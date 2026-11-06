import {
  formatFolderPath,
  parseFolderPath,
  parseSortPlan,
  SORT_PLAN_JSON_SCHEMA,
  buildFolderPaths,
  type SortPlan,
} from '@palanotes/core';
import {
  applySortRun,
  createSortRun,
  FilingError,
  findEntryById,
  findUserById,
  listFolders,
  listNoteIndex,
  setEntryStatus,
  type Db,
  type User,
} from '@palanotes/db';
import {
  buildSortPrompt,
  LlmError,
  redact,
  SORT_SYSTEM_PROMPT,
  type LlmClientResult,
} from '@palanotes/llm';

export interface SortEntryDeps {
  db: Db;
  clientFor: (user: User) => LlmClientResult;
  log?: (message: string) => void;
}

export type SortEntryOutcome = 'proposed' | 'applied' | 'failed' | 'skipped';

const INVALID_PLAN = 'Le rangement proposé n’était pas valable. Relance le rangement.';

// Checks what Zod cannot: folder paths parse, and appended notes belong to this account.
function checkPlan(plan: SortPlan, ownNoteIds: ReadonlySet<string>): string | null {
  for (const action of plan.actions) {
    if (action.type === 'create') {
      try {
        parseFolderPath(action.folderPath);
      } catch (error) {
        return `invalid folder path: ${error instanceof Error ? error.message : ''}`;
      }
    } else if (!ownNoteIds.has(action.noteId)) {
      return 'append to a note outside the index';
    }
  }
  return null;
}

export async function sortEntry(deps: SortEntryDeps, entryId: string): Promise<SortEntryOutcome> {
  const log = deps.log ?? ((message: string) => console.log(message));
  const entry = await findEntryById(deps.db, entryId);
  if (!entry || (entry.status !== 'pending' && entry.status !== 'processing')) {
    return 'skipped';
  }
  const user = await findUserById(deps.db, entry.userId);
  if (!user) {
    return 'skipped';
  }

  const fail = async (userMessage: string, reason: string): Promise<SortEntryOutcome> => {
    log(`[sort] entry ${entry.id} failed: ${redact(reason)}`);
    await setEntryStatus(deps.db, entry.id, 'failed', userMessage);
    return 'failed';
  };

  const { client, reason } = deps.clientFor(user);
  if (!client) {
    return fail(reason, 'no model for this account');
  }
  await setEntryStatus(deps.db, entry.id, 'processing');

  const [folders, notes] = await Promise.all([
    listFolders(deps.db, user.id),
    listNoteIndex(deps.db, user.id),
  ]);
  const paths = buildFolderPaths(folders);
  const prompt = buildSortPrompt({
    entry: entry.content,
    folderPaths: folders
      .map((folder) => formatFolderPath(paths.get(folder.id) ?? [folder.name]))
      .sort(),
    notes: notes.map((note) => ({
      id: note.id,
      folderPath: formatFolderPath(paths.get(note.folderId) ?? []),
      title: note.title,
      summary: note.summary,
      tags: note.tags,
    })),
  });

  let response;
  try {
    response = await client.complete({
      system: SORT_SYSTEM_PROMPT,
      prompt,
      jsonSchema: SORT_PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
    });
  } catch (error) {
    if (error instanceof LlmError) {
      return fail(error.userMessage, error.reason);
    }
    return fail(
      'Le rangement a échoué. Relance-le.',
      error instanceof Error ? error.message : 'unknown error',
    );
  }

  let plan: SortPlan;
  try {
    plan = parseSortPlan(response.json);
  } catch {
    return fail(INVALID_PLAN, 'plan does not match the schema');
  }
  const problem = checkPlan(plan, new Set(notes.map((note) => note.id)));
  if (problem) {
    return fail(INVALID_PLAN, problem);
  }

  const run = await deps.db.transaction(async (tx) => {
    const created = await createSortRun(tx, {
      userId: user.id,
      entryId: entry.id,
      plan,
      llmMode: response.mode,
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });
    await setEntryStatus(tx, entry.id, 'proposed');
    return created;
  });
  log(
    `[sort] entry ${entry.id} proposed (${response.mode}, ${response.model}, in ${response.inputTokens ?? '?'} / out ${response.outputTokens ?? '?'} tokens)`,
  );
  if (user.sortMode === 'direct') {
    try {
      await applySortRun(deps.db, user.id, run.id);
      log(`[sort] entry ${entry.id} applied directly`);
      return 'applied';
    } catch (error) {
      // The proposal stays visible, so the user can still accept or retry it.
      log(
        `[sort] entry ${entry.id} could not be applied: ${error instanceof FilingError ? error.userMessage : 'error'}`,
      );
    }
  }
  return 'proposed';
}
