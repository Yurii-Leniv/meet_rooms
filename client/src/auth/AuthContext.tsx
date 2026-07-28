import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from '../api/client';
import type { AuthResponse, Company, User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  company: Company | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerCompany: (input: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    floors: number;
  }) => Promise<void>;
  joinCompany: (input: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User; company: Company }>('/auth/me')
      .then((data) => {
        setUser(data.user);
        setCompany(data.company);
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  function applyAuth(data: AuthResponse) {
    setToken(data.token);
    setUser(data.user);
    setCompany(data.company);
  }

  async function login(email: string, password: string) {
    applyAuth(
      await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      }),
    );
  }

  async function registerCompany(input: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    floors: number;
  }) {
    applyAuth(
      await api<AuthResponse>('/auth/register/company', {
        method: 'POST',
        body: input,
        auth: false,
      }),
    );
  }

  async function joinCompany(input: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
  }) {
    applyAuth(
      await api<AuthResponse>('/auth/register/join', {
        method: 'POST',
        body: input,
        auth: false,
      }),
    );
  }

  function logout() {
    setToken(null);
    setUser(null);
    setCompany(null);
  }

  const value = useMemo(
    () => ({
      user,
      company,
      loading,
      isAdmin: user?.role === 'ADMIN',
      login,
      registerCompany,
      joinCompany,
      logout,
    }),
    [user, company, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
