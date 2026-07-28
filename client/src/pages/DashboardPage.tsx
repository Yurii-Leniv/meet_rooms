import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { RoomWithStatus } from '../api/types';
import { RoomCard } from '../components/RoomCard';

type Filter = 'all' | 'free' | 'busy';

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api<{ rooms: RoomWithStatus[]; at: string }>('/rooms'),
    refetchInterval: 30_000, // keep live status fresh
  });

  const rooms = data?.rooms ?? [];
  const freeCount = rooms.filter((r) => !r.busy).length;

  const visible = useMemo(() => {
    return rooms.filter((room) => {
      if (filter === 'free' && room.busy) return false;
      if (filter === 'busy' && !room.busy) return false;
      if (search && !room.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rooms, filter, search]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Meeting rooms</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLoading
              ? 'Loading rooms…'
              : `${freeCount} of ${rooms.length} rooms are free right now`}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms…"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {(['all', 'free', 'busy'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          Failed to load rooms: {(error as Error).message}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No rooms match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
