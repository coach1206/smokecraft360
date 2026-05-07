/**
 * PrintExport — Handles printing and PDF export for training documents.
 * Uses browser print dialog with print-specific CSS.
 * Supports: certificate, manual, investor-summary, walkthrough-summary.
 */

import { useState }       from "react";
import { motion }         from "framer-motion";
import { Printer, Download, X, FileText } from "lucide-react";

const T = {
  bg:     "#F5F2ED",
  card:   "rgba(26,26,27,0.06)",
  border: "rgba(212,139,0,0.15)",
  gold:   "#D48B00",
  text:   "rgba(26,26,27,0.90)",
  muted:  "rgba(240,232,212,0.48)",
  green:  "#34d399",
};

export type ExportType = "certificate" | "manual" | "investor-summary" | "walkthrough-summary";

interface PrintExportProps {
  type:       ExportType;
  data:       Record<string, unknown>;
  label?:     string;
  buttonStyle?: React.CSSProperties;
}

function buildCertificateHTML(data: Record<string, unknown>): string {
  return `
    <div style="
      font-family: 'Georgia', serif;
      max-width: 680px; margin: 0 auto;
      padding: 60px 60px;
      border: 3px solid #D48B00;
      background: #fdfaf5;
      text-align: center;
      position: relative;
    ">
      <div style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #999; margin-bottom: 24px;">
        Axiom OS · Vault Cigar Lounge · Training Mode
      </div>
      <div style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #D48B00; margin-bottom: 8px;">
        Certificate of Completion
      </div>
      <div style="font-size: 42px; font-weight: 700; color: #1a1008; margin: 16px 0;">
        ${data.name ?? "Training Participant"}
      </div>
      <div style="font-size: 14px; color: #555; margin-bottom: 28px;">
        has successfully completed the Axiom OS Training Program for the role of
      </div>
      <div style="font-size: 28px; font-weight: 700; color: #D48B00; border: 2px solid #D48B00; display: inline-block; padding: 10px 32px; margin-bottom: 28px;">
        ${data.roleTitle ?? "Staff Member"}
      </div>
      <div style="font-size: 13px; color: #555; line-height: 1.7; max-width: 400px; margin: 0 auto 36px;">
        This certifies completion of all required training modules, scenario exercises, and manager sign-off requirements. Valid for 12 months from date of issue.
      </div>
      <div style="display: flex; justify-content: space-around; margin-top: 40px; padding-top: 24px; border-top: 1px solid #D48B00;">
        <div style="text-align: center;">
          <div style="font-size: 12px; color: #333; font-weight: 600;">${data.managerName ?? "Floor Manager"}</div>
          <div style="font-size: 10px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.12em;">Manager Signature</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 12px; color: #333; font-weight: 600;">${new Date().toLocaleDateString()}</div>
          <div style="font-size: 10px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.12em;">Date Issued</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 12px; color: #333; font-weight: 600;">Vault Cigar Lounge</div>
          <div style="font-size: 10px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.12em;">Venue</div>
        </div>
      </div>
      <div style="margin-top: 20px; font-size: 9px; color: #bbb; letter-spacing: 0.1em;">
        TRAINING MODE — SANDBOX DOCUMENT — NOT A PRODUCTION RECORD
      </div>
    </div>
  `;
}

function buildInvestorSummaryHTML(): string {
  return `
    <div style="font-family: 'Georgia', serif; max-width: 720px; margin: 0 auto; padding: 40px; background: #fdfaf5;">
      <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #D48B00; padding-bottom: 24px;">
        <div style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #999; margin-bottom: 8px;">Axiom OS · Investor Brief</div>
        <div style="font-size: 32px; font-weight: 700; color: #1a1008;">Platform Overview</div>
        <div style="font-size: 13px; color: #666; margin-top: 6px;">Apple × Tesla × Hospitality × AI Intelligence</div>
      </div>
      ${[
        ["Guest Journey", "Cinematic onboarding collects palate preferences in under 90 seconds. AI-assigned mentor creates instant personal connection. Every visit improves the guest's profile and increases recommendation accuracy."],
        ["AI Engine", "Revenue Brain v2 scores every recommendation across taste match (40%), margin (25%), stock level (15%), vendor reliability (10%), and premium signal (10%). Processes in under 180ms. No manual curation."],
        ["Loyalty & Revenue", "5-tier progression system (Bronze → Vault) with 1 pt/dollar. Average tab value lift of 28% per venue. Campaign engine drives incremental revenue with distributor funding and auto-generated ROI reports."],
        ["Analytics", "9-tab enterprise intelligence suite with real-time data: Swipe IQ, Financial Reconciliation, Campaign ROI, Venue Comparison, Device Health, Staff Performance, and more."],
        ["Scale", "Multi-tenant architecture with AES-256-GCM field isolation. Lounge League competition system across the network. Central Command enables OTA updates across all venues simultaneously."],
        ["Revenue Model", "SaaS subscription per venue + transaction fees + distributor campaign margin share. Marketplace expansion: device ecosystem, franchise licensing, distributor platform."],
      ].map(([title, body]) => `
        <div style="margin-bottom: 22px;">
          <div style="font-size: 14px; font-weight: 700; color: #D48B00; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em;">${title}</div>
          <div style="font-size: 12px; color: #444; line-height: 1.75;">${body}</div>
        </div>
      `).join("")}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 9px; color: #bbb; text-align: center;">
        TRAINING MODE — SYNTHETIC DEMO DATA — NOT FOR DISTRIBUTION
      </div>
    </div>
  `;
}

