import { createContext, useContext, useState, type ReactNode } from "react";

export type UserRole = "DEVELOPER" | "MANAGEMENT" | "STAFF";

interface UserCredential { pin: string; role: UserRole; name: string; }

interface SecurityContextType {
  isAuthenticated:  boolean;
  currentRole:      UserRole | null;
  currentUser:      string | null;
  loginWithPin:     (pin: string) => boolean;
  registerNewPin:   (pin: string, role: UserRole, name: string) => void;
  logout:           () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

function playClick() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(3400, ctx.currentTime);
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.08);
  } catch { /* audio unavailable */ }
}

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole,     setCurrentRole]     = useState<UserRole | null>(null);
  const [currentUser,     setCurrentUser]     = useState<string | null>(null);
  const [credentials,     setCredentials]     = useState<UserCredential[]>([
    { pin: "7777", role: "DEVELOPER",  name: "Root Developer"    },
    { pin: "1111", role: "MANAGEMENT", name: "Manager Console"   },
    { pin: "2222", role: "STAFF",      name: "Lounge Floor Staff" },
    { pin: "2501", role: "DEVELOPER",  name: "Dev Override"      },
  ]);

  function loginWithPin(pin: string): boolean {
    playClick();
    const match = credentials.find(c => c.pin === pin);
    if (match) {
      setIsAuthenticated(true);
      setCurrentRole(match.role);
      setCurrentUser(match.name);
      localStorage.setItem("axiom_token", `dev_token_${pin}`);
      return true;
    }
    return false;
  }

  function registerNewPin(pin: string, role: UserRole, name: string) {
    playClick();
    setCredentials(prev => [...prev.filter(c => c.pin !== pin), { pin, role, name }]);
  }

  function logout() {
    setIsAuthenticated(false);
    setCurrentRole(null);
    setCurrentUser(null);
    localStorage.removeItem("axiom_token");
  }

  return (
    <SecurityContext.Provider value={{ isAuthenticated, currentRole, currentUser, loginWithPin, registerNewPin, logout }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity must be inside SecurityProvider");
  return ctx;
}
