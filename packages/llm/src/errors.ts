// Errors carry a short message for the user and a technical reason for the logs.
// Neither ever contains the note text or a credential.
export class LlmError extends Error {
  constructor(
    readonly userMessage: string,
    readonly reason: string,
  ) {
    super(reason);
    this.name = 'LlmError';
  }
}

export function redact(text: string): string {
  return text
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/(token|key|authorization)["'=:\s]+[A-Za-z0-9._-]{12,}/gi, '$1 [redacted]')
    .slice(0, 300);
}
