import { useEffect, useState } from "react";
import { VendorLayout, VT } from "./VendorLayout";
import { MessageSquare, Mail } from "lucide-react";

interface Message {
  id: string;
  subject: string;
  body: string;
  from: string;
  read: boolean;
  createdAt: string;
}

export default function VendorMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    fetch("/api/vendor/messages", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMessages((d as any).messages ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <VendorLayout title="Messages" subtitle="Communications from your account manager" breadcrumb="VENDOR PORTAL">
      <div style={{ display: "flex", gap: 20, height: "calc(100dvh - 160px)", minHeight: 400 }}>
        {/* Message list */}
        <div style={{
          width: 320, flexShrink: 0, background: VT.card,
          borderRadius: 12, border: `1px solid ${VT.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${VT.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: VT.sub, letterSpacing: "0.16em" }}>INBOX</div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "24px", fontSize: 10, color: VT.sub, textAlign: "center" }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <Mail size={28} color={VT.border} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: VT.text, marginBottom: 6 }}>No messages</div>
                <div style={{ fontSize: 9, color: VT.sub, lineHeight: 1.6 }}>
                  Your account manager will reach out here with updates, approval decisions, and platform news.
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  style={{
                    width: "100%", padding: "16px 18px", textAlign: "left",
                    background: selected?.id === m.id ? "rgba(8,123,255,0.06)" : "transparent",
                    border: "none",
                    borderBottom: `1px solid ${VT.border}`,
                    cursor: "pointer", fontFamily: VT.mono,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: m.read ? 600 : 800, color: VT.text }}>{m.subject}</span>
                    {!m.read && (
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: VT.accent, flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: VT.sub }}>{m.from}</div>
                  <div style={{ fontSize: 8, color: VT.faint, marginTop: 4 }}>
                    {new Date(m.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message body */}
        <div style={{
          flex: 1, background: VT.card, borderRadius: 12,
          border: `1px solid ${VT.border}`, display: "flex",
          flexDirection: "column", overflow: "hidden",
        }}>
          {selected ? (
            <>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${VT.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: VT.text, marginBottom: 4 }}>{selected.subject}</div>
                <div style={{ fontSize: 9, color: VT.sub }}>
                  From: {selected.from} · {new Date(selected.createdAt).toLocaleString()}
                </div>
              </div>
              <div style={{ flex: 1, padding: "24px", overflowY: "auto", fontSize: 11, color: VT.text, lineHeight: 1.8 }}>
                {selected.body}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <MessageSquare size={36} color={VT.border} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: VT.text, marginBottom: 6 }}>No message selected</div>
              <div style={{ fontSize: 9, color: VT.sub }}>Select a message from the inbox to read it</div>
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
