import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Router, Route, Switch, Redirect, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import TitanCraftDeck from '@/pages/TitanCraftDeck';
const LivingPortal = lazy(() => import('@/pages/LivingPortal'));
import AIProviderSetup from '@/pages/enterprise/AIProviderSetup';
import { AuthProvider }              from '@/contexts/AuthContext';
import { CommandCenterProvider }     from '@/contexts/CommandCenterContext';
import { PosProvider }               from '@/contexts/PosContext';
import { VenueProvider }             from '@/contexts/VenueContext';
import { ThemeProvider }             from '@/contexts/ThemeContext';
import { EngagementProvider }        from '@/contexts/EngagementContext';
import { PreferenceProvider }        from '@/contexts/PreferenceContext';
import { UserProfileProvider }       from '@/contexts/UserProfileContext';
import { OrchestratorProvider }      from '@/contexts/OrchestratorContext';
import { EnvironmentProvider }       from '@/contexts/EnvironmentContext';
import { AxiomIntelligenceProvider } from '@/contexts/AxiomIntelligenceContext';
import { AxiomPresenceProvider }     from '@/contexts/AxiomPresenceContext';
import { GuestProfileProvider }      from '@/contexts/GuestProfileContext';
import { CraftExperienceProvider }   from '@/contexts/CraftExperienceContext';
import { KioskModeProvider }         from '@/contexts/KioskModeContext';
import { LicenseProvider }           from '@/contexts/LicenseContext';
import { HandoffProvider }           from '@/contexts/HandoffContext';
import { AudioProvider }            from '@/contexts/AudioContext';
import { ExperienceProvider }       from '@/contexts/ExperienceContext';
import EeisOverlay                  from '@/components/EeisOverlay';
import StealthHandoff               from '@/components/StealthHandoff';
import { SovereignOverrideHub }    from '@/components/SovereignOverrideHub';
import { SuperAdminProvider }       from '@/contexts/SuperAdminContext';
import { GhostEntryTrigger }        from '@/components/GhostEntryTrigger';
import SuperAdminOverlay            from '@/components/SuperAdminOverlay';
import { HapticProvider }              from '@/contexts/HapticContext';
import { UniversalTouchAnchors }      from '@/components/UniversalTouchAnchors';
import { UniversalBackButton }        from '@/components/UniversalBackButton';
import { UnifiedCognitiveProvider }   from '@/contexts/UnifiedCognitiveContext';
import { RouteTransitionOverlay }     from '@/components/RouteTransitionOverlay';
import { TrifectaProvider }           from '@/contexts/TrifectaContext';
import { SovereignInsightCube }       from '@/components/SovereignInsightCube';
import { useSovereignSocket }         from '@/hooks/useSovereignSocket';
import PhantomHUD                     from '@/components/PhantomHUD';
import { SplashController }           from '@/components/SplashController';
import { KernelModeProvider }         from '@/contexts/KernelModeContext';
import { SovereignRoute }             from '@/components/SovereignRoute';
import InactivityGuard               from '@/components/InactivityGuard';
import { PresentationProvider }      from '@/contexts/PresentationContext';
import TabletViewport                from '@/components/TabletViewport';
import GlobalSmokeCanvas             from '@/components/GlobalSmokeCanvas';

/* ── Lazy-loaded sub-pages ─────────────────────────────────── */
const Dashboard             = lazy(() => import('@/pages/Dashboard'));
const SettingsModule        = lazy(() => import('@/pages/SettingsModule'));
const AdminMaster           = lazy(() => import('@/pages/AdminMaster'));
const OnboardWizard         = lazy(() => import('@/pages/OnboardWizard'));
const AnalyticsModule       = lazy(() => import('@/pages/AnalyticsModule'));
const SwipeIntelligence     = lazy(() => import('@/pages/SwipeIntelligence'));
const CraftHub              = lazy(() => import('@/pages/CraftHub'));
const DemoWalkthrough       = lazy(() => import('@/pages/DemoWalkthrough'));
const MasterOperations      = lazy(() => import('@/pages/MasterOperations'));
const CommandCenter         = lazy(() => import('@/pages/CommandCenter'));
const CentralCommand        = lazy(() => import('@/pages/CentralCommand'));
const PosMode               = lazy(() => import('@/pages/PosMode'));
const PinLogin              = lazy(() => import('@/pages/PinLogin'));
const Axiom360              = lazy(() => import('@/pages/Axiom360'));
const StaffModule           = lazy(() => import('@/pages/StaffModule'));
const TouchscreenHome       = lazy(() => import('@/pages/TouchscreenHome'));
const Entry                 = lazy(() => import('@/pages/Entry'));
const Home                  = lazy(() => import('@/pages/Home'));
const ExperiencesModule     = lazy(() => import('@/pages/ExperiencesModule'));
const DemoExperienceCenter  = lazy(() => import('@/pages/DemoExperienceCenter'));
const StaffTraining         = lazy(() => import('@/pages/StaffTraining'));
const InvestorSimulator     = lazy(() => import('@/pages/InvestorSimulator'));
const SalesValidation       = lazy(() => import('@/pages/SalesValidation'));
const ExperiencePage        = lazy(() => import('@/pages/ExperiencePage'));
const ExperienceOverview    = lazy(() => import('@/pages/ExperienceOverview'));
const SynchronizationChamber = lazy(() => import('@/pages/SynchronizationChamber'));
const RevealPage            = lazy(() => import('@/pages/RevealPage'));
const LegacyHandoff         = lazy(() => import('@/pages/LegacyHandoff'));
const FounderControlCenter  = lazy(() => import('@/pages/FounderControlCenter'));
const FinanceReconciliation = lazy(() => import('@/pages/FinanceReconciliation'));
const AxiomReceipt          = lazy(() => import('@/pages/AxiomReceipt'));
const InventoryModule       = lazy(() => import('@/pages/InventoryModule'));
const RevenueEngine         = lazy(() => import('@/pages/RevenueEngine'));
const CompetitionModule     = lazy(() => import('@/pages/CompetitionModule'));
const EstablishmentSetupPage= lazy(() => import('@/pages/EstablishmentSetupPage'));
const VenueTouchscreen      = lazy(() => import('@/pages/VenueTouchscreen'));
const AdminTouchscreen      = lazy(() => import('@/pages/AdminTouchscreen'));
const ExperienceControlPanel= lazy(() => import('@/pages/ExperienceControlPanel'));
const IntelligenceManifest  = lazy(() => import('@/pages/IntelligenceManifest'));
const AxiomPay              = lazy(() => import('@/pages/AxiomPay'));
const Demo                  = lazy(() => import('@/pages/Demo'));
const AxiomDemo             = lazy(() => import('@/pages/AxiomDemo'));
const MasterBlender         = lazy(() => import('@/pages/MasterBlender'));
const DesignerPage          = lazy(() => import('@/pages/DesignerPage'));
const UpgradePage           = lazy(() => import('@/pages/UpgradePage'));
const UpgradeRequired       = lazy(() => import('@/pages/UpgradeRequired'));

