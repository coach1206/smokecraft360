/**
 * EstablishmentSetupPage — /venue-setup
 *
 * Owner onboarding portal with three sections:
 *   1. Quick Start — 3-slide staff onboarding slideshow (60-second brief)
 *   2. Staff — create staff IDs, assign sections and tables
 *   3. Inventory — intake cigar/spirit/beer stock with flavor profiles
 *
 * Design: Industrial-Luxe Back-Office — dark charcoal header bezel,
 * Smoked Cream body, Warm Honey Amber accents.
 */

import { useState }        from "react";
import { useLocation }     from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, ChevronLeft, Users, Package,
  Play, Plus, Check, Zap, Star, TrendingUp, Shield,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:        "#F5F2ED",
  dark:      "#1A1A1B",
  graphite:  "#2A2A2A",
  gold:      "#D48B00",
  goldDim:   "rgba(212,139,0,0.55)",
  text:      "#1A1A1B",
  muted:     "#6B5E4E",
  border:    "rgba(26,26,27,0.10)",
  card:      "rgba(255,255,255,0.70)",
  cardBorder:"rgba(26,26,27,0.09)",
};

// ── Staff Onboarding Slides (spec requirement) ────────────────────────────────

const SLIDES = [
  {
    id:    1,
    icon:  TrendingUp,
    color: "#16a34a",
    tag:   "Slide 1 of 3",
    title: "How the Game Drives Tips",
    subtitle: "Expert guests spend 20% more.",
    body: [
      "NOVEE OS turns every visit into a personalized discovery session. Guests earn Mastery Points as they explore — and higher-tier guests (Craftsmen, Sommeliers) spend an average of 20% more per visit.",
      "Your role: guide them to their next level. A single well-placed recommendation can move a guest from Apprentice to Craftsman — and they'll remember you for it.",
    ],
    callout: "Craftsmanship-level guests tip 20% more on average.",
    calloutColor: "#16a34a",
  },
  {
    id:    2,
    icon:  Zap,
    color: "#D48B00",
    tag:   "Slide 2 of 3",
    title: "Understanding the Nudge",
    subtitle: "Your Sage alert is a sales tool, not a suggestion.",
    body: [
      "When a guest finishes a Craft Draft, your Service Sage dashboard lights up with a REVENUE OPPORTUNITY — telling you exactly what to recommend and why.",
      "Example: \"Based on their Bold & Earthy draft, offer the Aged Reserva for a +15 Mastery Boost.\" That's not a guess — it's a calculated match based on their flavor fingerprint.",
    ],
    callout: "Use the recommendation word-for-word. It's already personalized.",
    calloutColor: "#D48B00",
  },
  {
    id:    3,
    icon:  Star,
    color: "#9333ea",
    tag:   "Slide 3 of 3",
    title: "Prestige Recognition",
    subtitle: "Recognizing high-level guests builds loyalty — and orders.",
    body: [
      "When a guest reaches Sommelier or Grand Master tier, acknowledge it. A brief \"I see you're a Sommelier here — let me show you something special\" creates a powerful moment of recognition.",
      "These guests are your ambassadors. They return more often, spend more, and bring friends. Treat their status as a VIP signal.",
    ],
    callout: "Sommelier-tier guests return 3× more often than new Explorer guests.",
    calloutColor: "#9333ea",
  },
];

// ── Inventory categories ──────────────────────────────────────────────────────

const CATEGORIES = ["cigar", "spirit", "beer", "wine", "cocktail"];

// ── Main component ────────────────────────────────────────────────────────────

