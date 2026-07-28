import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Booking } from '../api/types';
import { formatDate, formatRange } from '../lib/format';

export function MyBookingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api<{ bookings: Booking[] }>('/bookings/mine'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/bookings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const bookings = data?.bookings ?? [];
  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.endTime).getTime() >= now);
  const past = bookings.filter((b) => new Date(b.endTime).getTime() < now);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">My bookings</h1>

      {isLoading ? (
        <p className="text-slate-400">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">You have no bookings yet.</p>
          <Link
            to="/"
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Find a room
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="Upcoming" bookings={upcoming} onCancel={(id) => cancel.mutate(id)} cancelable />
          <Section title="Past" bookings={past} onCancel={() => {}} cancelable={false} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  bookings,
  onCancel,
  cancelable,
}: {
  title: string;
  bookings: Booking[];
  onCancel: (id: string) => void;
  cancelable: boolean;
}) {
  if (bookings.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <ul className="space-y-3">
        {bookings.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <span className="text-[10px] font-semibold uppercase">
                  {new Date(b.startTime).toLocaleDateString([], { month: 'short' })}
                </span>
                <span className="text-lg font-bold leading-none">
                  {new Date(b.startTime).getDate()}
                </span>
              </div>
              <div>
                <div className="font-semibold">{b.title}</div>
                <div className="text-sm text-slate-500">
                  {b.room ? (
                    <Link to={`/rooms/${b.room.id}`} className="text-brand-600 hover:underline">
                      {b.room.name}
                    </Link>
                  ) : (
                    'Room'
                  )}{' '}
                  · {formatDate(b.startTime)} · {formatRange(b.startTime, b.endTime)}
                </div>
              </div>
            </div>
            {cancelable && (
              <button
                onClick={() => onCancel(b.id)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
