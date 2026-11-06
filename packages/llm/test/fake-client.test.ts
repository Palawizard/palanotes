import { describe, expect, it } from 'vitest';
import { parseSortPlan } from '@palanotes/core';
import { FakeLlmClient } from '../src/fake-client';
import { buildSortPrompt } from '../src/prompt';

describe('FakeLlmClient', () => {
  it('returns a valid plan that follows the filing hint', async () => {
    const response = await new FakeLlmClient().complete({
      system: '',
      prompt: buildSortPrompt({
        entry: 'Le masque /26 donne 62 hôtes\nà ranger avec mes cours de réseau',
        folderPaths: [],
        notes: [],
      }),
      jsonSchema: {},
    });
    const plan = parseSortPlan(response.json);
    expect(plan.actions[0]).toMatchObject({
      type: 'create',
      folderPath: 'Cours de réseau',
      title: 'Le masque /26 donne 62 hôtes',
    });
  });
});
