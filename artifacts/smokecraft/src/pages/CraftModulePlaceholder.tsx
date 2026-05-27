import { ArrowLeft, Home, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import "./CraftHubVisualPortal.css";

type CraftModulePlaceholderProps = {
  title: string;
  eyebrow: string;
  description: string;
  image?: string;
  status?: string;
};

export default function CraftModulePlaceholder({
  title,
  eyebrow,
  description,
  image = "/images/scenes/craft-hub.jpg",
  status = "Ready for backend wiring",
}: CraftModulePlaceholderProps) {
  const [, navigate] = useLocation();

  return (
    <main className="chvp-module-shell">
      <div className="chvp-module-bg" style={{ backgroundImage: `url(${image})` }} />
      <section className="chvp-module-panel">
        <div className="chvp-module-actions">
          <button onClick={() => window.history.back()}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button onClick={() => navigate("/craft-hub")}>
            <Home size={20} />
            <span>Home</span>
          </button>
        </div>

        <span className="chvp-overline">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>

        <div className="chvp-module-status">
          <ShieldCheck size={22} />
          <div>
            <strong>{status}</strong>
            <span>NOVEE OS route connected. Replace this panel with backend data when the module API is ready.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
