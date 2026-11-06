import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { LlmError, redact } from './errors';
import type { LlmClient, LlmRequest, LlmResponse } from './types';

export interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export type ProcessRunner = (
  command: string,
  args: string[],
  options: { env: Record<string, string>; cwd: string; input: string; timeoutMs: number },
) => Promise<ProcessResult>;

const MAX_OUTPUT = 4 * 1024 * 1024;

export const runProcess: ProcessRunner = (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: options.env, cwd: options.cwd, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT) stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.stdin.end(options.input);
  });

const cliResult = z.object({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean().optional(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  usage: z
    .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
    .partial()
    .optional(),
});

export interface CliOptions {
  command?: string;
  configDir?: string;
  timeoutMs?: number;
  runner?: ProcessRunner;
}

function parseJsonText(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return JSON.parse((fenced?.[1] ?? text).trim());
}

// Subscription mode: the official Claude Code CLI, non-interactive, with the owner's
// long-lived token. No tools, no MCP, no settings or memory files: one prompt, one JSON answer.
export class CliLlmClient implements LlmClient {
  readonly mode = 'subscription' as const;
  private readonly command: string;
  private readonly configDir: string;
  private readonly timeoutMs: number;
  private readonly runner: ProcessRunner;

  constructor(
    private readonly oauthToken: string,
    private readonly model: string,
    options: CliOptions = {},
  ) {
    this.command = options.command ?? 'claude';
    this.configDir = options.configDir ?? join(tmpdir(), 'palanotes-claude');
    this.timeoutMs = options.timeoutMs ?? 180_000;
    this.runner = options.runner ?? runProcess;
  }

  args(request: LlmRequest): string[] {
    return [
      '-p',
      '--output-format',
      'json',
      '--json-schema',
      JSON.stringify(request.jsonSchema),
      '--system-prompt',
      `${request.system}\n\nAnswer with the JSON object only.`,
      '--model',
      this.model,
      '--tools',
      '',
      '--strict-mcp-config',
      '--max-turns',
      '3',
      '--no-session-persistence',
    ];
  }

  // Only what the CLI needs. API keys are left out on purpose: the CLI would prefer
  // them over the subscription token.
  env(): Record<string, string> {
    return {
      PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
      HOME: this.configDir,
      CLAUDE_CONFIG_DIR: this.configDir,
      CLAUDE_CODE_OAUTH_TOKEN: this.oauthToken,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
      DISABLE_AUTOUPDATER: '1',
      DISABLE_TELEMETRY: '1',
    };
  }

  private prepareConfigDir(): void {
    mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    const state = join(this.configDir, '.claude.json');
    if (!existsSync(state)) {
      writeFileSync(state, JSON.stringify({ hasCompletedOnboarding: true }), { mode: 0o600 });
    }
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.prepareConfigDir();
    let run: ProcessResult;
    try {
      run = await this.runner(this.command, this.args(request), {
        env: this.env(),
        cwd: this.configDir,
        input: request.prompt,
        timeoutMs: this.timeoutMs,
      });
    } catch (error) {
      throw new LlmError(
        'Le rangement n’est pas disponible sur le serveur.',
        `cli could not start: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
    if (run.timedOut) {
      throw new LlmError('Le modèle a mis trop de temps. Relance le rangement.', 'cli timed out');
    }

    let parsed: z.infer<typeof cliResult>;
    try {
      parsed = cliResult.parse(JSON.parse(run.stdout));
    } catch {
      throw new LlmError(
        'Le rangement a échoué. Relance-le.',
        `cli exit ${run.code}: ${redact(run.stderr || run.stdout)}`,
      );
    }
    if (parsed.is_error || parsed.subtype !== 'success') {
      const expired = /login|expired|auth|401/i.test(parsed.result ?? '');
      throw new LlmError(
        expired
          ? 'L’accès au modèle a expiré sur le serveur.'
          : 'Le rangement a échoué. Relance-le.',
        `cli ${parsed.subtype}: ${redact(parsed.result ?? '')}`,
      );
    }

    let json = parsed.structured_output;
    if (json === undefined) {
      try {
        json = parseJsonText(parsed.result ?? '');
      } catch {
        throw new LlmError(
          'Réponse illisible du modèle. Relance le rangement.',
          'cli returned no json',
        );
      }
    }
    return {
      json,
      mode: this.mode,
      model: this.model,
      inputTokens: parsed.usage?.input_tokens ?? null,
      outputTokens: parsed.usage?.output_tokens ?? null,
    };
  }
}
