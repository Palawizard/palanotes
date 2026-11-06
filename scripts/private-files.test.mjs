import { describe, expect, it } from 'vitest';
import { isPrivatePath } from './private-files.mjs';

describe('isPrivatePath', () => {
  it.each([
    'CLAUDE.md',
    'apps/web/claude.md',
    'AGENTS.md',
    '.claude/settings.json',
    'apps/web/.claude/skills/x/SKILL.md',
    '.impeccable/state.json',
    'PRODUCT.md',
    'docs/DESIGN.md',
    'HANDOFF.md',
    'docs/handoff-2026.md',
    'PLAN.md',
    'docs/PLAN-v1.md',
    'RESEARCH.md',
    'PLAN',
    'docs/plan.txt.md',
    'docs\\research.md',
  ])('rejects %s', (path) => {
    expect(isPrivatePath(path)).toBe(true);
  });

  it.each([
    'README.md',
    'docs/ARCHITECTURE.md',
    'docs/DEPLOYMENT.md',
    'docs/DECISIONS.md',
    'apps/web/src/app/page.tsx',
    'packages/core/src/sort-plan.ts',
    'apps/web/src/components/planner-view.tsx',
  ])('accepts %s', (path) => {
    expect(isPrivatePath(path)).toBe(false);
  });
});
