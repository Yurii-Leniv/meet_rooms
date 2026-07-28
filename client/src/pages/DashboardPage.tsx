import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AvailabilityRoom } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { QuickBookModal } from '../components/QuickBookModal';
import { amenityIcon, amenityLabel } from '../lib/amenities';
import { formatTime, nextHalfHour, todayISODate, toISO, windowEndISO } from '../lib/format';

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
];

export function DashboardPage() {
  const { company } = useAuth();
  const floors = company?.floors ?? 1;

  const [date, setDate] = useState(todayISODate());
  const [start, setStart] = useState(nextHalfHour());
  const [duration, setDuration] = useState(60);
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [booking, setBooking] = useState<AvailabilityRoom | null>(null);

  const fromISO = toISO(date, start);
  const toISOEnd = windowEndISO(date, start, duration);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['availability', fromISO, toISOEnd],
    queryFn: () =>
      api<{ rooms: AvailabilityRoom[] }>(
        `/rooms/availability?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISOEnd)}`,
      ),
    refetchInterval: 30_000,
  });

  const rooms = data?.rooms ?? [];

  const visible = useMemo(
    () => rooms.filter((r) => floorFilter === 'all' || r.floor === floorFilter),
    [rooms, floorFilter],
  );
  const available = visible.filter((r) => r.available);
  const busy = visible.filter((r) => !r.available);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Find a room</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a day and time — we’ll show which rooms are free.
        </p>
      </div>

      {/* Search controls */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Day</span>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            className={controlClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Start</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={controlClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Duration</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={controlClass}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        {floors > 1 && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Floor</span>
            <select
              value={floorFilter}
              onChange={(e) =>
                setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className={controlClass}
            >
              <option value="all">All floors</option>
              {Array.from({ length: floors }, (_, f) => f + 1).map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-auto text-sm text-slate-500">
          {!isLoading && (
            <span>
              <b className="text-emerald-600">{available.length}</b> free ·{' '}
              {formatTime(fromISO)}–{formatTime(toISOEnd)}
            </span>
          )}
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          Failed to load rooms: {(error as Error).message}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyRooms />
      ) : (
        <div className="space-y-8">
          <Section title={`Available (${available.length})`}>
            {available.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No rooms are free for this slot. Try another time or a shorter duration.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((room) => (
                  <RoomResultCard
                    key={room.id}
                    room={room}
                    floors={floors}
                    onBook={() => setBooking(room)}
                  />
                ))}
              </div>
            )}
          </Section>

          {busy.length > 0 && (
            <Section title={`Busy (${busy.length})`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {busy.map((room) => (
                  <RoomResultCard key={room.id} room={room} floors={floors} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {booking && (
        <QuickBookModal
          room={booking}
          fromISO={fromISO}
          toISO={toISOEnd}
          onClose={() => setBooking(null)}
          onBooked={() => setBooking(null)}
        />
      )}
    </div>
  );
}

const controlClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

function RoomResultCard({
  room,
  floors,
  onBook,
}: {
  room: AvailabilityRoom;
  floors: number;
  onBook?: () => void;
}) {
  return (
    <div
      className={[
        'flex flex-col rounded-2xl border bg-white p-4 shadow-sm',
        room.available ? 'border-slate-200' : 'border-slate-200 opacity-75',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/rooms/${room.id}`} className="text-lg font-bold hover:text-brand-700">
            {room.name}
          </Link>
          <p className="mt-0.5 text-sm text-slate-500">
            👥 {room.capacity}
            {floors > 1 ? ` · Floor ${room.floor}` : ''}
          </p>
        </div>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            room.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
          ].join(' ')}
        >
          {room.available ? 'Free' : 'Busy'}
        </span>
      </div>

      {room.amenities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {room.amenities.map((a) => (
            <span
              key={a}
              title={amenityLabel(a)}
              className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
            >
              {amenityIcon(a)} {amenityLabel(a)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        {room.available ? (
          <button
            onClick={onBook}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Book this slot
          </button>
        ) : (
          <p className="text-sm text-slate-500">
            Busy: {room.conflict?.title}
            {room.conflict ? ` (until ${formatTime(room.conflict.endTime)})` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyRooms() {
  const { isAdmin } = useAuth();
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
      <div className="mb-3 text-4xl">🗂️</div>
      {isAdmin ? (
        <>
          <p className="text-slate-600">
            Your company has no meeting rooms yet. Add them so your team can start booking.
          </p>
          <Link
            to="/setup"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Set up rooms
          </Link>
        </>
      ) : (
        <p className="text-slate-600">
          No meeting rooms yet. Ask your company admin to add them.
        </p>
      )}
    </div>
  );
}
