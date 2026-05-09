/**
 * AIProviderSetup — Enterprise AI Provider Ownership + Responsibility System
 *
 * Premium enterprise configuration experience for AXIOM OS venues.
 * Surfaces AI billing mode, BYOK connections, usage metering, and
 * the full API responsibility language for each package tier.
 */

import React, { useState, useEffect, useRef } from 'react';

/* ── Types ──────────────────────────────────────────────────────────────────── */

type BillingMode = 'axiom_managed' | 'byok';
type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'azure_openai';
type ProviderStatus = 'connected' | 'degraded' | 'disconnected' | 'pending_validation';
type Tab = 'overview' | 'providers' | 'usage' | 'failover' | 'admin';

interface BillingConfig {
  mode: BillingMode;
  axiomPackage: string;
  failoverEnabled: boolean;
  failoverChain: string[];
  byokPermitted: boolean;
  responsibilityStatement: string;
}

interface Provider {
  id: string;
  providerName: ProviderName;
  status: ProviderStatus;
  isPrimary: boolean;
  keyHint?: string;
  validated?: boolean;
  lastCheckedAt?: string;
  lastErrorMsg?: string;
}

interface UsageTotals {
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
}

/* ── Provider display config ─────────────────────────────────────────────────── */

const PROVIDER_META: Record<ProviderName | string, { label: string; color: string; signupUrl: string; logoLetter: string }> = {
  openai:       { label: 'OpenAI',        color: '#10a37f', signupUrl: 'https://platform.openai.com/signup',     logoLetter: 'O' },
  anthropic:    { label: 'Anthropic',     color: '#d4a843', signupUrl: 'https://console.anthropic.com/login',   logoLetter: 'A' },
  gemini:       { label: 'Google Gemini', color: '#4285f4', signupUrl: 'https://ai.google.dev',                 logoLetter: 'G' },
  azure_openai: { label: 'Azure OpenAI',  color: '#0078d4', signupUrl: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service', logoLetter: 'Z' },
};

const PACKAGE_LABELS: Record<string, { label: string; badge: string; color: string }> = {
  axiom_core:  { label: 'AXIOM CORE',  badge: 'INCLUDED',         color: '#888' },
  axiom_pro:   { label: 'AXIOM PRO',   badge: 'INCLUDED',         color: '#d4af37' },
  axiom_xei:   { label: 'AXIOM XEI',   badge: 'FLEXIBLE',         color: '#c084fc' },
  axiom_black: { label: 'AXIOM BLACK', badge: 'ENTERPRISE OWNED', color: '#e2e8f0' },
};

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

const BASE = '/api/enterprise-ai';
async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('axiom_token') ?? sessionStorage.getItem('axiom_token') ?? '';
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
}

/* ── Status badge ────────────────────────────────────────────────────────────── */

function StatusDot({ status }: { status: ProviderStatus | 'active' | 'byok' | string }) {
  const colors: Record<string, string> = {
    connected: '#22c55e', active: '#22c55e', degraded: '#f59e0b', disconnected: '#6b7280',
    pending_validation: '#3b82f6', byok: '#c084fc',
  };
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: colors[status] ?? '#6b7280',
      boxShadow: `0 0 6px ${colors[status] ?? '#6b7280'}88`,
      marginRight: 6, flexShrink: 0,
    }} />
  );
}

/* ── Section header ──────────────────────────────────────────────────────────── */

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.35em', color: '#d4af37', fontFamily: 'monospace', marginBottom: 4 }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{sub}</div>}
      <div style={{ height: 1, background: 'linear-gradient(90deg,rgba(212,175,55,0.35),transparent)', marginTop: 8 }} />
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────────── */

interface AIProviderSetupProps {
  venueId: string;
  userRole?: string;
}