/* ── Lazy-loaded pages previously unregistered in router ───── */
const PaymentSuccess        = lazy(() => import('@/pages/PaymentSuccess'));
const PaymentCancel         = lazy(() => import('@/pages/PaymentCancel'));
const PresenceEngine        = lazy(() => import('@/pages/PresenceEngine'));
const CampaignsModule       = lazy(() => import('@/pages/CampaignsModule'));
const RewardsModule         = lazy(() => import('@/pages/RewardsModule'));
const OrdersModule          = lazy(() => import('@/pages/OrdersModule'));
const BrewCraft             = lazy(() => import('@/pages/BrewCraft'));
const PourCraft             = lazy(() => import('@/pages/PourCraft'));
const WineCraft             = lazy(() => import('@/pages/WineCraft'));
const SARV                  = lazy(() => import('@/pages/SARV'));
const SovereignCommand      = lazy(() => import('@/pages/SovereignCommand'));
const LaunchReadiness       = lazy(() => import('@/pages/LaunchReadiness'));
const Legal                 = lazy(() => import('@/pages/Legal'));
const SystemValidation      = lazy(() => import('@/pages/SystemValidation'));
const StaffFloorCockpit     = lazy(() => import('@/pages/StaffFloorCockpit'));
const DevicesModule         = lazy(() => import('@/pages/DevicesModule'));
const EnvironmentEngine     = lazy(() => import('@/pages/EnvironmentEngine'));
const EnterpriseIntelligence = lazy(() => import('@/pages/EnterpriseIntelligence'));
const EEIECommandCenter      = lazy(() => import('@/pages/EEIECommandCenter'));
const EEIELandingHub         = lazy(() => import('@/pages/EEIELandingHub'));
const WelcomeEEIE            = lazy(() => import('@/pages/WelcomeEEIE'));
const EEIEModulePage         = lazy(() => import('@/pages/EEIEModulePage'));
const TitanEATHub            = lazy(() => import('@/pages/TitanEATHub'));
const EnterpriseGovernance  = lazy(() => import('@/pages/EnterpriseGovernance'));
const SovereignDistributionVault   = lazy(() => import('@/pages/SovereignDistributionVault'));
const SovereignHardwareLab         = lazy(() => import('@/pages/SovereignHardwareLab'));
const SovereignGate                = lazy(() => import('@/pages/SovereignGate'));
const PulseIntelligenceCenter      = lazy(() => import('@/pages/pulse/PulseIntelligenceCenter'));
const VendorOnboarding             = lazy(() => import('@/pages/vendor/VendorOnboarding'));
const VendorDashboard              = lazy(() => import('@/pages/vendor/VendorDashboard'));
const VendorProducts               = lazy(() => import('@/pages/vendor/VendorProducts'));
const VendorMedia                  = lazy(() => import('@/pages/vendor/VendorMedia'));
const VendorInventory              = lazy(() => import('@/pages/vendor/VendorInventory'));
const VendorVenues                 = lazy(() => import('@/pages/vendor/VendorVenues'));
const VendorPerformance            = lazy(() => import('@/pages/vendor/VendorPerformance'));
const VendorApprovals              = lazy(() => import('@/pages/vendor/VendorApprovals'));
const VendorMessages               = lazy(() => import('@/pages/vendor/VendorMessages'));
const SovereignVerify              = lazy(() => import('@/pages/SovereignVerify'));
const SovereignDashboard           = lazy(() => import('@/pages/SovereignDashboard'));
const AmbassadorGate               = lazy(() => import('@/pages/AmbassadorGate'));
const AmbassadorVerify             = lazy(() => import('@/pages/AmbassadorVerify'));
const AmbassadorHub                = lazy(() => import('@/pages/AmbassadorHub'));

function PageLoader() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,128,255,0.18)', borderTopColor: '#0080FF', animation: 'axiom-ring-spin 0.8s linear infinite' }} />
    </div>
  );
}

/* ── Thin bridge — mounts sovereign socket listener once ────── */
function SovereignSocketBridge() {
  useSovereignSocket();
  return null;
}

