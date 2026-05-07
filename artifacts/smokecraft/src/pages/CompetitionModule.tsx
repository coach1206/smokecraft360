/**
 * CompetitionModule — live, daily, weekly, venue, and grand craft tournaments.
 * Route: /competition
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Zap, Calendar, Users,
  ChevronRight, Medal, Crown, Star, RefreshCw, BarChart2, MapPin, Plus, X,
} from "lucide-react";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { useVenueContext } from "@/contexts/VenueContext";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/services/auth";
import { socket } from "@/lib/socket";

// ── Types ─────────────────────────────────────────────────────────────────────

type TournamentType = "live" | "daily" | "weekly" | "venue" | "grand";
type TournamentStatus = "upcoming" | "active" | "scoring" | "completed" | "cancelled";

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  type: TournamentType;
  craftType: string | null;
  status: TournamentStatus;
  startAt: string;
  endAt: string;
  maxEntrants: number | null;
  prizeFirst: string | null;
  prizeSecond: string | null;
  prizeThird: string | null;
  featured: boolean;
  entrantCount: number;
  isEntered:   boolean;
  userEntryId: string | null;
  userScore:   number | null;
  userRank:    number | null;
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string | null;
  score: number;
  rank: number | null;
  joinedAt: string;
}

interface CraftLeaderEntry {
  rank: number;
  name: string;
  score: number;
  craft: string;
}

interface LoungeEntry {
  loungeId: string | null;
  loungeName: string;
  score: number;
  rank: number;
  isSelf: boolean;
}

interface LiveContext {
  craftLeaderboard: CraftLeaderEntry[];
  loungeLeague: LoungeEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<TournamentType, { label: string; color: string; icon: React.FC<{ size?: number; color?: string }> }> = {
  live:    { label: "Live Sprint",  color: "#ef4444", icon: Zap },
  daily:   { label: "Daily",        color: "#f59e0b", icon: Calendar },
  weekly:  { label: "Weekly",       color: "#8b5cf6", icon: Trophy },
  venue:   { label: "Venue Champ",  color: "#06b6d4", icon: Star },
  grand:   { label: "Grand Master", color: "#D48B00", icon: Crown },
};

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    credentials: "include",
    ...opts,
    headers: {
      ...getAuthHeaders(),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(endAt: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endAt).getTime() - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, new Date(endAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  const s = Math.floor(remaining / 1000);
  const days    = Math.floor(s / 86400);
  const hours   = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  return { days, hours, minutes, seconds, expired: remaining === 0 };
}

// ── Countdown Display ─────────────────────────────────────────────────────────

function CountdownDisplay({ endAt, color }: { endAt: string; color: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(endAt);

  if (expired) return <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>ENDED</span>;

  const parts = days > 0
    ? [{ v: days, l: "d" }, { v: hours, l: "h" }, { v: minutes, l: "m" }]
    : [{ v: hours, l: "h" }, { v: minutes, l: "m" }, { v: seconds, l: "s" }];

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      {parts.map(({ v, l }) => (
        <span key={l} style={{ fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color }}>{String(v).padStart(2, "0")}</span>
          <span style={{ fontSize: 11, color: "rgba(26,26,27,0.44)", marginLeft: 2 }}>{l}</span>
        </span>
      ))}
    </div>
  );
}

// ── Rank Badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = { 1: "#D48B00", 2: "#9ca3af", 3: "#b87333" };
  const c = colors[rank] ?? "rgba(26,26,27,0.30)";
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", background: `${c}20`,
      border: `2px solid ${c}`, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}>
      {rank <= 3
        ? <Medal size={14} color={c} />
        : <span style={{ fontSize: 11, fontWeight: 700, color: c }}>#{rank}</span>}
    </div>
  );
}

// ── Tournament Card ───────────────────────────────────────────────────────────

function TournamentCard({
  tournament,
  onSelect,
}: {
  tournament: Tournament;
  onSelect: (t: Tournament) => void;
}) {
  const meta = TYPE_META[tournament.type];
  const Icon = meta.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(tournament)}
      style={{
        display: "flex", flexDirection: "column", gap: 12,
        padding: 20, borderRadius: 16, textAlign: "left",
        background: tournament.isEntered ? `${meta.color}12` : `${meta.color}08`,
        border: tournament.isEntered ? `1.5px solid ${meta.color}70` : `1px solid ${meta.color}35`,
        cursor: "pointer", width: "100%",
        position: "relative", overflow: "hidden",
      }}
    >
      {tournament.isEntered && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
          color: "#22c55e", background: "rgba(34,197,94,0.12)",
          border: "1px solid rgba(34,197,94,0.35)", padding: "2px 8px", borderRadius: 999,
        }}>
          <span style={{ fontSize: 8 }}>✓</span> You&apos;re In
        </div>
      )}
      {!tournament.isEntered && tournament.featured && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
          color: meta.color, background: `${meta.color}18`,
          border: `1px solid ${meta.color}35`, padding: "2px 8px", borderRadius: 999,
        }}>Featured</div>
      )}
      {tournament.isEntered && tournament.featured && (
        <div style={{
          position: "absolute", top: 30, right: 12,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
          color: meta.color, background: `${meta.color}18`,
          border: `1px solid ${meta.color}35`, padding: "2px 8px", borderRadius: 999,
        }}>Featured</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={20} color={meta.color} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1B", marginBottom: 2 }}>
            {tournament.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              color: meta.color, background: `${meta.color}18`,
              border: `1px solid ${meta.color}30`, padding: "1px 7px", borderRadius: 999,
            }}>{meta.label}</span>
            {tournament.craftType && (
              <span style={{ fontSize: 10, color: "rgba(26,26,27,0.40)", textTransform: "capitalize" }}>
                · {tournament.craftType}
              </span>
            )}
          </div>
        </div>
      </div>

      {tournament.description && (
        <div style={{ fontSize: 12, color: "rgba(26,26,27,0.52)", lineHeight: 1.5 }}>
          {tournament.description}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Time Remaining
          </div>
          <CountdownDisplay endAt={tournament.endAt} color={meta.color} />
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            <Users size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />
            Entrants
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1B" }}>
            {tournament.entrantCount}
          </div>
        </div>
      </div>

      {tournament.isEntered && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "7px 12px", borderRadius: 10,
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
        }}>
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ You&apos;re in</span>
          {tournament.userRank !== null && (
            <span style={{ fontSize: 11, color: "rgba(26,26,27,0.48)" }}>
              · Rank <span style={{ color: "#1A1A1B", fontWeight: 700 }}>#{tournament.userRank}</span>
            </span>
          )}
          {tournament.userScore !== null && (
            <span style={{ fontSize: 11, color: "rgba(26,26,27,0.48)" }}>
              · <span style={{ color: "#1A1A1B", fontWeight: 700 }}>{tournament.userScore}</span> pts
            </span>
          )}
        </div>
      )}

      {tournament.prizeFirst && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(212,139,0,0.06)", border: "1px solid rgba(212,139,0,0.15)",
        }}>
          <Trophy size={12} color="#D48B00" />
          <span style={{ fontSize: 11, color: "rgba(26,26,27,0.62)" }}>
            1st: <span style={{ color: "#D48B00", fontWeight: 600 }}>{tournament.prizeFirst}</span>
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ChevronRight size={16} color="rgba(26,26,27,0.30)" />
      </div>
    </motion.button>
  );
}

// ── Leaderboard Panel ─────────────────────────────────────────────────────────

function LeaderboardPanel({
  tournament,
  entries,
  loading,
  onEnter,
  entering,
  onClose,
  userId,
}: {
  tournament: Tournament;
  entries: LeaderboardEntry[];
  loading: boolean;
  onEnter: () => void;
  entering: boolean;
  onClose: () => void;
  userId: string | null;
}) {
  const meta = TYPE_META[tournament.type];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        background: "rgba(245,242,237,0.95)",
        border: `1px solid ${meta.color}30`, borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${meta.color}20`,
        background: `${meta.color}06`, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10,
              background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
              color: "rgba(26,26,27,0.48)", cursor: "pointer", fontSize: 12,
            }}
          >
            <ArrowLeft size={14} /> Back
          </motion.button>

          {tournament.isEntered ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 12,
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)",
              color: "#22c55e", fontWeight: 700, fontSize: 13,
            }}>
              <span style={{ fontSize: 12 }}>✓</span> You&apos;re In
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              disabled={entering || tournament.status !== "active"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 12,
                background: tournament.status === "active" ? meta.color : "rgba(26,26,27,0.08)",
                border: "none", cursor: tournament.status === "active" && !entering ? "pointer" : "not-allowed",
                color: tournament.status === "active" ? "#1A1A1B" : "rgba(26,26,27,0.30)",
                fontWeight: 700, fontSize: 13,
                opacity: entering ? 0.7 : 1,
              }}
            >
              {entering ? "Entering…" : tournament.status === "active" ? "Enter Competition" : "Not Active"}
            </motion.button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={24} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1B" }}>{tournament.title}</div>
            <div style={{ fontSize: 11, color: "rgba(26,26,27,0.44)", marginTop: 2 }}>
              {tournament.description}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Ends In</div>
            <CountdownDisplay endAt={tournament.endAt} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Entrants</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1B" }}>{tournament.entrantCount}</div>
          </div>
        </div>

        {(tournament.prizeFirst || tournament.prizeSecond || tournament.prizeThird) && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tournament.prizeFirst && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)" }}>
                <span style={{ fontSize: 10 }}>🥇</span>
                <span style={{ fontSize: 11, color: "#D48B00", fontWeight: 600 }}>{tournament.prizeFirst}</span>
              </div>
            )}
            {tournament.prizeSecond && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.2)" }}>
                <span style={{ fontSize: 10 }}>🥈</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{tournament.prizeSecond}</span>
              </div>
            )}
            {tournament.prizeThird && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(184,115,51,0.08)", border: "1px solid rgba(184,115,51,0.2)" }}>
                <span style={{ fontSize: 10 }}>🥉</span>
                <span style={{ fontSize: 11, color: "#b87333", fontWeight: 600 }}>{tournament.prizeThird}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.40)",
          textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12,
        }}>
          Live Leaderboard
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <RefreshCw size={20} color="rgba(26,26,27,0.30)" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            padding: "40px 20px", color: "rgba(26,26,27,0.30)", textAlign: "center",
          }}>
            <Trophy size={32} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>No entries yet</div>
            <div style={{ fontSize: 12 }}>Be the first to compete!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((entry, i) => {
              const rank = entry.rank ?? i + 1;
              const rankColors: Record<number, string> = { 1: "#D48B00", 2: "#9ca3af", 3: "#b87333" };
              const c = rankColors[rank] ?? "rgba(26,26,27,0.58)";
              const isMe = userId !== null && entry.userId === userId;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 12,
                    background: isMe
                      ? "rgba(34,197,94,0.07)"
                      : rank <= 3 ? `${c}08` : "rgba(26,26,27,0.04)",
                    border: isMe
                      ? "1.5px solid rgba(34,197,94,0.35)"
                      : rank <= 3 ? `1px solid ${c}30` : "1px solid rgba(26,26,27,0.07)",
                  }}
                >
                  <RankBadge rank={rank} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? "#1A1A1B" : "#1A1A1B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.userName ?? "Guest"}
                      </div>
                      {isMe && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
                          color: "#22c55e", background: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.3)", padding: "1px 5px", borderRadius: 999,
                          textTransform: "uppercase", flexShrink: 0,
                        }}>You</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", marginTop: 2 }}>
                      Entered {new Date(entry.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isMe ? "#22c55e" : c }}>{entry.score}</div>
                    <div style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>pts</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Create Tournament Modal ────────────────────────────────────────────────────

const CRAFT_TYPES = ["smoke", "whiskey", "bourbon", "wine", "cocktail", "beer", "spirits"];

interface CreateFormState {
  title: string;
  description: string;
  type: TournamentType;
  craftType: string;
  startAt: string;
  maxEntrants: string;
  prizeFirst: string;
  prizeSecond: string;
  prizeThird: string;
}

function CreateTournamentModal({
  onClose,
  onCreated,
  existingTournaments,
}: {
  onClose: () => void;
  onCreated: (t: Tournament) => void;
  existingTournaments: Tournament[];
}) {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [form, setForm] = useState<CreateFormState>({
    title: "",
    description: "",
    type: "venue",
    craftType: "smoke",
    startAt: localNow,
    maxEntrants: "",
    prizeFirst: "",
    prizeSecond: "",
    prizeThird: "",
  });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof CreateFormState>(key: K, val: CreateFormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 2) {
      errs.title = "Title must be at least 2 characters.";
    }
    if (!form.type) {
      errs.type = "Please select a tournament type.";
    }
    if (form.type === "live") {
      const hasActiveLive = existingTournaments.some(
        t => t.type === "live" && (t.status === "active" || t.status === "upcoming"),
      );
      if (hasActiveLive) {
        errs.type = "A live tournament is already active or upcoming. Only one live tournament can run at a time.";
      }
    }
    if (form.maxEntrants && (isNaN(Number(form.maxEntrants)) || Number(form.maxEntrants) < 1)) {
      errs.maxEntrants = "Max entrants must be a positive number.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title:       form.title.trim(),
        type:        form.type,
        craftType:   form.craftType || undefined,
        description: form.description.trim() || undefined,
        startAt:     form.startAt ? new Date(form.startAt).toISOString() : undefined,
        maxEntrants: form.maxEntrants ? Number(form.maxEntrants) : undefined,
        prizeFirst:  form.prizeFirst.trim() || undefined,
        prizeSecond: form.prizeSecond.trim() || undefined,
        prizeThird:  form.prizeThird.trim() || undefined,
      };
      const result = await apiFetch("/competitions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onCreated(result as Tournament);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("403")) {
        setErrors({ _global: "You do not have permission to create tournaments." });
      } else if (msg.includes("400")) {
        setErrors({ _global: "Invalid form data. Please check your inputs." });
      } else {
        setErrors({ _global: "Failed to create tournament. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const meta = TYPE_META[form.type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(26,26,27,0.32)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{
          background: "rgba(14,11,8,0.98)",
          border: `1px solid ${meta.color}35`,
          borderRadius: 20, width: "100%", maxWidth: 520,
          maxHeight: "90dvh", overflowY: "auto",
          boxShadow: `0 24px 80px rgba(26,26,27,0.40), 0 0 0 1px ${meta.color}15`,
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: `1px solid ${meta.color}20`,
          background: `${meta.color}06`, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus size={18} color={meta.color} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1B" }}>Create Tournament</div>
              <div style={{ fontSize: 10, color: "rgba(26,26,27,0.40)" }}>Venue Command Hub</div>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
              color: "rgba(26,26,27,0.48)", cursor: "pointer",
            }}
          >
            <X size={16} />
          </motion.button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {errors._global && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              fontSize: 12, color: "#ef4444",
            }}>
              {errors._global}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Tournament Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Best Bourbon Build — Weekend Showdown"
              maxLength={120}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(26,26,27,0.06)", border: `1px solid ${errors.title ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                color: "#1A1A1B", fontSize: 13, outline: "none",
              }}
            />
            {errors.title && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{errors.title}</div>}
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Tournament Type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["live", "daily", "weekly", "venue", "grand"] as TournamentType[]).map(t => {
                const tmeta = TYPE_META[t];
                const active = form.type === t;
                return (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => set("type", t)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                      background: active ? `${tmeta.color}22` : "rgba(26,26,27,0.05)",
                      border: active ? `1px solid ${tmeta.color}60` : "1px solid rgba(26,26,27,0.10)",
                      color: active ? tmeta.color : "rgba(26,26,27,0.40)",
                    }}
                  >
                    {tmeta.label}
                  </motion.button>
                );
              })}
            </div>
            {errors.type && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{errors.type}</div>}
            <div style={{ fontSize: 10, color: "rgba(26,26,27,0.30)", marginTop: 6 }}>
              Duration: {form.type === "live" ? "30 min" : form.type === "daily" ? "24 hours" : form.type === "weekly" ? "7 days" : form.type === "venue" ? "75 days" : "180 days"}
            </div>
          </div>

          {/* Craft Type */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Craft Type
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CRAFT_TYPES.map(ct => {
                const active = form.craftType === ct;
                return (
                  <motion.button
                    key={ct}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => set("craftType", ct)}
                    style={{
                      padding: "5px 12px", borderRadius: 16, cursor: "pointer",
                      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                      background: active ? "rgba(212,139,0,0.15)" : "rgba(26,26,27,0.05)",
                      border: active ? "1px solid rgba(212,139,0,0.5)" : "1px solid rgba(26,26,27,0.10)",
                      color: active ? "#D48B00" : "rgba(26,26,27,0.40)",
                    }}
                  >
                    {ct}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Start Time
            </label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={e => set("startAt", e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#1A1A1B", fontSize: 13, outline: "none",
                colorScheme: "dark",
              }}
            />
            <div style={{ fontSize: 10, color: "rgba(26,26,27,0.30)", marginTop: 4 }}>Leave at current time to start immediately.</div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Description <span style={{ color: "rgba(26,26,27,0.25)" }}>(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Describe the competition rules or theme…"
              maxLength={500}
              rows={2}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#1A1A1B", fontSize: 13, outline: "none", resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Prizes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Custom Prizes <span style={{ color: "rgba(26,26,27,0.25)" }}>(optional — defaults applied if blank)</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(["prizeFirst", "prizeSecond", "prizeThird"] as const).map((key, i) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{["🥇", "🥈", "🥉"][i]}</span>
                  <input
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={`${["1st", "2nd", "3rd"][i]} place prize`}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 9,
                      background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
                      color: "#1A1A1B", fontSize: 12, outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Max Entrants */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,26,27,0.48)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
              Max Entrants <span style={{ color: "rgba(26,26,27,0.25)" }}>(optional)</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.maxEntrants}
              onChange={e => set("maxEntrants", e.target.value)}
              placeholder="Unlimited"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(26,26,27,0.06)", border: `1px solid ${errors.maxEntrants ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                color: "#1A1A1B", fontSize: 13, outline: "none",
              }}
            />
            {errors.maxEntrants && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{errors.maxEntrants}</div>}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: "flex", gap: 10, padding: "16px 22px",
          borderTop: "1px solid rgba(26,26,27,0.08)",
          background: "rgba(245,242,237,0.5)",
        }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              flex: 1, padding: "11px 20px", borderRadius: 12,
              background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
              color: "rgba(26,26,27,0.48)", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2, padding: "11px 20px", borderRadius: 12,
              background: submitting ? "rgba(212,139,0,0.3)" : meta.color,
              border: "none", color: submitting ? "rgba(26,26,27,0.48)" : "#1A1A1B",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700,
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? "Creating…" : "Create Tournament"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<TournamentStatus, { label: string; color: string }> = {
  upcoming:  { label: "Upcoming",  color: "#8b5cf6" },
  active:    { label: "Active",    color: "#22c55e" },
  scoring:   { label: "Scoring",   color: "#f59e0b" },
  completed: { label: "Completed", color: "#6b7280" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
};

function StatusBadge({ status }: { status: TournamentStatus }) {
  const { label, color } = STATUS_META[status];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
      color, background: `${color}18`, border: `1px solid ${color}35`,
      padding: "2px 8px", borderRadius: 999, flexShrink: 0,
    }}>{label}</span>
  );
}

