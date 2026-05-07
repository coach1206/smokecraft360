/**
 * NfcTapIn — NFC Identity Handshake (Web NFC API).
 *
 * Works on Android Chrome 89+ and Chromium-based browsers.
 * On iOS / Safari, gracefully shows a "Tap your Axiom Coin" instruction
 * and falls back to manual entry.
 *
 * NFC payload expected format (NDEF Text record):
 *   JSON string: { "type": "axiom_guest", "lastName": "...", "phoneLast4": "..." }
 *   OR plain text: "AXIOM:lastName:phoneLast4"
 *
 * On successful tap:
 *   1. Calls the guest fast-return API to load the profile
 *   2. Fires onIdentified(profile) callback
 *   3. Shows a cinematic reveal overlay
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }      from "framer-motion";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

interface NfcGuestPayload {
  type:       string;
  lastName:   string;
  phoneLast4: string;
}

interface GuestProfile {
  id:        string;
  firstName: string;
  publicId:  string;
  masteryTier: string;
}

interface Props {
  onIdentified?: (profile: GuestProfile) => void;
  onError?:      (msg: string)           => void;
  autoStart?:    boolean;
}

declare class NDEFReader {
  scan(opts?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(type: "reading", listener: (event: NDEFReadingEvent) => void): void;
}
interface NDEFReadingEvent {
  serialNumber: string;
  message: { records: Array<{ recordType: string; data: DataView; encoding?: string }> };
}

function parseNfcPayload(raw: string): NfcGuestPayload | null {
  try {
    const j = JSON.parse(raw);
    if (j.type === "axiom_guest" && j.lastName && j.phoneLast4) return j as NfcGuestPayload;
  } catch { /* not JSON */ }
  const m = raw.match(/^AXIOM:([^:]+):([^:]+)$/);
  if (m) return { type: "axiom_guest", lastName: m[1]!, phoneLast4: m[2]! };
  return null;
}

async function doFastReturn(lastName: string, phoneLast4: string): Promise<GuestProfile> {
  const r = await fetch(`${BASE}/api/enrollment/return`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ lastName, phoneLast4 }),
  });
  if (!r.ok) throw new Error(`Guest not found (${r.status})`);
  const d = await r.json() as { profile: GuestProfile };
  return d.profile;
}

export default function NfcTapIn({ onIdentified, onError, autoStart = true }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning,  setScanning]  = useState(false);
  const [status,    setStatus]    = useState<"idle"|"scanning"|"reading"|"success"|"error">("idle");
  const [message,   setMessage]   = useState("");
  const [profile,   setProfile]   = useState<GuestProfile | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSupported("NDEFReader" in window);
  }, []);

  const start = async () => {
    if (!("NDEFReader" in window)) {
      setStatus("error");
      setMessage("NFC is not supported in this browser. Use Android Chrome or tap the pad below.");
      onError?.("NFC not supported");
      return;
    }
    setScanning(true);
    setStatus("scanning");
    setMessage("Hold your Axiom Member Coin or NFC-enabled phone to the pad…");
    abortRef.current = new AbortController();
    try {
      const reader = new NDEFReader();
      await reader.scan({ signal: abortRef.current.signal });
      reader.addEventListener("reading", async (event: NDEFReadingEvent) => {
        setStatus("reading");
        setMessage("Reading identity…");
        for (const record of event.message.records) {
          if (record.recordType !== "text") continue;
          const decoder = new TextDecoder(record.encoding ?? "utf-8");
          const text    = decoder.decode(record.data);
          const payload = parseNfcPayload(text);
          if (!payload) continue;
          try {
            const p = await doFastReturn(payload.lastName, payload.phoneLast4);
            setProfile(p);
            setStatus("success");
            setMessage(`Welcome back, ${p.firstName}.`);
            onIdentified?.(p);
            abortRef.current?.abort();
            setScanning(false);
          } catch (e) {
            setStatus("error");
            setMessage(e instanceof Error ? e.message : "Identity not found");
            onError?.(e instanceof Error ? e.message : "Unknown");
          }
          break;
        }
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setMessage((err as Error).message ?? "NFC scan failed");
      onError?.((err as Error).message);
      setScanning(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setScanning(false);
    setStatus("idle");
    setMessage("");
  };

  useEffect(() => {
    if (autoStart && supported) void start();
    return () => abortRef.current?.abort();
  }, [autoStart, supported]);

  const ringColor = status === "success" ? "#4ade80"
                  : status === "error"   ? "#f87171"
                  : status === "scanning" || status === "reading" ? "#D48B00"
                  : "rgba(26,26,27,0.18)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "24px 0" }}>
      {/* NFC Ring */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        {/* Outer pulse rings */}
        {(status === "scanning" || status === "reading") && [0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              inset: `${-i * 14}px`,
              borderRadius: "50%",
              border: `1.5px solid ${ringColor}`,
              opacity: 0,
            }}
            animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.3, 1.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
          />
        ))}

        {/* Core pad */}
        <motion.div
          animate={status === "scanning" ? { boxShadow: [`0 0 0 0 ${ringColor}44`, `0 0 32px 8px ${ringColor}22`, `0 0 0 0 ${ringColor}44`] } : {}}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "linear-gradient(145deg, rgba(26,26,27,0.06), rgba(26,26,27,0.02))",
            border: `2px solid ${ringColor}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* NFC icon */}
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
            <path d="M12 36 L12 12 L24 12 C30.627 12 36 17.373 36 24 C36 30.627 30.627 36 24 36 Z" stroke={ringColor} strokeWidth="2" strokeLinejoin="round" />
            <path d="M18 29 L18 19 L24 19 C27.314 19 30 21.686 30 25 C30 28.314 27.314 31 24 31 Z" stroke={ringColor} strokeWidth="1.5" strokeLinejoin="round" opacity="0.6" />
          </svg>
        </motion.div>
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          style={{ textAlign: "center", maxWidth: 260 }}
        >
          {status === "success" && profile ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80", fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>
                {profile.firstName} · {profile.masteryTier.replace("_", " ").toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.50)" }}>Identity confirmed via NFC handshake</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: status === "error" ? "#f87171" : "rgba(26,26,27,0.75)", marginBottom: 4 }}>
                {message || (supported === false ? "NFC not supported in this browser" : "Tap your Axiom Coin or phone")}
              </div>
              {supported === false && (
                <div style={{ fontSize: 10, color: "rgba(26,26,27,0.40)" }}>
                  Use Android Chrome, or identify by name + last-4 below
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10 }}>
        {!scanning && status !== "success" && supported !== false && (
          <button
            onClick={() => void start()}
            style={{
              padding: "9px 22px", borderRadius: 10, cursor: "pointer",
              background: "#D48B00", border: "none",
              fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.08em",
            }}
          >
            TAP IN
          </button>
        )}
        {scanning && (
          <button
            onClick={stop}
            style={{
              padding: "9px 22px", borderRadius: 10, cursor: "pointer",
              background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.12)",
              fontSize: 12, fontWeight: 700, color: "rgba(26,26,27,0.55)", letterSpacing: "0.08em",
            }}
          >
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
