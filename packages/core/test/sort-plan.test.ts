import { describe, expect, it } from 'vitest';
import { parseSortPlan } from '../src/sort-plan.js';

const existingNoteId = '0b6f1f1e-3c1a-4a52-9a43-6f0c2a8d9e10';

describe('parseSortPlan', () => {
  it('accepts a plan that creates one note and appends to another', () => {
    const plan = parseSortPlan({
      explanation: 'Cours de réseau rangé avec le chapitre précédent.',
      actions: [
        {
          type: 'create',
          folderPath: 'Cours / Réseau',
          title: 'Sous-réseaux IPv4',
          content: '# Sous-réseaux IPv4\n\n- /24 = 254 hôtes',
          summary: 'Calcul des sous-réseaux et des masques.',
          tags: ['réseau', 'ipv4'],
        },
        {
          type: 'append',
          noteId: existingNoteId,
          sectionTitle: 'Rappel du 6 novembre',
          content: 'Le masque /26 donne 62 hôtes.',
          summary: 'Exemple de masque /26.',
          tags: [],
        },
      ],
    });

    expect(plan.actions).toHaveLength(2);
    expect(plan.actions[1]?.type).toBe('append');
  });

  it('rejects an empty plan', () => {
    expect(() => parseSortPlan({ explanation: '', actions: [] })).toThrow();
  });

  it('rejects an append without a valid note id', () => {
    expect(() =>
      parseSortPlan({
        explanation: '',
        actions: [
          {
            type: 'append',
            noteId: 'not-a-uuid',
            sectionTitle: 'x',
            content: 'x',
            summary: 'x',
            tags: [],
          },
        ],
      }),
    ).toThrow();
  });
});
