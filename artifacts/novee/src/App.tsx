import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeafBlendPanel } from "@/components/LeafBlendPanel";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ backgroundColor: "#000000", minHeight: "100vh", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <LeafBlendPanel />
      </div>
    </QueryClientProvider>
  );
}
