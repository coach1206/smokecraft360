/**
 * TrainingCertifications — /training/certifications
 * Training completion records and certification display.
 */

import { useState, useEffect }   from "react";
import { motion }                from "framer-motion";
import { useLocation }           from "wouter";
import { ArrowLeft, Award, CheckCircle, Lock, BookOpen, Users, Map, BarChart3 } from "lucide-react";
import Maxwell                   from "@/components/Maxwell";
import TrainingBanner             from "@/components/training/TrainingBanner";
import PrintExport                from "@/components/training/PrintExport";
import { TRAINING_ROLES_CONFIG, TRAINING_SCENARIOS, MAXWELL_INTROS } from "@/data/trainingData";

const T = {
  bg: "#F5F2ED", card: "rgba(26,26,27,0.06)", border: "rgba(212,139,0,0.15)",
  gold: "#D48B00", text: "rgba(26,26,27,0.90)", muted: "rgba(240,232,212,0.48)",
  light: "rgba(26,26,27,0.72)", green: "#34d399", blue: "#60a5fa",
  amber: "#f59e0b", purple: "#a78bfa", red: "#ef4444",
};

function getToken() {
  return localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
}

interface Cert {
  id: string; certId: string; role: string | null; mode: string;
  title: string; score: number; issuedAt: string;
}

// ── Static cert templates (awarded upon scenario/role completion) ─────────────

const ROLE_CERTS = TRAINING_ROLES_CONFIG.map((r) => ({
  id:     `cert-role-${r.id}`,
  title:  `${r.title} — NOVEE OS Certified`,
  mode:   "employee",
  role:   r.id,
  color:  r.color,
  icon:   Users,
  desc:   `Completed all ${r.modules} ${r.title} training modules`,
  points: r.modules * 20,
}));

const SCENARIO_CERT = {
  id:    "cert-scenarios-all",
  title: "Master Scenario Specialist",
  mode:  "scenarios",
  role:  null,
  color: T.amber,
  icon:  BookOpen,
  desc:  "Completed all 8 NOVEE OS training scenarios",
  points: 1600,
};

const WALKTHROUGH_CERT = {
  id:    "cert-walkthrough",
  title: "Venue Setup Complete",
  mode:  "walkthrough",
  role:  null,
  color: T.purple,
  icon:  Map,
  desc:  "Completed the full 10-step venue walkthrough",
  points: 200,
};

const INVESTOR_CERT = {
  id:    "cert-investor",
  title: "Platform Demonstration Certified",
  mode:  "investor",
  role:  null,
  color: T.green,
  icon:  BarChart3,
  desc:  "Completed the full NOVEE OS investor demonstration",
  points: 100,
};

