/**
 * ExperienceLayout — three-column master layout used on the Home page.
 *
 *  [Sidebar 220px] | [Center max-w-xl] | [Right panel 300px - optional]
 *
 * Sidebar is hidden below lg breakpoint (sidebar handles its own visibility).
 * Center content always fills available space.
 * Right panel slides in via AnimatePresence when provided.
 */

import { type ReactNode }          from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  sidebar:     ReactNode;
  children:    ReactNode;
  rightPanel?: ReactNode;
}

export function ExperienceLayout({ sidebar, children, rightPanel }: Props) {
  return (
    <div className="min-h-[100dvh] w-full flex relative">
      {/* ── Left sidebar (self-positioned fixed) ── */}
      {sidebar}

      {/* ── Center + Right wrapper ── */}
      <div
        className="flex flex-1 min-h-[100dvh]"
        style={{
          // Push center right of sidebar on desktop
          marginLeft: "clamp(0px, 0px, 0px)",
        }}
      >
        {/* Center content */}
        <main
          className="flex-1 flex flex-col min-h-[100dvh] lg:ml-[220px] transition-all duration-300"
          style={{
            // On desktop with right panel, give right panel space
            marginRight: rightPanel ? "clamp(0px, 300px, 300px)" : 0,
          }}
        >
          {children}
        </main>

        {/* ── Right panel ── */}
        <AnimatePresence>
          {rightPanel && (
            <motion.aside
              key="right-panel"
              className="hidden xl:flex flex-col fixed right-0 top-0 bottom-0 overflow-y-auto"
              style={{
                width:          300,
                background:     "rgba(10,8,5,0.75)",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                borderLeft:     "1px solid rgba(212,175,55,0.09)",
                boxShadow:      "-4px 0 32px rgba(0,0,0,0.5)",
              }}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0,   opacity: 1 }}
              exit={{    x: 300, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="p-5 flex-1">
                {rightPanel}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
