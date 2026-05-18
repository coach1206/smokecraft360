import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { EATTransitionOverlay } from "@/components/EATTransitionOverlay";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const CraftPortalHome   = lazy(() => import("@/pages/CraftPortalHome"));
const SmokeCraftGateway = lazy(() => import("@/pages/SmokeCraftGateway"));
const CraftComingSoon   = lazy(() => import("@/pages/CraftComingSoon"));
const OSShell           = lazy(() => import("@/pages/OSShell"));
const EATDashboard      = lazy(() => import("@/pages/EATDashboard"));
const CommandCenter     = lazy(() => import("@/pages/CommandCenter"));
const SlugRedirect      = lazy(() => import("@/pages/SlugRedirect"));

function PageLoader() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#070605", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" stroke="rgba(196,97,10,0.18)" strokeWidth="2" fill="none" />
        <circle cx="20" cy="20" r="16" stroke="#C4610A" strokeWidth="2" fill="none"
          strokeDasharray="40 60" strokeLinecap="round"
          style={{ animation: "spin 1s linear infinite", transformOrigin: "20px 20px" }} />
      </svg>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Default entry: immediate cinematic launch into the blending chamber */}
        <Route path="/"                  component={SmokeCraftGateway} />
        <Route path="/smokecraft"        component={SmokeCraftGateway} />
        {/* Craft collection preserved for multi-craft navigation */}
        <Route path="/craft-collection"  component={CraftPortalHome} />
        <Route path="/pourcraft"     component={() => <CraftComingSoon craft="pourcraft" />} />
        <Route path="/beercraft"     component={() => <CraftComingSoon craft="beercraft" />} />
        <Route path="/winecraft"     component={() => <CraftComingSoon craft="winecraft" />} />

        <Route path="/sovereign"     component={OSShell} />
        <Route path="/admin"         component={OSShell} />
        <Route path="/ops"           component={OSShell} />
        <Route path="/eat-engine"    component={EATDashboard} />
        <Route path="/kernel"        component={EATDashboard} />
        <Route path="/eeie"          component={EATDashboard} />

        {/* Autonomous Intelligence Command Center */}
        <Route path="/command-center" component={CommandCenter} />
        <Route path="/intelligence"   component={CommandCenter} />
        <Route path="/eeis"           component={CommandCenter} />

        {/* Slug resolver — handles current and historical module slugs with redirect */}
        <Route path="/modules/:slug"  component={SlugRedirect} />

        <Route component={() => <Redirect to="/" />} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <EATTransitionOverlay />
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
