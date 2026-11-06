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
const dayYearFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const fullFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const dayKey = new Intl.DateTimeFormat('fr-CA', { timeZone: TIME_ZONE });
const yearKey = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: TIME_ZONE });

const DAY = 86_400_000;

// A fixed time zone keeps server and browser output identical, so hydration matches.
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = timeFormat.format(date);
  return dayKey.format(date) === dayKey.format(now) ? time : `${formatDay(iso, now)} ${time}`;
}

// Short date for lists: the year only when it is not the current one, so a note from
// last November never reads like one from this week.
export function formatDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  return yearKey.format(date) === yearKey.format(now)
    ? dayFormat.format(date)
    : dayYearFormat.format(date);
}

// Compact date for dense rows: the time today, « hier », then the day.
export function formatShort(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) {
    return timeFormat.format(date);
  }
  if (key === dayKey.format(new Date(now.getTime() - DAY))) {
    return 'hier';
  }
  return formatDay(iso, now);
}

// Full wording for tooltips and screen readers.
export function formatFull(iso: string): string {
  return fullFormat.format(new Date(iso));
}
