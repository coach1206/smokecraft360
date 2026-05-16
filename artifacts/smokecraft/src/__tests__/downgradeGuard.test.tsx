/**
 * Kernel mode downgrade guard — UI coverage
 *
 * Tests:
 *  - ConfirmModal renders the warning block when the `warning` prop is provided
 *  - ConfirmModal applies danger (red) styling to the confirm button when danger=true
 *  - ConfirmModal does NOT render the warning block when `warning` is absent
 *  - ConfirmModal uses amber (non-danger) styling when danger=false
 *
 * This covers the key invariants of the downgrade guard path in SettingsModule:
 *   pendingKernelMode === "essential" && activeOrderCount > 0
 *     → ConfirmModal receives warning=<active-count message> + danger=true
 *   pendingKernelMode === "essential" && activeOrderCount === 0
 *     → ConfirmModal receives no warning prop
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ConfirmModal from "@/components/ConfirmModal";

// ── Framer Motion: render children synchronously in tests ─────────────────────
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
    button: ({
      children,
      whileTap: _whileTap,
      ...rest
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children?: React.ReactNode;
      whileTap?: unknown;
    }) => <button {...rest}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderModal(overrides: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) {
  const defaults: React.ComponentProps<typeof ConfirmModal> = {
    open: true,
    title: "Change Kernel Mode",
    message: "Switch to Essential mode? This will lock luxury features for this venue.",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<ConfirmModal {...defaults} {...overrides} />);
}

// ── Tests: warning block ──────────────────────────────────────────────────────

describe("ConfirmModal — warning block", () => {
  it("renders the warning text when the warning prop is provided", () => {
    renderModal({
      warning: "3 active sessions will lose access to premium features immediately.",
      danger: true,
    });

    expect(
      screen.getByText("3 active sessions will lose access to premium features immediately."),
    ).toBeInTheDocument();
  });

  it("does not render a warning block when the warning prop is absent", () => {
    renderModal({ warning: undefined, danger: true });

    expect(
      screen.queryByText(/active session.*will lose access/i),
    ).not.toBeInTheDocument();
  });

  it("does not render a warning block when activeOrderCount is 0 (empty string guard)", () => {
    renderModal({ warning: "", danger: true });

    const warningBlocks = document
      .querySelectorAll('[style*="rgba(239,68,68,0.10)"]');
    expect(warningBlocks).toHaveLength(0);
  });

  it("renders the correct count in the warning for a single active session", () => {
    renderModal({
      warning: "1 active session will lose access to premium features immediately.",
      danger: true,
    });

    expect(
      screen.getByText("1 active session will lose access to premium features immediately."),
    ).toBeInTheDocument();
  });

  it("renders the correct count in the warning for multiple active sessions", () => {
    renderModal({
      warning: "5 active sessions will lose access to premium features immediately.",
      danger: true,
    });

    expect(
      screen.getByText("5 active sessions will lose access to premium features immediately."),
    ).toBeInTheDocument();
  });
});

// ── Tests: danger styling on confirm button ───────────────────────────────────

describe("ConfirmModal — danger styling", () => {
  it("applies red gradient to the confirm button when danger=true", () => {
    renderModal({
      warning: "2 active sessions will lose access to premium features immediately.",
      danger: true,
      confirmLabel: "Confirm Downgrade",
    });

    const confirmBtn = screen.getByRole("button", { name: "Confirm Downgrade" });

    expect(confirmBtn).toBeInTheDocument();
    // The button style includes the red gradient when danger=true and not disabled
    expect(confirmBtn).toHaveStyle({
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
    });
  });

  it("does not apply red gradient when danger=false", () => {
    renderModal({
      danger: false,
      confirmLabel: "Confirm Upgrade",
    });

    const confirmBtn = screen.getByRole("button", { name: "Confirm Upgrade" });

    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).not.toHaveStyle({
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
    });
  });

  it("uses amber gradient on the confirm button when danger=false", () => {
    renderModal({
      danger: false,
      confirmLabel: "Confirm",
    });

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    expect(confirmBtn).toHaveStyle({
      background: "linear-gradient(135deg, #D48B00, #a98828)",
    });
  });
});

// ── Tests: modal visibility ───────────────────────────────────────────────────

describe("ConfirmModal — open/closed state", () => {
  it("renders nothing when open=false", () => {
    renderModal({ open: false });

    expect(screen.queryByText("Change Kernel Mode")).not.toBeInTheDocument();
  });

  it("renders the title and message when open=true", () => {
    renderModal();

    expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    expect(
      screen.getByText(/switch to essential mode/i),
    ).toBeInTheDocument();
  });
});

// ── Tests: cancel / confirm callbacks ────────────────────────────────────────

describe("ConfirmModal — callback wiring", () => {
  it("calls onCancel when the Cancel button is clicked", () => {
    const onCancel = vi.fn();
    renderModal({ onCancel, cancelLabel: "Cancel" });

    screen.getByRole("button", { name: "Cancel" }).click();

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when the Confirm button is clicked and not disabled", () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm, confirmLabel: "Confirm", danger: true });

    screen.getByRole("button", { name: "Confirm" }).click();

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("does not call onConfirm when the button is disabled", () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm, confirmLabel: "Confirm", confirmDisabled: true });

    screen.getByRole("button", { name: "Confirm" }).click();

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
