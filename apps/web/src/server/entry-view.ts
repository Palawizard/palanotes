import { buildFolderPaths, formatFolderPath, parseSortPlan } from '@palanotes/core';
import {
  findNotesByIds,
  latestSortRuns,
  listFolders,
  listRecentEntries,
  type Db,
  type Entry,
  type EntryStatus,
  type SortRun,
} from '@palanotes/db';

export type ActionView =
  | { type: 'create'; folderPath: string; title: string; content: string }
  | {
      type: 'append';
      noteId: string;
      noteTitle: string;
      folderPath: string;
      sectionTitle: string;
      content: string;
    };

export interface RunView {
  id: string;
  status: SortRun['status'];
  explanation: string;
  actions: ActionView[];
  noteIds: string[];
}

export interface EntryView {
  id: string;
  preview: string;
  content: string;
  status: EntryStatus;
  createdAt: string;
  error: string | null;
  run: RunView | null;
}

const PREVIEW_LENGTH = 140;

// The plan card already shows the title, so a first heading that repeats it is dropped.
export function withoutLeadingTitle(content: string, title: string): string {
  const match = /^\s*#{1,6}\s+(.+?)\s*(\n|$)/.exec(content);
  if (match && match[1]?.trim().toLowerCase() === title.trim().toLowerCase()) {
    return content.slice(match[0].length).trimStart();
  }
  return content;
}

export function previewOf(content: string): string {
  const line =
    content
      .split('\n')
      .map((text) => text.replace(/^\s*(#{1,6}\s+|[-*+]\s+|>\s*|\d+\.\s+)/, '').trim())
      .find((text) => text.length > 0) ?? '';
  return line.length > PREVIEW_LENGTH ? `${line.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : line;
}

export function toEntryView(entry: Entry, run: RunView | null = null): EntryView {
  return {
    id: entry.id,
    preview: previewOf(entry.content),
    content: entry.content,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    error: entry.status === 'failed' ? entry.error : null,
    run,
  };
}

// The recent entries of one account, each with its latest filing plan in readable form.
export async function loadPocket(db: Db, userId: string): Promise<EntryView[]> {
  const entries = await listRecentEntries(db, userId);
  const [runs, folders] = await Promise.all([
    latestSortRuns(
      db,
      userId,
      entries.map((entry) => entry.id),
    ),
    listFolders(db, userId),
  ]);
  const plans = new Map(
    [...runs.values()].map((run) => [run.id, parseSortPlan(run.plan)] as const),
  );
  const appendedIds = [...plans.values()].flatMap((plan) =>
    plan.actions.flatMap((action) => (action.type === 'append' ? [action.noteId] : [])),
  );
  const appliedIds = [...runs.values()].flatMap((run) =>
    run.status === 'applied' && run.applied
      ? [...run.applied.createdNoteIds, ...run.applied.appendedNoteIds]
      : [],
  );
  const notes = new Map(
    (await findNotesByIds(db, userId, [...new Set([...appendedIds, ...appliedIds])])).map(
      (note) => [note.id, note],
    ),
  );
  const paths = buildFolderPaths(folders);

  return entries.map((entry) => {
    const run = runs.get(entry.id);
    const plan = run ? plans.get(run.id) : undefined;
    if (!run || !plan) {
      return toEntryView(entry);
    }
    const actions = plan.actions.map((action): ActionView => {
      if (action.type === 'create') {
        return {
          type: 'create',
          folderPath: formatFolderPath(
            action.folderPath
              .split('/')
              .map((part) => part.trim())
              .filter(Boolean),
          ),
          title: action.title,
          content: withoutLeadingTitle(action.content, action.title),
        };
      }
      const note = notes.get(action.noteId);
      return {
        type: 'append',
        noteId: action.noteId,
        noteTitle: note?.title ?? 'Note supprimée',
        folderPath: note ? formatFolderPath(paths.get(note.folderId) ?? []) : '',
        sectionTitle: action.sectionTitle,
        content: action.content,
      };
    });
    const noteIds =
      run.status === 'applied' && run.applied
        ? [...run.applied.createdNoteIds, ...run.applied.appendedNoteIds].filter((id) =>
            notes.has(id),
          )
        : [];
    return toEntryView(entry, {
      id: run.id,
      status: run.status,
      explanation: plan.explanation,
      actions,
      noteIds,
    });
  });
}
