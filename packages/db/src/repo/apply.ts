import { and, eq, inArray, sql } from 'drizzle-orm';
import { parseFolderPath, parseSortPlan } from '@palanotes/core';
import type { DbOrTx } from '../client';
import { entries, folders, notes, noteVersions, sortRuns, type AppliedChanges } from '../schema';
import { ensureFolderPath } from './folders';

export class FilingError extends Error {
  constructor(readonly userMessage: string) {
    super(userMessage);
    this.name = 'FilingError';
  }
}

function appendSection(content: string, title: string, body: string): string {
  return `${content.trimEnd()}\n\n## ${title}\n\n${body.trim()}\n`;
}

async function lockRun(db: DbOrTx, userId: string, runId: string) {
  const [run] = await db
    .select()
    .from(sortRuns)
    .where(and(eq(sortRuns.id, runId), eq(sortRuns.userId, userId)))
    .for('update')
    .limit(1);
  if (!run) {
    throw new FilingError('Ce rangement n’existe plus.');
  }
  return run;
}

// Applies a stored plan in one transaction: missing folders, new notes, appended sections,
// and one note_versions row per touched note so the whole run can be undone.
export async function applySortRun(
  db: DbOrTx,
  userId: string,
  runId: string,
): Promise<AppliedChanges> {
  return db.transaction(async (tx) => {
    const run = await lockRun(tx, userId, runId);
    if (run.status !== 'proposed' && run.status !== 'undone') {
      throw new FilingError('Ce rangement a déjà été traité.');
    }
    const plan = parseSortPlan(run.plan);
    const changes: AppliedChanges = {
      createdNoteIds: [],
      appendedNoteIds: [],
      createdFolderIds: [],
    };

    for (const action of plan.actions) {
      if (action.type === 'create') {
        const { folderId, created } = await ensureFolderPath(
          tx,
          userId,
          parseFolderPath(action.folderPath),
        );
        changes.createdFolderIds.push(...created);
        const [note] = await tx
          .insert(notes)
          .values({
            userId,
            folderId,
            title: action.title,
            content: action.content,
            summary: action.summary,
            tags: action.tags,
          })
          .returning();
        if (!note) {
          throw new Error('note insert returned no row');
        }
        await tx.insert(noteVersions).values({
          noteId: note.id,
          sortRunId: run.id,
          kind: 'created',
          folderId,
          title: note.title,
          summary: note.summary,
          tags: note.tags,
          content: note.content,
        });
        changes.createdNoteIds.push(note.id);
        continue;
      }

      const [note] = await tx
        .select()
        .from(notes)
        .where(and(eq(notes.id, action.noteId), eq(notes.userId, userId)))
        .for('update')
        .limit(1);
      if (!note) {
        throw new FilingError('La note à compléter a été supprimée. Relance le rangement.');
      }
      await tx.insert(noteVersions).values({
        noteId: note.id,
        sortRunId: run.id,
        kind: 'before_append',
        folderId: note.folderId,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        content: note.content,
      });
      await tx
        .update(notes)
        .set({
          content: appendSection(note.content, action.sectionTitle, action.content),
          summary: action.summary,
          tags: action.tags,
          updatedAt: sql`now()`,
        })
        .where(eq(notes.id, note.id));
      changes.appendedNoteIds.push(note.id);
    }

    await tx
      .update(sortRuns)
      .set({
        status: 'applied',
        applied: changes,
        appliedAt: sql`now()`,
        undoneAt: null,
        updatedAt: sql`now()`,
      })
      .where(eq(sortRuns.id, run.id));
    await tx
      .update(entries)
      .set({ status: 'applied', error: null, updatedAt: sql`now()` })
      .where(eq(entries.id, run.entryId));
    return changes;
  });
}

