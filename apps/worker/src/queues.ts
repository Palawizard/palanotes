export const QUEUES = {
  sortEntry: 'sort-entry',
} as const;

export interface SortEntryJob {
  entryId: string;
}
