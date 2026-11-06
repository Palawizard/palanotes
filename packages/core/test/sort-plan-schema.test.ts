import { describe, expect, it } from 'vitest';
import { sortPlan } from '../src/sort-plan';
import { SORT_PLAN_JSON_SCHEMA } from '../src/sort-plan-schema';

function keysOf(schema: { properties: Record<string, unknown> }): string[] {
  return Object.keys(schema.properties).sort();
}

describe('SORT_PLAN_JSON_SCHEMA', () => {
  it('describes the same fields as the Zod plan', () => {
    expect(keysOf(SORT_PLAN_JSON_SCHEMA)).toEqual(Object.keys(sortPlan.shape).sort());
    const [create, append] = SORT_PLAN_JSON_SCHEMA.properties.actions.items.anyOf;
    expect(keysOf(create)).toEqual(
      ['content', 'folderPath', 'summary', 'tags', 'title', 'type'].sort(),
    );
    expect(keysOf(append)).toEqual(
      ['content', 'noteId', 'sectionTitle', 'summary', 'tags', 'type'].sort(),
    );
  });

  it('uses no keyword that structured outputs reject', () => {
    const text = JSON.stringify(SORT_PLAN_JSON_SCHEMA);
    for (const keyword of [
      'minLength',
      'maxLength',
      'minItems',
      'maxItems',
      'minimum',
      'maximum',
    ]) {
      expect(text).not.toContain(`"${keyword}"`);
    }
  });
});