/* ── Full provider stack for all sub-pages ──────────────────── */
function SubPageProviders({ children }: { children: React.ReactNode }) {
  const venueId = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('axiom_venue_id') ?? '00000000-0000-0000-0000-000000000000')
    : '00000000-0000-0000-0000-000000000000';
  return (
    <UnifiedCognitiveProvider>
    <ExperienceProvider>
    <AudioProvider>
      <AuthProvider>
        <LicenseProvider>
          <VenueProvider>
            <KernelModeProvider>
            <ThemeProvider venueId={venueId}>
              <KioskModeProvider>
                <CommandCenterProvider>
                  <PosProvider>
                    <EngagementProvider>
                      <PreferenceProvider>
                        <UserProfileProvider>
                          <GuestProfileProvider>
                            <CraftExperienceProvider>
                            <HandoffProvider>
                              <AxiomIntelligenceProvider>
                                <AxiomPresenceProvider>
                                  <EnvironmentProvider>
                                    <OrchestratorProvider>
                                      <SuperAdminProvider>
                                        <TrifectaProvider>
                                        <HapticProvider>
                                        <PresentationProvider>
                                          <TabletViewport />
                                          <GlobalSmokeCanvas />
                                          <UniversalTouchAnchors />
                                          <UniversalBackButton />
                                          {children}
                                          <RouteTransitionOverlay />
                                          <InactivityGuard />
                                          <EeisOverlay />
                                          <GhostEntryTrigger />
                                          <SuperAdminOverlay />
                                          <SovereignOverrideHub />
                                          <SovereignInsightCube />
                                          <SovereignSocketBridge />
                                          <StealthHandoff />
                                        </PresentationProvider>
                                        </HapticProvider>
                                        </TrifectaProvider>
                                      </SuperAdminProvider>
                                    </OrchestratorProvider>
                                  </EnvironmentProvider>
                                </AxiomPresenceProvider>
                              </AxiomIntelligenceProvider>
                            </HandoffProvider>
                            </CraftExperienceProvider>
                          </GuestProfileProvider>
                        </UserProfileProvider>
                      </PreferenceProvider>
                    </EngagementProvider>
                  </PosProvider>
                </CommandCenterProvider>
              </KioskModeProvider>
            </ThemeProvider>
            </KernelModeProvider>
          </VenueProvider>
        </LicenseProvider>
      </AuthProvider>
    </AudioProvider>
    </ExperienceProvider>
    </UnifiedCognitiveProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOVEE OS — 7-PHASE SOVEREIGN BOOT FLOW
   Master State Engine · No menus · No buttons · No dashboards
═══════════════════════════════════════════════════════════════ */

type Phase =
  | 'void'         // 0–3s   black void + gold particle
  | 'materialize'  // 3–7s   PROFOUND INNOVATIONS emergence
  | 'calibrate'    // 7–11s  intelligence ring + telemetry
  | 'environment'  // 11s+   2×2 live craft terminal
  | 'immersion'    // dwell  single craft consumes screen
  | 'eeis'         // staff  gold wireframe intelligence layer
  | 'recap';       // end    session discoveries cinematic

const CRAFT_DATA: Record<string, { name: string; color: string; glow: string; img: string; tagline: string }> = {
  smoke: { name: 'SMOKECRAFT',  color: '#c8860a', glow: 'rgba(200,134,10,0.45)',  img: '/images/scenes/smokecraft-card.jpg', tagline: 'Aged Leaf · Warm Ember · Sovereign Smoke' },
  pour:  { name: 'POURCRAFT',   color: '#d4af37', glow: 'rgba(212,175,55,0.45)',  img: '/images/scenes/pourcraft-card.jpg',  tagline: 'Single Malt · Crystal Glass · Liquid Gold' },
  brew:  { name: 'BREWCRAFT',   color: '#b87333', glow: 'rgba(184,115,51,0.45)',  img: '/images/scenes/brewcraft-card.jpg',  tagline: 'Cold Craft · Copper Warmth · Fresh Pour' },
  wine:  { name: 'WINECRAFT',   color: '#8B1A2F', glow: 'rgba(139,26,47,0.45)',  img: '/images/scenes/craft-hub.jpg',         tagline: 'Deep Velvet · Wine Legs · Terroir Soul' },
};

/* ── PHASE 1: THE VOID ─────────────────────────────────────── */
function PhaseVoid({ progress }: { progress: number }) {
  return (
    <div style={fullBleed('#000')}>
      <div style={{
        width: 2, height: 2, borderRadius: '50%',
        background: '#d4af37',
        boxShadow: `0 0 ${8 + progress * 40}px ${2 + progress * 20}px rgba(212,175,55,${0.3 + progress * 0.5})`,
        animation: 'axiom-breathe 2s ease-in-out infinite',
      }} />
    </div>
  );
}

/* ── PHASE 2: MATERIALIZATION ──────────────────────────────── */
function PhaseMaterialize({ progress }: { progress: number }) {
  const p = Math.min(1, progress);
  return (
    <div style={fullBleed('#000')}>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        {/* Smoked titanium depth layer */}
        <div style={{
          position: 'absolute', inset: '-40px -60px',
          background: `radial-gradient(ellipse, rgba(212,175,55,${0.04 * p}) 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }} />
        {/* Edge reflection bars */}
        <div style={{
          position: 'absolute', top: 0, left: `-${60 - p * 60}px`, right: `-${60 - p * 60}px`,
          height: 1, background: `linear-gradient(90deg,transparent,rgba(212,175,55,${p * 0.6}),transparent)`,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: `-${60 - p * 60}px`, right: `-${60 - p * 60}px`,
          height: 1, background: `linear-gradient(90deg,transparent,rgba(212,175,55,${p * 0.4}),transparent)`,
        }} />
        {/* PROFOUND INNOVATIONS — cinematic materialization */}
        <div style={{
          fontSize: 'clamp(10px,2.2vw,28px)',
          fontWeight: 300,
          letterSpacing: `${0.6 - p * 0.3}em`,
          fontFamily: 'monospace',
          color: `rgba(255,249,230,${p})`,
          textShadow: `0 0 ${p * 60}px rgba(212,175,55,${p * 0.8}), 0 0 ${p * 120}px rgba(212,175,55,${p * 0.3})`,
          transform: `scale(${0.88 + p * 0.12})`,
          transition: 'all 0.1s linear',
          filter: `blur(${(1 - p) * 8}px)`,
          marginBottom: 12,
        }}>
          PROFOUND INNOVATIONS
        </div>
        {/* Scan line sweeping across */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${p * 110 - 5}%`,
          width: 2,
          background: `linear-gradient(180deg,transparent,rgba(212,175,55,${p * 0.7}),transparent)`,
          filter: 'blur(1px)',
          transition: 'left 0.05s linear',
        }} />
        {/* Powered by */}
        <div style={{
          fontSize: 'clamp(7px,1.1vw,13px)',
          letterSpacing: '0.5em',
          fontFamily: 'monospace',
          color: `rgba(212,175,55,${Math.max(0, p - 0.6) * 2.5})`,
          marginTop: 8,
        }}>
          POWERED BY NOVEE OS
        </div>
      </div>
    </div>
  );
}

/* ── PHASE 3: CALIBRATION ──────────────────────────────────── */
const TELEMETRY_LINES = [
  'VENUE_SYNC .............. ACTIVE',
  'GUEST_CONTINUITY ........ STABLE',
  'INTELLIGENCE_MESH ....... ONLINE',
  'SENSORY_SYSTEMS ......... ARMED',
  'ENVIRONMENTAL_CORE ...... ENGAGED',
  'REVENUE_ENGINE .......... LIVE',
];

function PhaseCalibrate({ progress }: { progress: number }) {
  const p = Math.min(1, progress);
  const R = 90;
  return (
    <div style={fullBleed('#000')}>
      {/* Intelligence Ring */}
      <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 32 }}>
        <svg width="220" height="220" style={{ position: 'absolute', inset: 0 }}>
          {/* Outer ring */}
          <circle cx="110" cy="110" r={R} stroke="rgba(212,175,55,0.18)" strokeWidth="0.5" fill="none" />
          {/* Rotating arc */}
          <circle cx="110" cy="110" r={R} stroke="#d4af37" strokeWidth="1.5" fill="none"
            strokeDasharray={`${p * 200} ${2 * Math.PI * R}`}
            strokeLinecap="round"
            style={{ transformOrigin: '110px 110px', animation: 'axiom-ring-spin 3s linear infinite' }} />
          {/* Inner pulse ring */}
          <circle cx="110" cy="110" r={R - 12} stroke="rgba(212,175,55,0.08)" strokeWidth="0.5" fill="none" />
          {/* AI resonance dots */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg - 90) * Math.PI / 180;
            const x = 110 + R * Math.cos(rad);
            const y = 110 + R * Math.sin(rad);
            return (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 1.5}
                fill="#d4af37"
                opacity={p > i * 0.15 ? (i % 3 === 0 ? 0.9 : 0.4) : 0}
                style={{ animation: `axiom-breathe ${1.5 + i * 0.2}s ease-in-out infinite` }} />
            );
          })}
        </svg>
        {/* Center content */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <div style={{ fontSize: 11, letterSpacing: '0.4em', fontFamily: 'monospace',
            background: GOLD_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            opacity: p, fontWeight: 900 }}>NOVEE OS</div>
          <div style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(212,175,55,0.5)',
            fontFamily: 'monospace', opacity: p }}>CALIBRATING</div>
        </div>
      </div>
      {/* Telemetry lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 320 }}>
        {TELEMETRY_LINES.map((line, i) => (
          <div key={i} style={{
            fontSize: 9, letterSpacing: '0.18em', fontFamily: 'monospace',
            color: '#d4af37', opacity: p > (i + 1) / TELEMETRY_LINES.length ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PHASE 4 WRAPPER: ENVIRONMENT + DWELL ──────────────────── */
const HOVER_CRAFTS = ['smoke', 'pour', 'brew', 'wine'];

function PhaseEnvironment({
  onDwell, onEEIS, entering,
}: {
  onDwell: (craft: string) => void;
  onEEIS: () => void;
  entering: boolean;
}) {
  const dwellRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const startDwell = useCallback((craft: string) => {
    setHovered(craft);
    dwellRef.current = setTimeout(() => onDwell(craft), 1500);
  }, [onDwell]);

  const cancelDwell = useCallback(() => {
    setHovered(null);
    if (dwellRef.current) clearTimeout(dwellRef.current);
  }, []);

  const startEEIS = useCallback(() => {
    pressRef.current = setTimeout(onEEIS, 3000);
  }, [onEEIS]);

  const cancelEEIS = useCallback(() => {
    if (pressRef.current) clearTimeout(pressRef.current);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, opacity: entering ? 0 : 1, transition: 'opacity 1.2s ease' }}>
      {/* The locked TitanCraftDeck */}
      <TitanCraftDeck />

      {/* Dwell detection zones — invisible 2×2 overlay */}
      <div style={{
        position: 'fixed',
        top: 36, left: 84, right: 72, bottom: 36,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        zIndex: 200,
        pointerEvents: 'auto',
      }}>
        {HOVER_CRAFTS.map(craft => (
          <div key={craft}
            onTouchStart={() => startDwell(craft)}
            onTouchEnd={cancelDwell}
            style={{ position: 'relative', cursor: 'none' }}
          >
            {/* Dwell progress ring */}
            {hovered === craft && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 48, height: 48,
                border: '1.5px solid rgba(212,175,55,0.6)',
                borderRadius: '50%',
                animation: 'axiom-dwell-ring 1.5s linear forwards',
                pointerEvents: 'none',
                zIndex: 210,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* EEIS hidden trigger — long-press on left panel area */}
      <div
        onTouchStart={startEEIS}
        onTouchEnd={cancelEEIS}
        style={{
          position: 'fixed', top: 36, left: 0, width: 84, bottom: 36,
          zIndex: 300, cursor: 'default',
        }}
      />
    </div>
  );
}

/* ── PHASE 4b: IMMERSION ────────────────────────────────────── */
function PhaseImmersion({ craft, onExit }: { craft: string; onExit: () => void }) {
  const c = CRAFT_DATA[craft];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, cursor: 'pointer' }} onClick={onExit}>
      <img src={c.img} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: '50% 20%',
        filter: 'brightness(0.6) saturate(1.3)',
      }} alt="" />
      {/* Atmosphere color wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${c.glow} 0%, rgba(0,0,0,0.7) 100%)`,
        animation: 'axiom-breathe-slow 4s ease-in-out infinite',
      }} />
      {/* Craft identity */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        animation: 'axiom-fadein 1s ease forwards',
      }}>
        <div style={{
          fontSize: 'clamp(28px,6vw,72px)', fontWeight: 900,
          letterSpacing: '0.5em', fontFamily: 'monospace',
          color: c.color,
          textShadow: `0 0 40px ${c.glow}, 0 0 80px ${c.glow}`,
        }}>{c.name}</div>
        <div style={{
          fontSize: 'clamp(9px,1.4vw,14px)', letterSpacing: '0.4em',
          color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace',
        }}>{c.tagline}</div>
        <div style={{
          marginTop: 32, fontSize: 9, letterSpacing: '0.3em',
          color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace',
          animation: 'axiom-pulse 2s ease-in-out infinite',
        }}>TAP TO RETURN</div>
      </div>
    </div>
  );
}

