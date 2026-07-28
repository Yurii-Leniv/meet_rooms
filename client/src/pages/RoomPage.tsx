import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Booking, Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { amenityIcon, amenityLabel } from '../lib/amenities';
import { formatRange, todayISODate, toISO } from '../lib/format';

interface RoomDayResponse {
  room: Room;
  date: string;
  bookings: Booking[];
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayISODate());

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
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  if (isLoading) {
    return <div className="text-slate-400">Loading room…</div>;
  }
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
        {/* Room info */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {room.imageUrl && (
              <img src={room.imageUrl} alt={room.name} className="h-56 w-full object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold">{room.name}</h1>
                  <p className="mt-1 text-slate-500">
                    👥 {room.capacity} seats · Floor {room.floor}
                    {room.location ? ` · ${room.location}` : ''}
                  </p>
                </div>
              </div>

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

          {/* Timeline */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Schedule</h2>
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
                  const mine = b.userId === user?.id;
                  const canCancel = mine || user?.role === 'ADMIN';
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
                          onClick={() => cancel.mutate(b.id)}
                          disabled={cancel.isPending}
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
        </div>

        {/* Booking form */}
        <div className="lg:col-span-1">
          <BookingForm roomId={room.id} date={date} />
        </div>
      </div>
    </div>
  );
}

function BookingForm({ roomId, date }: { roomId: string; date: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

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
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Could not create booking',
      });
    },
  });

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">Book this room</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        For {new Date(`${date}T00:00`).toLocaleDateString([], { dateStyle: 'full' })}
      </p>

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
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">End</span>
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={inputClass}
            />
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
