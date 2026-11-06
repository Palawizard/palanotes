import { describe, expect, it } from 'vitest';
import { CliLlmClient, type ProcessResult, type ProcessRunner } from '../src/cli-client';
import { LlmError } from '../src/errors';

const plan = { explanation: 'x', actions: [] };
const request = { system: 'sys', prompt: 'le prompt', jsonSchema: { type: 'object' } };

function client(result: Partial<ProcessResult>, seen: Parameters<ProcessRunner>[] = []) {
  const runner: ProcessRunner = async (...args) => {
    seen.push(args);
    return { code: 0, stdout: '', stderr: '', timedOut: false, ...result };
  };
  return new CliLlmClient('oauth-token-value', 'claude-haiku-5-5', {
    runner,
    configDir: `/tmp/palanotes-cli-test-${process.pid}`,
  });
}

describe('CliLlmClient', () => {
  it('runs the CLI without tools and with only the subscription token in its environment', async () => {
    const seen: Parameters<ProcessRunner>[] = [];
    process.env.ANTHROPIC_API_KEY = 'sk-ant-should-not-leak';
    const response = await client(
      {
        stdout: JSON.stringify({
          type: 'result',
          subtype: 'success',
          result: '',
          structured_output: plan,
          usage: { input_tokens: 120, output_tokens: 40 },
        }),
      },
      seen,
    ).complete(request);
    delete process.env.ANTHROPIC_API_KEY;

    expect(response).toEqual({
      json: plan,
      mode: 'subscription',
      model: 'claude-haiku-5-5',
      inputTokens: 120,
      outputTokens: 40,
    });
    const [command, args, options] = seen[0] ?? [];
    expect(command).toBe('claude');
    expect(args).toEqual(
      expect.arrayContaining(['-p', '--tools', '', '--json-schema', '--strict-mcp-config']),
    );
    expect(args?.[args.indexOf('--tools') + 1]).toBe('');
    expect(options?.input).toBe('le prompt');
    expect(options?.env.CLAUDE_CODE_OAUTH_TOKEN).toBe('oauth-token-value');
    expect(options?.env).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(options?.env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');
  });

  it('falls back to the JSON in the text result when structured output is missing', async () => {
    const response = await client({
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: '```json\n{"explanation":"x","actions":[]}\n```',
      }),
    }).complete(request);
    expect(response.json).toEqual(plan);
  });

  it('turns an expired token into a clear message', async () => {
    const error = await client({
      code: 1,
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        result: 'Login expired',
      }),
    })
      .complete(request)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LlmError);
    expect((error as LlmError).userMessage).toBe('L’accès au modèle a expiré sur le serveur.');
  });

  it('reports a timeout and garbage output without leaking secrets', async () => {
    await expect(client({ timedOut: true }).complete(request)).rejects.toThrow('cli timed out');
    const error = (await client({ code: 2, stdout: 'oops', stderr: 'bad sk-ant-abc123secret' })
      .complete(request)
      .catch((caught: unknown) => caught)) as LlmError;
    expect(error.reason).toContain('[redacted]');
    expect(error.reason).not.toContain('sk-ant-abc123secret');
  });
});
