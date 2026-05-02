import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff, Sparkles, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/services/auth";

type Tab = "login" | "register";

interface LoginModalProps {
  onClose?: () => void;
  showClose?: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: "super_admin",    label: "Super Admin",     hint: "Full platform access"         },
  { value: "venue_owner",    label: "Venue Owner",     hint: "Manage your venue"            },
  { value: "manager",        label: "Manager",         hint: "Inventory & analytics"        },
  { value: "brand_partner",  label: "Brand Partner",   hint: "Sponsor & boost products"     },
  { value: "customer",       label: "Guest",           hint: "Recommendations only"         },
];

export function LoginModal({ onClose, showClose = true }: LoginModalProps) {
  const { login, register } = useAuth();
  const [tab,         setTab]         = useState<Tab>("login");
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [role,        setRole]        = useState<UserRole>("venue_owner");
  const [showPwd,     setShowPwd]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, hsl(22 18% 7%), hsl(22 15% 5%))",
          border: "1px solid rgba(212,175,55,0.15)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.06) inset",
        }}
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        {/* Gold shimmer top */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} style={{ color: "rgba(212,175,55,0.5)" }} />
                <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(212,175,55,0.45)" }}>Partner Access</span>
              </div>
              <h2 className="font-serif text-2xl" style={{ color: "rgba(230,210,175,0.9)", fontWeight: 300 }}>
                {tab === "login" ? "Welcome back" : "Create account"}
              </h2>
            </div>
            {showClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "rgba(180,155,100,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.7)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.4)")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-full p-0.5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["login", "register"] as Tab[]).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(null); }}
                className="flex-1 py-2 text-[10px] uppercase tracking-[0.2em] rounded-full transition-all duration-200"
                style={tab === t
                  ? { background: "rgba(212,175,55,0.14)", color: "rgba(212,175,55,0.85)", border: "1px solid rgba(212,175,55,0.28)" }
                  : { color: "rgba(180,155,100,0.45)" }
                }
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)" }}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            <AnimatePresence>
              {tab === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                >
                  <InputField label="Full Name" type="text" value={name} onChange={setName} placeholder="Your name" />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />

            {/* Password */}
            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(180,155,100,0.5)" }}>Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full pr-10 py-3 px-4 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(220,200,165,0.9)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(180,155,100,0.4)" }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role selector (register only) */}
            <AnimatePresence>
              {tab === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                >
                  <label className="block text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(180,155,100,0.5)" }}>Role</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ROLE_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                        style={role === opt.value
                          ? { background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
                        }>
                        <span className="text-xs font-serif" style={{ color: role === opt.value ? "rgba(230,210,175,0.9)" : "rgba(200,180,145,0.6)" }}>{opt.label}</span>
                        <span className="text-[9px]" style={{ color: "rgba(180,155,100,0.35)" }}>{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[8px]" style={{ color: "rgba(180,155,100,0.3)" }}>
                    The first registered account becomes Super Admin automatically.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit" disabled={submitting}
              className="w-full py-3.5 mt-2 font-serif text-base uppercase tracking-[0.2em] rounded-xl relative overflow-hidden"
              style={{
                background: submitting
                  ? "rgba(212,175,55,0.15)"
                  : "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                color: submitting ? "rgba(212,175,55,0.6)" : "hsl(22 18% 6%)",
              }}
              whileHover={!submitting ? { scale: 1.01 } : {}}
              whileTap={!submitting ? { scale: 0.99 } : {}}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span className="inline-block w-4 h-4 border-2 rounded-full"
                    style={{ borderColor: "rgba(212,175,55,0.4)", borderTopColor: "rgba(212,175,55,0.8)" }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  {tab === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={14} />
                  {tab === "login" ? "Sign In" : "Create Account"}
                </span>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InputField({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: "rgba(180,155,100,0.5)" }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required
        className="w-full py-3 px-4 rounded-xl text-sm outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(220,200,165,0.9)" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)")}
        onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
      />
    </div>
  );
}
