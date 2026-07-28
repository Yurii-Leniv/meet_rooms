import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { AuthShell, Field, inputClass, primaryButtonClass } from './LoginPage';

type Mode = 'create' | 'join';

export function RegisterPage() {
  const { user, registerCompany, joinCompany } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('create');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [floors, setFloors] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await registerCompany({ name, email, password, companyName, floors });
        navigate('/setup', { replace: true });
      } else {
        await joinCompany({ name, email, password, inviteCode });
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register your company or join an existing one."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <TabButton active={mode === 'create'} onClick={() => setMode('create')}>
          🏢 Create company
        </TabButton>
        <TabButton active={mode === 'join'} onClick={() => setMode('join')}>
          🔑 Join with code
        </TabButton>
      </div>

      <p className="mb-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
        {mode === 'create'
          ? 'You’ll become the admin of a new company and can set up its meeting rooms and invite colleagues.'
          : 'Enter the invite code your company admin shared with you to join their workspace.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Jane Doe"
          />
        </Field>

        {mode === 'create' ? (
          <>
            <Field label="Company name">
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="How many floors does your office have?">
              <input
                type="number"
                required
                min={1}
                max={200}
                value={floors}
                onChange={(e) => setFloors(Math.max(1, Number(e.target.value)))}
                className={inputClass}
              />
            </Field>
          </>
        ) : (
          <Field label="Invite code">
            <input
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className={`${inputClass} font-mono tracking-wider`}
              placeholder="ACME-7X4K2"
            />
          </Field>
        )}

        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 8 characters"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting
            ? 'Please wait…'
            : mode === 'create'
              ? 'Create company & account'
              : 'Join company'}
        </button>
      </form>
    </AuthShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg py-2 text-sm font-semibold transition-colors',
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
