import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '../services/api';
import { authService, type Credentials } from '../services/auth.service';
import type { User } from '../types/models';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (data: Credentials & { name: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaura la sesión a partir de la cookie httpOnly al cargar la app.
    let cancelled = false;
    authService
      .me()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        // 401 es lo esperado cuando no hay sesión; cualquier otro error se registra.
        if (!(err instanceof ApiError) || err.status !== 401) console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    setUser(await authService.login(credentials));
  }, []);

  const register = useCallback(async (data: Credentials & { name: string }) => {
    setUser(await authService.register(data));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
