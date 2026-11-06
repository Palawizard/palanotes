import type { EntryStatus } from '@palanotes/db';

export const STATUS_LABELS: Record<EntryStatus, string> = {
  pending: 'En attente',
  processing: 'Rangement…',
  proposed: 'À valider',
  applied: 'Rangée',
  failed: 'Échec',
  rejected: 'Refusée',
};

// Each status has its own shape, so it reads without relying on colour.
export function StatusMark({ status }: { status: EntryStatus }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      {status === 'pending' ? (
        <circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      ) : null}
      {status === 'processing' ? (
        <circle
          className="mark-spin"
          cx="7"
          cy="7"
          r="5.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 2.5"
        />
      ) : null}
      {status === 'proposed' ? (
        <>
          <circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 1.75a5.25 5.25 0 0 1 0 10.5z" fill="currentColor" />
        </>
      ) : null}
      {status === 'applied' ? (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d="M4.25 7.25 6.1 9l3.65-3.9"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {status === 'rejected' ? (
        <>
          <circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : null}
      {status === 'failed' ? (
        <>
          <circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 10.5 10.5 3.5" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : null}
    </svg>
  );
}