/* ── PHASE 5: EEIS INTELLIGENCE LAYER ──────────────────────── */
const EEIS_METRICS = [
  { label: 'GUEST JOURNEY',         value: 'SMOKE → POUR → INQUIRY', color: '#d4af37' },
  { label: 'PREDICTIVE INTENT',     value: 'PRESTIGE SPEND ↑ 87%',   color: '#00e676' },
  { label: 'ENV INTENSITY',         value: '████████░░ 82%',          color: '#d4af37' },
  { label: 'REVENUE INFLUENCE',     value: '$340 PROJECTED',         color: '#00e676' },
  { label: 'PACING',                value: 'LEISURELY · 14 MIN',     color: '#d4af37' },
  { label: 'PREMIUM PROBABILITY',   value: '███████░░░ 71%',          color: '#d4af37' },
  { label: 'AI MENTOR STATE',       value: 'ACTIVE · ENGAGED',       color: '#00e676' },
  { label: 'ATMOS HEATMAP',         value: 'SMOKE ZONE: HOT',        color: '#ff6b35' },
];

const EEIS_NAV = [
  { label: 'DASHBOARD',      path: '/dashboard',           color: '#d4af37' },
  { label: 'ADMIN MASTER',   path: '/admin-master',        color: '#d4af37' },
  { label: 'ANALYTICS',      path: '/analytics',           color: '#d4af37' },
  { label: 'OPERATIONS',     path: '/operations',          color: '#d4af37' },
  { label: 'SETTINGS',       path: '/settings',            color: '#d4af37' },
  { label: 'ONBOARDING',     path: '/onboarding',          color: '#d4af37' },
  { label: 'AI CONFIG',      path: '/enterprise/ai-config',color: '#00e676' },
  { label: 'CRAFT HUB',      path: '/craft-hub',           color: '#d4af37' },
  { label: 'POS MODE',       path: '/pos',                 color: '#d4af37' },
  { label: 'FINANCE',        path: '/finance-reconciliation', color: '#d4af37' },
];

