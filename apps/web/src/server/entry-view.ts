import type { Entry, EntryStatus } from '@palanotes/db';

export interface EntryView {
  id: string;
  preview: string;
  status: EntryStatus;
  createdAt: string;
}

const PREVIEW_LENGTH = 140;

export function previewOf(content: string): string {
  const line =
    content
      .split('\n')
      .map((text) => text.replace(/^\s*(#{1,6}\s+|[-*+]\s+|>\s*|\d+\.\s+)/, '').trim())
      .find((text) => text.length > 0) ?? '';
  return line.length > PREVIEW_LENGTH ? `${line.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : line;
}

export function toEntryView(entry: Entry): EntryView {
  return {
    id: entry.id,
    preview: previewOf(entry.content),
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
  };
}
