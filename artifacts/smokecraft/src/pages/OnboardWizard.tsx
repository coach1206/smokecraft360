/**
 * OnboardWizard — 5-step venue onboarding wizard.
 *
 * Steps:
 *  1. Venue Info     — name, type, size
 *  2. Hardware       — device count & types
 *  3. Menu           — import or skip
 *  4. AI Config      — tone, goal, focus categories
 *  5. Go Live        — review & launch
 */

import { useState, useCallback } from "react";
import { useLocation }           from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Monitor, Package, Sparkles, Rocket,
  Check, ChevronRight, ChevronLeft, ArrowLeft,
} from "lucide-react";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { getAuthHeaders } from "@/services/auth";

const C = {
  bg:     "#0a0806",
  gold:   "#d4af37",
  goldDim:"rgba(212,175,55,0.55)",
  text:   "#e8e0c8",
  muted:  "rgba(232,224,200,0.5)",
  dim:    "rgba(232,224,200,0.3)",
  card:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
};

interface WizardData {
  venueName:         string;
  venueType:         string;
  venueSize:         string;
  deviceCount:       string;
  deviceTypes:       string[];
  menuImport:        string;
  aiTone:            string;
  aiGoal:            string;
  aiFocusCategories: string[];
}

const INITIAL: WizardData = {
  venueName:         "",
  venueType:         "cigar_lounge",
  venueSize:         "medium",
  deviceCount:       "2",
  deviceTypes:       ["tablet"],
  menuImport:        "skip",
  aiTone:            "upscale",
  aiGoal:            "balanced",
  aiFocusCategories: ["cigar", "spirit"],
};

const STEPS = [
  { id: "venue_info", label: "Venue Info",  icon: Building2, color: "#d4af37" },
  { id: "hardware",   label: "Hardware",    icon: Monitor,   color: "#5b8def" },
  { id: "menu",       label: "Menu",        icon: Package,   color: "#34d399" },
  { id: "ai_config",  label: "AI Config",   icon: Sparkles,  color: "#a78bfa" },
  { id: "go_live",    label: "Go Live",     icon: Rocket,    color: "#f97316" },
];

function StepProgress({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? "1" : undefined }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? `${step.color}20` : active ? `${step.color}15` : "rgba(255,255,255,0.04)",
              border: `2px solid ${done || active ? step.color : "rgba(255,255,255,0.1)"}`,
              transition: "all 0.3s",
            }}>
              {done
                ? <Check size={16} color={step.color} />
                : <Icon size={16} color={active ? step.color : "rgba(232,224,200,0.3)"} />
              }
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 4px",
                background: done ? C.gold : "rgba(255,255,255,0.06)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OptionChip({
  label, selected, onClick, color = C.gold,
}: {
  label: string; selected: boolean; onClick: () => void; color?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
        background: selected ? `${color}15` : C.card,
        border: `1px solid ${selected ? color : C.border}`,
        color: selected ? color : C.muted,
        transition: "all 0.2s",
      }}
    >
      {label}
    </motion.button>
  );
}

