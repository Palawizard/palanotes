import Anthropic from '@anthropic-ai/sdk';
import { LlmError } from './errors';
import type { LlmClient, LlmRequest, LlmResponse } from './types';

// Api mode: the account pays through ANTHROPIC_API_KEY. A spending cap belongs in the console.
export class ApiLlmClient implements LlmClient {
  readonly mode = 'api' as const;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8000,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: request.jsonSchema },
        },
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new LlmError('Le service est saturé. Relance dans une minute.', 'api rate limited');
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LlmError('La clé du service est refusée.', 'api authentication failed');
      }
      if (error instanceof Anthropic.APIError) {
        throw new LlmError(
          'Le service n’a pas répondu. Relance le rangement.',
          `api error ${error.status ?? 'network'}`,
        );
      }
      throw error;
    }

    if (response.stop_reason === 'refusal') {
      throw new LlmError('Le modèle a refusé de ranger cette note.', 'api refusal');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new LlmError(
        'Note trop longue pour être rangée d’un coup. Coupe-la en deux.',
        'api max_tokens',
      );
    }
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') {
      throw new LlmError('Réponse vide du modèle. Relance le rangement.', 'api returned no text');
    }
    let json: unknown;
    try {
      json = JSON.parse(text.text);
    } catch {
      throw new LlmError(
        'Réponse illisible du modèle. Relance le rangement.',
        'api returned invalid json',
      );
    }
    return {
      json,
      mode: this.mode,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
