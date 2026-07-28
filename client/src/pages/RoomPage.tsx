import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Booking, Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { WeekCalendar } from '../components/WeekCalendar';
import { amenityIcon, amenityLabel } from '../lib/amenities';
import {
  addDays,
  formatRange,
  startOfWeek,
  todayISODate,
  toISO,
} from '../lib/format';

interface RoomDayResponse {
  room: Room;
  date: string;
  bookings: Booking[];
}

type View = 'day' | 'week';

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user, company } = useAuth();
  const floors = company?.floors ?? 1;
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>('day');
  const [date, setDate] = useState(todayISODate());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  // Booking-form fields live here so the week grid can prefill them.
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['room', id, date],
    queryFn: () => api<RoomDayResponse>(`/rooms/${id}?date=${date}`),
    enabled: Boolean(id),
  });

  const cancel = useMutation({
    mutationFn: (bookingId: string) =>
      api(`/bookings/${bookingId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      queryClient.invalidateQueries({ queryKey: ['room-week', id] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  function handleSlotClick(dayISO: string, hour: number) {
    setDate(dayISO);
    setStart(`${String(hour).padStart(2, '0')}:00`);
    setEnd(`${String(hour + 1).padStart(2, '0')}:00`);
  }

  if (isLoading) return <div className="text-slate-400">Loading room…</div>;
  if (isError || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        Room not found.{' '}
        <Link to="/" className="font-semibold underline">
          Back to rooms
        </Link>
      </div>
    );
  }

  const { room, bookings } = data;

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← All rooms
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2">
          {/* Room info */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {room.imageUrl && (
              <img src={room.imageUrl} alt={room.name} className="h-56 w-full object-cover" />
            )}
            <div className="p-6">
              <h1 className="text-2xl font-extrabold">{room.name}</h1>
              <p className="mt-1 text-slate-500">
                👥 {room.capacity} seats
                {floors > 1 ? ` · Floor ${room.floor}` : ''}
                {room.location ? ` · ${room.location}` : ''}
              </p>
              {room.amenities.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {room.amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                    >
                      <span>{amenityIcon(a)}</span>
                      {amenityLabel(a)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Schedule</h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                  {(['day', 'week'] as View[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={[
                        'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
                        view === v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {view === 'day' ? (
              <DayView
                date={date}
                setDate={setDate}
                bookings={bookings}
                userId={user?.id}
                isAdmin={user?.role === 'ADMIN'}
                onCancel={(bid) => cancel.mutate(bid)}
                cancelPending={cancel.isPending}
              />
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-600">
                    {weekStart.toLocaleDateString([], { day: 'numeric', month: 'short' })} –{' '}
                    {addDays(weekStart, 6).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex gap-1">
                    <NavBtn onClick={() => setWeekStart(addDays(weekStart, -7))}>←</NavBtn>
                    <NavBtn onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</NavBtn>
                    <NavBtn onClick={() => setWeekStart(addDays(weekStart, 7))}>→</NavBtn>
                  </div>
                </div>
                <WeekCalendar
                  roomId={room.id}
                  weekStart={weekStart}
                  currentUserId={user?.id}
                  onSlotClick={handleSlotClick}
                />
                <p className="mt-3 text-center text-xs text-slate-400">
                  Click a time slot to pre-fill the booking form →
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Booking form */}
        <div className="lg:col-span-1">
          <BookingForm
            roomId={room.id}
            date={date}
            title={title}
            setTitle={setTitle}
            start={start}
            setStart={setStart}
            end={end}
            setEnd={setEnd}
          />
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function DayView({
  date,
  setDate,
  bookings,
  userId,
  isAdmin,
  onCancel,
  cancelPending,
}: {
  date: string;
  setDate: (d: string) => void;
  bookings: Booking[];
  userId?: string;
  isAdmin: boolean;
  onCancel: (id: string) => void;
  cancelPending: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <input
          type="date"
          value={date}
          min={todayISODate()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
        />
      </div>
      {bookings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No bookings for this day — the room is all yours. 🎉
        </p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => {
            const mine = b.userId === userId;
            const canCancel = mine || isAdmin;
            return (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-sm font-semibold text-brand-700">
                    {formatRange(b.startTime, b.endTime)}
                  </div>
                  <div>
                    <div className="font-medium">{b.title}</div>
                    <div className="text-xs text-slate-500">
                      {b.user?.name}
                      {mine && ' · you'}
                    </div>
                  </div>
                </div>
                {canCancel && (
                  <button
                    onClick={() => onCancel(b.id)}
                    disabled={cancelPending}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BookingForm({
  roomId,
  date,
  title,
  setTitle,
  start,
  setStart,
  end,
  setEnd,
}: {
  roomId: string;
  date: string;
  title: string;
  setTitle: (v: string) => void;
  start: string;
  setStart: (v: string) => void;
  end: string;
  setEnd: (v: string) => void;
}) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api<{ booking: Booking }>('/bookings', {
        method: 'POST',
        body: {
          roomId,
          title,
          startTime: toISO(date, start),
          endTime: toISO(date, end),
        },
      }),
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Booked! 🎉' });
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-week', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (err) =>
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Could not create booking',
      }),
  });

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  const prettyDate = new Date(`${date}T00:00`).toLocaleDateString([], { dateStyle: 'full' });

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">Book this room</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">For {prettyDate}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFeedback(null);
          create.mutate();
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Meeting title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint planning"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Start</span>
            <input type="time" required value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">End</span>
            <input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          </label>
        </div>

        {feedback && (
          <p
            className={
              feedback.type === 'ok'
                ? 'rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700'
                : 'rounded-lg bg-red-50 p-2.5 text-sm text-red-600'
            }
          >
            {feedback.text}
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {create.isPending ? 'Booking…' : 'Book room'}
        </button>
      </form>
    </div>
  );
}
