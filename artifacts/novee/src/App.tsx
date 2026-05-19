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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base="/novee">
        <EATTransitionOverlay />
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/"               component={SmokeCraftGateway} />
            <Route path="/craft-collection" component={CraftPortalHome} />
            <Route path="/craft-collection/:slug" component={SlugRedirect} />
            <Route path="/coming-soon"    component={CraftComingSoon} />
            <Route path="/eat"            component={EATDashboard} />
            <Route path="/command"        component={CommandCenter} />
            <Route path="/os"             component={OSShell} />
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
        </Suspense>
      </WouterRouter>
    </QueryClientProvider>
  );
}
