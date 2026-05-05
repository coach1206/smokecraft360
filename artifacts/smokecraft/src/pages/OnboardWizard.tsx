/**
 * OnboardWizard — 5-step venue onboarding wizard.
 *
 * Steps:
 *  1. Venue Details      — name, type, size
 *  2. Craft Selection    — which crafts to enable (SmokeCraft, PourCraft, BrewCraft, VapeCraft)
 *  3. Inventory Preview  — preview of default products for selected crafts
 *  4. AI Config Preview  — tone, goal, focus — preview of AI strategy
 *  5. Go Live            — review & launch
 */

import { useState, useCallback, useEffect } from "react";
import { useLocation }                 from "wouter";
import { motion, AnimatePresence }     from "framer-motion";
import {
  Building2, Layers, Package, Sparkles, Rocket,
  Check, ChevronRight, ChevronLeft, ArrowLeft,
  Flame, Beer, Wine, Zap,
} from "lucide-react";
import BackgroundLayer                 from "@/components/Layout/BackgroundLayer";
import { getAuthHeaders }             from "@/services/auth";

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
  venueLocation:     string;
  selectedCrafts:    string[];
  aiTone:            string;
  aiGoal:            string;
  pricingTier:       string;
  aiFocusCategories: string[];
  inventoryQtys:     Record<string, number>;
}

const INITIAL: WizardData = {
  venueName:         "",
  venueType:         "cigar_lounge",
  venueSize:         "medium",
  venueLocation:     "",
  selectedCrafts:    ["cigar", "spirit"],
  aiTone:            "upscale",
  aiGoal:            "balanced",
  pricingTier:       "premium",
  aiFocusCategories: ["cigar", "spirit"],
  inventoryQtys:     {},
};

const STEPS = [
  { id: "venue_info",        label: "Venue Details",      icon: Building2, color: "#d4af37" },
  { id: "craft_selection",   label: "Craft Selection",    icon: Layers,    color: "#5b8def" },
  { id: "inventory_preview", label: "Inventory Preview",  icon: Package,   color: "#34d399" },
  { id: "ai_preview",        label: "AI Config Preview",  icon: Sparkles,  color: "#a78bfa" },
  { id: "go_live",           label: "Go Live",            icon: Rocket,    color: "#f97316" },
];

// Preview catalog — mirrors backend SEED_PRODUCTS
const PREVIEW_CATALOG: Record<string, Array<{ name: string; tier: string; price: string }>> = {
  cigar: [
    { name: "Arturo Fuente Opus X",  tier: "premium",  price: "$42" },
    { name: "Padron 1926 Serie #80", tier: "premium",  price: "$55" },
    { name: "Oliva Serie V Melanio", tier: "standard", price: "$18" },
  ],
  spirit: [
    { name: "Macallan 18 Sherry Oak", tier: "premium",  price: "$28" },
    { name: "Buffalo Trace Bourbon",  tier: "standard", price: "$12" },
    { name: "Clase Azul Reposado",    tier: "premium",  price: "$35" },
  ],
  beer: [
    { name: "Guinness Draught",    tier: "standard", price: "$9" },
    { name: "Pliny the Elder IPA", tier: "premium",  price: "$14" },
  ],
  wine: [
    { name: "Caymus Cabernet 2021",   tier: "premium",  price: "$22" },
    { name: "Whispering Angel Rosé",  tier: "standard", price: "$16" },
  ],
  food: [
    { name: "Wagyu Beef Sliders", tier: "premium",  price: "$24" },
    { name: "Charcuterie Board",  tier: "standard", price: "$18" },
  ],
  vape: [
    { name: "Acid Kuba Kuba",        tier: "standard", price: "$12" },
    { name: "CAO Flavours Honey",    tier: "mid",      price: "$15" },
  ],
};

