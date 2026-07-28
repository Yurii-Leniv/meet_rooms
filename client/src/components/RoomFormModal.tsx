import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Room } from '../api/types';
import { AMENITY_META } from '../lib/amenities';

const ALL_AMENITIES = Object.keys(AMENITY_META);

interface Props {
  room: Room | null; // null = create mode
  onClose: () => void;
}

export function RoomFormModal({ room, onClose }: Props) {
  const editing = Boolean(room);
  const queryClient = useQueryClient();

  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(room?.capacity ?? 4);
  const [floor, setFloor] = useState(room?.floor ?? 1);
  const [location, setLocation] = useState(room?.location ?? '');
  const [imageUrl, setImageUrl] = useState(room?.imageUrl ?? '');
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        capacity: Number(capacity),
        floor: Number(floor),
        location: location || null,
        imageUrl: imageUrl || null,
        amenities,
      };
      return editing
        ? api(`/rooms/${room!.id}`, { method: 'PATCH', body })
        : api('/rooms', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not save room'),
  });

  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">{editing ? 'Edit room' : 'Add a room'}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Room name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Kyiv" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Capacity</span>
              <input type="number" min={1} required value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Floor</span>
              <input type="number" required value={floor} onChange={(e) => setFloor(Number(e.target.value))} className={input} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Location (optional)</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} placeholder="e.g. North wing" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Image URL (optional)</span>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={input} placeholder="https://…" />
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Amenities</span>
            <div className="flex flex-wrap gap-2">
              {ALL_AMENITIES.map((a) => {
                const active = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={[
                      'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {AMENITY_META[a].icon} {AMENITY_META[a].label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={save.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
