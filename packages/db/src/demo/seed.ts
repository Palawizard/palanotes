import { count, eq } from 'drizzle-orm';
import type { SortPlan } from '@palanotes/core';
import type { Db, DbOrTx } from '../client';
import { entries, folders, notes, sortRuns } from '../schema';
import { DEMO_FOLDERS } from './folders';
import { COURSE_NOTES } from './notes-cours';
import { LONG_NOTES } from './notes-long';
import { NETWORK_NOTES } from './notes-reseau';
import { PERSONAL_NOTES } from './notes-perso';
import { PROJECT_NOTES } from './notes-projets';
import { recurringNotes } from './notes-recurring';
import { createRandom, type Random } from './random';
import type { DemoNote } from './types';

const DAY = 86_400_000;
const SEED = 20261106;

export interface DemoSummary {
  folders: number;
  notes: number;
  entries: number;
}

export class DemoAccountNotEmptyError extends Error {
  constructor() {
    super('the account already has folders or notes; the demo set only loads into an empty one');
    this.name = 'DemoAccountNotEmptyError';
  }
}

export function demoNotes(now: Date): DemoNote[] {
  const random = createRandom(SEED);
  return [
    ...NETWORK_NOTES,
    ...COURSE_NOTES,
    ...LONG_NOTES,
    ...PROJECT_NOTES,
    ...PERSONAL_NOTES,
    ...recurringNotes(random, now),
  ];
}

// A time of day between 7:00 and 23:00, so dates read like real use.
function at(now: Date, daysAgo: number, random: Random): Date {
  const day = new Date(now.getTime() - daysAgo * DAY);
  day.setUTCHours(random.int(6, 21), random.int(0, 59), random.int(0, 59), 0);
  return day.getTime() > now.getTime() ? new Date(now.getTime() - random.int(5, 90) * 60_000) : day;
}

function datesOf(note: DemoNote, now: Date, random: Random): { createdAt: Date; updatedAt: Date } {
  if (note.daysAgo !== undefined) {
    const createdAt = at(now, note.daysAgo, random);
    return { createdAt, updatedAt: createdAt };
  }
  const daysAgo = random.int(3, 365);
  const createdAt = at(now, daysAgo, random);
  // About one note in three was edited later, a few of them in the last days.
  const roll = random.next();
  if (roll < 0.66) {
    return { createdAt, updatedAt: createdAt };
  }
  const editedDaysAgo = roll > 0.92 ? random.int(0, 2) : random.int(0, daysAgo - 1);
  const updatedAt = at(now, editedDaysAgo, random);
  return { createdAt, updatedAt: updatedAt < createdAt ? createdAt : updatedAt };
}

async function isEmpty(db: Db, userId: string): Promise<boolean> {
  const [folderRow] = await db
    .select({ n: count() })
    .from(folders)
    .where(eq(folders.userId, userId));
  const [noteRow] = await db.select({ n: count() }).from(notes).where(eq(notes.userId, userId));
  return (folderRow?.n ?? 0) === 0 && (noteRow?.n ?? 0) === 0;
}

