export type LlmMode = 'subscription' | 'api' | 'disabled';

export interface LlmRequest {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
}

export interface LlmResponse {
  json: unknown;
  mode: Exclude<LlmMode, 'disabled'>;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface LlmClient {
  readonly mode: Exclude<LlmMode, 'disabled'>;
  complete(request: LlmRequest): Promise<LlmResponse>;
}
