import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  AuthUser,
  UserRole,
  authLogin,
  authRegister,
  authMe,
  storeAuth,
  clearAuth,
  getStoredToken,
  getStoredUser,
} from "@/services/auth";
import { clearAllKernelModeCache } from "@/contexts/KernelModeContext";
import { clearAllVenueBackgroundCaches } from "@/contexts/VenueContext";

interface AuthState {
  user:     AuthUser | null;
  token:    string | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout:   () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(getStoredUser);
  const [token,   setToken]   = useState<string | null>(getStoredToken);
  const [loading, setLoading] = useState(!!getStoredToken());

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    authMe()
      .then((u) => { setUser(u); })
      .catch(() => { clearAllKernelModeCache(); clearAllVenueBackgroundCaches(); clearAuth(); setUser(null); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await authLogin(email, password);
    storeAuth(t, u);
    setToken(t);
    setUser(u);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role?: UserRole) => {
      const { token: t, user: u } = await authRegister(name, email, password, role);
      storeAuth(t, u);
      setToken(t);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(() => {
    clearAllKernelModeCache();
    clearAllVenueBackgroundCaches();
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
