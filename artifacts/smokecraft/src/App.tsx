import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster }         from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider }    from "@/contexts/AuthContext";
import { VenueProvider }   from "@/contexts/VenueContext";
import { ThemeProvider }   from "@/contexts/ThemeContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import { LicenseGate }     from "@/components/License/LicenseGate";
import { PresentationProvider } from "@/contexts/PresentationContext";
import NotFound        from "@/pages/not-found";
import Home            from "@/pages/Home";
import Intro           from "@/pages/Intro";
import Entry           from "@/pages/Entry";
import PinLogin        from "@/pages/PinLogin";
import PosMode         from "@/pages/PosMode";
import Dashboard       from "@/pages/Dashboard";
import CommandCenter   from "@/pages/CommandCenter";
import DevicesModule   from "@/pages/DevicesModule";
import ExperiencesModule from "@/pages/ExperiencesModule";
import AnalyticsModule from "@/pages/AnalyticsModule";
import VendorsModule   from "@/pages/VendorsModule";
import StaffModule     from "@/pages/StaffModule";
import SettingsModule  from "@/pages/SettingsModule";
import OrdersModule    from "@/pages/OrdersModule";
import InventoryModule from "@/pages/InventoryModule";
import RewardsModule   from "@/pages/RewardsModule";
import CampaignsModule  from "@/pages/CampaignsModule";
import RevenueEngine       from "@/pages/RevenueEngine";
import IntelligencePanel  from "@/pages/IntelligencePanel";
import PresenceEngine          from "@/pages/PresenceEngine";
import EnterpriseGovernance   from "@/pages/EnterpriseGovernance";
import CentralCommand         from "@/pages/CentralCommand";
import { AxiomIntelligenceProvider } from "@/contexts/AxiomIntelligenceContext";
import { AxiomPresenceProvider }     from "@/contexts/AxiomPresenceContext";
import OwnerIntelPanel from "@/pages/OwnerIntelPanel";
import ExperiencePage      from "@/pages/ExperiencePage";
import RevealPage          from "@/pages/RevealPage";
import SwipeIntelligence   from "@/pages/SwipeIntelligence";
import BuildYourOwn   from "@/pages/BuildYourOwn";
import DesignerPage   from "@/pages/DesignerPage";
import PaymentSuccess  from "@/pages/PaymentSuccess";
import PaymentCancel   from "@/pages/PaymentCancel";
import Demo            from "@/pages/Demo";
import DemoWalkthrough from "@/pages/DemoWalkthrough";
import TouchscreenHome      from "@/pages/TouchscreenHome";
import AdminTouchscreen     from "@/pages/AdminTouchscreen";
import VenueTouchscreen     from "@/pages/VenueTouchscreen";
import VendorTouchscreen    from "@/pages/VendorTouchscreen";
import DemoExperienceCenter from "@/pages/DemoExperienceCenter";
import CraftHub            from "@/pages/CraftHub";
import Axiom360            from "@/pages/Axiom360";
import TitanCraftDeck           from "@/pages/TitanCraftDeck";
import DemographicIntelligence  from "@/pages/DemographicIntelligence";
import ExperienceControlPanel from "@/pages/ExperienceControlPanel";
import { DemoBanner }            from "@/components/Demo/DemoBanner";
import { OfflineQueueBanner }   from "@/components/Demo/OfflineQueueBanner";
import { PresentationOverlay }   from "@/components/Presentation/PresentationOverlay";
import { KioskModeProvider, KioskModeBanner } from "@/contexts/KioskModeContext";
import { PosProvider } from "@/contexts/PosContext";
import { CommandCenterProvider } from "@/contexts/CommandCenterContext";
import { DeviceRouterProvider }  from "@/components/DeviceRouter";
import { NeuralBridgeOverlay }   from "@/components/NeuralBridgeOverlay";
import OnboardWizard      from "@/pages/OnboardWizard";
import DemoSimDashboard      from "@/pages/DemoSimDashboard";
import SystemValidation      from "@/pages/SystemValidation";
import AxiomDemo             from "@/pages/AxiomDemo";
import OperatorReadiness     from "@/pages/OperatorReadiness";
import StaffTraining         from "@/pages/StaffTraining";
import VenueManual           from "@/pages/VenueManual";
import GlobalBackButton from "@/components/Layout/GlobalBackButton";
import InactivityGuard                 from "@/components/InactivityGuard";
import PosAuditBridge                  from "@/components/PosAuditBridge";
import { useSystemVersion }            from "@/hooks/useSystemVersion";
import { EngagementProvider }          from "@/contexts/EngagementContext";
import { GuestProfileProvider }        from "@/contexts/GuestProfileContext";
import { bootstrapKioskAuth }          from "@/services/auth";
import { EnvironmentProvider }         from "@/contexts/EnvironmentContext";
import { OrchestratorProvider }       from "@/contexts/OrchestratorContext";
import { PersistentAmbientLayer }      from "@/components/PersistentAmbientLayer";
import { ParticleSystem }              from "@/components/ParticleSystem";
import { GlobalAmbientOverlay }        from "@/components/GlobalAmbientOverlay";
import { LoungeEnvironment }           from "@/components/LoungeEnvironment";
import EnvironmentEnginePage          from "@/pages/EnvironmentEngine";
import EnterpriseIntelligence         from "@/pages/EnterpriseIntelligence";
import MasterOperations               from "@/pages/MasterOperations";
import AxiomPay                       from "@/pages/AxiomPay";
import LaunchReadiness                from "@/pages/LaunchReadiness";
import Legal                          from "@/pages/Legal";
import AxiomReceipt                   from "@/pages/AxiomReceipt";
import MobileHub                      from "@/pages/MobileHub";
import FinanceReconciliation          from "@/pages/FinanceReconciliation";
import PitchPage                      from "@/pages/PitchPage";
import TrainingHub                    from "@/pages/training/TrainingHub";
import TrainingEmployee               from "@/pages/training/TrainingEmployee";
import TrainingInvestor               from "@/pages/training/TrainingInvestor";
import TrainingSales                  from "@/pages/training/TrainingSales";
import TrainingWalkthrough            from "@/pages/training/TrainingWalkthrough";
import TrainingScenarios              from "@/pages/training/TrainingScenarios";
import TrainingCertifications         from "@/pages/training/TrainingCertifications";
import TrainingManual                  from "@/pages/training/TrainingManual";
import IntelligenceManifest            from "@/pages/IntelligenceManifest";
import AdminMaster                     from "@/pages/AdminMaster";
import ExecutiveWarRoom               from "@/pages/ExecutiveWarRoom";
import ManufacturerWarRoom            from "@/pages/ManufacturerWarRoom";
import InvestorSimulator              from "@/pages/InvestorSimulator";
import IdentityLedger                from "@/pages/IdentityLedger";
import ServiceSagePage               from "@/pages/ServiceSagePage";
import EstablishmentSetupPage        from "@/pages/EstablishmentSetupPage";
import PromoDashboard                from "@/pages/PromoDashboard";
import { StaffBOHFeed }              from "@/components/StaffBOHFeed";
import AxiomStartup       from "@/pages/AxiomStartup";
import CraftOrbSelector    from "@/pages/CraftOrbSelector";
import StaffFloorCockpit            from "@/pages/StaffFloorCockpit";
import FounderIntelligenceDashboard from "@/pages/FounderIntelligenceDashboard";
import RevenueCommandCenter        from "@/pages/RevenueCommandCenter";

