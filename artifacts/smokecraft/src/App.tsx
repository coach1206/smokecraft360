import { useState } from "react";
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
import CampaignsModule from "@/pages/CampaignsModule";
import OwnerIntelPanel from "@/pages/OwnerIntelPanel";
import BrewCraft       from "@/pages/BrewCraft";
import PourCraft       from "@/pages/PourCraft";
import VapeCraft       from "@/pages/VapeCraft";
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
import CompetitionModule   from "@/pages/CompetitionModule";
import CraftHub            from "@/pages/CraftHub";
import { DemoBanner }            from "@/components/Demo/DemoBanner";
import { OfflineQueueBanner }   from "@/components/Demo/OfflineQueueBanner";
import { PresentationOverlay }   from "@/components/Presentation/PresentationOverlay";
import { KioskModeProvider, KioskModeBanner } from "@/contexts/KioskModeContext";
import { PosProvider } from "@/contexts/PosContext";
import { CommandCenterProvider } from "@/contexts/CommandCenterContext";
import BootIntro, { hasSeenBootIntro } from "@/components/BootIntro";
import GlobalBackButton                from "@/components/Layout/GlobalBackButton";
import InactivityGuard                 from "@/components/InactivityGuard";
import PosAuditBridge                  from "@/components/PosAuditBridge";
import { useSystemVersion }            from "@/hooks/useSystemVersion";
import { EngagementProvider }          from "@/contexts/EngagementContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/"           component={Entry}          />
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
      <Route path="/admin/intel" component={OwnerIntelPanel} />
      {/* BrewCraft — beer-led quick-pick flow. Declared before /:theme so
          the explicit path wins; if it ever needs to live under a theme
          (e.g. /smokecraft/brewcraft) it can be moved down. */}
      <Route path="/brewcraft"  component={BrewCraft}      />
      {/* PourCraft — whisky/spirit-led pairing flow. Same explicit-route
          pattern as /brewcraft so the dynamic /:theme handler can't shadow it. */}
      <Route path="/pourcraft"  component={PourCraft}      />
      {/* VapeCraft — placeholder page with vape-environment visuals.
          Declared before /:theme so /vapecraft no longer falls through
          to the cigar wizard in Home.tsx. Full vapor flow is a separate
          slice once vape inventory + style presets are designed. */}
      <Route path="/vapecraft"       component={VapeCraft}      />
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
      <Route path="/competition"        component={CompetitionModule}    />
      <Route path="/craft-hub"          component={CraftHub}             />
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
  /* Gate the routed app behind the boot intro per the user's onFinish
   * pattern. Initialized synchronously from sessionStorage so a "seen"
   * session goes straight to ready=true and never mounts BootIntro at
   * all (no one-frame flash). Providers stay outside the gate so context
   * state isn't torn down/remounted across the transition. */
  const [ready, setReady] = useState<boolean>(() => hasSeenBootIntro());
  useSystemVersion();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VenueProvider>
         <ThemeProvider>
          <LicenseProvider>
            <AuthProvider>
              <PresentationProvider>
                <PosProvider>
                <CommandCenterProvider>
                <EngagementProvider>
                <KioskModeProvider>
                  {!ready && <BootIntro onFinish={() => setReady(true)} />}
                  {ready && (
                    <>
                      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                        <GlobalBackButton />
                        <InactivityGuard />
                        <Router />
                      </WouterRouter>
                      <PosAuditBridge />
                      <PresentationOverlay />
                      <DemoBanner />
                      <OfflineQueueBanner />
                      <KioskModeBanner />
                      <LicenseGate />
                      <Toaster />
                    </>
                  )}
                </KioskModeProvider>
                </EngagementProvider>
                </CommandCenterProvider>
                </PosProvider>
              </PresentationProvider>
            </AuthProvider>
          </LicenseProvider>
         </ThemeProvider>
        </VenueProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
