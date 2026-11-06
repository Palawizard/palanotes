import { describe, expect, it } from 'vitest';
import { resolveLlmMode, type LlmModeConfig } from '../src/mode';

const config: LlmModeConfig = {
  ownerSubject: 'owner-sub',
  ownerMode: 'subscription',
  defaultMode: 'api',
};

describe('resolveLlmMode', () => {
  it('routes the owner through the subscription', () => {
    expect(resolveLlmMode('owner-sub', config)).toBe('subscription');
  });

  it('routes every other account through the default mode', () => {
    expect(resolveLlmMode('friend-sub', config)).toBe('api');
  });

  it('lets the owner switch to the api mode', () => {
    expect(resolveLlmMode('owner-sub', { ...config, ownerMode: 'api' })).toBe('api');
  });

  it('never uses the subscription when no owner is configured', () => {
    expect(resolveLlmMode('owner-sub', { ...config, ownerSubject: null })).toBe('api');
  });
});
