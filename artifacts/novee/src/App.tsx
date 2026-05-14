import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const OSShell      = lazy(() => import("@/pages/OSShell"));
const EATDashboard = lazy(() => import("@/pages/EATDashboard"));

function PageLoader() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0D0D0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <Route path="/"           component={OSShell} />
        <Route path="/eat-engine" component={EATDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
