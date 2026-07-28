/** Format an ISO timestamp as a short local time, e.g. "14:30". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format an ISO timestamp as a readable date, e.g. "Mon, 28 Jul". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** "14:30 – 15:00" for a start/end pair. */
export function formatRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Today's date as YYYY-MM-DD in local time (for <input type="date">). */
export function todayISODate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Combine a YYYY-MM-DD date and HH:MM time into an ISO string. */
export function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

/** Format a Date as a local YYYY-MM-DD string. */
export function toISODate(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Monday of the week containing `d` (local time, at 00:00). */
export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setDate(date.getDate() - day);
  return date;
}

/** Return a new Date `n` days after `d`. */
export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

/** Short weekday label, e.g. "Mon". */
export function weekdayShort(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short' });
}

/** Current time rounded up to the next half hour, as "HH:MM". */
export function nextHalfHour(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  if (m > 30) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  } else if (m > 0) {
    d.setMinutes(30);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string for `date` + `time` + `durationMinutes`. */
export function windowEndISO(date: string, time: string, durationMinutes: number): string {
  const start = new Date(`${date}T${time}`);
  return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
}

/** True if two dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
