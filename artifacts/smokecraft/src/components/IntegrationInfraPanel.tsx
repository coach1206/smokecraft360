/**
 * IntegrationInfraPanel — Phase 3 UI: Venue API Management Center
 *
 * Displays all configured integration providers for the venue,
 * allows adding/editing/testing connections, and shows health status.
 * Wired to /api/integration-kernel routes.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Provider {
  id: string;
  providerName: string;
  providerType: string;
  displayName: string;
  isActive: boolean;
  isPrimary: boolean;
  lastHealthStatus: string;
  lastTestedAt: string | null;
  lastUsedAt: string | null;
  endpointUrl: string | null;
  errorMessage: string | null;
}

interface CatalogueEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  authType: string;
  isCustom: boolean;
  supportsWebhook: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI Providers",
  pos: "POS Systems",
  payment: "Payment",
  music: "Music & Audio",
  lighting: "Lighting",
  sensor: "Sensors",
  crm: "CRM & Comms",
  booking: "Booking",
  voice: "Voice",
  analytics: "Analytics",
  device: "Devices",
  custom: "Custom APIs",
};

const HEALTH_COLOR: Record<string, string> = {
  healthy:        "#32B45A",
  degraded:       "#C8A00A",
  failed:         "#C84A4A",
  fallback_active:"#C87028",
  unchecked:      "rgba(212,175,55,0.40)",
};

const HEALTH_LABEL: Record<string, string> = {
  healthy:        "Healthy",
  degraded:       "Degraded",
  failed:         "Failed",
  fallback_active:"Fallback",
  unchecked:      "Not Tested",
};

interface Props {
  venueId: string;
  GOLD: string;
  CREAM: string;
}

type View = "list" | "catalogue" | "add" | "test";

export function IntegrationInfraPanel({ venueId, GOLD, CREAM }: Props) {
  const [view, setView] = useState<View>("list");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latencyMs: number | null; error: string | null } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ providerName: "", providerType: "ai", displayName: "", apiKey: "", endpointUrl: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integration-kernel/venues/${venueId}/providers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("novee_staff_pin") ?? ""}` },
      });
      if (res.ok) {
        const data = await res.json() as { providers: Provider[] };
        setProviders(data.providers);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [venueId]);

  const loadCatalogue = useCallback(async () => {
    try {
      const res = await fetch("/api/integration-kernel/catalogue");
      if (res.ok) {
        const data = await res.json() as { providers: CatalogueEntry[] };
        setCatalogue(data.providers);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void loadProviders(); void loadCatalogue(); }, [loadProviders, loadCatalogue]);

  async function handleTest(providerId: string) {
    setTestingId(providerId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integration-kernel/venues/${venueId}/providers/${providerId}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("novee_staff_pin") ?? ""}` },
      });
      if (res.ok) {
        const data = await res.json() as { status: string; latencyMs: number | null; error: string | null };
        setTestResult(data);
        void loadProviders();
      }
    } catch { setTestResult({ status: "failed", latencyMs: null, error: "Network error" }); }
    finally { setTestingId(null); }
  }

  async function handleAdd() {
    if (!addForm.providerName) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const body: Record<string, unknown> = {
        providerName: addForm.providerName,
        providerType: addForm.providerType,
        displayName:  addForm.displayName || addForm.providerName,
        endpointUrl:  addForm.endpointUrl || null,
      };
      if (addForm.apiKey) body["credentials"] = { apiKey: addForm.apiKey };

      const res = await fetch(`/api/integration-kernel/venues/${venueId}/providers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("novee_staff_pin") ?? ""}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setAddError(err.error ?? "Failed to add provider");
      } else {
        setAddForm({ providerName: "", providerType: "ai", displayName: "", apiKey: "", endpointUrl: "" });
        setView("list");
        void loadProviders();
      }
    } catch { setAddError("Network error — try again"); }
    finally { setAddLoading(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/integration-kernel/venues/${venueId}/providers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("novee_staff_pin") ?? ""}` },
    });
    void loadProviders();
  }

  async function handleSetPrimary(id: string) {
    await fetch(`/api/integration-kernel/venues/${venueId}/providers/${id}/set-primary`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("novee_staff_pin") ?? ""}` },
    });
    void loadProviders();
  }

  const filteredCatalogue = selectedCategory === "all"
    ? catalogue
    : catalogue.filter(c => c.category === selectedCategory);

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>INTEGRATION INFRASTRUCTURE</div>
          <div style={{ fontSize: 9, color: `${GOLD}55`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif", marginTop: 1 }}>UNIVERSAL PROVIDER ORCHESTRATION</div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {(["list", "catalogue", "add"] as View[]).map(v => (
            <motion.button key={v} type="button" whileTap={{ scale: 0.95 }} onClick={() => setView(v)}
              style={{ padding: "4px 9px", borderRadius: 5, border: `1px solid ${view === v ? GOLD + "66" : GOLD + "22"}`, background: view === v ? `rgba(212,175,55,0.14)` : "transparent", color: view === v ? GOLD : `${GOLD}55`, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
              {v === "list" ? "MY PROVIDERS" : v === "catalogue" ? "CATALOGUE" : "+ ADD"}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Provider list ── */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "20px", color: `${GOLD}55`, fontSize: 11, fontFamily: "'Inter',sans-serif", letterSpacing: "0.14em" }}>LOADING PROVIDERS...</div>
            )}
            {!loading && providers.length === 0 && (
              <div style={{ padding: "18px 14px", borderRadius: 10, background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD}18`, textAlign: "center" }}>
                <div style={{ fontSize: 22, color: `${GOLD}40`, marginBottom: 6 }}>⟡</div>
                <div style={{ fontSize: 11, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>NO PROVIDERS CONFIGURED</div>
                <div style={{ fontSize: 9, color: `${GOLD}33`, fontFamily: "'Inter',sans-serif", marginTop: 3 }}>Add your first provider to begin orchestration</div>
              </div>
            )}
            {providers.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: "11px 13px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: `1px solid ${p.isActive ? HEALTH_COLOR[p.lastHealthStatus] + "33" : "rgba(255,255,255,0.08)"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: HEALTH_COLOR[p.lastHealthStatus] ?? HEALTH_COLOR["unchecked"], boxShadow: `0 0 5px ${HEALTH_COLOR[p.lastHealthStatus] ?? HEALTH_COLOR["unchecked"]}` }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{p.displayName || p.providerName}</div>
                      <div style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em", marginTop: 1 }}>
                        {CATEGORY_LABELS[p.providerType] ?? p.providerType.toUpperCase()} {p.isPrimary ? "· PRIMARY" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ padding: "2px 7px", borderRadius: 4, background: `${HEALTH_COLOR[p.lastHealthStatus]}18`, border: `1px solid ${HEALTH_COLOR[p.lastHealthStatus]}44`, fontSize: 8, color: HEALTH_COLOR[p.lastHealthStatus], fontWeight: 700, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }}>
                      {HEALTH_LABEL[p.lastHealthStatus] ?? p.lastHealthStatus.toUpperCase()}
                    </div>
                    <motion.button type="button" whileTap={{ scale: 0.93 }}
                      onClick={() => void handleTest(p.id)}
                      disabled={testingId === p.id}
                      style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${GOLD}33`, background: "rgba(212,175,55,0.08)", color: testingId === p.id ? `${GOLD}44` : GOLD, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }}>
                      {testingId === p.id ? "..." : "TEST"}
                    </motion.button>
                    {!p.isPrimary && (
                      <motion.button type="button" whileTap={{ scale: 0.93 }} onClick={() => void handleSetPrimary(p.id)}
                        style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${GOLD}22`, background: "transparent", color: `${GOLD}66`, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }}>
                        PRIMARY
                      </motion.button>
                    )}
                    <motion.button type="button" whileTap={{ scale: 0.93 }} onClick={() => void handleDelete(p.id)}
                      style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(200,74,74,0.30)", background: "transparent", color: "#C84A4A", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                      ✕
                    </motion.button>
                  </div>
                </div>
                {testResult && testingId === null && p.id === providers.find(x => x.id === p.id)?.id && (
                  <div style={{ fontSize: 9, color: testResult.status === "healthy" ? "#32B45A" : "#C84A4A", fontFamily: "'Inter',sans-serif", marginTop: 3 }}>
                    Last test: {testResult.status} {testResult.latencyMs ? `· ${testResult.latencyMs}ms` : ""} {testResult.error ? `· ${testResult.error}` : ""}
                  </div>
                )}
                {p.lastTestedAt && (
                  <div style={{ fontSize: 8, color: `${GOLD}33`, fontFamily: "'Inter',sans-serif" }}>
                    Last tested: {new Date(p.lastTestedAt).toLocaleString()}
                  </div>
                )}
              </motion.div>
            ))}

            <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}15`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>{providers.length} PROVIDER{providers.length !== 1 ? "S" : ""} CONFIGURED</span>
              <span style={{ fontSize: 9, color: "#32B45A", fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>{providers.filter(p => p.lastHealthStatus === "healthy").length} HEALTHY</span>
            </div>
          </motion.div>
        )}

        {/* ── Catalogue ── */}
        {view === "catalogue" && (
          <motion.div key="catalogue" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
              {categories.map(c => (
                <motion.button key={c} type="button" whileTap={{ scale: 0.95 }} onClick={() => setSelectedCategory(c)}
                  style={{ flexShrink: 0, padding: "3px 9px", borderRadius: 5, border: `1px solid ${selectedCategory === c ? GOLD + "55" : GOLD + "18"}`, background: selectedCategory === c ? `rgba(212,175,55,0.12)` : "transparent", color: selectedCategory === c ? GOLD : `${GOLD}55`, fontSize: 8, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
                  {c === "all" ? "ALL" : (CATEGORY_LABELS[c] ?? c).toUpperCase()}
                </motion.button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {filteredCatalogue.map(p => (
                <div key={p.id} style={{ padding: "9px 11px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}15`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", marginTop: 1 }}>{CATEGORY_LABELS[p.category] ?? p.category} · {p.authType.replace("_"," ").toUpperCase()}</div>
                    <div style={{ fontSize: 9, color: `rgba(240,232,212,0.45)`, fontFamily: "'Inter',sans-serif", marginTop: 2, lineHeight: 1.4 }}>{p.description}</div>
                  </div>
                  <motion.button type="button" whileTap={{ scale: 0.95 }}
                    onClick={() => { setAddForm(f => ({ ...f, providerName: p.id, providerType: p.category, displayName: p.name })); setView("add"); }}
                    style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 5, border: `1px solid ${GOLD}44`, background: `rgba(212,175,55,0.10)`, color: GOLD, fontSize: 8, fontWeight: 700, cursor: "pointer", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
                    ADD
                  </motion.button>
                </div>
              ))}
              {filteredCatalogue.length === 0 && (
                <div style={{ textAlign: "center", padding: 14, color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>No providers in this category</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Add provider form ── */}
        {view === "add" && (
          <motion.div key="add" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ fontSize: 10, color: `${GOLD}66`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>CONFIGURE NEW PROVIDER</div>
            {[
              { key: "providerName", label: "Provider ID", placeholder: "e.g. openai, stripe, my_custom_api" },
              { key: "displayName",  label: "Display Name", placeholder: "e.g. OpenAI GPT-4" },
              { key: "endpointUrl",  label: "Endpoint URL (optional)", placeholder: "https://api.example.com/v1" },
              { key: "apiKey",       label: "API Key (encrypted at rest)", placeholder: "sk-..." },
            ].map(field => (
              <div key={field.key}>
                <div style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.14em", marginBottom: 3 }}>{field.label}</div>
                <input
                  type={field.key === "apiKey" ? "password" : "text"}
                  value={addForm[field.key as keyof typeof addForm]}
                  onChange={e => setAddForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", padding: "8px 11px", borderRadius: 7, border: `1px solid ${GOLD}33`, background: "rgba(255,255,255,0.04)", color: CREAM, fontSize: 11, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.14em", marginBottom: 3 }}>CATEGORY</div>
              <select value={addForm.providerType} onChange={e => setAddForm(f => ({ ...f, providerType: e.target.value }))}
                style={{ width: "100%", padding: "8px 11px", borderRadius: 7, border: `1px solid ${GOLD}33`, background: "#0A0600", color: CREAM, fontSize: 11, fontFamily: "'Inter',sans-serif", outline: "none" }}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {addError && (
              <div style={{ padding: "7px 10px", borderRadius: 6, background: "rgba(200,74,74,0.10)", border: "1px solid rgba(200,74,74,0.28)", color: "#F07070", fontSize: 10, fontFamily: "'Inter',sans-serif" }}>{addError}</div>
            )}
            <div style={{ display: "flex", gap: 7 }}>
              <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => void handleAdd()} disabled={addLoading || !addForm.providerName}
                style={{ flex: 1, padding: "10px", borderRadius: 7, border: `1px solid ${GOLD}55`, background: `rgba(212,175,55,0.16)`, color: addLoading ? `${GOLD}55` : GOLD, fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.16em", fontFamily: "'Inter',sans-serif" }}>
                {addLoading ? "SAVING..." : "SAVE PROVIDER"}
              </motion.button>
              <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => setView("list")}
                style={{ padding: "10px 14px", borderRadius: 7, border: `1px solid ${GOLD}22`, background: "transparent", color: `${GOLD}66`, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                CANCEL
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