const CRAFT_META: Array<{ id: string; label: string; icon: typeof Beer; color: string; desc: string }> = [
  { id: "cigar",  label: "SmokeCraft",  icon: Package, color: "#d4af37", desc: "Luxury cigar recommendations & pairings" },
  { id: "spirit", label: "PourCraft",   icon: Wine,    color: "#5b8def", desc: "Spirits & whiskey concierge experience" },
  { id: "beer",   label: "BrewCraft",   icon: Beer,    color: "#34d399", desc: "Craft beer discovery & flight builder" },
  { id: "vape",   label: "VapeCraft",   icon: Zap,     color: "#a78bfa", desc: "Premium vape & e-liquid matching" },
  { id: "food",   label: "Culinary",    icon: Layers,  color: "#f97316", desc: "Food pairings & menu integration" },
];

function StepProgress({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {STEPS.map((step, i) => {
        const Icon  = step.icon;
        const done  = i < current;
        const active = i === current;
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

function OptionChip({ label, selected, onClick, color = C.gold }: {
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

// ── Step 1: Venue Details ──────────────────────────────────────────────────────
function StepVenueDetails({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
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
          onFocus={e  => { e.target.style.borderColor = C.gold; }}
          onBlur={e   => { e.target.style.borderColor = C.border; }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Venue Type
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "cigar_lounge", label: "Cigar Lounge" },
            { value: "bar",          label: "Bar" },
            { value: "restaurant",   label: "Restaurant" },
            { value: "hotel",        label: "Hotel" },
            { value: "club",         label: "Club" },
            { value: "retail",       label: "Retail" },
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
            { value: "small",  label: "Small (1–2 staff)" },
            { value: "medium", label: "Medium (3–10 staff)" },
            { value: "large",  label: "Large (11+ staff)" },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.venueSize === opt.value} onClick={() => set("venueSize", opt.value)} />
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>
          Region / Location
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "US-East",  label: "US East" },
            { value: "US-West",  label: "US West" },
            { value: "US-South", label: "US South" },
            { value: "Europe",   label: "Europe" },
            { value: "Asia",     label: "Asia" },
            { value: "Other",    label: "Other" },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.venueLocation === opt.value} onClick={() => set("venueLocation", opt.value)} color="#34d399" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Craft Selection ────────────────────────────────────────────────────
function StepCraftSelection({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
  function toggle(id: string) {
    const cur = data.selectedCrafts;
    set("selectedCrafts", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 4 }}>
        Select the experience modules to activate at your venue. Each craft has its own AI-guided recommendation engine and default product catalog.
      </div>
      {CRAFT_META.map(craft => {
        const Icon     = craft.icon;
        const selected = data.selectedCrafts.includes(craft.id);
        return (
          <motion.button
            key={craft.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggle(craft.id)}
            style={{
              display: "flex", gap: 14, padding: "16px", borderRadius: 14, cursor: "pointer",
              textAlign: "left",
              background: selected ? `${craft.color}08` : C.card,
              border: `2px solid ${selected ? craft.color : C.border}`,
              transition: "all 0.2s",
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: selected ? `${craft.color}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected ? craft.color : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={18} color={selected ? craft.color : "rgba(232,224,200,0.3)"} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: selected ? craft.color : C.text, marginBottom: 3 }}>
                {craft.label}
              </div>
              <div style={{ fontSize: 12, color: C.dim }}>{craft.desc}</div>
            </div>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0, alignSelf: "center",
              border: `2px solid ${selected ? craft.color : "rgba(255,255,255,0.15)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {selected && <div style={{ width: 12, height: 12, borderRadius: "50%", background: craft.color }} />}
            </div>
          </motion.button>
        );
      })}
      {data.selectedCrafts.length === 0 && (
        <div style={{ fontSize: 12, color: "#ef4444", textAlign: "center", paddingTop: 4 }}>
          Select at least one craft module to continue.
        </div>
      )}
    </div>
  );
}

// ── Step 3: Inventory Preview ──────────────────────────────────────────────────
function StepInventoryPreview({ data, onQtyChange }: {
  data: WizardData;
  onQtyChange: (qtys: Record<string, number>) => void;
}) {
  const crafts = data.selectedCrafts.length > 0 ? data.selectedCrafts : ["cigar", "spirit"];
  const tierColor = (tier: string) =>
    tier === "premium" ? "#d4af37" : tier === "mid" ? "#a78bfa" : "#5b8def";

  function getQty(name: string) { return data.inventoryQtys[name] ?? 20; }
  function adjustQty(name: string, delta: number) {
    onQtyChange({ ...data.inventoryQtys, [name]: Math.max(0, Math.min(999, getQty(name) + delta)) });
  }

  const qBtn = (label: string, onClick: () => void): React.ReactNode => (
    <button key={label} onClick={onClick} style={{
      width: 24, height: 24, borderRadius: 6, cursor: "pointer", flexShrink: 0,
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
      color: "rgba(232,224,200,0.7)", fontSize: 12, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
        Set opening inventory quantities for each product. These values are seeded on launch and editable any time.
      </div>
      {crafts.map(craftId => {
        const meta     = CRAFT_META.find(c => c.id === craftId);
        const products = PREVIEW_CATALOG[craftId] ?? [];
        if (!products.length) return null;
        return (
          <div key={craftId}>
            <div style={{ fontSize: 11, fontWeight: 700, color: meta?.color ?? C.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              {meta?.label ?? craftId}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {products.map(p => (
                <div key={p.name} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 14px", borderRadius: 10,
                  background: C.card, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{p.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: tierColor(p.tier), letterSpacing: "0.08em" }}>{p.tier}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {qBtn("−−", () => adjustQty(p.name, -5))}
                    {qBtn("−",  () => adjustQty(p.name, -1))}
                    <span style={{ minWidth: 32, textAlign: "center", fontSize: 13, fontWeight: 700, color: C.text }}>{getQty(p.name)}</span>
                    {qBtn("+",  () => adjustQty(p.name, +1))}
                    {qBtn("++", () => adjustQty(p.name, +5))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{
        padding: "12px 16px", borderRadius: 12,
        background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)",
        fontSize: 12, color: "rgba(232,224,200,0.5)", lineHeight: 1.6,
      }}>
        {crafts.length > 0
          ? `${crafts.reduce((n, c) => n + (PREVIEW_CATALOG[c]?.length ?? 0), 0)} products across ${crafts.length} craft module${crafts.length > 1 ? "s" : ""}.`
          : "No crafts selected — select crafts in the previous step."}
      </div>
    </div>
  );
}

interface AiPreviewConfig {
  tonePreset:           string;
  experienceGoal:       string;
  upsellIntensity:      number;
  loyaltyWeight:        number;
  maxRecommendations:   number;
  pricingStrategy?:     { tier?: string; targetMarginPct?: number };
  experienceFlowWeights?: { flavor: number; strength: number; balance: number; mood: number };
}

// ── Step 4: AI Config Preview ─────────────────────────────────────────────────
function StepAiPreview({ data, set }: { data: WizardData; set: (k: keyof WizardData, v: string | string[]) => void }) {
  const [preview,  setPreview]  = useState<AiPreviewConfig | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [previewErr, setPreviewErr] = useState(false);

  function toggleCat(c: string) {
    const cur = data.aiFocusCategories;
    set("aiFocusCategories", cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  }

  // Debounced live preview — call /api/ai/configure every time inputs change
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setPreviewErr(false);
      try {
        const r = await fetch("/api/ai/configure", {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body:    JSON.stringify({
            venueType:         data.venueType,
            menuSize:          data.venueSize as "small" | "medium" | "large",
            targetDemographic: data.aiTone,
            focusCategories:   data.aiFocusCategories,
            experienceGoal:    data.aiGoal,
            location:          data.venueLocation || "US-East",
            pricingTier:       data.pricingTier as "budget" | "mid" | "premium" | "luxury",
          }),
        });
        if (!r.ok) { setPreviewErr(true); return; }
        const j = await r.json() as { config?: AiPreviewConfig };
        if (!cancelled) setPreview(j.config ?? null);
      } catch { if (!cancelled) setPreviewErr(true); }
      finally   { if (!cancelled) setLoading(false); }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [data.aiTone, data.aiGoal, data.aiFocusCategories, data.venueType, data.venueLocation, data.venueSize, data.pricingTier]);

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
          Pricing Tier
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { value: "budget",  label: "Budget"    },
            { value: "mid",     label: "Mid-Range" },
            { value: "premium", label: "Premium"   },
            { value: "luxury",  label: "Luxury"    },
          ].map(opt => (
            <OptionChip key={opt.value} label={opt.label} selected={data.pricingTier === opt.value} onClick={() => set("pricingTier", opt.value)} color="#f97316" />
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

      {/* Live AI strategy cards */}
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)",
        fontSize: 12, lineHeight: 1.6,
      }}>
        {loading ? (
          <span style={{ color: "rgba(167,139,250,0.5)" }}>Generating AI strategy…</span>
        ) : previewErr ? (
          <span style={{ color: "rgba(232,224,200,0.4)" }}>Preview available after authentication. Your config will be applied on launch.</span>
        ) : preview ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StratCard label="Tone"         value={preview.tonePreset}                          color="#a78bfa" />
              <StratCard label="Goal"         value={preview.experienceGoal}                      color="#d4af37" />
              <StratCard label="Upsell"       value={`${Math.round(preview.upsellIntensity * 100)}%`} color="#f59e0b" />
              <StratCard label="Loyalty"      value={`${Math.round(preview.loyaltyWeight * 100)}%`}   color="#34d399" />
              <StratCard label="Recs"         value={`${preview.maxRecommendations} items`}       color="#5b8def" />
              {preview.pricingStrategy?.targetMarginPct != null && (
                <StratCard label="Target Margin" value={`${preview.pricingStrategy.targetMarginPct}%`} color="#f97316" />
              )}
            </div>
            {preview.experienceFlowWeights && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                {Object.entries(preview.experienceFlowWeights).map(([k, v]) => (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                    <div style={{
                      height: 4, borderRadius: 2,
                      background: "rgba(167,139,250,0.15)",
                      overflow: "hidden",
                    }}>
                      <div style={{ width: `${Math.round(v * 100 / 0.35 * 100)}%`, height: "100%", background: "#a78bfa", borderRadius: 2, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(167,139,250,0.7)", marginTop: 3 }}>{Math.round(v * 100)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "rgba(232,224,200,0.4)" }}>Select options above to preview your AI configuration.</span>
        )}
      </div>
    </div>
  );
}

function StratCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 8,
      background: `${color}08`, border: `1px solid ${color}20`,
      textAlign: "center", minWidth: 72,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Step 5: Go Live ────────────────────────────────────────────────────────────
function StepGoLive({ data, launching }: { data: WizardData; launching: boolean }) {
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<"idle" | "countdown" | "go">("idle");

  useEffect(() => {
    if (!launching) { setCount(5); setPhase("idle"); return; }
    setPhase("countdown");
    let c = 5;
    setCount(c);
    const t = setInterval(() => {
      c--;
      if (c <= 0) { clearInterval(t); setPhase("go"); }
      else setCount(c);
    }, 800);
    return () => clearInterval(t);
  }, [launching]);

  if (launching) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <AnimatePresence mode="wait">
          {phase !== "go" ? (
            <motion.div
              key={count}
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ fontSize: 80, fontWeight: 900, color: C.gold, lineHeight: 1 }}
            >
              {count}
            </motion.div>
          ) : (
            <motion.div
              key="go"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              style={{ fontSize: 42, fontWeight: 900, color: "#34d399", letterSpacing: "0.06em" }}
            >
              GO LIVE!
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: 20, fontSize: 12, color: C.dim }}
        >
          {phase === "go" ? "Applying your configuration…" : "Preparing Axiom OS…"}
        </motion.div>
      </div>
    );
  }

  const summary = [
    { label: "Venue",          value: data.venueName || "(unnamed)" },
    { label: "Type",           value: data.venueType.replace("_", " ") },
    { label: "Size",           value: data.venueSize },
    { label: "Region",         value: data.venueLocation || "Not specified" },
    { label: "Active Crafts",  value: data.selectedCrafts.join(", ") || "none" },
    { label: "Pricing Tier",   value: data.pricingTier },
    { label: "AI Tone",        value: data.aiTone },
    { label: "Goal",           value: data.aiGoal },
    { label: "Focus",          value: data.aiFocusCategories.join(", ") || "all" },
    { label: "Products Seeded",value: `${data.selectedCrafts.reduce((n, c) => n + (PREVIEW_CATALOG[c]?.length ?? 0), 0)} items` },
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

// ── Main Wizard ────────────────────────────────────────────────────────────────

export default function OnboardWizard() {
  const [, navigate]  = useLocation();
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState<WizardData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const set = useCallback((k: keyof WizardData, v: string | string[]) => {
    setData(prev => ({ ...prev, [k]: v }));
  }, []);

  const setQtys = useCallback((qtys: Record<string, number>) => {
    setData(prev => ({ ...prev, inventoryQtys: qtys }));
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
        return json.id;
      }
    } catch { /* non-fatal */ }
    return null;
  }

  async function patchStep(sid: string, stepId: string) {
    try {
      await fetch(`/api/onboarding/${sid}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body:    JSON.stringify({
          step:           stepId,
          data:           { venueName: data.venueName, venueType: data.venueType, venueSize: data.venueSize, aiTone: data.aiTone, aiGoal: data.aiGoal, inventoryQtys: data.inventoryQtys },
          selectedCrafts: data.selectedCrafts,
        }),
      });
    } catch { /* non-fatal */ }
  }

  async function handleNext() {
    // Validate craft selection step
    if (STEPS[step]?.id === "craft_selection" && data.selectedCrafts.length === 0) {
      setError("Please select at least one craft module.");
      return;
    }
    setError(null);

    let sid = sessionId;
    if (step === 0 && !sid) {
      sid = await startSession();
    }
    if (sid) await patchStep(sid, STEPS[step]!.id);
    if (step < STEPS.length - 1) setStep(s => s + 1);
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      let sid = sessionId;
      if (!sid) sid = await startSession();

      if (sid) {
        await patchStep(sid, "go_live");
        const completeRes = await fetch(`/api/onboarding/${sid}/complete`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body:    JSON.stringify({ inventoryQtys: data.inventoryQtys }),
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
          location:          data.venueLocation || "US-East",
          pricingTier:       data.pricingTier as "budget" | "mid" | "premium" | "luxury",
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
  const Icon        = currentStep.icon;
  const isLast      = step === STEPS.length - 1;

  const stepContent: Record<string, React.ReactNode> = {
    venue_info:        <StepVenueDetails     data={data} set={set} />,
    craft_selection:   <StepCraftSelection   data={data} set={set} />,
    inventory_preview: <StepInventoryPreview data={data} onQtyChange={setQtys} />,
    ai_preview:        <StepAiPreview        data={data} set={set} />,
    go_live:           <StepGoLive           data={data} launching={loading && isLast} />,
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
            <div style={{ fontSize: 12, color: C.dim }}>Experience Commerce OS</div>
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
              onClick={() => { setStep(s => s - 1); setError(null); }}
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
            {loading ? "Launching…" : isLast
              ? <><Rocket size={16} /> Launch Axiom OS</>
              : <>{STEPS[step + 1]?.label} <ChevronRight size={16} /></>
            }
          </motion.button>
        </div>
      </div>
    </BackgroundLayer>
  );
}
