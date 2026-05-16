/**
 * SlugRedirect — resolves a module slug (current or historical) and navigates
 * the user to the correct destination.
 *
 * Route: /modules/:slug
 *
 * Behaviour:
 *  - Calls GET /api/kernel/modules/by-slug/:slug
 *  - Current slug  → launches the module directly
 *  - Historical slug → API responds with 301 + { redirect, currentSlug, module };
 *    fetch follows the 301 automatically, so we read the final JSON body and
 *    navigate to the new slug URL (or launch the module).
 *  - Unknown slug → shows a "not found" message with a link back to the OS.
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

interface KernelModule {
  id: string;
  name: string;
  slug: string;
  status: string;
  launchUrl: string | null;
}

type ResolveResult =
  | { redirect: false; module: KernelModule }
  | { redirect: true; currentSlug: string; module: KernelModule };

export default function SlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "redirecting" | "launching" | "not_found" | "deleted" | "error">("loading");
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    apiFetch<ResolveResult>(`/modules/by-slug/${encodeURIComponent(slug)}`)
      .then((result) => {
        const mod = result.module;

        if (result.redirect) {
          // Old slug → the API returned the current slug. Show a brief notice then redirect.
          setResolvedSlug(result.currentSlug);
          setStatus("redirecting");
          setTimeout(() => {
            // Navigate to the canonical slug page so the URL bar reflects the new slug.
            navigate(`/modules/${encodeURIComponent(result.currentSlug)}`, { replace: true });
          }, 1500);
          return;
        }

        // Current slug — launch the module immediately.
        setStatus("launching");
        const url = mod.launchUrl ?? "/";
        window.open(url, "_blank");
        // After launching, send the user back to the OS shell.
        setTimeout(() => navigate("/sovereign", { replace: true }), 800);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setStatus("not_found");
        } else if (msg.toLowerCase().includes("deleted")) {
          setStatus("deleted");
        } else {
          setErrorMsg(msg);
          setStatus("error");
        }
      });
  }, [slug, navigate]);

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0D0D0E",
    color: "#F5EDD8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    padding: "40px 24px",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: "0.3em",
    color: "rgba(196,97,10,0.5)",
    marginBottom: 8,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 300,
    letterSpacing: "0.1em",
    margin: 0,
    textAlign: "center",
  };

  const subStyle: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(245,237,216,0.45)",
    letterSpacing: "0.06em",
    textAlign: "center",
    maxWidth: 400,
  };

  const Spinner = () => (
    <div style={{ width: 32, height: 32, border: "2px solid rgba(196,97,10,0.2)", borderTopColor: "#C4610A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
  );

  if (status === "loading") {
    return (
      <div style={containerStyle}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <Spinner />
        <div style={subStyle}>Resolving <code style={{ color: "#C4610A" }}>/{slug}</code>…</div>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div style={containerStyle}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={labelStyle}>SLUG REDIRECTED</div>
        <h1 style={headingStyle}>This link has moved</h1>
        <div style={subStyle}>
          <code style={{ color: "rgba(248,113,113,0.8)" }}>/{slug}</code>
          {" "}→{" "}
          <code style={{ color: "rgba(134,239,172,0.8)" }}>/{resolvedSlug}</code>
        </div>
        <div style={{ ...subStyle, marginTop: 8 }}>Redirecting you now…</div>
        <Spinner />
      </div>
    );
  }

  if (status === "launching") {
    return (
      <div style={containerStyle}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={labelStyle}>MODULE LAUNCHING</div>
        <h1 style={headingStyle}>Opening module…</h1>
        <Spinner />
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div style={containerStyle}>
        <div style={labelStyle}>KERNEL REGISTRY</div>
        <h1 style={headingStyle}>No module found</h1>
        <div style={subStyle}>
          No module is registered under <code style={{ color: "#C4610A" }}>/{slug}</code>, and no redirect history exists for this slug.
        </div>
        <button
          onClick={() => navigate("/sovereign")}
          style={{
            marginTop: 8,
            background: "rgba(196,97,10,0.12)", border: "1px solid rgba(196,97,10,0.3)",
            borderRadius: 8, padding: "10px 24px",
            color: "#C4610A", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
            cursor: "pointer",
          }}
        >
          ← BACK TO OS SHELL
        </button>
      </div>
    );
  }

  if (status === "deleted") {
    return (
      <div style={containerStyle}>
        <div style={labelStyle}>KERNEL REGISTRY</div>
        <h1 style={headingStyle}>Module has been removed</h1>
        <div style={subStyle}>
          The module previously at <code style={{ color: "#C4610A" }}>/{slug}</code> was deleted and is no longer available.
        </div>
        <button
          onClick={() => navigate("/sovereign")}
          style={{
            marginTop: 8,
            background: "rgba(196,97,10,0.12)", border: "1px solid rgba(196,97,10,0.3)",
            borderRadius: 8, padding: "10px 24px",
            color: "#C4610A", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
            cursor: "pointer",
          }}
        >
          ← BACK TO OS SHELL
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>ERROR</div>
      <h1 style={headingStyle}>Something went wrong</h1>
      {errorMsg && (
        <div style={{ ...subStyle, color: "rgba(248,113,113,0.7)", fontSize: 11 }}>{errorMsg}</div>
      )}
      <button
        onClick={() => navigate("/sovereign")}
        style={{
          marginTop: 8,
          background: "rgba(196,97,10,0.12)", border: "1px solid rgba(196,97,10,0.3)",
          borderRadius: 8, padding: "10px 24px",
          color: "#C4610A", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
          cursor: "pointer",
        }}
      >
        ← BACK TO OS SHELL
      </button>
    </div>
  );
}
