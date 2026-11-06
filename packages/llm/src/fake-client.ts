import type { LlmClient, LlmRequest, LlmResponse } from './types';

// Deterministic stand-in for tests and local runs without a model. It files each entry
// as a new note, in the folder named by a "à ranger avec/dans ..." hint, else in "Divers".
export class FakeLlmClient implements LlmClient {
  readonly mode = 'api' as const;

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const entry = /<entry>\n([\s\S]*)\n<\/entry>/.exec(request.prompt)?.[1] ?? '';
    const lines = entry.split('\n').map((line) => line.trim());
    const hintIndex = lines.findIndex((line) => /^à ranger (avec|dans)\s+/i.test(line));
    const hint = hintIndex >= 0 ? (lines[hintIndex] ?? '') : '';
    const folder = hint
      .replace(/^à ranger (avec|dans)\s+/i, '')
      .replace(/^(mes|mon|ma|les|le|la)\s+/i, '')
      .replace(/[.!]+$/, '')
      .trim();
    const body =
      lines
        .filter((_, index) => index !== hintIndex)
        .join('\n')
        .trim() || entry.trim();
    const title = (body.split('\n')[0] ?? 'Note').replace(/^#+\s*/, '').slice(0, 80) || 'Note';
    const folderPath = folder ? folder.charAt(0).toUpperCase() + folder.slice(1) : 'Divers';
    return {
      json: {
        explanation: `Nouvelle note dans ${folderPath}.`,
        actions: [
          {
            type: 'create',
            folderPath,
            title,
            content: body,
            summary: title,
            tags: [],
          },
        ],
      },
      mode: this.mode,
      model: 'fake',
      inputTokens: null,
      outputTokens: null,
    };
  }
}
