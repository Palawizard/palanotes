export const QUEUES = {
  sortEntry: 'sort-entry',
} as const;

export interface SortEntryJob {
  entryId: string;
}

export const ENTRY_MAX_LENGTH = 20_000;
