import {
  type AnyPgColumn,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const sortModeEnum = pgEnum('sort_mode', ['direct', 'review']);
export const llmModeEnum = pgEnum('llm_mode', ['subscription', 'api']);
export const entryStatusEnum = pgEnum('entry_status', [
  'pending',
  'processing',
  'proposed',
  'applied',
  'failed',
  'rejected',
]);
export const noteVersionKindEnum = pgEnum('note_version_kind', [
  'created',
  'before_append',
  'before_edit',
]);

export interface AppliedChanges {
  createdNoteIds: string[];
  appendedNoteIds: string[];
  createdFolderIds: string[];
}

export const sortRunStatusEnum = pgEnum('sort_run_status', [
  'proposed',
  'applied',
  'rejected',
  'undone',
]);

// Maintained by the notes_search_update trigger (see migration 0002_search).
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authSubject: text('auth_subject').notNull().unique(),
  displayName: text('display_name').notNull(),
  sortMode: sortModeEnum('sort_mode').notNull().default('review'),
  ...timestamps,
});

export const folders = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => folders.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [
    unique('folders_name_unique').on(t.userId, t.parentId, t.name).nullsNotDistinct(),
    index('folders_parent_idx').on(t.parentId),
  ],
);

// Raw text exactly as typed. Never edited or deleted by the sorting, so a bad
// sort can always be redone from the original.
export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    status: entryStatusEnum('status').notNull().default('pending'),
    error: text('error'),
    ...timestamps,
  },
  (t) => [index('entries_user_status_idx').on(t.userId, t.status)],
);

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => folders.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    summary: text('summary').notNull(),
    tags: text('tags').array().notNull().default([]),
    search: tsvector('search'),
    searchText: text('search_text'),
    ...timestamps,
  },
  (t) => [
    index('notes_user_folder_idx').on(t.userId, t.folderId),
    index('notes_user_updated_idx').on(t.userId, t.updatedAt.desc()),
    index('notes_folder_idx').on(t.folderId),
    index('notes_search_idx').using('gin', t.search),
    index('notes_search_text_trgm_idx').using('gin', t.searchText.op('gin_trgm_ops')),
  ],
);

export const sortRuns = pgTable(
  'sort_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    plan: jsonb('plan').notNull(),
    status: sortRunStatusEnum('status').notNull().default('proposed'),
    llmMode: llmModeEnum('llm_mode').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    applied: jsonb('applied').$type<AppliedChanges>(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    undoneAt: timestamp('undone_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('sort_runs_entry_idx').on(t.entryId), index('sort_runs_user_idx').on(t.userId)],
);

// One row per change to a note: a snapshot of the note as it was created, or as it was
// just before a filing appended to it or the user edited it. Undo restores from these rows.
export const noteVersions = pgTable(
  'note_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    sortRunId: uuid('sort_run_id').references(() => sortRuns.id, { onDelete: 'set null' }),
    kind: noteVersionKindEnum('kind').notNull().default('before_edit'),
    folderId: uuid('folder_id'),
    title: text('title'),
    summary: text('summary'),
    tags: text('tags').array(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('note_versions_note_idx').on(t.noteId),
    index('note_versions_sort_run_idx').on(t.sortRunId),
  ],
);

// A deleted folder with everything it held, kept for 30 days so the deletion can be undone.
// The payload is a copy of the rows as they were; the live tables keep no deleted rows, so
// no other query has to filter them out.
export const trashItems = pgTable(
  'trash_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id').notNull(),
    parentId: uuid('parent_id'),
    name: text('name').notNull(),
    path: text('path').array().notNull(),
    noteCount: integer('note_count').notNull(),
    folderCount: integer('folder_count').notNull(),
    payload: jsonb('payload').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('trash_items_user_deleted_idx').on(t.userId, t.deletedAt.desc()),
    index('trash_items_deleted_idx').on(t.deletedAt),
  ],
);
