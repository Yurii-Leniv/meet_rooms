import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Booking } from '../api/types';
import { addDays, formatRange, isSameDay, toISODate, weekdayShort } from '../lib/format';

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_PX = 48;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

interface Props {
  roomId: string;
  weekStart: Date;
  currentUserId?: string;
  onSlotClick: (dayISO: string, hour: number) => void;
}

export function WeekCalendar({ roomId, weekStart, currentUserId, onSlotClick }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = toISODate(weekStart);
  const to = toISODate(addDays(weekStart, 7));

  const { data, isLoading } = useQuery({
    queryKey: ['room-week', roomId, from],
    queryFn: () =>
      api<{ bookings: Booking[] }>(`/rooms/${roomId}/bookings?from=${from}&to=${to}`),
  });

  const bookings = data?.bookings ?? [];
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200">
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className="px-1 py-2 text-center">
                <div className="text-xs font-medium text-slate-400">{weekdayShort(day)}</div>
                <div
                  className={[
                    'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    isToday ? 'bg-brand-600 text-white' : 'text-slate-700',
                  ].join(' ')}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative grid grid-cols-[56px_repeat(7,1fr)]">
          <div>
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 right-2 text-xs text-slate-400">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayISO = toISODate(day);
            const dayBookings = bookings.filter((b) =>
              isSameDay(new Date(b.startTime), day),
            );
            return (
              <div key={dayISO} className="relative border-l border-slate-100">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onSlotClick(dayISO, h)}
                    className="block w-full border-b border-slate-100 hover:bg-brand-50/60"
                    style={{ height: HOUR_PX }}
                    title={`Book ${dayISO} at ${String(h).padStart(2, '0')}:00`}
                  />
                ))}

                {dayBookings.map((b) => {
                  const style = blockStyle(b);
                  if (!style) return null;
                  const mine = b.userId === currentUserId;
                  return (
                    <div
                      key={b.id}
                      className={[
                        'absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight shadow-sm',
                        mine
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-200 text-slate-700',
                      ].join(' ')}
                      style={style}
                      title={`${b.title} · ${formatRange(b.startTime, b.endTime)} · ${b.user?.name ?? ''}`}
                    >
                      <div className="font-semibold">{b.title}</div>
                      <div className="opacity-80">{formatRange(b.startTime, b.endTime)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {isLoading && (
          <p className="py-4 text-center text-sm text-slate-400">Loading week…</p>
        )}
      </div>
    </div>
  );
}

function blockStyle(b: Booking): { top: number; height: number } | null {
  const start = new Date(b.startTime);
  const end = new Date(b.endTime);

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const windowStart = START_HOUR * 60;
  const windowEnd = END_HOUR * 60;

  const clampedStart = Math.max(startMin, windowStart);
  const clampedEnd = Math.min(endMin <= startMin ? windowEnd : endMin, windowEnd);
  if (clampedEnd <= clampedStart) return null;

  const top = ((clampedStart - windowStart) / 60) * HOUR_PX;
  const height = ((clampedEnd - clampedStart) / 60) * HOUR_PX - 2;
  return { top, height: Math.max(height, 16) };
}
