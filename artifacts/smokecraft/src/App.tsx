import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster }         from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider }    from "@/contexts/AuthContext";
import { VenueProvider }   from "@/contexts/VenueContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import { LicenseGate }     from "@/components/License/LicenseGate";
import { PresentationProvider } from "@/contexts/PresentationContext";
import NotFound        from "@/pages/not-found";
import Home            from "@/pages/Home";
import Dashboard       from "@/pages/Dashboard";
import PaymentSuccess  from "@/pages/PaymentSuccess";
import PaymentCancel   from "@/pages/PaymentCancel";
import { DemoBanner }            from "@/components/Demo/DemoBanner";
import { PresentationOverlay }   from "@/components/Presentation/PresentationOverlay";
import { KioskModeProvider, KioskModeBanner } from "@/contexts/KioskModeContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/"          component={Home}           />
      <Route path="/dashboard" component={Dashboard}      />
      <Route path="/success"   component={PaymentSuccess} />
      <Route path="/cancel"    component={PaymentCancel}  />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VenueProvider>
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
                </KioskModeProvider>
              </PresentationProvider>
            </AuthProvider>
          </LicenseProvider>
        </VenueProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