// Undoes an applied run: deletes the notes it created, restores the notes it extended,
// and removes the folders it created when they are empty. Refused when a touched note
// changed afterwards, so a later manual edit is never lost.
export async function undoSortRun(db: DbOrTx, userId: string, runId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const run = await lockRun(tx, userId, runId);
    if (run.status !== 'applied' || !run.applied || !run.appliedAt) {
      throw new FilingError('Ce rangement ne peut plus être annulé.');
    }
    const changes = run.applied;
    const touched = [...changes.createdNoteIds, ...changes.appendedNoteIds];
    if (touched.length > 0) {
      const current = await tx
        .select({ id: notes.id, updatedAt: notes.updatedAt })
        .from(notes)
        .where(and(inArray(notes.id, touched), eq(notes.userId, userId)))
        .for('update');
      if (current.some((note) => note.updatedAt.getTime() > (run.appliedAt?.getTime() ?? 0))) {
        throw new FilingError(
          'Une note a été modifiée depuis ce rangement. Annule tes changements à la main.',
        );
      }
    }

    if (changes.appendedNoteIds.length > 0) {
      const versions = await tx
        .select()
        .from(noteVersions)
        .where(and(eq(noteVersions.sortRunId, run.id), eq(noteVersions.kind, 'before_append')));
      for (const version of versions) {
        await tx
          .update(notes)
          .set({
            content: version.content,
            ...(version.title !== null ? { title: version.title } : {}),
            ...(version.summary !== null ? { summary: version.summary } : {}),
            ...(version.tags !== null ? { tags: version.tags } : {}),
            updatedAt: sql`now()`,
          })
          .where(and(eq(notes.id, version.noteId), eq(notes.userId, userId)));
      }
    }
    if (changes.createdNoteIds.length > 0) {
      await tx
        .delete(notes)
        .where(and(inArray(notes.id, changes.createdNoteIds), eq(notes.userId, userId)));
    }
    // Deepest folders first, and only when nothing else was filed in them since.
    for (const folderId of [...changes.createdFolderIds].reverse()) {
      const [used] = await tx
        .select({ one: sql`1` })
        .from(notes)
        .where(eq(notes.folderId, folderId))
        .limit(1);
      const [child] = await tx
        .select({ one: sql`1` })
        .from(folders)
        .where(eq(folders.parentId, folderId))
        .limit(1);
      if (!used && !child) {
        await tx.delete(folders).where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
      }
    }

    await tx
      .update(sortRuns)
      .set({ status: 'undone', undoneAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(sortRuns.id, run.id));
    await tx
      .update(entries)
      .set({ status: 'proposed', updatedAt: sql`now()` })
      .where(eq(entries.id, run.entryId));
  });
}

export async function rejectSortRun(db: DbOrTx, userId: string, runId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const run = await lockRun(tx, userId, runId);
    if (run.status !== 'proposed' && run.status !== 'undone') {
      throw new FilingError('Ce rangement a déjà été traité.');
    }
    await tx
      .update(sortRuns)
      .set({ status: 'rejected', updatedAt: sql`now()` })
      .where(eq(sortRuns.id, run.id));
    await tx
      .update(entries)
      .set({ status: 'rejected', updatedAt: sql`now()` })
      .where(eq(entries.id, run.entryId));
  });
}

// Puts an entry back in the queue: its pending proposal, if any, is set aside first.
export async function prepareRetry(db: DbOrTx, userId: string, entryId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
      .for('update')
      .limit(1);
    if (!entry) {
      throw new FilingError('Cette entrée n’existe plus.');
    }
    if (entry.status === 'applied') {
      throw new FilingError('Annule d’abord ce rangement pour le relancer.');
    }
    if (entry.status === 'pending' || entry.status === 'processing') {
      throw new FilingError('Le rangement est déjà en cours.');
    }
    await tx
      .update(sortRuns)
      .set({ status: 'rejected', updatedAt: sql`now()` })
      .where(and(eq(sortRuns.entryId, entry.id), inArray(sortRuns.status, ['proposed', 'undone'])));
    await tx
      .update(entries)
      .set({ status: 'pending', error: null, updatedAt: sql`now()` })
      .where(eq(entries.id, entry.id));
  });
}
