import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { AvailabilityRoom } from '../api/types';
import { formatRange } from '../lib/format';

interface Props {
  room: AvailabilityRoom;
  fromISO: string;
  toISO: string;
  onClose: () => void;
  onBooked: () => void;
}

export function QuickBookModal({ room, fromISO, toISO, onClose, onBooked }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const book = useMutation({
    mutationFn: () =>
      api('/bookings', {
        method: 'POST',
        body: { roomId: room.id, title, startTime: fromISO, endTime: toISO },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      onBooked();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not book the room'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    book.mutate();
  }

  const when = new Date(fromISO).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Book {room.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {when} · {formatRange(fromISO, toISO)}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Meeting title
            </span>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 1:1 with Alex"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={book.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {book.isPending ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