function StepVenueInfo({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
          Venue Name
        </label>
        <input
          value={data.venueName}
          onChange={e => set("venueName", e.target.value)}
          placeholder="e.g. The Grand Lounge"
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 15,
            background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
            color: C.text, outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => { e.target.style.borderColor = C.gold; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Venue Type
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "cigar_lounge", label: "Cigar Lounge" },
            { value: "bar", label: "Bar" },
            { value: "restaurant", label: "Restaurant" },
            { value: "hotel", label: "Hotel" },
            { value: "club", label: "Club" },
            { value: "retail", label: "Retail" },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.venueType === opt.value} onClick={() => set("venueType", opt.value)} />
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Venue Size
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { value: "small", label: "Small (1–2 staff)" },
            { value: "medium", label: "Medium (3–10 staff)" },
            { value: "large", label: "Large (11+ staff)" },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.venueSize === opt.value} onClick={() => set("venueSize", opt.value)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepHardware({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
  function toggleType(t: string) {
    const cur = data.deviceTypes;
    set("deviceTypes", cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
          Expected Device Count
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {["1", "2", "3", "5", "10+"].map(n => (
            <OptionChip key={n} label={n} selected={data.deviceCount === n} onClick={() => set("deviceCount", n)} color="#5b8def" />
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Device Types (select all that apply)
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {["kiosk", "tablet", "mobile"].map(t => (
            <OptionChip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} selected={data.deviceTypes.includes(t)} onClick={() => toggleType(t)} color="#5b8def" />
          ))}
        </div>
      </div>
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "rgba(91,141,239,0.06)", border: "1px solid rgba(91,141,239,0.15)",
        fontSize: 12, color: "rgba(232,224,200,0.5)", lineHeight: 1.6,
      }}>
        Devices can be registered later from the Devices module. This step seeds your fleet estimate for AI configuration.
      </div>
    </div>
  );
}

function StepMenu({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 4 }}>
        Import an existing menu or start with the Axiom OS default catalog. You can add and edit products at any time.
      </div>
      {[
        { value: "skip",     label: "Start with default catalog",     desc: "Use our curated premium product library — ready immediately." },
        { value: "csv",      label: "Import from CSV",                desc: "Upload a spreadsheet with your existing product names and prices." },
        { value: "manual",   label: "Add products manually",          desc: "Build your menu from scratch using the inventory module." },
      ].map(opt => (
        <motion.button
          key={opt.value}
          whileTap={{ scale: 0.98 }}
          onClick={() => set("menuImport", opt.value)}
          style={{
            display: "flex", gap: 14, padding: "16px", borderRadius: 14, cursor: "pointer",
            textAlign: "left",
            background: data.menuImport === opt.value ? "rgba(52,211,153,0.08)" : C.card,
            border: `2px solid ${data.menuImport === opt.value ? "#34d399" : C.border}`,
            transition: "all 0.2s",
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
            border: `2px solid ${data.menuImport === opt.value ? "#34d399" : "rgba(255,255,255,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {data.menuImport === opt.value && (
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#34d399" }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: data.menuImport === opt.value ? "#34d399" : C.text, marginBottom: 4 }}>
              {opt.label}
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>{opt.desc}</div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function StepAiConfig({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
  function toggleCat(c: string) {
    const cur = data.aiFocusCategories;
    set("aiFocusCategories", cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Experience Tone
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "upscale",  label: "Upscale & Refined" },
            { value: "casual",   label: "Casual & Friendly" },
            { value: "mixed",    label: "Welcoming & Warm" },
            { value: "business", label: "Professional" },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.aiTone === opt.value} onClick={() => set("aiTone", opt.value)} color="#a78bfa" />
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Business Goal
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "revenue",   label: "Maximize Revenue" },
            { value: "loyalty",   label: "Build Loyalty" },
            { value: "discovery", label: "Drive Discovery" },
            { value: "balanced",  label: "Balanced" },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.aiGoal === opt.value} onClick={() => set("aiGoal", opt.value)} color="#a78bfa" />
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Focus Categories
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["cigar", "spirit", "beer", "vape", "food"].map(c => (
            <OptionChip key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} selected={data.aiFocusCategories.includes(c)} onClick={() => toggleCat(c)} color="#a78bfa" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepGoLive({ data }: { data: WizardData }) {
  const summary = [
    { label: "Venue",        value: data.venueName || "(unnamed)" },
    { label: "Type",         value: data.venueType.replace("_", " ") },
    { label: "Size",         value: data.venueSize },
    { label: "Devices",      value: `${data.deviceCount} × ${data.deviceTypes.join(", ")}` },
    { label: "Menu",         value: data.menuImport },
    { label: "AI Tone",      value: data.aiTone },
    { label: "Goal",         value: data.aiGoal },
    { label: "Focus",        value: data.aiFocusCategories.join(", ") || "all" },
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
        Review your setup. Click <strong style={{ color: C.gold }}>Launch Axiom OS</strong> to apply your configuration and go live.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {summary.map(row => (
          <div key={row.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderRadius: 10,
            background: C.card, border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 12, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardWizard() {
  const [, navigate] = useLocation();
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState<WizardData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const set = useCallback((k: keyof WizardData, v: string | string[]) => {
    setData(prev => ({ ...prev, [k]: v }));
  }, []);

  async function startSession() {
    try {
      const res = await fetch("/api/onboarding/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body:    JSON.stringify({}),
      });
      if (res.ok) {
        const json = await res.json() as { id: string };
        setSessionId(json.id);
      }
    } catch { /* non-fatal */ }
  }

  async function patchStep(stepId: string) {
    if (!sessionId) return;
    try {
      await fetch(`/api/onboarding/${sessionId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body:    JSON.stringify({ step: stepId, data }),
      });
    } catch { /* non-fatal */ }
  }

  async function handleNext() {
    if (step === 0 && !sessionId) {
      await startSession();
    }
    if (sessionId) {
      await patchStep(STEPS[step]!.id);
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      if (sessionId) {
        await patchStep("go_live");
        const completeRes = await fetch(`/api/onboarding/${sessionId}/complete`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body:    "{}",
        });
        if (!completeRes.ok) throw new Error("Complete failed");
      }

      // Apply AI configuration
      await fetch("/api/ai/configure", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body:    JSON.stringify({
          venueName:         data.venueName,
          venueType:         data.venueType,
          menuSize:          data.venueSize as "small" | "medium" | "large",
          targetDemographic: data.aiTone,
          focusCategories:   data.aiFocusCategories,
          experienceGoal:    data.aiGoal,
        }),
      });

      navigate("/dashboard");
    } catch {
      setError("Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const currentStep = STEPS[step]!;
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  const stepContent: Record<string, React.ReactNode> = {
    venue_info: <StepVenueInfo data={data} set={set} />,
    hardware:   <StepHardware  data={data} set={set} />,
    menu:       <StepMenu      data={data} set={set} />,
    ai_config:  <StepAiConfig  data={data} set={set} />,
    go_live:    <StepGoLive    data={data} />,
  };

  return (
    <BackgroundLayer image="/images/lounge-bg.jpg" style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/dashboard")}
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
              color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display', serif" }}>
              Axiom OS Setup
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>Configure your experience platform</div>
          </div>
        </div>

        {/* Progress */}
        <StepProgress current={step} />

        {/* Step card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          style={{
            padding: 28, borderRadius: 20,
            background: "rgba(10,8,6,0.7)",
            border: `1px solid ${currentStep.color}25`,
            backdropFilter: "blur(20px)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `${currentStep.color}15`, border: `1px solid ${currentStep.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={20} color={currentStep.color} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: currentStep.color }}>{currentStep.label}</div>
              <div style={{ fontSize: 11, color: C.dim }}>Step {step + 1} of {STEPS.length}</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {stepContent[currentStep.id]}
          </AnimatePresence>
        </motion.div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 12,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            fontSize: 12, color: "#ef4444",
          }}>
            {error}
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: "14px", borderRadius: 14, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                color: C.muted, fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <ChevronLeft size={16} /> Back
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={isLast ? handleComplete : handleNext}
            disabled={loading}
            style={{
              flex: 2, padding: "14px", borderRadius: 14, cursor: loading ? "wait" : "pointer",
              background: `linear-gradient(135deg, ${currentStep.color}, ${currentStep.color}cc)`,
              border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Launching..." : isLast ? <><Rocket size={16} /> Launch Axiom OS</> : <>{STEPS[step + 1]?.label} <ChevronRight size={16} /></>}
          </motion.button>
        </div>
      </div>
    </BackgroundLayer>
  );
}
