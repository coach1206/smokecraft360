/**
 * AppLayout — opt-in wrapper for pages that want a consistent header.
 *
 * Additive only — pages that don't use it still render normally. The
 * GlobalBackButton (mounted once in App.tsx) handles back navigation
 * across the whole app independently, so AppLayout does NOT inject one
 * (it would double up).
 *
 * Use this when a page wants:
 *   • A full-bleed background image
 *   • A consistent top-left page title
 *   • A standard top padding so content doesn't collide with the
 *     global back button
 *
 * Pages with bespoke layouts (Dashboard, Home wizard, Intro) should
 * stay as-is — this wrapper is for new pages or future refactors.
 */

import type { CSSProperties, ReactNode } from "react";

export interface AppLayoutProps {
  title?: string;
  background?: string;
  /** Override default top padding (default 80px clears the BackButton). */
  contentPaddingTop?: number;
  /** If true, renders without the dimmed overlay (default false). */
  noOverlay?: boolean;
  children: ReactNode;
}

export default function AppLayout({
  title,
  background,
  contentPaddingTop = 80,
  noOverlay = false,
  children,
}: AppLayoutProps) {
  const rootStyle: CSSProperties = {
    minHeight: "100vh",
    position: "relative",
    backgroundColor: "#0b0908",
    backgroundImage: background ? `url(${background})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    color: "rgba(230,210,175,0.92)",
  };

  return (
    <div data-testid="app-layout" style={rootStyle}>
      {!noOverlay && background ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(11,9,8,0.55) 0%, rgba(11,9,8,0.85) 100%)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {title ? (
        <div
          data-testid="app-layout-title"
          style={{
            position: "absolute",
            top: 24,
            left: 96,
            zIndex: 5,
            font: "600 13px/1 'Inter', system-ui, sans-serif",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "rgba(230,210,175,0.78)",
          }}
        >
          {title}
        </div>
      ) : null}

      <div style={{ position: "relative", zIndex: 1, paddingTop: contentPaddingTop }}>
        {children}
      </div>
    </div>
  );
}