export default function AIProviderSetup({ venueId, userRole = 'venue_owner' }: AIProviderSetupProps) {
  const [tab, setTab]                 = useState<Tab>('overview');
  const [config, setConfig]           = useState<BillingConfig | null>(null);
  const [providers, setProviders]     = useState<Provider[]>([]);
  const [usage, setUsage]             = useState<UsageTotals | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  // Connect-provider form
  const [connectOpen, setConnectOpen]         = useState(false);
  const [connectProviderName, setConnectProviderName] = useState<ProviderName>('openai');
  const [connectKey, setConnectKey]           = useState('');
  const [connectPrimary, setConnectPrimary]   = useState(false);
  const [connecting, setConnecting]           = useState(false);
  const [validating, setValidating]           = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [cfgRes, provRes, usageRes] = await Promise.all([
        apiFetch(`/billing-mode/${venueId}`),
        apiFetch(`/providers/${venueId}`),
        apiFetch(`/usage/${venueId}`),
      ]);
      if (cfgRes.ok)   setConfig(await cfgRes.json());
      if (provRes.ok)  setProviders((await provRes.json()).providers ?? []);
      if (usageRes.ok) setUsage((await usageRes.json()).totals);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [venueId]);

  async function setMode(mode: BillingMode) {
    if (!config) return;
    setSaving(true);
    try {
      const r = await apiFetch('/billing-mode', {
        method: 'PUT',
        body: JSON.stringify({ venueId, mode, axiomPackage: config.axiomPackage }),
      });
      if (r.ok) { setConfig({ ...config, mode }); showToast('AI billing mode updated.'); }
      else      { const e = await r.json(); showToast(e.error ?? 'Failed to update mode.', false); }
    } finally { setSaving(false); }
  }

  async function handleConnectProvider() {
    if (!connectKey.trim()) return;
    setConnecting(true);
    try {
      const r = await apiFetch('/providers/connect', {
        method: 'POST',
        body: JSON.stringify({ venueId, providerName: connectProviderName, apiKey: connectKey, isPrimary: connectPrimary }),
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`${PROVIDER_META[connectProviderName].label} connected. Validating…`);
        setConnectOpen(false);
        setConnectKey('');
        await loadAll();
        await validateProvider(data.providerId);
      } else {
        showToast(data.error ?? 'Connection failed.', false);
      }
    } finally { setConnecting(false); }
  }

  async function validateProvider(id: string) {
    setValidating(id);
    try {
      const r = await apiFetch(`/providers/${id}/validate`, { method: 'POST' });
      const d = await r.json();
      showToast(d.valid ? 'API key validated successfully.' : `Validation failed: ${d.errorMsg}`, d.valid);
      await loadAll();
    } finally { setValidating(null); }
  }

  async function disconnectProvider(id: string) {
    await apiFetch(`/providers/${id}`, { method: 'DELETE' });
    showToast('Provider disconnected.');
    await loadAll();
  }

  const isSuperAdmin = userRole === 'super_admin';
  const pkg   = config?.axiomPackage ?? 'axiom_core';
  const pkgMeta = PACKAGE_LABELS[pkg] ?? PACKAGE_LABELS.axiom_core;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',   label: 'AI CONFIGURATION' },
    { id: 'providers',  label: 'PROVIDERS' },
    { id: 'usage',      label: 'USAGE & BILLING' },
    { id: 'failover',   label: 'FAILOVER' },
    ...(isSuperAdmin ? [{ id: 'admin' as Tab, label: 'ADMIN' }] : []),
  ];

  /* ── RENDER ─────────────────────────────────────────────────────────────────── */

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0b', color: '#e2e8f0',
      fontFamily: 'monospace', position: 'relative',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.ok ? '#22c55e' : '#ef4444'}44`,
          padding: '10px 18px', borderRadius: 2, fontSize: 11, letterSpacing: '0.15em',
          color: toast.ok ? '#22c55e' : '#ef4444',
          backdropFilter: 'blur(8px)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(212,175,55,0.18)',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
        padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: '0.4em', color: '#d4af37', fontWeight: 900 }}>
            AXIOM OS · AI INTELLIGENCE CONFIGURATION
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#475569', marginTop: 3 }}>
            AI PROVIDER OWNERSHIP + API RESPONSIBILITY SYSTEM
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${pkgMeta.color}33`,
          padding: '6px 14px', borderRadius: 2,
        }}>
          <span style={{ fontSize: 8, letterSpacing: '0.3em', color: '#64748b' }}>PACKAGE</span>
          <span style={{ fontSize: 10, letterSpacing: '0.25em', color: pkgMeta.color, fontWeight: 700 }}>{pkgMeta.label}</span>
          <span style={{ fontSize: 8, letterSpacing: '0.2em', color: pkgMeta.color, opacity: 0.6 }}>{pkgMeta.badge}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 32px', display: 'flex', gap: 0,
        background: 'rgba(0,0,0,0.4)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 9, letterSpacing: '0.3em',
            color: tab === t.id ? '#d4af37' : '#475569',
            borderBottom: tab === t.id ? '1.5px solid #d4af37' : '1.5px solid transparent',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#334155', fontSize: 10, letterSpacing: '0.3em' }}>
          LOADING CONFIGURATION…
        </div>
      ) : (
        <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }}>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div>
              <SectionHead title="AI INTELLIGENCE CONFIGURATION"
                sub="Determine who owns, manages, and pays for AI within your AXIOM OS deployment." />

              {/* Mode cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                {/* AXIOM MANAGED */}
                <div
                  onClick={() => config?.byokPermitted !== false || config.mode === 'axiom_managed' ? setMode('axiom_managed') : undefined}
                  style={{
                    border: `1.5px solid ${config?.mode === 'axiom_managed' ? '#d4af37' : 'rgba(255,255,255,0.08)'}`,
                    background: config?.mode === 'axiom_managed' ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                    borderRadius: 3, padding: 24, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <StatusDot status={config?.mode === 'axiom_managed' ? 'active' : 'disconnected'} />
                    <span style={{ fontSize: 11, letterSpacing: '0.3em', color: '#d4af37', fontWeight: 700 }}>
                      INCLUDED WITH AXIOM
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 10, letterSpacing: '0.05em' }}>
                    AI services managed by AXIOM OS
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7, letterSpacing: '0.05em' }}>
                    AXIOM handles AI hosting, API management, routing, usage metering,
                    and infrastructure. No provider account required.
                  </div>
                  <div style={{
                    marginTop: 16, padding: '8px 12px',
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                    fontSize: 9, color: '#22c55e', letterSpacing: '0.2em', borderRadius: 2,
                  }}>
                    AI infrastructure, orchestration, and API usage are included within your AXIOM subscription.
                  </div>
                </div>

                {/* BYOK */}
                <div
                  onClick={() => config?.byokPermitted ? setMode('byok') : undefined}
                  style={{
                    border: `1.5px solid ${config?.mode === 'byok' ? '#c084fc' : 'rgba(255,255,255,0.08)'}`,
                    background: config?.mode === 'byok' ? 'rgba(192,132,252,0.06)' : 'rgba(255,255,255,0.02)',
                    borderRadius: 3, padding: 24,
                    cursor: config?.byokPermitted ? 'pointer' : 'not-allowed',
                    opacity: config?.byokPermitted ? 1 : 0.45,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <StatusDot status={config?.mode === 'byok' ? 'byok' : 'disconnected'} />
                      <span style={{ fontSize: 11, letterSpacing: '0.3em', color: '#c084fc', fontWeight: 700 }}>
                        CONNECT YOUR OWN AI PROVIDER
                      </span>
                    </div>
                    {!config?.byokPermitted && (
                      <span style={{ fontSize: 8, letterSpacing: '0.2em', color: '#475569', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 2 }}>
                        REQUIRES XEI / BLACK
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 10, letterSpacing: '0.05em' }}>
                    Use your own OpenAI or supported provider account
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7, letterSpacing: '0.05em' }}>
                    AXIOM routes AI requests through your venue-owned provider account.
                    You manage API billing, usage charges, and account limits directly.
                  </div>
                  <div style={{
                    marginTop: 16, padding: '8px 12px',
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: 9, color: '#f59e0b', letterSpacing: '0.2em', borderRadius: 2,
                  }}>
                    You are responsible for your own provider billing, API usage, and account management.
                  </div>
                </div>
              </div>

              {/* Responsibility summary table */}
              <SectionHead title="RESPONSIBILITY MATRIX" sub="Who owns what — at a glance." />
              <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 32 }}>
                {[
                  { item: 'AI Infrastructure',        axiom: '✓ AXIOM',    byok: '✓ AXIOM'   },
                  { item: 'AI Routing + Orchestration',axiom: '✓ AXIOM',    byok: '✓ AXIOM'   },
                  { item: 'API Key Management',        axiom: '✓ AXIOM',    byok: 'VENUE'      },
                  { item: 'Provider Billing',          axiom: '✓ AXIOM',    byok: 'VENUE'      },
                  { item: 'Usage Charges',             axiom: '✓ AXIOM',    byok: 'VENUE'      },
                  { item: 'OpenAI Account',            axiom: 'NOT NEEDED', byok: 'VENUE'      },
                  { item: 'Provider Limits',           axiom: 'AXIOM CAPS', byok: 'VENUE CAPS' },
                  { item: 'Failover Routing',          axiom: 'AXIOM',      byok: 'CONFIGURABLE' },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                    borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <div style={{ padding: '10px 16px', fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em' }}>{row.item}</div>
                    <div style={{ padding: '10px 16px', fontSize: 10,
                      color: row.axiom.includes('AXIOM') ? '#22c55e' : '#64748b', letterSpacing: '0.08em' }}>
                      {row.axiom}
                    </div>
                    <div style={{ padding: '10px 16px', fontSize: 10,
                      color: row.byok === 'VENUE' ? '#f59e0b' : row.byok.includes('AXIOM') ? '#22c55e' : '#94a3b8',
                      letterSpacing: '0.08em' }}>
                      {row.byok}
                    </div>
                  </div>
                ))}
              </div>

              {/* Package tiers */}
              <SectionHead title="SUBSCRIPTION PACKAGE AI ENTITLEMENTS" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {[
                  { pkg: 'axiom_core',  desc: 'AI included. Limited monthly usage cap.', features: ['AXIOM managed', 'Limited cap', 'No BYOK'] },
                  { pkg: 'axiom_pro',   desc: 'AI included with expanded orchestration limits.', features: ['AXIOM managed', 'Expanded cap', 'No BYOK'] },
                  { pkg: 'axiom_xei',   desc: 'Choose AXIOM-managed or connect your own provider.', features: ['Either mode', 'BYOK available', 'Single provider'] },
                  { pkg: 'axiom_black', desc: 'Enterprise AI ownership. Multi-provider routing enabled.', features: ['BYOK recommended', 'Multi-provider', 'Failover chains'] },
                ].map(p => {
                  const m = PACKAGE_LABELS[p.pkg];
                  return (
                    <div key={p.pkg} style={{
                      border: `1px solid ${pkg === p.pkg ? m.color + '55' : 'rgba(255,255,255,0.06)'}`,
                      background: pkg === p.pkg ? `${m.color}0a` : 'rgba(255,255,255,0.01)',
                      borderRadius: 3, padding: 16,
                    }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: m.color, fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 10, lineHeight: 1.6 }}>{p.desc}</div>
                      {p.features.map(f => (
                        <div key={f} style={{ fontSize: 8, color: '#475569', letterSpacing: '0.1em', marginBottom: 3 }}>· {f}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PROVIDERS TAB ── */}
          {tab === 'providers' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <SectionHead title="CONNECTED AI PROVIDERS"
                  sub={config?.mode === 'byok' ? 'BYOK mode active — providers below are used for routing.' : 'AXIOM MANAGED mode active — your own providers are optional.'} />
                {config?.byokPermitted && (
                  <button onClick={() => setConnectOpen(true)} style={{
                    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)',
                    color: '#d4af37', padding: '8px 16px', fontSize: 9, letterSpacing: '0.3em',
                    cursor: 'pointer', borderRadius: 2, flexShrink: 0,
                  }}>
                    + CONNECT PROVIDER
                  </button>
                )}
              </div>

              {providers.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: 48, color: '#334155', fontSize: 10,
                  letterSpacing: '0.25em', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 3,
                }}>
                  {config?.mode === 'axiom_managed'
                    ? 'AXIOM MANAGED — No BYOK keys required.'
                    : 'No providers connected. Connect a provider to enable BYOK routing.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {providers.map(p => {
                    const m = PROVIDER_META[p.providerName] ?? PROVIDER_META.openai;
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3,
                        padding: '14px 20px', background: 'rgba(255,255,255,0.02)',
                      }}>
                        {/* Logo */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: `${m.color}22`, border: `1px solid ${m.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 900, color: m.color,
                        }}>
                          {m.logoLetter}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <StatusDot status={p.status} />
                            <span style={{ fontSize: 11, letterSpacing: '0.2em', color: '#e2e8f0', fontWeight: 700 }}>{m.label}</span>
                            {p.isPrimary && (
                              <span style={{ fontSize: 7, letterSpacing: '0.2em', color: '#d4af37', background: 'rgba(212,175,55,0.1)', padding: '2px 6px', borderRadius: 2 }}>
                                PRIMARY
                              </span>
                            )}
                            <span style={{ fontSize: 8, letterSpacing: '0.15em', color: '#475569', textTransform: 'uppercase' }}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em' }}>
                            KEY: {p.keyHint ?? '—'}
                            {p.validated && <span style={{ color: '#22c55e', marginLeft: 8 }}>· VALIDATED</span>}
                            {p.lastCheckedAt && <span style={{ marginLeft: 8 }}>· LAST CHECK: {new Date(p.lastCheckedAt).toLocaleTimeString()}</span>}
                          </div>
                          {p.lastErrorMsg && (
                            <div style={{ fontSize: 9, color: '#ef4444', marginTop: 3, letterSpacing: '0.08em' }}>
                              {p.lastErrorMsg}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => validateProvider(p.id)}
                            disabled={validating === p.id}
                            style={{ fontSize: 8, letterSpacing: '0.2em', padding: '5px 12px', cursor: 'pointer',
                              background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', borderRadius: 2 }}
                          >
                            {validating === p.id ? 'TESTING…' : 'TEST'}
                          </button>
                          <button
                            onClick={() => disconnectProvider(p.id)}
                            style={{ fontSize: 8, letterSpacing: '0.2em', padding: '5px 12px', cursor: 'pointer',
                              background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 2 }}
                          >
                            DISCONNECT
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Official signup links */}
              <div style={{ marginTop: 32 }}>
                <SectionHead title="CREATE PROVIDER ACCOUNTS" sub="Official sign-up pages for supported AI providers." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                  {(['openai', 'anthropic', 'gemini'] as ProviderName[]).map(name => {
                    const m = PROVIDER_META[name];
                    return (
                      <a key={name} href={m.signupUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        border: `1px solid ${m.color}33`, borderRadius: 3,
                        background: `${m.color}08`, textDecoration: 'none', color: m.color,
                        fontSize: 9, letterSpacing: '0.25em', transition: 'all 0.15s',
                      }}>
                        <span style={{ fontWeight: 900, fontSize: 14 }}>{m.logoLetter}</span>
                        CREATE {m.label.toUpperCase()} ACCOUNT ↗
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Connect provider modal */}
              {connectOpen && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                  zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    background: '#0f0f11', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 4,
                    padding: 32, width: 440, maxWidth: '90vw',
                  }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.35em', color: '#d4af37', marginBottom: 20 }}>
                      CONNECT AI PROVIDER
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 8, letterSpacing: '0.25em', color: '#64748b', display: 'block', marginBottom: 6 }}>PROVIDER</label>
                      <select
                        value={connectProviderName}
                        onChange={e => setConnectProviderName(e.target.value as ProviderName)}
                        style={{ width: '100%', background: '#1a1a1d', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0',
                          padding: '8px 12px', fontSize: 10, borderRadius: 2, letterSpacing: '0.1em' }}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="azure_openai">Azure OpenAI</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 8, letterSpacing: '0.25em', color: '#64748b', display: 'block', marginBottom: 6 }}>API KEY</label>
                      <input
                        type="password"
                        value={connectKey}
                        onChange={e => setConnectKey(e.target.value)}
                        placeholder="sk-..."
                        style={{ width: '100%', background: '#1a1a1d', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0',
                          padding: '8px 12px', fontSize: 10, borderRadius: 2, letterSpacing: '0.1em', boxSizing: 'border-box' }}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
                      <input type="checkbox" checked={connectPrimary} onChange={e => setConnectPrimary(e.target.checked)} />
                      <span style={{ fontSize: 9, letterSpacing: '0.2em', color: '#94a3b8' }}>SET AS PRIMARY PROVIDER</span>
                    </label>
                    <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.1em', marginBottom: 20, lineHeight: 1.7, padding: '8px 12px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 2 }}>
                      Your API key is encrypted with AES-256-GCM before storage.
                      You are responsible for your own provider billing and account management.
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setConnectOpen(false); setConnectKey(''); }}
                        style={{ flex: 1, padding: '9px', background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#64748b', fontSize: 9, letterSpacing: '0.25em', cursor: 'pointer', borderRadius: 2 }}>
                        CANCEL
                      </button>
                      <button onClick={handleConnectProvider} disabled={connecting || !connectKey.trim()}
                        style={{ flex: 2, padding: '9px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
                          color: '#d4af37', fontSize: 9, letterSpacing: '0.25em', cursor: 'pointer', borderRadius: 2,
                          opacity: connecting || !connectKey.trim() ? 0.5 : 1 }}>
                        {connecting ? 'CONNECTING…' : 'CONNECT + VALIDATE'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── USAGE TAB ── */}
          {tab === 'usage' && (
            <div>
              <SectionHead title="API USAGE & BILLING MONITOR"
                sub="Request volume, token consumption, and cost estimation." />
              {usage ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
                    {[
                      { label: 'TOTAL REQUESTS',    value: usage.totalRequests.toLocaleString(),          color: '#d4af37' },
                      { label: 'TOTAL TOKENS',      value: usage.totalTokens.toLocaleString(),             color: '#c084fc' },
                      { label: 'EST. COST (USD)',    value: `$${(usage.totalCostCents / 100).toFixed(2)}`, color: '#22c55e' },
                    ].map(card => (
                      <div key={card.label} style={{
                        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3,
                        padding: '20px 18px', background: 'rgba(255,255,255,0.02)',
                      }}>
                        <div style={{ fontSize: 8, letterSpacing: '0.3em', color: '#475569', marginBottom: 8 }}>{card.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: card.color, letterSpacing: '0.05em' }}>{card.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    padding: '12px 18px', background: 'rgba(34,197,94,0.04)',
                    border: '1px solid rgba(34,197,94,0.15)', borderRadius: 3, fontSize: 9, color: '#22c55e',
                    letterSpacing: '0.15em', lineHeight: 1.7,
                  }}>
                    {config?.mode === 'axiom_managed'
                      ? 'AI infrastructure, orchestration, and API usage are included within your AXIOM subscription. Cost estimates above are for transparency only.'
                      : 'You are responsible for your own provider billing, API usage, and account management. The figures above reflect actual consumption charges on your provider account.'}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#334155', fontSize: 10, letterSpacing: '0.2em', padding: 32, textAlign: 'center' }}>
                  NO USAGE DATA YET
                </div>
              )}
            </div>
          )}

          {/* ── FAILOVER TAB ── */}
          {tab === 'failover' && (
            <FailoverPanel venueId={venueId} config={config} onSaved={loadAll} showToast={showToast} />
          )}

          {/* ── ADMIN TAB ── */}
          {tab === 'admin' && isSuperAdmin && (
            <AdminOverviewPanel showToast={showToast} />
          )}

        </div>
      )}
    </div>
  );
}

/* ── Failover sub-panel ──────────────────────────────────────────────────────── */

function FailoverPanel({ venueId, config, onSaved, showToast }: {
  venueId: string;
  config: BillingConfig | null;
  onSaved: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [enabled, setEnabled]     = useState(config?.failoverEnabled ?? false);
  const [chain, setChain]         = useState<string[]>(config?.failoverChain ?? []);
  const [saving, setSaving]       = useState(false);

  const ALL_PROVIDERS = ['openai', 'anthropic', 'gemini', 'azure_openai'];

  function toggleChain(p: string) {
    setChain(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/enterprise-ai/failover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, failoverEnabled: enabled, failoverChain: chain }),
      });
      if (r.ok) { showToast('Failover configuration saved.'); onSaved(); }
      else      { showToast('Failed to save failover config.', false); }
    } finally { setSaving(false); }
  }

  return (
    <div>
      <SectionHead title="AUTO-FAILOVER CONFIGURATION"
        sub="When the primary provider is degraded, AXIOM automatically routes to backup providers." />
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <span style={{ fontSize: 10, letterSpacing: '0.25em', color: enabled ? '#22c55e' : '#475569' }}>
            FAILOVER ROUTING {enabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </label>
      </div>
      {enabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 8, letterSpacing: '0.25em', color: '#64748b', marginBottom: 12 }}>
            FAILOVER CHAIN — select providers and order (first selected = first fallback)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ALL_PROVIDERS.map(p => {
              const m = PROVIDER_META[p];
              const idx = chain.indexOf(p);
              return (
                <div key={p} onClick={() => toggleChain(p)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer',
                  border: `1px solid ${idx >= 0 ? m.color + '55' : 'rgba(255,255,255,0.07)'}`,
                  background: idx >= 0 ? `${m.color}0a` : 'transparent', borderRadius: 3, transition: 'all 0.15s',
                }}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: 10, color: idx >= 0 ? m.color : '#334155', fontWeight: 900 }}>
                    {idx >= 0 ? `${idx + 1}` : '—'}
                  </span>
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', color: idx >= 0 ? m.color : '#475569' }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 3, fontSize: 9, color: '#3b82f6', letterSpacing: '0.12em', lineHeight: 1.7, marginBottom: 24 }}>
        When OpenAI fails, AXIOM can automatically route to Anthropic, Gemini, or any configured backup provider.
        Failover is transparent to the venue — the guest experience is never interrupted.
      </div>
      <button onClick={save} disabled={saving} style={{
        padding: '10px 24px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)',
        color: '#d4af37', fontSize: 9, letterSpacing: '0.3em', cursor: 'pointer', borderRadius: 2,
        opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'SAVING…' : 'SAVE FAILOVER CONFIG'}
      </button>
    </div>
  );
}

/* ── Admin overview sub-panel ────────────────────────────────────────────────── */

function AdminOverviewPanel({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [data, setData] = useState<{ venueCount: number; axiomManagedCount: number; byokCount: number; usage: unknown[] } | null>(null);

  useEffect(() => {
    fetch('/api/enterprise-ai/admin/overview', {
      headers: { Authorization: `Bearer ${localStorage.getItem('axiom_token') ?? ''}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => showToast('Failed to load admin overview.', false));
  }, []);

  if (!data) return <div style={{ color: '#334155', fontSize: 10, letterSpacing: '0.2em', padding: 32 }}>LOADING…</div>;

  return (
    <div>
      <SectionHead title="SUPER ADMIN · AI PROVIDER OVERVIEW"
        sub="Platform-wide visibility into venue AI billing modes and usage." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'TOTAL VENUES',      value: data.venueCount,          color: '#d4af37' },
          { label: 'AXIOM MANAGED',     value: data.axiomManagedCount,   color: '#22c55e' },
          { label: 'BYOK DEPLOYMENTS',  value: data.byokCount,           color: '#c084fc' },
        ].map(c => (
          <div key={c.label} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: '18px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.3em', color: '#475569', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#475569', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
        Full venue routing control, throttling, and AI traffic rerouting available via the AXIOM Master Operations console.
      </div>
    </div>
  );
}