function PhaseEEIS({ onExit }: { onExit: () => void }) {
  const [, navigate] = useLocation();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600 }}>
      {/* Environment dimmed behind */}
      <TitanCraftDeck />
      {/* Ripple distortion overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(3px)',
        animation: 'axiom-fadein 0.8s ease forwards',
      }} />
      {/* Gold wireframe grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />
      {/* EEIS panel */}
      <div style={{
        position: 'absolute', inset: '5%',
        border: '1px solid rgba(212,175,55,0.35)',
        borderRadius: 2,
        display: 'flex', flexDirection: 'column',
        animation: 'axiom-fadein 0.6s ease forwards',
        overflow: 'hidden',
      }}>
        {/* EEIS header */}
        <div style={{
          height: 44, background: 'rgba(0,0,0,0.85)',
          borderBottom: '1px solid rgba(212,175,55,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676', animation: 'axiom-pulse 1.5s infinite' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.35em', fontFamily: 'monospace', color: '#d4af37', fontWeight: 900 }}>
              EEIS · ENVIRONMENTAL EXPERIENCE INTELLIGENCE SYSTEM
            </span>
          </div>
          <div
            style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(212,175,55,0.5)', fontFamily: 'monospace', cursor: 'pointer' }}
            onClick={onExit}
          >
            [ EXIT STAFF MODE ]
          </div>
        </div>
        {/* Metrics grid */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
          gap: 1, background: 'rgba(212,175,55,0.06)',
          overflow: 'auto',
        }}>
          {EEIS_METRICS.map((m, i) => (
            <div key={i} style={{
              background: 'rgba(0,0,0,0.8)',
              padding: '18px 20px',
              borderLeft: `1.5px solid ${m.color}33`,
              animation: `axiom-fadein 0.4s ${i * 0.08}s ease both`,
            }}>
              <div style={{ fontSize: 7.5, letterSpacing: '0.25em', color: 'rgba(212,175,55,0.45)', fontFamily: 'monospace', marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
              {/* Animated pulse line */}
              <div style={{ marginTop: 10, height: 1, background: `linear-gradient(90deg,${m.color}44,${m.color}88,${m.color}44)`, animation: `axiom-shimmer 2s ${i * 0.1}s linear infinite` }} />
            </div>
          ))}
        </div>
        {/* Staff nav bar */}
        <div style={{
          background: 'rgba(0,0,0,0.92)',
          borderTop: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          padding: '8px 12px', gap: 6, flexShrink: 0,
        }}>
          {EEIS_NAV.map((n) => (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              style={{
                background: 'transparent',
                border: `1px solid ${n.color}55`,
                borderRadius: 2,
                padding: '5px 10px',
                fontSize: 8, letterSpacing: '0.25em',
                fontFamily: 'monospace', fontWeight: 700,
                color: n.color, cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {n.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="120" height="24" viewBox="0 0 120 24">
              <polyline points="0,12 8,7 16,15 24,5 32,17 40,9 48,13 56,4 64,18 72,10 80,12 88,6 96,16 104,8 112,13 120,12"
                fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.5"
                style={{ animation: 'axiom-shimmer 3s linear infinite' }} />
            </svg>
            <span style={{ fontSize: 7, letterSpacing: '0.3em', color: '#00e676', fontFamily: 'monospace' }}>NOMINAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PHASE 7: RECAP ─────────────────────────────────────────── */
function PhaseRecap({ onRestart }: { onRestart: () => void }) {
  const DISCOVERIES = ['SMOKECRAFT 360', 'POURCRAFT 360', 'BREWCRAFT 360', 'WINECRAFT 360'];
  return (
    <div style={{ ...fullBleed('#000'), flexDirection: 'column', gap: 32 }} onClick={onRestart}>
      <div style={{ fontSize: 9, letterSpacing: '0.5em', color: 'rgba(212,175,55,0.5)', fontFamily: 'monospace' }}>SESSION COMPLETE</div>
      <div style={{ fontSize: 'clamp(18px,3vw,36px)', fontWeight: 900, letterSpacing: '0.4em', fontFamily: 'monospace',
        background: GOLD_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        DISCOVERIES UNLOCKED
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {DISCOVERIES.map((d, i) => (
          <div key={d} style={{
            fontSize: 11, letterSpacing: '0.35em', fontFamily: 'monospace',
            color: '#d4af37', opacity: 0,
            animation: `axiom-fadein 0.6s ${0.3 + i * 0.25}s ease forwards`,
          }}>
            ◆ {d}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, fontSize: 8, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace',
        animation: 'axiom-pulse 2s ease-in-out infinite' }}>
        TAP TO BEGIN NEW SESSION
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MASTER STATE ENGINE — Sovereign Boot Flow
══════════════════════════════════════════════════════════════ */
function SovereignBootFlow() {
  const [phase, setPhase]           = useState<Phase>('void');
  const [phaseAge, setPhaseAge]     = useState(0);   // seconds in current phase
  const [immersionCraft, setImmersionCraft] = useState<string>('smoke');
  const ageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drive the automatic phase progression
  useEffect(() => {
    if (ageRef.current) clearInterval(ageRef.current);
    setPhaseAge(0);
    ageRef.current = setInterval(() => setPhaseAge(a => a + 0.05), 50);
    return () => { if (ageRef.current) clearInterval(ageRef.current); };
  }, [phase]);

  // Auto-advance through boot phases
  useEffect(() => {
    if (phase === 'void'        && phaseAge >= 3)  setPhase('materialize');
    if (phase === 'materialize' && phaseAge >= 4)  setPhase('calibrate');
    if (phase === 'calibrate'   && phaseAge >= 4)  setPhase('environment');
  }, [phase, phaseAge]);

  const handleDwell   = useCallback((craft: string) => { setImmersionCraft(craft); setPhase('immersion'); }, []);
  const handleEEIS    = useCallback(() => setPhase('eeis'), []);
  const handleEEISExit= useCallback(() => setPhase('environment'), []);
  const handleImmExit = useCallback(() => setPhase('environment'), []);
  const handleRecap   = useCallback(() => { setPhase('void'); }, []);

  return (
    <>
      {/* ── PHASE RENDER ── */}
      {phase === 'void'        && <PhaseVoid        progress={phaseAge / 3} />}
      {phase === 'materialize' && <PhaseMaterialize  progress={phaseAge / 4} />}
      {phase === 'calibrate'   && <PhaseCalibrate    progress={phaseAge / 4} />}
      {phase === 'environment' && (
        <PhaseEnvironment
          onDwell={handleDwell}
          onEEIS={handleEEIS}
          entering={phaseAge < 1.2}
        />
      )}
      {phase === 'immersion'   && <PhaseImmersion craft={immersionCraft} onExit={handleImmExit} />}
      {phase === 'eeis'        && <PhaseEEIS onExit={handleEEISExit} />}
      {phase === 'recap'       && <PhaseRecap onRestart={handleRecap} />}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width:100vw; height:100vh; overflow:hidden; background:#000; }

        @keyframes axiom-breathe      { 0%,100%{opacity:.6;transform:scale(1)}   50%{opacity:1;transform:scale(1.15)} }
        @keyframes axiom-breathe-slow { 0%,100%{opacity:.85} 50%{opacity:1} }
        @keyframes axiom-pulse        { 0%,100%{opacity:1}   50%{opacity:.35} }
        @keyframes axiom-fadein       { from{opacity:0} to{opacity:1} }
        @keyframes axiom-ring-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes axiom-shimmer      { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes axiom-dwell-ring   {
          0%   { transform:translate(-50%,-50%) scale(0.5); opacity:0; border-color:rgba(212,175,55,0.8); }
          100% { transform:translate(-50%,-50%) scale(1.6); opacity:0; border-color:rgba(212,175,55,0); }
        }
      `}</style>
    </>
  );
}

/* ── Guest-route ambient layer — persistent canvas smoke/ember/vignette ─────── */

const GUEST_PREFIXES = [
  '/craft-hub', '/experience/', '/experience-overview/', '/synchronization/',
  '/legacy-handoff/', '/experience-center', '/enrollment', '/reveal/',
  '/master-blender',
];

interface AmbientParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  type: 'smoke' | 'ember';
  phase: number; // time offset for phase-shifted fade
}

function GuestAmbientLayer() {
  const [loc] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = GUEST_PREFIXES.some(p => loc === p.replace(/\/$/, '') || loc.startsWith(p));

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext('2d');
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    let raf: number;
    let frame = 0;
    const particles: AmbientParticle[] = [];

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();

    function spawnSmoke() {
      const w = canvas!.width;
      const h = canvas!.height;
      particles.push({
        x: w * Math.random(),
        y: h * 1.05,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.18 + Math.random() * 0.28),
        life: 0,
        maxLife: 420 + Math.random() * 340,
        size: 90 + Math.random() * 140,
        type: 'smoke',
        phase: Math.random() * Math.PI * 2,
      });
    }

    function spawnEmber() {
      const w = canvas!.width;
      const h = canvas!.height;
      particles.push({
        x: w * (0.1 + Math.random() * 0.8),
        y: h * (0.6 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 0.55,
        vy: -(0.45 + Math.random() * 0.75),
        life: 0,
        maxLife: 200 + Math.random() * 160,
        size: 0.8 + Math.random() * 1.6,
        type: 'ember',
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Pre-seed with staggered smoke blobs
    for (let i = 0; i < 6; i++) {
      spawnSmoke();
      // Push each to a random point in its lifecycle so they don't all appear at once
      const p = particles[particles.length - 1]!;
      p.life = Math.floor(Math.random() * p.maxLife * 0.7);
      p.y = canvas.height * (0.2 + Math.random() * 0.8);
    }

    function tick() {
      frame++;
      const w = canvas!.width;
      const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      if (frame % 18 === 0) spawnSmoke();
      if (frame % 6  === 0) spawnEmber();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x   += p.vx;
        p.y   += p.vy;
        p.vx  += (Math.random() - 0.5) * 0.015;
        p.life++;

        const progress = p.life / p.maxLife;
        // Bell curve alpha with per-particle phase shift for organic feel
        const alpha = Math.sin(progress * Math.PI + p.phase * 0.1) * (1 - progress * 0.3);

        if (p.type === 'smoke') {
          const r = p.size * (1 + progress * 0.8);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0,   `rgba(180,120,40,${Math.max(0, alpha * 0.062)})`);
          grad.addColorStop(0.45, `rgba(212,175,55,${Math.max(0, alpha * 0.038)})`);
          grad.addColorStop(1,   `rgba(212,175,55,0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          const a = Math.max(0, alpha * 0.13);
          ctx.save();
          ctx.shadowBlur  = p.size * 4;
          ctx.shadowColor = `rgba(212,175,55,${a * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212,175,55,${a})`;
          ctx.fill();
          ctx.restore();
        }

        if (p.life >= p.maxLife || p.y < -80) particles.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      zIndex: 9990, overflow: 'hidden',
      mixBlendMode: 'screen',
    }}>
      {/* Cinematic edge vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 82% 72% at 50% 50%, transparent 28%, rgba(4,2,0,0.52) 100%)',
      }} />
      {/* Canvas-based volumetric smoke + ember particle system */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', willChange: 'contents' }}
      />
      {/* Persistent smoldering cigar-tip fixture — bottom-right, 5s pulse */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 6px 2px rgba(212,175,55,0.22)',
            '0 0 26px 8px rgba(212,175,55,0.70)',
            '0 0 12px 4px rgba(212,175,55,0.40)',
            '0 0 26px 8px rgba(212,175,55,0.70)',
            '0 0 6px 2px rgba(212,175,55,0.22)',
          ],
          opacity: [0.72, 1, 0.82, 1, 0.72],
        }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position:     'absolute',
          bottom:       72,
          right:        '13%',
          width:        10,
          height:       6,
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, #fff8e1 0%, #d4af37 42%, #7c3800 100%)',
          willChange:   'box-shadow, opacity',
        }}
      />
      {/* Micro-sparks from persistent fixture */}
      {([0, 1, 2] as const).map(i => (
        <motion.div
          key={`global-spark-${i}`}
          animate={{
            x:       [0, (i === 0 ? -6 : i === 1 ? 5 : -2)],
            y:       [0, -(14 + i * 8)],
            opacity: [0, 0.8, 0],
            scale:   [1, 0.3],
          }}
          transition={{ duration: 0.5 + i * 0.15, repeat: Infinity, delay: i * 1.6 + 0.4, ease: 'easeOut' }}
          style={{
            position:     'absolute',
            bottom:       74,
            right:        `calc(13% + ${i * 3}px)`,
            width:        2.5,
            height:       2.5,
            borderRadius: '50%',
            background:   '#fff8e1',
            boxShadow:    '0 0 4px #d4af37',
            willChange:   'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

/* ── Brand partner firewall — redirects vendors away from protected routes ── */
const VENDOR_BLOCKED_PREFIXES = [
  '/sovereign-dashboard', '/sovereign-gate', '/sovereign-verify',
  '/founder', '/eeie-command', '/titan-eat', '/eeie/command-center',
  '/operations', '/distribution', '/hardware-lab', '/ambassador-hub',
  '/admin-master', '/admin-panel', '/central-command',
  '/finance-reconciliation', '/governance', '/enterprise-intelligence',
  '/analytics', '/war-room', '/intelligence', '/revenue',
  '/competition', '/inventory', '/training', '/staff',
];

function BrandPartnerFirewall() {
  const [loc, navigate] = useLocation();
  useEffect(() => {
    const role = typeof localStorage !== 'undefined' ? localStorage.getItem('axiom_role') : null;
    if (role !== 'brand_partner') return;
    if (VENDOR_BLOCKED_PREFIXES.some((prefix) => loc === prefix || loc.startsWith(prefix + '/'))) {
      navigate('/vendor/dashboard');
    }
  }, [loc, navigate]);
  return null;
}

/* ══════════════════════════════════════════════════════════════
   ROOT APP — wouter router
   All sub-pages lazy-loaded; / → Sovereign Boot Flow
══════════════════════════════════════════════════════════════ */
export default function App() {
  const venueId  = typeof localStorage !== 'undefined' ? (localStorage.getItem('axiom_venue_id')  ?? '00000000-0000-0000-0000-000000000000') : '00000000-0000-0000-0000-000000000000';
  const userRole = typeof localStorage !== 'undefined' ? (localStorage.getItem('axiom_role')       ?? 'venue_owner') : 'venue_owner';
  return (
    <Router>
      <BrandPartnerFirewall />
      <GuestAmbientLayer />
      {/* ── Cinematic 4-stage brand intro — fixed overlay, session-gated ── */}
      <SplashController />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* ── Enterprise / AI (standalone — no full provider stack needed) ── */}
          <Route path="/enterprise/ai-config">
            <AIProviderSetup venueId={venueId} userRole={userRole} />
          </Route>

          {/* ── All sub-pages — wrapped in full provider stack ── */}
          <Route path="/dashboard">
            <SubPageProviders><Dashboard /></SubPageProviders>
          </Route>
          <Route path="/settings">
            <SubPageProviders><SettingsModule /></SubPageProviders>
          </Route>
          <Route path="/admin-master">
            <SubPageProviders><AdminMaster /></SubPageProviders>
          </Route>
          <Route path="/admin-panel">
            <SubPageProviders><AdminMaster /></SubPageProviders>
          </Route>
          <Route path="/onboarding">
            <OnboardWizard />
          </Route>
          <Route path="/analytics">
            <SubPageProviders><AnalyticsModule /></SubPageProviders>
          </Route>
          <Route path="/analytics/swipe-intelligence">
            <SubPageProviders><SwipeIntelligence /></SubPageProviders>
          </Route>
          <Route path="/founder">
            <SubPageProviders><FounderControlCenter /></SubPageProviders>
          </Route>
          <Route path="/command">
            <SubPageProviders><CommandCenter /></SubPageProviders>
          </Route>
          <Route path="/command-center">
            <SubPageProviders><SovereignRoute featureName="Command Center"><CentralCommand /></SovereignRoute></SubPageProviders>
          </Route>
          <Route path="/welcome-eeie">
            <WelcomeEEIE />
          </Route>
          <Route path="/titan-eat">
            <SubPageProviders><TitanEATHub /></SubPageProviders>
          </Route>
          <Route path="/eeie-command">
            <SubPageProviders><EEIELandingHub /></SubPageProviders>
          </Route>
          <Route path="/eeie/command-center">
            <SubPageProviders><EEIECommandCenter /></SubPageProviders>
          </Route>
          <Route path="/eeie/:module">
            <SubPageProviders><EEIEModulePage /></SubPageProviders>
          </Route>
          <Route path="/operations">
            <SubPageProviders><SovereignRoute featureName="Master Operations"><MasterOperations /></SovereignRoute></SubPageProviders>
          </Route>
          <Route path="/finance-reconciliation">
            <SubPageProviders><FinanceReconciliation /></SubPageProviders>
          </Route>
          <Route path="/inventory">
            <SubPageProviders><InventoryModule /></SubPageProviders>
          </Route>
          <Route path="/revenue">
            <SubPageProviders><RevenueEngine /></SubPageProviders>
          </Route>
          <Route path="/competition">
            <SubPageProviders><CompetitionModule /></SubPageProviders>
          </Route>
          <Route path="/intelligence">
            <SubPageProviders><IntelligenceManifest /></SubPageProviders>
          </Route>
          <Route path="/craft-hub">
            <SubPageProviders><CraftHub /></SubPageProviders>
          </Route>
          <Route path="/pos">
            <SubPageProviders><PosMode /></SubPageProviders>
          </Route>
          <Route path="/pin-login">
            <SubPageProviders><PinLogin /></SubPageProviders>
          </Route>
          <Route path="/axiom360">
            <SubPageProviders><Axiom360 /></SubPageProviders>
          </Route>
          <Route path="/staff">
            <SubPageProviders><StaffModule /></SubPageProviders>
          </Route>
          <Route path="/touch">
            <SubPageProviders><TouchscreenHome /></SubPageProviders>
          </Route>
          <Route path="/venue-touch">
            <SubPageProviders><VenueTouchscreen /></SubPageProviders>
          </Route>
          <Route path="/admin-touch">
            <SubPageProviders><AdminTouchscreen /></SubPageProviders>
          </Route>
          <Route path="/experience-control">
            <SubPageProviders><ExperienceControlPanel /></SubPageProviders>
          </Route>
          <Route path="/establishment-setup">
            <SubPageProviders><EstablishmentSetupPage /></SubPageProviders>
          </Route>
          <Route path="/training/employee">
            <SubPageProviders><StaffTraining /></SubPageProviders>
          </Route>
          <Route path="/training/investor">
            <SubPageProviders><InvestorSimulator /></SubPageProviders>
          </Route>
          <Route path="/training/sales">
            <SubPageProviders><SalesValidation /></SubPageProviders>
          </Route>
          <Route path="/experience-overview/:type">
            <SubPageProviders><ExperienceOverview /></SubPageProviders>
          </Route>
          <Route path="/synchronization/:type">
            <SubPageProviders><SynchronizationChamber /></SubPageProviders>
          </Route>
          <Route path="/experience/:type">
            <SubPageProviders><ExperiencePage /></SubPageProviders>
          </Route>
          <Route path="/reveal/:type">
            <SubPageProviders><RevealPage /></SubPageProviders>
          </Route>
          <Route path="/legacy-handoff/:sessionId/:craftType">
            <SubPageProviders><LegacyHandoff /></SubPageProviders>
          </Route>
          <Route path="/enrollment">
            <SubPageProviders><Entry /></SubPageProviders>
          </Route>
          <Route path="/experience-center">
            <SubPageProviders><DemoExperienceCenter /></SubPageProviders>
          </Route>
          <Route path="/demo">
            <SubPageProviders><Demo /></SubPageProviders>
          </Route>
          <Route path="/demo-walkthrough">
            <SubPageProviders><DemoWalkthrough /></SubPageProviders>
          </Route>
          <Route path="/axiom-demo">
            <SubPageProviders><AxiomDemo /></SubPageProviders>
          </Route>
          <Route path="/pay/:tabId">
            <SubPageProviders><AxiomPay /></SubPageProviders>
          </Route>
          <Route path="/receipt/:tabId">
            <SubPageProviders><AxiomReceipt /></SubPageProviders>
          </Route>
          <Route path="/master-blender">
            <SubPageProviders><MasterBlender /></SubPageProviders>
          </Route>
          <Route path="/designer">
            <SubPageProviders><SovereignRoute featureName="Experience Designer"><DesignerPage /></SovereignRoute></SubPageProviders>
          </Route>
          <Route path="/upgrade">
            <SubPageProviders><UpgradePage /></SubPageProviders>
          </Route>
          <Route path="/upgrade-required">
            <SubPageProviders><UpgradeRequired /></SubPageProviders>
          </Route>

          {/* ── Previously unregistered pages — recovered routes ── */}
          <Route path="/payment/success">
            <SubPageProviders><PaymentSuccess /></SubPageProviders>
          </Route>
          <Route path="/payment/cancel">
            <SubPageProviders><PaymentCancel /></SubPageProviders>
          </Route>
          <Route path="/presence">
            <SubPageProviders><PresenceEngine /></SubPageProviders>
          </Route>
          <Route path="/campaigns">
            <SubPageProviders><CampaignsModule /></SubPageProviders>
          </Route>
          <Route path="/rewards">
            <SubPageProviders><RewardsModule /></SubPageProviders>
          </Route>
          <Route path="/orders">
            <SubPageProviders><OrdersModule /></SubPageProviders>
          </Route>
          <Route path="/brew">
            <SubPageProviders><BrewCraft /></SubPageProviders>
          </Route>
          <Route path="/pour">
            <SubPageProviders><PourCraft /></SubPageProviders>
          </Route>
          <Route path="/wine">
            <SubPageProviders><WineCraft /></SubPageProviders>
          </Route>
          <Route path="/sarv">
            <SubPageProviders><SARV /></SubPageProviders>
          </Route>
          <Route path="/sovereign-command">
            <SubPageProviders><SovereignCommand /></SubPageProviders>
          </Route>
          <Route path="/launch-readiness">
            <SubPageProviders><LaunchReadiness /></SubPageProviders>
          </Route>
          <Route path="/legal">
            <SubPageProviders><Legal /></SubPageProviders>
          </Route>
          <Route path="/system-validation">
            <SubPageProviders><SystemValidation /></SubPageProviders>
          </Route>
          <Route path="/staff-cockpit">
            <SubPageProviders><StaffFloorCockpit /></SubPageProviders>
          </Route>
          <Route path="/devices">
            <SubPageProviders><DevicesModule /></SubPageProviders>
          </Route>
          <Route path="/environment">
            <SubPageProviders><EnvironmentEngine /></SubPageProviders>
          </Route>
          <Route path="/enterprise-intelligence">
            <SubPageProviders><SovereignRoute featureName="Enterprise Intelligence"><EnterpriseIntelligence /></SovereignRoute></SubPageProviders>
          </Route>
          <Route path="/governance">
            <SubPageProviders><SovereignRoute featureName="Enterprise Governance"><EnterpriseGovernance /></SovereignRoute></SubPageProviders>
          </Route>
          <Route path="/central-command">
            <SubPageProviders><SovereignRoute featureName="Central Command"><CentralCommand /></SovereignRoute></SubPageProviders>
          </Route>
          <Route path="/axiom-pay">
            <SubPageProviders><AxiomPay /></SubPageProviders>
          </Route>

          <Route path="/distribution">
            <SubPageProviders><SovereignDistributionVault /></SubPageProviders>
          </Route>
          <Route path="/hardware-lab">
            <SubPageProviders><SovereignHardwareLab /></SubPageProviders>
          </Route>
          {/* ── Vendor Portal — brand_partner role ── */}
          <Route path="/novee/pulse">
            <PulseIntelligenceCenter />
          </Route>
          <Route path="/vendor/onboarding">
            <VendorOnboarding />
          </Route>
          <Route path="/vendor/dashboard">
            <VendorDashboard />
          </Route>
          <Route path="/vendor/products">
            <VendorProducts />
          </Route>
          <Route path="/vendor/media">
            <VendorMedia />
          </Route>
          <Route path="/vendor/inventory">
            <VendorInventory />
          </Route>
          <Route path="/vendor/venues">
            <VendorVenues />
          </Route>
          <Route path="/vendor/performance">
            <VendorPerformance />
          </Route>
          <Route path="/vendor/approvals">
            <VendorApprovals />
          </Route>
          <Route path="/vendor/messages">
            <VendorMessages />
          </Route>

          {/* ── Sovereign routes ── */}
          <Route path="/sovereign-gate">
            <SovereignGate />
          </Route>
          <Route path="/gate">
            <SovereignGate />
          </Route>
          <Route path="/sovereign-verify">
            <SovereignVerify />
          </Route>
          <Route path="/sovereign-dashboard">
            <SovereignDashboard />
          </Route>

          {/* ── EEIE alias ── */}
          <Route path="/eeie">
            <SubPageProviders><EEIELandingHub /></SubPageProviders>
          </Route>

          {/* ── Ambassador routes ── */}
          <Route path="/ambassador-gate">
            <AmbassadorGate />
          </Route>
          <Route path="/ambassador-verify">
            <AmbassadorVerify />
          </Route>
          <Route path="/ambassador-hub">
            <AmbassadorHub />
          </Route>

          {/* ── /portal — Pristine Boot State (System Purge destination) ── */}
          <Route path="/portal">
            <SubPageProviders><LivingPortal /></SubPageProviders>
          </Route>

          {/* ── Root: SmokeCraft landing page ── */}
          <Route path="/experiences">
            <SubPageProviders><ExperiencesModule /></SubPageProviders>
          </Route>
          {/* ── /home preserved for admin/staff direct access ── */}
          <Route path="/home">
            <SubPageProviders><Home /></SubPageProviders>
          </Route>
          {/* ── Root redirects to CraftHub (side-by-side columns) ── */}
          <Route path="/">
            <Redirect to="/craft-hub" />
          </Route>

          {/* ── Default: Sovereign Gate — all entry flows begin here ── */}
          <Route>
            <SovereignGate />
          </Route>
        </Switch>
      </Suspense>
      {/* Phantom HUD — additive fixed overlay, zero interruption */}
      <PhantomHUD />
    </Router>
  );
}

/* ── HELPERS ── */
const GOLD_GRAD = 'linear-gradient(180deg,#fff9e6 0%,#d4af37 45%,#b8860b 75%,#8a6d3b 100%)';

function fullBleed(bg: string): React.CSSProperties {
  return {
    position: 'fixed', inset: 0,
    background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
  };
}
