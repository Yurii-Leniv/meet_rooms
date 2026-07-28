import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Room } from '../api/types';
import { useAuth } from '../auth/AuthContext';

interface RoomDraft {
  name: string;
  floor: number;
}

export function SetupPage() {
  const { user, company, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const floors = company?.floors ?? 1;

  const [drafts, setDrafts] = useState<RoomDraft[]>([
    { name: '', floor: 1 },
    { name: '', floor: 1 },
    { name: '', floor: 1 },
  ]);
  const [step, setStep] = useState<'rooms' | 'done'>('rooms');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const save = useMutation({
    mutationFn: (rooms: RoomDraft[]) =>
      api<{ rooms: Room[] }>('/rooms/bulk', { method: 'POST', body: { rooms } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setStep('done');
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not save rooms'),
  });

  if (loading) return <div className="p-10 text-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  function updateDraft(i: number, patch: Partial<RoomDraft>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function addRow() {
    setDrafts((prev) => [...prev, { name: '', floor: 1 }]);
  }
  function removeRow(i: number) {
    setDrafts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    setError(null);
    const filled = drafts
      .map((d) => ({ name: d.name.trim(), floor: d.floor }))
      .filter((d) => d.name.length > 0);
    if (filled.length === 0) {
      setError('Add at least one room, or skip for now.');
      return;
    }
    save.mutate(filled);
  }

  async function copyCode() {
    if (!company?.inviteCode) return;
    await navigator.clipboard.writeText(company.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🏢</div>
          <h1 className="text-2xl font-extrabold">
            Welcome to Meet<span className="text-brand-600">Rooms</span>
          </h1>
          <p className="mt-1 text-slate-500">
            {step === 'rooms'
              ? `Let’s add the meeting rooms in ${company?.name ?? 'your office'}.`
              : 'You’re all set!'}
          </p>
        </div>

        {step === 'rooms' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your meeting rooms</h2>
              <span className="text-sm text-slate-400">
                {floors > 1 ? `${floors} floors` : 'Single floor'}
              </span>
            </div>

            <div
              className={`mb-1 grid gap-2 px-1 text-xs font-medium text-slate-400 ${
                floors > 1 ? 'grid-cols-[1fr_120px_40px]' : 'grid-cols-[1fr_40px]'
              }`}
            >
              <span>Room name</span>
              {floors > 1 && <span>Floor</span>}
              <span />
            </div>

            <div className="space-y-2">
              {drafts.map((draft, i) => (
                <div
                  key={i}
                  className={`grid gap-2 ${
                    floors > 1 ? 'grid-cols-[1fr_120px_40px]' : 'grid-cols-[1fr_40px]'
                  }`}
                >
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(i, { name: e.target.value })}
                    placeholder={`e.g. Focus Room ${i + 1}`}
                    className={inputClass}
                  />
                  {floors > 1 && (
                    <select
                      value={draft.floor}
                      onChange={(e) => updateDraft(i, { floor: Number(e.target.value) })}
                      className={inputClass}
                    >
                      {Array.from({ length: floors }, (_, f) => f + 1).map((f) => (
                        <option key={f} value={f}>
                          Floor {f}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={drafts.length === 1}
                    className="rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-30"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              + Add another room
            </button>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={save.isPending}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {save.isPending ? 'Saving…' : 'Save rooms'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-3xl">🎉</div>
            <h2 className="text-lg font-bold">Rooms added!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Share this invite code with your colleagues so they can join{' '}
              {company?.name} and book rooms.
            </p>

            <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2">
              <code className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 font-mono text-lg font-bold tracking-widest text-brand-700">
                {company?.inviteCode ?? '—'}
              </code>
              <button
                onClick={copyCode}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-6 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