function buildWalkthroughSummaryHTML(): string {
  const steps = [
    ["Welcome & Platform Overview", "Axiom OS introduction, design philosophy, and system architecture."],
    ["Venue Configuration", "Name, location, capacity, operating hours, and brand customization."],
    ["Inventory Setup", "Add products across all craft categories with stock levels and reorder thresholds."],
    ["Staff Onboarding", "Role assignment, access control, and Training Mode activation."],
    ["Campaign Setup", "Distributor connections, brand campaigns, and budget configuration."],
    ["Guest Experience Demo", "Live swipe experience, mentor assignment, and add-to-order flow."],
    ["Analytics Overview", "KPI dashboard, Swipe IQ, financial reconciliation, and campaign ROI."],
    ["Revenue Engine", "Tab management, loyalty settings, payout pipeline, and reconciliation."],
    ["Device Control", "Kiosk registration, display modes, burn-in protection, and OTA setup."],
    ["Full Launch", "Readiness checklist, system verification, and go-live confirmation."],
  ];
  return `
    <div style="font-family: 'Georgia', serif; max-width: 720px; margin: 0 auto; padding: 40px; background: #fdfaf5;">
      <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #D48B00; padding-bottom: 24px;">
        <div style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #999; margin-bottom: 8px;">Axiom OS · Venue Setup Guide</div>
        <div style="font-size: 32px; font-weight: 700; color: #1a1008;">Venue Walkthrough Summary</div>
        <div style="font-size: 13px; color: #666; margin-top: 6px;">10-Step Setup From First Launch to Full Operation</div>
      </div>
      ${steps.map(([title, body], i) => `
        <div style="display: flex; gap: 16px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #eee;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #D48B00; color: #1a1008; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0;">${i + 1}</div>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #1a1008; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 11px; color: #555; line-height: 1.65;">${body}</div>
          </div>
        </div>
      `).join("")}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 9px; color: #bbb; text-align: center;">
        TRAINING MODE — SYNTHETIC DEMO DATA — NOT FOR DISTRIBUTION
      </div>
    </div>
  `;
}

function openPrintWindow(html: string, title: string) {
  const w = window.open("", "_blank", "width=850,height=950");
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html><html><head>
    <title>${title} — Axiom OS</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: white; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        button { display: none !important; }
      }
    </style>
    </head><body>
    <div style="padding: 32px; text-align: center; margin-bottom: 16px;">
      <button onclick="window.print()" style="
        background: #D48B00; color: #1a1008; border: none; padding: 10px 24px;
        border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; margin-right: 10px;
      ">Print / Save as PDF</button>
      <button onclick="window.close()" style="
        background: transparent; color: #999; border: 1px solid #ddd; padding: 10px 24px;
        border-radius: 6px; font-size: 13px; cursor: pointer;
      ">Close</button>
    </div>
    ${html}
    </body></html>
  `);
  w.document.close();
}

export default function PrintExport({ type, data, label, buttonStyle }: PrintExportProps) {
  const [open, setOpen] = useState(false);

  function handleExport(subtype: ExportType) {
    setOpen(false);
    let html = "";
    let title = "";
    if (subtype === "certificate") {
      html  = buildCertificateHTML(data);
      title = "Training Certificate";
    } else if (subtype === "investor-summary") {
      html  = buildInvestorSummaryHTML();
      title = "Investor Summary";
    } else if (subtype === "walkthrough-summary") {
      html  = buildWalkthroughSummaryHTML();
      title = "Venue Walkthrough Summary";
    } else {
      html  = `<div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:40px;"><h1 style="color:#D48B00;">${data.roleTitle ?? ""} Training Manual</h1><pre style="font-size:12px;line-height:1.7;white-space:pre-wrap;">${JSON.stringify(data, null, 2)}</pre></div>`;
      title = `${data.roleTitle ?? "Role"} Manual`;
    }
    openPrintWindow(html, title);
  }

  if (type !== "certificate" && !open) {
    return (
      <button
        onClick={() => handleExport(type)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "rgba(240,232,212,0.6)", fontSize: 11, cursor: "pointer",
          ...buttonStyle,
        }}
      >
        <Printer size={11} /> {label ?? "Export"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "rgba(240,232,212,0.6)", fontSize: 11, cursor: "pointer",
          ...buttonStyle,
        }}
      >
        <Download size={11} /> {label ?? "Export"}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)",
            background: "#0c0914", border: "1px solid rgba(212,139,0,0.2)",
            borderRadius: 10, padding: "6px", zIndex: 20, minWidth: 180,
          }}
        >
          {[
            { key: "certificate" as ExportType,          label: "Training Certificate" },
            { key: "investor-summary" as ExportType,     label: "Investor Summary"      },
            { key: "walkthrough-summary" as ExportType,  label: "Walkthrough Summary"   },
          ].map(({ key, label: lbl }) => (
            <button key={key} onClick={() => handleExport(key)} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "9px 12px", background: "transparent", border: "none",
              borderRadius: 7, color: "rgba(240,232,212,0.8)", fontSize: 11,
              cursor: "pointer", textAlign: "left",
            }}>
              <FileText size={11} color={T.gold} /> {lbl}
            </button>
          ))}
          <button onClick={() => setOpen(false)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "7px 12px", background: "transparent", border: "none",
            borderRadius: 7, color: "rgba(26,26,27,0.35)", fontSize: 10,
            cursor: "pointer", marginTop: 2,
          }}>
            <X size={10} /> Close
          </button>
        </motion.div>
      )}
    </>
  );
}
