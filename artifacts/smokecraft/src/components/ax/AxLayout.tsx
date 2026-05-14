/**
 * AxLayout — master dashboard shell for NOVEE OS.
 * Provides standardized:
 *   - Sticky dark header with back button + title + right slot
 *   - Horizontal scrollable tab bar
 *   - Content area with max-width + padding
 *   - Ambient page glow
 *
 * Step 1 of 10 — Master Layout System (AppLayout)
 *
 * Usage:
 *   <AxLayout
 *     title="NOVEE Pay"
 *     subtitle="Payments · Tabs · Fulfillment"
 *     onBack={() => navigate("/operations")}
 *     rightSlot={<LiveIndicator />}
 *     tabs={TABS}
 *     activeTab={tab}
 *     onTabChange={setTab}
 *   >
 *     <MyTabContent />
 *   </AxLayout>
 */

import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AxStatusDot } from "./AxStatusDot";

export interface AxLayoutTab {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
}

interface AxLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Right-aligned header content */
  rightSlot?: ReactNode;
  tabs?: AxLayoutTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Content max-width (default: 1100) */
  maxWidth?: number;
  /** Content padding (default: "24px") */
  padding?: string;
  children: ReactNode;
  /** Show ambient page glow (default: true) */
  glow?: boolean;
  /** Live indicator in header */
  live?: boolean;
}

const BG = "#F5F2ED";
const GOLD = "#D48B00";
const BORDER = "rgba(212,139,0,0.16)";
const MUTED = "rgba(240,232,212,0.42)";
const TEXT = "rgba(26,26,27,0.88)";

export function AxLayout({
  title, subtitle, onBack, backLabel = "Back", rightSlot,
  tabs, activeTab, onTabChange,
  maxWidth = 1100, padding = "24px",
  children, glow = true, live,
}: AxLayoutProps) {
  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      color: TEXT,
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
      position: "relative",
    }}>
      {/* Ambient glow */}
      {glow && (
        <div
          aria-hidden
          style={{
            position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(212,139,0,0.06) 0%, transparent 70%)",
          }}
        />
      )}

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${BG}ee`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${BORDER}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 1px 0 rgba(212,139,0,0.08), 0 4px 20px rgba(26,26,27,0.10)",
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: `1px solid ${BORDER}`,
              borderRadius: 8, color: MUTED,
              fontSize: 11, padding: "6px 10px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            <ArrowLeft size={12} />
            {backLabel}
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: GOLD,
            fontFamily: "'Cormorant Garamond', serif",
            letterSpacing: "0.06em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{
              fontSize: 10, color: MUTED,
              letterSpacing: "0.12em", textTransform: "uppercase",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
          {live && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <AxStatusDot status="online" size={6} />
              <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700, letterSpacing: "0.08em" }}>
                LIVE
              </span>
            </div>
          )}
          {rightSlot}
        </div>
      </div>

      {/* ── Tab bar ── */}
      {tabs && tabs.length > 0 && (
        <div style={{
          display: "flex", gap: 0,
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 24px",
          overflowX: "auto",
          scrollbarWidth: "none",
          position: "sticky", top: 56, zIndex: 30,
          background: `${BG}f0`, backdropFilter: "blur(12px)",
        }}>
          {tabs.map(({ id, label, icon: Icon, badge }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                onClick={() => onTabChange?.(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "11px 16px",
                  border: "none",
                  borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  color: active ? GOLD : MUTED,
                  whiteSpace: "nowrap",
                  transition: "color 0.15s",
                  minHeight: 44,
                }}
              >
                {Icon && <Icon size={11} />}
                {label}
                {badge != null && badge > 0 && (
                  <span style={{
                    background: "#ef4444", color: "#1A1A1B",
                    borderRadius: "50%", fontSize: 9, fontWeight: 700,
                    width: 14, height: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding, maxWidth, position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab ?? "content"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