const queryClient = new QueryClient();

// ── One-time cinematic boot sequence ─────────────────────────────────────────
// Renders as a fixed overlay above the entire app on first session visit.

function AxiomBootManager() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem("axiom_booted"); } catch { return false; }
  });
  if (!show) return null;
  return (
    <AxiomStartup
      onComplete={() => {
        try { sessionStorage.setItem("axiom_booted", "1"); } catch { /* */ }
        setShow(false);
      }}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/"           component={TitanCraftDeck}     />
      <Route path="/craft-hub"  component={CraftHub}          />
      <Route path="/titan-hub"   component={TitanCraftDeck}           />
      <Route path="/titan-demo"  component={DemographicIntelligence}  />
      <Route path="/intro"      component={Intro}          />
      <Route path="/entry"      component={Entry}          />
      <Route path="/pin-login"  component={PinLogin}       />
      <Route path="/pos"         component={PosMode}         />
      <Route path="/dashboard"   component={CommandCenter}   />
      <Route path="/admin-panel" component={Dashboard}       />
      <Route path="/devices"     component={DevicesModule}   />
      <Route path="/experiences" component={ExperiencesModule} />
      <Route path="/analytics"   component={AnalyticsModule} />
      <Route path="/vendors"     component={VendorsModule}   />
      <Route path="/staff"       component={StaffModule}     />
      <Route path="/settings"    component={SettingsModule}  />
      <Route path="/orders"      component={OrdersModule}    />
      <Route path="/inventory"   component={InventoryModule} />
      <Route path="/rewards"     component={RewardsModule}   />
      <Route path="/campaigns"   component={CampaignsModule} />
      <Route path="/revenue"       component={RevenueEngine}      />
      <Route path="/intelligence"  component={IntelligencePanel}  />
      <Route path="/presence"      component={PresenceEngine}     />
      <Route path="/governance"      component={EnterpriseGovernance}   />
      <Route path="/central-command" component={CentralCommand}         />
      <Route path="/environment"            component={EnvironmentEnginePage}  />
      <Route path="/enterprise-intelligence" component={EnterpriseIntelligence} />
      <Route path="/operations"              component={MasterOperations}        />
      <Route path="/axiom-pay"               component={AxiomPay}                />
      <Route path="/launch-readiness"        component={LaunchReadiness}          />
      <Route path="/legal"                   component={Legal}                    />
      <Route path="/receipt/:tabId"              component={AxiomReceipt}              />
      <Route path="/mobile-hub"                  component={MobileHub}                 />
      <Route path="/finance-reconciliation"    component={FinanceReconciliation}     />
      <Route path="/promo-dashboard"           component={PromoDashboard}            />
      <Route path="/pitch"                     component={PitchPage}                 />
      <Route path="/training"                  component={TrainingHub}               />
      <Route path="/training/employee"         component={TrainingEmployee}          />
      <Route path="/training/investor"         component={TrainingInvestor}          />
      <Route path="/training/sales"            component={TrainingSales}             />
      <Route path="/training/walkthrough"      component={TrainingWalkthrough}       />
      <Route path="/training/scenarios"        component={TrainingScenarios}         />
      <Route path="/training/certifications"   component={TrainingCertifications}    />
      <Route path="/training/manual"             component={TrainingManual}            />
      <Route path="/intelligence-manifest"       component={IntelligenceManifest}      />
      <Route path="/admin-master"                 component={AdminMaster}               />
      <Route path="/admin/intel"               component={OwnerIntelPanel}         />
      <Route path="/admin/experience-control" component={ExperienceControlPanel}  />
      <Route path="/executive-war-room"        component={ExecutiveWarRoom}        />
      <Route path="/manufacturer-war-room"     component={ManufacturerWarRoom}     />
      <Route path="/investor-simulator"        component={InvestorSimulator}       />
      <Route path="/craft-selector" component={CraftOrbSelector} />
      {/* Legacy craft routes — redirect into the Universal Swipe Engine */}
      <Route path="/brewcraft"       component={() => { window.location.replace("/experience/brew"); return null; }} />
      <Route path="/pourcraft"       component={() => { window.location.replace("/experience/pour"); return null; }} />
      <Route path="/vapecraft"       component={() => { window.location.replace("/experience/vape"); return null; }} />
      <Route path="/smokecraft"      component={() => { window.location.replace("/experience/smoke"); return null; }} />
      {/* Universal Swipe Experience Engine */}
      <Route path="/experience/:type"              component={ExperiencePage}    />
      <Route path="/reveal/:sessionId"             component={RevealPage}        />
      <Route path="/analytics/swipe-intelligence"  component={SwipeIntelligence} />
      <Route path="/build-your-own"  component={BuildYourOwn}   />
      <Route path="/designer"        component={DesignerPage}   />
      <Route path="/success"    component={PaymentSuccess} />
      <Route path="/cancel"     component={PaymentCancel}  />
      {/* /demo — NDA-gated entry to the demo experience. Renders the
          DemoNdaModal until the user signs (sessionStorage flag), then
          redirects to /intro. Declared before /:theme so it can't be
          shadowed by the dynamic theme route. */}
      <Route path="/demo"       component={Demo}           />
      <Route path="/demo-mode"  component={DemoWalkthrough} />
      <Route path="/touch"             component={TouchscreenHome}      />
      <Route path="/touch/admin"       component={AdminTouchscreen}     />
      <Route path="/touch/venue"       component={VenueTouchscreen}     />
      <Route path="/touch/vendor"      component={VendorTouchscreen}    />
      <Route path="/experience-center" component={DemoExperienceCenter} />
      <Route path="/craft-hub"          component={CraftHub}             />
      <Route path="/onboard"            component={OnboardWizard}        />
      <Route path="/demo-sim"               component={DemoSimDashboard}     />
      <Route path="/admin/system-validation"   component={SystemValidation}    />
      <Route path="/demo/axiom-experience"    component={AxiomDemo}           />
      <Route path="/admin/operator-readiness" component={OperatorReadiness}   />
      <Route path="/admin/manual"             component={VenueManual}         />
      <Route path="/training/staff"           component={StaffTraining}       />
      <Route path="/identity-ledger"          component={IdentityLedger}      />
      <Route path="/staff/sage"               component={ServiceSagePage}     />
      <Route path="/staff/floor"              component={StaffFloorCockpit}           />
      <Route path="/venue-setup"              component={EstablishmentSetupPage}      />
      <Route path="/founder/intelligence"     component={FounderIntelligenceDashboard} />
      <Route path="/revenue-command-center"  component={RevenueCommandCenter} />
      {/* Dynamic per-theme entry URL (/smokecraft, /pourcraft, /grillcraft …).
          Declared LAST in the Switch so explicit app routes above always win;
          loadTheme() resolves the active theme from the first path segment.
          Adding a new theme requires only inserting a row in theme_profiles —
          no code change here. The slug pattern is enforced by loadTheme:
          unknown slugs silently fall back to the default theme. */}
      <Route path="/:theme"     component={Home}           />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useSystemVersion();

  // Kiosk armor — disable right-click context menu globally
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  // Bootstrap kiosk auth on mount and refresh every 30 minutes
  useEffect(() => {
    void bootstrapKioskAuth();
    const interval = setInterval(() => void bootstrapKioskAuth(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VenueProvider>
         <ThemeProvider>
          <LicenseProvider>
            <AuthProvider>
              <GuestProfileProvider>
              <PresentationProvider>
                <PosProvider>
                <CommandCenterProvider>
                <AxiomIntelligenceProvider>
                <AxiomPresenceProvider>
                <EngagementProvider>
                <KioskModeProvider>
                <DeviceRouterProvider>
                  <EnvironmentProvider>
                  <OrchestratorProvider>
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      <LoungeEnvironment>
                        <GlobalAmbientOverlay />
                        <PersistentAmbientLayer />
                        <ParticleSystem />
                        <GlobalBackButton />
                        <InactivityGuard />
                        <Router />
                        <AxiomBootManager />
                      </LoungeEnvironment>
                    </WouterRouter>
                    <StaffBOHFeed />
                    <PosAuditBridge />
                    <PresentationOverlay />
                    <DemoBanner />
                    <OfflineQueueBanner />
                    <KioskModeBanner />
                    <LicenseGate />
                    <NeuralBridgeOverlay />
                    <Toaster />
                  </OrchestratorProvider>
                  </EnvironmentProvider>
                </DeviceRouterProvider>
                </KioskModeProvider>
                </EngagementProvider>
                </AxiomPresenceProvider>
                </AxiomIntelligenceProvider>
                </CommandCenterProvider>
                </PosProvider>
              </PresentationProvider>
              </GuestProfileProvider>
            </AuthProvider>
          </LicenseProvider>
         </ThemeProvider>
        </VenueProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
