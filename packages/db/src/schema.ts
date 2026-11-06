import {
  type AnyPgColumn,
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
]);
export const sortRunStatusEnum = pgEnum('sort_run_status', [
  'proposed',
  'applied',
  'rejected',
  'undone',
]);

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
  (t) => [unique('folders_name_unique').on(t.userId, t.parentId, t.name).nullsNotDistinct()],
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
    ...timestamps,
  },
  (t) => [index('notes_user_folder_idx').on(t.userId, t.folderId)],
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
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    undoneAt: timestamp('undone_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('sort_runs_entry_idx').on(t.entryId)],
);

// One row per content change, so applying a sort run can be undone.
export const noteVersions = pgTable(
  'note_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    sortRunId: uuid('sort_run_id').references(() => sortRuns.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('note_versions_note_idx').on(t.noteId)],
);
