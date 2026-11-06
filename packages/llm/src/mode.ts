import type { LlmMode } from './types.js';

export interface LlmModeConfig {
  ownerSubject: string | null;
  defaultMode: Exclude<LlmMode, 'subscription'>;
  ownerMode: LlmMode;
}

// The subscription is licensed for the owner's individual use only, so no
// other account may ever be routed through it, whatever the configuration says.
export function resolveLlmMode(userSubject: string, config: LlmModeConfig): LlmMode {
  const isOwner = config.ownerSubject !== null && userSubject === config.ownerSubject;
  return isOwner ? config.ownerMode : config.defaultMode;
}
