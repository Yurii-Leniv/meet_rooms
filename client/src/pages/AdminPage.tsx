import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CompanyDetails, Member, Room, RoomWithStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { RoomFormModal } from '../components/RoomFormModal';
import { amenityIcon } from '../lib/amenities';

export function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);

  const companyQuery = useQuery({
    queryKey: ['company'],
    queryFn: () => api<{ company: CompanyDetails; members: Member[] }>('/companies/me'),
    enabled: isAdmin,
  });

  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api<{ rooms: RoomWithStatus[] }>('/rooms'),
    enabled: isAdmin,
  });

  const deleteRoom = useMutation({
    mutationFn: (id: string) => api(`/rooms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const rooms = roomsQuery.data?.rooms ?? [];
  const members = companyQuery.data?.members ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Admin panel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your company’s meeting rooms, invite code, and members.
        </p>
      </div>

      <InviteCodeCard code={companyQuery.data?.company.inviteCode} />

      {/* Rooms management */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Meeting rooms</h2>
            <p className="text-sm text-slate-500">{rooms.length} room(s)</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Add room
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-slate-500">
              No rooms yet. Add your company’s meeting rooms so your team can book them.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Add your first room
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rooms.map((room) => (
              <li key={room.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold">
                    {room.name}{' '}
                    <span className="ml-1 text-sm font-normal text-slate-400">
                      Floor {room.floor} · {room.capacity} seats
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {room.location ?? '—'}{' '}
                    {room.amenities.map((a) => (
                      <span key={a} title={a} className="ml-0.5">
                        {amenityIcon(a)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(room)}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete room "${room.name}"? This also removes its bookings.`))
                        deleteRoom.mutate(room.id);
                    }}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Members ({members.length})</h2>
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-slate-500">{m.email}</div>
              </div>
              <span
                className={[
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  m.role === 'ADMIN'
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {(creating || editing) && (
        <RoomFormModal
          room={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function InviteCodeCard({ code }: { code?: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const regenerate = useMutation({
    mutationFn: () => api<{ inviteCode: string }>('/companies/regenerate-code', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company'] }),
  });

  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
      <h2 className="text-lg font-bold text-brand-900">Invite code</h2>
      <p className="mt-1 text-sm text-brand-800">
        Share this code with colleagues so they can join <b>your company</b> when they sign up.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <code className="rounded-lg border border-brand-200 bg-white px-4 py-2 font-mono text-lg font-bold tracking-widest text-brand-700">
          {code ?? '••••••••'}
        </code>
        <button
          onClick={copy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={() => {
            if (confirm('Generate a new code? The old one will stop working.'))
              regenerate.mutate();
          }}
          disabled={regenerate.isPending}
          className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
        >
          {regenerate.isPending ? 'Generating…' : 'Regenerate'}
        </button>
      </div>
    </section>
  );
}
