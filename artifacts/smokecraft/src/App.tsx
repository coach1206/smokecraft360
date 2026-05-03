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
import Dashboard       from "@/pages/Dashboard";
import BrewCraft       from "@/pages/BrewCraft";
import PourCraft       from "@/pages/PourCraft";
import PaymentSuccess  from "@/pages/PaymentSuccess";
import PaymentCancel   from "@/pages/PaymentCancel";
import { DemoBanner }            from "@/components/Demo/DemoBanner";
import { PresentationOverlay }   from "@/components/Presentation/PresentationOverlay";
import { KioskModeProvider, KioskModeBanner } from "@/contexts/KioskModeContext";
import BootIntro                  from "@/components/BootIntro";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/"           component={Intro}          />
      <Route path="/intro"      component={Intro}          />
      <Route path="/dashboard"  component={Dashboard}      />
      {/* BrewCraft — beer-led quick-pick flow. Declared before /:theme so
          the explicit path wins; if it ever needs to live under a theme
          (e.g. /smokecraft/brewcraft) it can be moved down. */}
      <Route path="/brewcraft"  component={BrewCraft}      />
      {/* PourCraft — whisky/spirit-led pairing flow. Same explicit-route
          pattern as /brewcraft so the dynamic /:theme handler can't shadow it. */}
      <Route path="/pourcraft"  component={PourCraft}      />
      <Route path="/success"    component={PaymentSuccess} />
      <Route path="/cancel"     component={PaymentCancel}  />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VenueProvider>
         <ThemeProvider>
          <LicenseProvider>
            <AuthProvider>
              <PresentationProvider>
                <KioskModeProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                  </WouterRouter>
                  <PresentationOverlay />
                  <DemoBanner />
                  <KioskModeBanner />
                  <LicenseGate />
                  <Toaster />
                  {/* Profound Innovation cinematic boot intro — sibling
                      overlay so it sits above every route on first session
                      load and self-dismisses to reveal the underlying app. */}
                  <BootIntro />
                </KioskModeProvider>
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