// ── My Tournament Row ─────────────────────────────────────────────────────────

function MyTournamentRow({
  tournament,
  onSelect,
  onStatusChange,
  onError,
}: {
  tournament: Tournament;
  onSelect: (t: Tournament) => void;
  onStatusChange: (id: string, status: "cancelled" | "completed") => void;
  onError: (msg: string) => void;
}) {
  const meta = TYPE_META[tournament.type];
  const Icon = meta.icon;

  const [pending, setPending]     = useState<"cancel" | "close" | null>(null);
  const [working, setWorking]     = useState(false);

  const canCancel = tournament.status === "upcoming" || tournament.status === "active";
  const canClose  = tournament.status === "active"   || tournament.status === "scoring";

  async function executeAction(action: "cancel" | "close") {
    const newStatus = action === "cancel" ? "cancelled" : "completed";
    setWorking(true);
    try {
      await apiFetch(`/competitions/${tournament.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChange(tournament.id, newStatus);
    } catch (err) {
      const msg = err instanceof Error && err.message.includes("409")
        ? "This tournament can no longer be changed."
        : "Could not update tournament — please try again.";
      onError(msg);
      setPending(null);
    } finally {
      setWorking(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", flexDirection: "column", gap: 0,
        borderRadius: 14,
        background: "rgba(26,26,27,0.04)",
        border: "1px solid rgba(26,26,27,0.09)",
        overflow: "hidden",
      }}
    >
      {/* Clickable main row */}
      <motion.button
        whileHover={{ backgroundColor: "rgba(26,26,27,0.05)" }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onSelect(tournament)}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 16px", textAlign: "left",
          background: "transparent", border: "none",
          cursor: "pointer", width: "100%",
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={meta.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tournament.title}
            </span>
            <StatusBadge status={tournament.status} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              color: meta.color,
            }}>{meta.label}</span>
            {tournament.craftType && (
              <span style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", textTransform: "capitalize" }}>
                · {tournament.craftType}
              </span>
            )}
            <span style={{ fontSize: 10, color: "rgba(26,26,27,0.35)" }}>
              Started {new Date(tournament.startAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1B" }}>
            {tournament.entrantCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
            <Users size={9} color="rgba(26,26,27,0.35)" />
            <span style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>entrants</span>
          </div>
        </div>

        <ChevronRight size={14} color="rgba(26,26,27,0.25)" style={{ flexShrink: 0 }} />
      </motion.button>

      {/* Action bar — only for actionable statuses */}
      {(canCancel || canClose) && (
        <div style={{
          display: "flex", gap: 8, padding: "8px 16px 10px",
          borderTop: "1px solid rgba(26,26,27,0.07)",
        }}>
          {canClose && (
            pending === "close" ? (
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={working}
                  onClick={() => executeAction("close")}
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 8, cursor: working ? "not-allowed" : "pointer",
                    background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
                    color: "#22c55e", fontSize: 11, fontWeight: 700,
                    opacity: working ? 0.6 : 1,
                  }}
                >
                  {working ? "Closing…" : "Confirm Close"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPending(null)}
                  style={{
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(26,26,27,0.40)", fontSize: 11, fontWeight: 600,
                  }}
                >
                  Keep
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setPending("close"); }}
                style={{
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22c55e", fontSize: 11, fontWeight: 700,
                }}
              >
                Close Now
              </motion.button>
            )
          )}

          {canCancel && (
            pending === "cancel" ? (
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={working}
                  onClick={() => executeAction("cancel")}
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 8, cursor: working ? "not-allowed" : "pointer",
                    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444", fontSize: 11, fontWeight: 700,
                    opacity: working ? 0.6 : 1,
                  }}
                >
                  {working ? "Cancelling…" : "Confirm Cancel"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPending(null)}
                  style={{
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(26,26,27,0.40)", fontSize: 11, fontWeight: 600,
                  }}
                >
                  Keep
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setPending("cancel"); }}
                style={{
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444", fontSize: 11, fontWeight: 700,
                }}
              >
                Cancel Tournament
              </motion.button>
            )
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CompetitionModule() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();
  const { user } = useAuth();

  const canCreateTournament = user?.role === "super_admin" || user?.role === "venue_owner" || user?.role === "manager";

  const [activeTab, setActiveTab]     = useState<"browse" | "mine">("browse");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMine, setLoadingMine] = useState(false);
  const [selected, setSelected]       = useState<Tournament | null>(null);
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB]     = useState(false);
  const [entering, setEntering]       = useState(false);
  const [filterType, setFilterType]   = useState<TournamentType | "all">("all");
  const [toast, setToast]             = useState<string | null>(null);
  const [liveCtx, setLiveCtx]         = useState<LiveContext | null>(null);
  const [showCreate, setShowCreate]   = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadTournaments = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiFetch("/competitions");
      setTournaments(data);
    } catch {
      // best-effort
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMyTournaments = useCallback(async () => {
    setLoadingMine(true);
    try {
      const data = await apiFetch("/competitions?mine=true");
      setMyTournaments(data);
    } catch {
      setMyTournaments([]);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  const loadLiveContext = useCallback(async () => {
    try {
      // Craft leaderboard: uses /api/craft/leaderboard (public, same data source as tournament scoring)
      const craftData: CraftLeaderEntry[] = await apiFetch("/craft/leaderboard?limit=5")
        .catch(() => []);

      // Lounge league: uses /api/lounge-league (auth-protected, applies venue anonymization)
      const loungeData: LoungeEntry[] = await apiFetch("/lounge-league")
        .catch(() => []);

      setLiveCtx({
        craftLeaderboard: craftData,
        loungeLeague: (Array.isArray(loungeData) ? loungeData : []).slice(0, 5),
      });
    } catch {
      // best-effort — non-critical sidebar panel
    }
  }, []);

  const loadLeaderboard = useCallback(async (id: string) => {
    setLoadingLB(true);
    try {
      const data = await apiFetch(`/competitions/${id}/leaderboard`);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoadingLB(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
    loadLiveContext();
  }, [loadTournaments, loadLiveContext]);

  useEffect(() => {
    if (activeTab === "mine" && canCreateTournament) {
      loadMyTournaments();
    }
  }, [activeTab, canCreateTournament, loadMyTournaments]);

  useEffect(() => {
    if (!selected) return;
    loadLeaderboard(selected.id);
    const id = setInterval(() => loadLeaderboard(selected.id), 15_000);
    return () => clearInterval(id);
  }, [selected, loadLeaderboard]);

  // Keep a ref to the latest loadTournaments so socket handlers don't
  // capture a stale closure.
  const loadTournamentsRef = useRef(loadTournaments);
  useEffect(() => { loadTournamentsRef.current = loadTournaments; }, [loadTournaments]);

  // Keep a stable ref to the current user so the socket handler can access it
  // without re-registering on every auth state change.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Keep a stable ref to the selected tournament for leaderboard reloads.
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const loadLeaderboardRef = useRef(loadLeaderboard);
  useEffect(() => { loadLeaderboardRef.current = loadLeaderboard; }, [loadLeaderboard]);

  // Subscribe to real-time tournament lifecycle events from the server.
  useEffect(() => {
    function onCompleted(payload: { type: string; title: string }) {
      const name = payload.title || (TYPE_META[payload.type as TournamentType]?.label ?? payload.type);
      showToast(`"${name}" ended — standings are being finalised.`);
      loadTournamentsRef.current();
    }

    function onSpawned(payload: { type: string; title: string }) {
      const name = payload.title || (TYPE_META[payload.type as TournamentType]?.label ?? payload.type);
      showToast(`🏆 "${name}" has started — enter now!`);
      loadTournamentsRef.current();
    }

    function onRankChanged(payload: {
      userId: string;
      tournamentId: string;
      tournamentTitle: string;
      newRank: number;
      oldRank: number | null;
    }) {
      // Only show the notification to the user whose rank actually changed.
      if (payload.userId !== userRef.current?.id) return;

      const rankLabel = payload.newRank === 1 ? "#1 🏆" : `#${payload.newRank}`;
      const direction = payload.oldRank === null
        ? ""
        : payload.newRank < payload.oldRank
          ? "↑ "
          : "↓ ";
      showToast(`${direction}Your rank in "${payload.tournamentTitle}" moved to ${rankLabel}`);

      // Refresh the leaderboard panel if this tournament is currently open.
      if (selectedRef.current?.id === payload.tournamentId) {
        loadLeaderboardRef.current(payload.tournamentId);
      }
    }

    socket.on("tournament_completed", onCompleted);
    socket.on("tournament_spawned", onSpawned);
    socket.on("tournament_rank_changed", onRankChanged);
    return () => {
      socket.off("tournament_completed", onCompleted);
      socket.off("tournament_spawned", onSpawned);
      socket.off("tournament_rank_changed", onRankChanged);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEnter() {
    if (!selected) return;
    setEntering(true);
    try {
      const entry = await apiFetch(`/competitions/${selected.id}/enter`, { method: "POST" });
      // Immediately sync the authoritative craft-build score from the DB
      await apiFetch(`/competitions/${selected.id}/sync-score`, { method: "POST" })
        .catch(() => { /* best-effort — entry still succeeded */ });
      showToast("You're in! Your craft score has been recorded.");
      await loadLeaderboard(selected.id);
      await loadTournaments();
      setSelected(prev => prev
        ? {
            ...prev,
            entrantCount: prev.entrantCount + 1,
            isEntered:    true,
            userEntryId:  entry?.id ?? null,
            userScore:    entry?.score ?? 0,
            userRank:     entry?.rank  ?? null,
          }
        : prev
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not enter";
      if (msg.includes("409")) {
        showToast("Already entered — may the best score win!");
      } else {
        showToast("Sign in to enter a competition.");
      }
    } finally {
      setEntering(false);
    }
  }

  const visible = filterType === "all"
    ? tournaments
    : tournaments.filter(t => t.type === filterType);

  const featured   = visible.filter(t => t.featured);
  const nonfeatured = visible.filter(t => !t.featured);

  return (
    <BackgroundLayer
      image={getBackground("dashboard")}
      style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#1A1A1B", overflow: "hidden" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(26,26,27,0.08)",
        background: "rgba(245,242,237,0.85)", backdropFilter: "blur(8px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
              color: "rgba(26,26,27,0.48)", cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#D48B00" }}>Competitions</div>
            <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)" }}>Craft Tournaments · Live Leaderboards</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canCreateTournament && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreate(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 12,
                background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.35)",
                color: "#D48B00", cursor: "pointer", fontSize: 12, fontWeight: 700,
              }}
            >
              <Plus size={14} />
              Create Tournament
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => activeTab === "mine" ? loadMyTournaments() : loadTournaments()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 40, borderRadius: 12,
              background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
              color: "rgba(26,26,27,0.48)", cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
          </motion.button>
        </div>
      </div>

      {/* Tab bar (only shown for privileged users) */}
      {canCreateTournament && (
        <div style={{
          display: "flex", gap: 4, padding: "10px 20px",
          borderBottom: "1px solid rgba(26,26,27,0.08)",
          background: "rgba(245,242,237,0.75)", flexShrink: 0,
        }}>
          {(["browse", "mine"] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setActiveTab(tab); setSelected(null); }}
                style={{
                  padding: "7px 18px", borderRadius: 10, cursor: "pointer",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.03em",
                  background: isActive ? "rgba(212,139,0,0.15)" : "rgba(26,26,27,0.05)",
                  border: isActive ? "1px solid rgba(212,139,0,0.4)" : "1px solid rgba(26,26,27,0.09)",
                  color: isActive ? "#D48B00" : "rgba(26,26,27,0.40)",
                }}
              >
                {tab === "browse" ? "Browse" : "My Tournaments"}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Filter chips — only on browse tab */}
      {activeTab === "browse" && (
        <div style={{
          display: "flex", gap: 8, padding: "12px 20px",
          borderBottom: "1px solid rgba(26,26,27,0.06)",
          background: "rgba(245,242,237,0.6)", flexShrink: 0, overflowX: "auto",
        }}>
          {(["all", "live", "daily", "weekly", "venue", "grand"] as const).map(t => {
            const active = filterType === t;
            const color  = t === "all" ? "#D48B00" : TYPE_META[t].color;
            return (
              <motion.button
                key={t}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterType(t)}
                style={{
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                  textTransform: "capitalize", whiteSpace: "nowrap",
                  background: active ? `${color}20` : "rgba(26,26,27,0.05)",
                  border: active ? `1px solid ${color}50` : "1px solid rgba(26,26,27,0.10)",
                  color: active ? color : "rgba(26,26,27,0.40)",
                }}
              >
                {t === "all" ? "All" : TYPE_META[t].label}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* My Tournaments tab */}
        {activeTab === "mine" && (
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="leaderboard-mine"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                style={{ flex: 1, padding: "16px 20px", overflow: "hidden" }}
              >
                <LeaderboardPanel
                  tournament={selected}
                  entries={entries}
                  loading={loadingLB}
                  onEnter={handleEnter}
                  entering={entering}
                  onClose={() => setSelected(null)}
                  userId={user?.id ?? null}
                />
              </motion.div>
            ) : (
              <motion.div
                key="mine-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    All Tournaments You Created
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={loadMyTournaments}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 32, height: 32, borderRadius: 9,
                      background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
                      color: "rgba(26,26,27,0.40)", cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={13} />
                  </motion.button>
                </div>

                {loadingMine ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                    <RefreshCw size={24} color="rgba(26,26,27,0.30)" style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                ) : myTournaments.length === 0 ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                    padding: "64px 20px", color: "rgba(26,26,27,0.30)", textAlign: "center",
                  }}>
                    <Trophy size={40} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>No tournaments created yet</div>
                    <div style={{ fontSize: 12, maxWidth: 280 }}>Tap "Create Tournament" to launch your first competition — venue-wide, daily, or grand series.</div>
                  </div>
                ) : (
                  <>
                    {/* Summary stats */}
                    {(() => {
                      const total     = myTournaments.length;
                      const active    = myTournaments.filter(t => t.status === "active").length;
                      const completed = myTournaments.filter(t => t.status === "completed").length;
                      const totalEntrants = myTournaments.reduce((sum, t) => sum + t.entrantCount, 0);
                      return (
                        <div style={{
                          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 4,
                        }}>
                          {[
                            { label: "Total", value: total, color: "#D48B00" },
                            { label: "Active", value: active, color: "#22c55e" },
                            { label: "Completed", value: completed, color: "#6b7280" },
                            { label: "Entrants", value: totalEntrants, color: "#06b6d4" },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{
                              padding: "10px 12px", borderRadius: 12, textAlign: "center",
                              background: `${color}08`, border: `1px solid ${color}20`,
                            }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                              <div style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {myTournaments.map((t, i) => (
                      <motion.div key={t.id} transition={{ delay: i * 0.04 }}>
                        <MyTournamentRow
                          tournament={t}
                          onSelect={setSelected}
                          onStatusChange={(id, status) => {
                            setMyTournaments(prev =>
                              prev.map(row => row.id === id ? { ...row, status } : row),
                            );
                            const label = status === "cancelled" ? "cancelled" : "closed";
                            showToast(`Tournament ${label} successfully.`);
                          }}
                          onError={showToast}
                        />
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Browse tab — Tournament list */}
        {activeTab === "browse" && (
        <div style={{
          flex: selected ? "0 0 380px" : "1",
          overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
          transition: "flex 0.3s ease",
          maxWidth: selected ? 380 : "100%",
        }}>
          {loadingList ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
              <RefreshCw size={24} color="rgba(26,26,27,0.30)" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : visible.length === 0 ? (

            <div style={{ padding: "0 0 16px" }}>
              {/* ── LEGEND SERIES — Mock featured tournament ── */}
              <div style={{
                borderRadius: 18, overflow: "hidden", marginBottom: 16,
                background: "linear-gradient(135deg, rgba(212,139,0,0.12) 0%, rgba(212,139,0,0.04) 100%)",
                border: "1.5px solid rgba(212,139,0,0.45)",
                boxShadow: "0 8px 32px rgba(212,139,0,0.08)",
              }}>
                {/* Header */}
                <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(212,139,0,0.18)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>🏆</span>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#D48B00" }}>Legend Series</div>
                        <div style={{ fontSize: 11, color: "rgba(26,26,27,0.45)" }}>Grand · Multi-craft · All venues</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 9, fontWeight: 800,
                        letterSpacing: "0.14em", textTransform: "uppercase",
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#22c55e",
                      }}>● LIVE</div>
                      <div style={{ fontSize: 10, color: "rgba(26,26,27,0.38)", marginTop: 4 }}>Resets in 6h 22m</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[["247", "Entrants"], ["$2,400", "Prize Pool"], ["1st", "1 Week Free"]].map(([v, l]) => (
                      <div key={l}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1B" }}>{v}</div>
                        <div style={{ fontSize: 9, color: "rgba(26,26,27,0.38)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Live Leaderboard */}
                <div style={{ padding: "14px 20px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,26,27,0.30)", marginBottom: 12 }}>
                    Live Leaderboard
                  </div>
                  {[
                    { rank: 1, name: "Marcus R.",   venue: "The Vault",       pts: 2847, craft: "smoke", badge: "🥇" },
                    { rank: 2, name: "Sofia M.",    venue: "Oak & Ember",     pts: 2341, craft: "pour",  badge: "🥈" },
                    { rank: 3, name: "Omar K.",     venue: "The Reserve",     pts: 1998, craft: "smoke", badge: "🥉" },
                    { rank: 4, name: "Jade T.",     venue: "Velvet Room",     pts: 1654, craft: "brew",  badge: "4" },
                    { rank: 5, name: "Theo B.",     venue: "The Vault",       pts: 1102, craft: "pour",  badge: "5" },
                  ].map((entry) => (
                    <div key={entry.rank} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 12, marginBottom: 6,
                      background: entry.rank <= 3 ? `rgba(212,139,0,0.06)` : "rgba(26,26,27,0.03)",
                      border: `1px solid ${entry.rank === 1 ? "rgba(212,139,0,0.35)" : entry.rank <= 3 ? "rgba(212,139,0,0.15)" : "rgba(26,26,27,0.08)"}`,
                    }}>
                      <div style={{ width: 30, textAlign: "center", fontSize: entry.rank <= 3 ? 16 : 12, fontWeight: 700, color: entry.rank <= 3 ? "#D48B00" : "rgba(26,26,27,0.35)" }}>
                        {entry.badge}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1B" }}>{entry.name}</div>
                        <div style={{ fontSize: 10, color: "rgba(26,26,27,0.38)" }}>{entry.venue} · {entry.craft.toUpperCase()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#D48B00" }}>{entry.pts.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: "rgba(26,26,27,0.30)", textTransform: "uppercase", letterSpacing: "0.1em" }}>pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* ── Coming up next ── */}
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Happy Hour Hustle", type: "DAILY",  color: "#22c55e",  starts: "Starts 4 PM" },
                  { label: "Weekly Smoke-Off",  type: "WEEKLY", color: "#D48B00",  starts: "Sat · 7 PM"  },
                ].map(t => (
                  <div key={t.label} style={{
                    flex: 1, padding: "14px 16px", borderRadius: 14,
                    background: `${t.color}08`, border: `1px solid ${t.color}25`,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: t.color, marginBottom: 5 }}>{t.type}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1B", marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(26,26,27,0.38)" }}>{t.starts}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "rgba(212,139,0,0.6)",
                    textTransform: "uppercase", letterSpacing: "0.2em",
                  }}>
                    ⭐ Featured
                  </div>
                  {featured.map((t, i) => (
                    <motion.div key={t.id} transition={{ delay: i * 0.05 }}>
                      <TournamentCard tournament={t} onSelect={setSelected} />
                    </motion.div>
                  ))}
                </>
              )}
              {nonfeatured.length > 0 && (
                <>
                  {featured.length > 0 && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(26,26,27,0.30)",
                      textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 4,
                    }}>
                      All Competitions
                    </div>
                  )}
                  {nonfeatured.map((t, i) => (
                    <motion.div key={t.id} transition={{ delay: i * 0.05 }}>
                      <TournamentCard tournament={t} onSelect={setSelected} />
                    </motion.div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
        )}

        {/* Right panel: leaderboard (if tournament selected) or live context — Browse tab only */}
        {activeTab === "browse" && <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              style={{
                flex: 1, padding: "16px 20px",
                borderLeft: "1px solid rgba(26,26,27,0.08)",
                overflow: "hidden",
              }}
            >
              <LeaderboardPanel
                tournament={selected}
                entries={entries}
                loading={loadingLB}
                onEnter={handleEnter}
                entering={entering}
                onClose={() => setSelected(null)}
                userId={user?.id ?? null}
              />
            </motion.div>
          ) : liveCtx && (liveCtx.craftLeaderboard.length > 0 || liveCtx.loungeLeague.length > 0) ? (
            <motion.div
              key="context"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{
                width: 300, flexShrink: 0,
                borderLeft: "1px solid rgba(26,26,27,0.08)",
                overflowY: "auto", padding: "16px 16px",
                display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              {/* Craft Leaderboard context */}
              {liveCtx.craftLeaderboard.length > 0 && (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                    fontSize: 10, fontWeight: 700, color: "rgba(26,26,27,0.40)",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                  }}>
                    <BarChart2 size={11} />
                    Craft Leaderboard
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {liveCtx.craftLeaderboard.slice(0, 5).map((entry, i) => {
                      const rankColors: Record<number, string> = { 1: "#D48B00", 2: "#9ca3af", 3: "#b87333" };
                      const c = rankColors[i + 1] ?? "rgba(26,26,27,0.40)";
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 10px", borderRadius: 10,
                          background: i < 3 ? `${c}08` : "rgba(26,26,27,0.04)",
                          border: i < 3 ? `1px solid ${c}25` : "1px solid rgba(26,26,27,0.06)",
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: `${c}15`, border: `1px solid ${c}40`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: c }}>#{i + 1}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600, color: "#1A1A1B",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{entry.name}</div>
                            <div style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", textTransform: "capitalize" }}>
                              {entry.craft} craft
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{entry.score}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lounge League context */}
              {liveCtx.loungeLeague.length > 0 && (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                    fontSize: 10, fontWeight: 700, color: "rgba(26,26,27,0.40)",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                  }}>
                    <MapPin size={11} />
                    Lounge League
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {liveCtx.loungeLeague.map((lounge, i) => {
                      const c = i === 0 ? "#D48B00" : "rgba(26,26,27,0.40)";
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 10px", borderRadius: 10,
                          background: i === 0 ? "rgba(212,139,0,0.06)" : "rgba(26,26,27,0.04)",
                          border: i === 0 ? "1px solid rgba(212,139,0,0.2)" : "1px solid rgba(26,26,27,0.06)",
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: c, width: 20, textAlign: "center" }}>
                            #{lounge.rank}
                          </span>
                          <div style={{
                            flex: 1, fontSize: 12, fontWeight: 600, color: "#1A1A1B",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {lounge.loungeName}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{lounge.score.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            style={{
              position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
              background: "rgba(30,25,18,0.95)", border: "1px solid rgba(212,139,0,0.4)",
              borderRadius: 14, padding: "12px 24px",
              fontSize: 13, fontWeight: 600, color: "#1A1A1B",
              zIndex: 1000, backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(26,26,27,0.26)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateTournamentModal
            onClose={() => setShowCreate(false)}
            existingTournaments={tournaments}
            onCreated={(newTournament) => {
              const enrichedTournament = {
                ...newTournament,
                entrantCount: 0,
                isEntered:    false,
                userEntryId:  null,
                userScore:    null,
                userRank:     null,
              };
              setTournaments(prev => [...prev, enrichedTournament]);
              setMyTournaments(prev => [enrichedTournament, ...prev]);
              setShowCreate(false);
              showToast(`"${newTournament.title}" tournament created!`);
            }}
          />
        )}
      </AnimatePresence>
    </BackgroundLayer>
  );
}
