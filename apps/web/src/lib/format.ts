const TIME_ZONE = 'Europe/Paris';

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});
const dayKey = new Intl.DateTimeFormat('fr-CA', { timeZone: TIME_ZONE });

// A fixed time zone keeps server and browser output identical, so hydration matches.
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = timeFormat.format(date);
  return dayKey.format(date) === dayKey.format(now) ? time : `${dayFormat.format(date)} ${time}`;
}