export default function EstablishmentSetupPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"quickstart" | "staff" | "inventory">("quickstart");

  // Slide state
  const [slide, setSlide] = useState(0);

  // Staff form
  const [staffForm, setStaffForm] = useState({ staffName: "", staffPin: "", assignedSection: "", assignedTables: "" });
  const [staffList, setStaffList] = useState<typeof staffForm[]>([]);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError]   = useState("");
  const [staffSuccess, setStaffSuccess] = useState(false);

  // Inventory form
  const [invForm, setInvForm] = useState({
    name: "", category: "cigar", quantity: "", costCents: "",
    premiumTier: "1", body: "", notes: "",
  });
  const [invList,  setInvList]    = useState<typeof invForm[]>([]);
  const [invSaving, setInvSaving] = useState(false);
  const [invError,  setInvError]  = useState("");
  const [invSuccess, setInvSuccess] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const token = () => localStorage.getItem("auth_token") ?? "";

  // ── Staff submit ─────────────────────────────────────────────────────────

  async function addStaff() {
    if (!staffForm.staffName.trim() || !staffForm.staffPin.match(/^\d{4}$/)) {
      setStaffError("Name and a 4-digit PIN are required."); return;
    }
    setStaffSaving(true); setStaffError("");
    try {
      await fetch(`${BASE}/api/venue-setup/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          staffName:       staffForm.staffName,
          staffPin:        staffForm.staffPin,
          assignedSection: staffForm.assignedSection || undefined,
          assignedTables:  staffForm.assignedTables
            ? staffForm.assignedTables.split(",").map(t => t.trim())
            : undefined,
        }),
      });
      setStaffList(prev => [...prev, { ...staffForm }]);
      setStaffForm({ staffName: "", staffPin: "", assignedSection: "", assignedTables: "" });
      setStaffSuccess(true);
      setTimeout(() => setStaffSuccess(false), 2000);
    } catch { setStaffError("Failed to save staff. Please retry."); }
    finally { setStaffSaving(false); }
  }

  // ── Inventory submit ─────────────────────────────────────────────────────

  async function addInventoryItem() {
    if (!invForm.name.trim() || !invForm.quantity) {
      setInvError("Item name and quantity are required."); return;
    }
    setInvSaving(true); setInvError("");
    try {
      await fetch(`${BASE}/api/venue-setup/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          venueId: "00000000-0000-0000-0000-000000000001",  // placeholder — real app uses venue context
          items: [{
            name:        invForm.name,
            category:    invForm.category,
            quantity:    parseInt(invForm.quantity) || 0,
            costCents:   invForm.costCents ? parseInt(invForm.costCents) * 100 : undefined,
            premiumTier: parseInt(invForm.premiumTier) || 1,
            flavorProfile: invForm.body || invForm.notes
              ? { body: invForm.body || undefined, notes: invForm.notes ? invForm.notes.split(",").map(n => n.trim()) : undefined }
              : undefined,
          }],
        }),
      });
      setInvList(prev => [...prev, { ...invForm }]);
      setInvForm({ name: "", category: "cigar", quantity: "", costCents: "", premiumTier: "1", body: "", notes: "" });
      setInvSuccess(true);
      setTimeout(() => setInvSuccess(false), 2000);
    } catch { setInvError("Failed to save item. Please retry."); }
    finally { setInvSaving(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{
        background:   C.graphite,
        padding:      "14px 24px",
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        borderBottom: "1px solid rgba(212,139,0,0.18)",
      }}>
        <button
          onClick={() => navigate("/admin/intel")}
          style={{ background: "none", border: "none", color: "rgba(240,232,212,0.45)", cursor: "pointer", display: "flex" }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F5F2ED", letterSpacing: "0.08em" }}>
            Establishment Setup
          </div>
          <div style={{ fontSize: "0.62rem", color: "rgba(212,139,0,0.6)", letterSpacing: "0.10em", textTransform: "uppercase" }}>
            NOVEE OS · Owner Portal
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{
        display:      "flex",
        background:   "#fff",
        borderBottom: `1px solid ${C.border}`,
        boxShadow:    "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        {([
          { id: "quickstart", label: "Quick Start", icon: Play },
          { id: "staff",      label: "Staff",       icon: Users },
          { id: "inventory",  label: "Inventory",   icon: Package },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex:          1,
              padding:       "13px 4px",
              background:    "none",
              border:        "none",
              borderBottom:  tab === id ? `2px solid ${C.gold}` : "2px solid transparent",
              color:         tab === id ? C.gold : C.muted,
              fontSize:      "0.66rem",
              fontWeight:    600,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              cursor:        "pointer",
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              gap:           5,
              transition:    "all 0.15s",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}>

        {/* ───── QUICK START TAB ───── */}
        {tab === "quickstart" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>
                Staff Onboarding · 60-Second Brief
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: C.text }}>
                Three things every team member needs to know.
              </div>
            </div>

            {/* Slide card */}
            <AnimatePresence mode="wait">
              {(() => {
                const s = SLIDES[slide]!;
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                      background:   "#fff",
                      border:       `1px solid ${C.cardBorder}`,
                      borderRadius: 16,
                      padding:      "32px 28px",
                      marginBottom: 20,
                      boxShadow:    "0 2px 16px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: `${s.color}18`,
                        border: `1px solid ${s.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={18} color={s.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.58rem", color: C.muted, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                          {s.tag}
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text }}>
                          {s.title}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: "0.78rem", color: C.muted, fontStyle: "italic",
                      marginBottom: 16, lineHeight: 1.4,
                    }}>
                      {s.subtitle}
                    </div>

                    {s.body.map((para, i) => (
                      <p key={i} style={{
                        fontSize: "0.8rem", color: C.text, lineHeight: 1.65,
                        marginBottom: 12, margin: "0 0 12px",
                      }}>
                        {para}
                      </p>
                    ))}

                    <div style={{
                      marginTop:    20,
                      background:   `${s.calloutColor}0d`,
                      border:       `1px solid ${s.calloutColor}30`,
                      borderLeft:   `3px solid ${s.calloutColor}`,
                      borderRadius: 8,
                      padding:      "10px 14px",
                      fontSize:     "0.74rem",
                      fontWeight:   600,
                      color:        s.calloutColor,
                      lineHeight:   1.4,
                    }}>
                      {s.callout}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Slide nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={() => setSlide(s => Math.max(0, s - 1))}
                disabled={slide === 0}
                style={{
                  display:    "flex", alignItems: "center", gap: 6,
                  padding:    "10px 18px",
                  background: slide === 0 ? "rgba(26,26,27,0.04)" : C.graphite,
                  border:     `1px solid ${slide === 0 ? C.border : "transparent"}`,
                  borderRadius: 8,
                  color:      slide === 0 ? C.muted : "#F5F2ED",
                  fontSize:   "0.72rem", fontWeight: 600,
                  cursor:     slide === 0 ? "default" : "pointer",
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <div style={{ display: "flex", gap: 6 }}>
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    style={{
                      width: slide === i ? 20 : 8, height: 8,
                      borderRadius: 4,
                      background: slide === i ? C.gold : "rgba(26,26,27,0.15)",
                      border: "none", cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>

              {slide < SLIDES.length - 1 ? (
                <button
                  onClick={() => setSlide(s => Math.min(SLIDES.length - 1, s + 1))}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 18px",
                    background: C.gold,
                    border: "none", borderRadius: 8,
                    color: "#fff", fontSize: "0.72rem", fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setTab("staff")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 18px",
                    background: C.graphite,
                    border: "none", borderRadius: 8,
                    color: C.gold, fontSize: "0.72rem", fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Set Up Staff <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ───── STAFF TAB ───── */}
        {tab === "staff" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>
                Staff Management
              </div>
              <div style={{ fontSize: "0.74rem", color: C.muted }}>
                Create staff IDs and assign them to sections or tables.
              </div>
            </div>

            {/* Add staff form */}
            <div style={{
              background: "#fff", border: `1px solid ${C.cardBorder}`,
              borderRadius: 14, padding: "22px 24px", marginBottom: 24,
              boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
                Add Staff Member
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {[
                  { key: "staffName",  label: "Full Name",     placeholder: "e.g. Marcus Rivera" },
                  { key: "staffPin",   label: "4-Digit PIN",   placeholder: "e.g. 1234",  type: "tel", maxLength: 4 },
                ].map(({ key, label, placeholder, type, maxLength }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                      {label}
                    </label>
                    <input
                      type={type ?? "text"}
                      maxLength={maxLength}
                      placeholder={placeholder}
                      value={(staffForm as Record<string, string>)[key]}
                      onChange={e => setStaffForm(p => ({ ...p, [key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "9px 12px",
                        background: "#F9F8F6", border: `1px solid ${C.border}`,
                        borderRadius: 8, fontSize: "0.78rem", color: C.text,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { key: "assignedSection", label: "Section (optional)", placeholder: "e.g. Main Floor, Patio" },
                  { key: "assignedTables",  label: "Tables (comma-separated)", placeholder: "e.g. Table 1, Table 2" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                      {label}
                    </label>
                    <input
                      placeholder={placeholder}
                      value={(staffForm as Record<string, string>)[key]}
                      onChange={e => setStaffForm(p => ({ ...p, [key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "9px 12px",
                        background: "#F9F8F6", border: `1px solid ${C.border}`,
                        borderRadius: 8, fontSize: "0.78rem", color: C.text,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              {staffError && <div style={{ fontSize: "0.7rem", color: "#ef4444", marginBottom: 10 }}>{staffError}</div>}

              <button
                onClick={addStaff}
                disabled={staffSaving}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 22px",
                  background: staffSaving ? "rgba(212,139,0,0.6)" : C.gold,
                  border: "none", borderRadius: 8,
                  color: "#fff", fontSize: "0.74rem", fontWeight: 700,
                  cursor: staffSaving ? "default" : "pointer",
                }}
              >
                {staffSuccess ? <Check size={14} /> : <Plus size={14} />}
                {staffSuccess ? "Added!" : staffSaving ? "Saving…" : "Add Staff Member"}
              </button>
            </div>

            {/* Staff list */}
            {staffList.length > 0 && (
              <div>
                <div style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
                  Added This Session ({staffList.length})
                </div>
                {staffList.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#fff", border: `1px solid ${C.cardBorder}`,
                    borderRadius: 10, padding: "10px 14px", marginBottom: 8,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(212,139,0,0.10)", border: `1px solid rgba(212,139,0,0.22)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, color: C.gold, fontWeight: 700,
                    }}>
                      {s.staffName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: C.text }}>{s.staffName}</div>
                      <div style={{ fontSize: "0.62rem", color: C.muted }}>
                        {s.assignedSection && `${s.assignedSection} · `}PIN: ••••
                      </div>
                    </div>
                    <Shield size={13} color="rgba(34,197,94,0.7)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───── INVENTORY TAB ───── */}
        {tab === "inventory" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>
                Inventory Intake
              </div>
              <div style={{ fontSize: "0.74rem", color: C.muted }}>
                List your stock. The AI Sage uses this to tailor guest nudges to your actual menu.
              </div>
            </div>

            {/* Add inventory form */}
            <div style={{
              background: "#fff", border: `1px solid ${C.cardBorder}`,
              borderRadius: 14, padding: "22px 24px", marginBottom: 24,
              boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
                Add Item
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                    Item Name
                  </label>
                  <input
                    placeholder="e.g. Aged Reserva Maduro"
                    value={invForm.name}
                    onChange={e => setInvForm(p => ({ ...p, name: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                    Category
                  </label>
                  <select
                    value={invForm.category}
                    onChange={e => setInvForm(p => ({ ...p, category: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                    Qty in Stock
                  </label>
                  <input
                    type="number" min="0"
                    placeholder="e.g. 12"
                    value={invForm.quantity}
                    onChange={e => setInvForm(p => ({ ...p, quantity: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                    Price ($)
                  </label>
                  <input
                    type="number" min="0" placeholder="e.g. 28"
                    value={invForm.costCents}
                    onChange={e => setInvForm(p => ({ ...p, costCents: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                    Premium Tier (1–5)
                  </label>
                  <select
                    value={invForm.premiumTier}
                    onChange={e => setInvForm(p => ({ ...p, premiumTier: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                  >
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["Entry","Standard","Premium","Reserve","Ultra-Premium"][n-1]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                    Flavor Body
                  </label>
                  <input
                    placeholder="full / medium / light"
                    value={invForm.body}
                    onChange={e => setInvForm(p => ({ ...p, body: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.64rem", color: C.muted, marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em" }}>
                  Flavor Notes (comma-separated)
                </label>
                <input
                  placeholder="e.g. cocoa, earth, cedar, leather"
                  value={invForm.notes}
                  onChange={e => setInvForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.78rem", color: C.text, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {invError && <div style={{ fontSize: "0.7rem", color: "#ef4444", marginBottom: 10 }}>{invError}</div>}

              <button
                onClick={addInventoryItem}
                disabled={invSaving}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 22px",
                  background: invSaving ? "rgba(212,139,0,0.6)" : C.gold,
                  border: "none", borderRadius: 8,
                  color: "#fff", fontSize: "0.74rem", fontWeight: 700,
                  cursor: invSaving ? "default" : "pointer",
                }}
              >
                {invSuccess ? <Check size={14} /> : <Plus size={14} />}
                {invSuccess ? "Added!" : invSaving ? "Saving…" : "Add to Inventory"}
              </button>
            </div>

            {/* Inventory list */}
            {invList.length > 0 && (
              <div>
                <div style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
                  Added This Session ({invList.length})
                </div>
                {invList.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#fff", border: `1px solid ${C.cardBorder}`,
                    borderRadius: 10, padding: "10px 14px", marginBottom: 8,
                  }}>
                    <div style={{
                      padding: "3px 8px", borderRadius: 6,
                      background: "rgba(212,139,0,0.10)", border: `1px solid rgba(212,139,0,0.20)`,
                      fontSize: "0.58rem", fontWeight: 700, color: C.gold, textTransform: "uppercase",
                    }}>
                      {item.category}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: C.text }}>{item.name}</div>
                      <div style={{ fontSize: "0.62rem", color: C.muted }}>
                        Qty: {item.quantity} · Tier {item.premiumTier}
                        {item.body && ` · ${item.body}`}
                        {item.notes && ` · ${item.notes}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