const ALL_CERTS = [...ROLE_CERTS, SCENARIO_CERT, WALKTHROUGH_CERT, INVESTOR_CERT];

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ earned, total, pts }: { earned: number; total: number; pts: number }) {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
      {[
        { label: "Certifications Earned", value: `${earned} / ${total}`,  color: T.gold   },
        { label: "Completion",            value: `${pct}%`,               color: T.green  },
        { label: "Points Earned",         value: `${pts.toLocaleString()}`, color: T.purple },
      ].map(({ label, value, color }) => (
        <div key={label} style={{
          flex: 1, background: `${color}08`, border: `1px solid ${color}25`,
          borderRadius: 10, padding: "12px 16px",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'Cormorant Garamond',serif" }}>{value}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Cert card ─────────────────────────────────────────────────────────────────

function CertCard({ cert, earned, delay }: { cert: typeof ALL_CERTS[number]; earned: boolean; delay: number }) {
  const Icon = cert.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        background: earned ? `${cert.color}08` : T.card,
        border: `1px solid ${earned ? cert.color + "35" : T.border}`,
        borderRadius: 12, padding: "18px 20px",
        opacity: earned ? 1 : 0.5,
        position: "relative", overflow: "hidden",
      }}
    >
      {earned && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          background: `${T.green}20`, border: `1px solid ${T.green}40`,
          borderRadius: 5, padding: "2px 8px",
          fontSize: 8, color: T.green, fontWeight: 700, textTransform: "uppercase",
        }}>
          Earned
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${cert.color}${earned ? "18" : "08"}`,
          border: `1px solid ${cert.color}${earned ? "40" : "15"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {earned
            ? <Award size={18} color={cert.color} />
            : <Lock size={16} color={T.muted} />
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: earned ? T.text : T.muted, marginBottom: 3 }}>
            {cert.title}
          </div>
          <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.55, marginBottom: 8 }}>{cert.desc}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              fontSize: 9, color: cert.color, background: `${cert.color}15`,
              border: `1px solid ${cert.color}30`, borderRadius: 4,
              padding: "2px 7px", textTransform: "uppercase", fontWeight: 600,
            }}>
              {cert.mode}
            </span>
            <span style={{ fontSize: 9, color: T.muted }}>{cert.points} pts</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TrainingCertifications() {
  const [, navigate] = useLocation();
  const [certs, setCerts]   = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    const parsed = (() => {
      try { return JSON.parse(atob(token.split(".")[1] ?? "")); } catch { return null; }
    })();
    const userId = parsed?.sub ?? parsed?.id;
    if (!userId) { setLoading(false); return; }

    fetch(`/api/training/certifications/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setCerts(d.certifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // For demo: treat all as earned if we have any cert, or none if we have none.
  // In production, each cert maps to a certId.
  const earnedIds = new Set(certs.map((c) => c.mode + "-" + (c.role ?? "general")));
  const earned    = certs.length;
  const pts       = certs.reduce((acc, c) => acc + c.score, 0);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/training")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.muted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Training
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif" }}>
            Training Certifications
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {earned} earned · {ALL_CERTS.length} available
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, position: "relative" }}>
          <div style={{ position: "relative" }}>
            <PrintExport
              type="certificate"
              data={{ name: "Training Participant", roleTitle: "NOVEE OS Staff", managerName: "Floor Manager" }}
              label="Export PDF"
            />
          </div>
          <button onClick={() => navigate("/training/scenarios")} style={{
            background: `${T.gold}15`, border: `1px solid ${T.gold}30`,
            borderRadius: 8, color: T.gold, fontSize: 11, fontWeight: 600,
            padding: "7px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <BookOpen size={11} /> Start Training
          </button>
        </div>
      </div>
      <TrainingBanner />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        <StatsStrip earned={earned} total={ALL_CERTS.length} pts={pts} />

        {loading ? (
          <div style={{ color: T.muted, fontSize: 12 }}>Loading certifications…</div>
        ) : (
          <>
            {/* Role certs */}
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
              Role Certifications
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10, marginBottom: 28 }}>
              {ROLE_CERTS.map((cert, i) => (
                <CertCard key={cert.id} cert={cert} earned={earnedIds.has("employee-" + cert.role)} delay={i * 0.04} />
              ))}
            </div>

            {/* Achievement certs */}
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
              Achievement Certifications
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
              {[SCENARIO_CERT, WALKTHROUGH_CERT, INVESTOR_CERT].map((cert, i) => (
                <CertCard key={cert.id} cert={cert} earned={earnedIds.has(cert.mode + "-general")} delay={0.5 + i * 0.06} />
              ))}
            </div>

            {earned === 0 && (
              <div style={{
                marginTop: 28, padding: "20px 24px",
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
                textAlign: "center", color: T.muted, fontSize: 12,
              }}>
                Complete a training scenario or role module to earn your first certification.
                <button onClick={() => navigate("/training/scenarios")} style={{
                  display: "block", margin: "12px auto 0",
                  background: T.gold, border: "none", borderRadius: 8,
                  color: "#F5F2ED", padding: "8px 18px", cursor: "pointer",
                  fontSize: 11, fontWeight: 700,
                }}>
                  Start a Scenario
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Maxwell message={MAXWELL_INTROS.certifications} context="Certifications" />
    </div>
  );
}
