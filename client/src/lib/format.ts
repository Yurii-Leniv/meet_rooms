export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function todayISODate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function toISODate(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function weekdayShort(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short' });
}

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

export function windowEndISO(date: string, time: string, durationMinutes: number): string {
  const start = new Date(`${date}T${time}`);
  return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