// Loads the demo account: about fifty folders on four levels, a few hundred notes spread
// over the last year, and a pocket holding entries in each state. Development and tests only.
export async function seedDemoAccount(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<DemoSummary> {
  if (!(await isEmpty(db, userId))) {
    throw new DemoAccountNotEmptyError();
  }
  const random = createRandom(SEED + 1);
  const list = demoNotes(now);

  return db.transaction(async (tx) => {
    const folderIds = new Map<string, string>();
    for (const path of DEMO_FOLDERS) {
      const parts = path.split(' / ');
      const name = parts.at(-1) ?? path;
      const parentId = parts.length > 1 ? folderIds.get(parts.slice(0, -1).join(' / ')) : null;
      if (parentId === undefined) {
        throw new Error(`demo folder ${path} is listed before its parent`);
      }
      const createdAt = at(now, random.int(200, 380), random);
      const [row] = await tx
        .insert(folders)
        .values({ userId, parentId, name, createdAt, updatedAt: createdAt })
        .returning({ id: folders.id });
      if (!row) {
        throw new Error('folder insert returned no row');
      }
      folderIds.set(path, row.id);
    }

    const rows = list.map((note) => {
      const folderId = folderIds.get(note.path);
      if (!folderId) {
        throw new Error(`demo note ${note.title} points to an unknown folder ${note.path}`);
      }
      return {
        userId,
        folderId,
        title: note.title,
        content: note.content,
        summary: note.summary,
        tags: note.tags,
        ...datesOf(note, now, random),
      };
    });
    const inserted = await tx
      .insert(notes)
      .values(rows)
      .returning({ id: notes.id, title: notes.title });
    const noteId = (title: string): string => {
      const found = inserted.find((note) => note.title === title);
      if (!found) {
        throw new Error(`demo note ${title} is missing`);
      }
      return found.id;
    };

    const pocket = await seedPocket(tx, userId, now, noteId);
    return { folders: folderIds.size, notes: inserted.length, entries: pocket };
  });
}

interface PocketEntry {
  content: string;
  minutesAgo: number;
  status: 'proposed' | 'applied' | 'failed' | 'rejected';
  error?: string;
  plan?: SortPlan;
  applied?: { createdNoteIds: string[]; appendedNoteIds: string[] };
}

async function seedPocket(
  db: DbOrTx,
  userId: string,
  now: Date,
  noteId: (title: string) => string,
): Promise<number> {
  const romans = noteId('Liste de romans à lire');
  const pocket: PocketEntry[] = [
    {
      content:
        'NAT et PAT\nla box traduit les adresses privées en une seule adresse publique, le PAT distingue les connexions par le port source\nà ranger avec le cours de réseau',
      minutesAgo: 6,
      status: 'proposed',
      plan: {
        explanation: 'Nouvelle note avec les autres notes sur TCP-IP, comme demandé.',
        actions: [
          {
            type: 'create',
            folderPath: 'Cours / Réseau / TCP-IP',
            title: 'NAT et PAT',
            content:
              '# NAT et PAT\n\nLa box traduit les adresses privées en **une seule adresse publique**.\n\n- **NAT** : une adresse privée ↔ une adresse publique\n- **PAT** : plusieurs machines derrière une adresse, distinguées par le port source\n\n> Conséquence : une connexion entrante a besoin d’une redirection de port.',
            summary: 'Différence entre NAT et PAT et rôle du port source.',
            tags: ['nat', 'réseau'],
          },
        ],
      },
    },
    {
      content: 'ajouter Le Nom de la rose d’Umberto Eco à ma liste de romans',
      minutesAgo: 25,
      status: 'proposed',
      plan: {
        explanation: 'Ajout à ta liste de romans existante.',
        actions: [
          {
            type: 'append',
            noteId: romans,
            sectionTitle: 'Ajouté',
            content: '- [ ] Le Nom de la rose, Eco',
            summary: 'Pile de romans à lire, avec ceux déjà terminés cochés.',
            tags: ['lecture', 'romans', 'à lire'],
          },
        ],
      },
    },
    {
      content: 'rdv dentiste jeudi 14h30, apporter la carte vitale',
      minutesAgo: 70,
      status: 'failed',
      error: 'Le rangement n’a pas répondu à temps. Relance-le.',
    },
    {
      content: 'code du portail 4512 changé en septembre',
      minutesAgo: 60 * 20,
      status: 'applied',
      plan: {
        explanation: 'Nouvelle note dans Administratif / Logement.',
        actions: [
          {
            type: 'create',
            folderPath: 'Administratif / Logement',
            title: 'Code du portail',
            content: 'Code du portail : 4512, changé en septembre.',
            summary: 'Code du portail de la résidence.',
            tags: ['logement'],
          },
        ],
      },
      applied: { createdNoteIds: [noteId('Code du portail')], appendedNoteIds: [] },
    },
    {
      content: 'test test',
      minutesAgo: 60 * 26,
      status: 'rejected',
      plan: {
        explanation: 'Nouvelle note dans Idées en vrac.',
        actions: [
          {
            type: 'create',
            folderPath: 'Idées en vrac',
            title: 'Test',
            content: 'test test',
            summary: 'Note de test.',
            tags: [],
          },
        ],
      },
    },
  ];

  for (const item of pocket) {
    const createdAt = new Date(now.getTime() - item.minutesAgo * 60_000);
    const [entry] = await db
      .insert(entries)
      .values({
        userId,
        content: item.content,
        status: item.status,
        error: item.error ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: entries.id });
    if (!entry) {
      throw new Error('entry insert returned no row');
    }
    if (item.plan) {
      await db.insert(sortRuns).values({
        userId,
        entryId: entry.id,
        plan: item.plan,
        status: item.status === 'failed' ? 'proposed' : item.status,
        llmMode: 'subscription',
        model: 'claude-haiku-5-5',
        applied: item.applied ? { ...item.applied, createdFolderIds: [] } : null,
        appliedAt: item.status === 'applied' ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  return pocket.length;
}
