import { useEffect, useState } from "react";
import { VendorLayout, VT } from "./VendorLayout";
import { Image as ImageIcon, ExternalLink, Copy, Check } from "lucide-react";

interface Asset {
  id: string;
  cloudinaryId: string;
  url: string;
  label?: string;
  subtype?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  isPrimary: boolean;
  createdAt: string;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
        background: "transparent", border: `1px solid ${VT.border}`, borderRadius: 6,
        color: copied ? VT.green : VT.sub, fontSize: 8, fontWeight: 700,
        cursor: "pointer", fontFamily: VT.mono, letterSpacing: "0.10em",
      }}
    >
      {copied ? <Check size={9} /> : <Copy size={9} />}
      {copied ? "COPIED" : "COPY URL"}
    </button>
  );
}

export default function VendorMedia() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    fetch("/api/vendor/media", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAssets((d as any).assets ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <VendorLayout title="Media Assets" subtitle="Images and media files linked to your products" breadcrumb="VENDOR PORTAL">
      {/* Info callout */}
      <div style={{
        padding: "16px 20px", background: "rgba(8,123,255,0.04)",
        border: `1px solid rgba(8,123,255,0.16)`, borderRadius: 10, marginBottom: 28,
        fontSize: 10, color: VT.sub, lineHeight: 1.7,
      }}>
        <strong style={{ color: VT.accent }}>Media Management:</strong> Images attached to your products are managed here.
        To upload new product images, use the image URL field when submitting a product, or contact your account manager
        to have Cloudinary assets registered to your account.
      </div>

      {loading ? (
        <div style={{ fontSize: 10, color: VT.sub, textAlign: "center", padding: "60px 0" }}>Loading media…</div>
      ) : assets.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: VT.card, borderRadius: 12, border: `1px solid ${VT.border}`,
        }}>
          <ImageIcon size={36} color={VT.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: VT.text, marginBottom: 8 }}>No media assets yet</div>
          <div style={{ fontSize: 10, color: VT.sub }}>
            Media assets are registered when you submit products with image URLs
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {assets.map((a) => (
            <div
              key={a.id}
              style={{
                background: VT.card, borderRadius: 12, overflow: "hidden",
                border: `1px solid ${VT.border}`,
                boxShadow: "0 2px 14px rgba(8,123,255,0.04)",
              }}
            >
              {/* Preview */}
              <div style={{
                width: "100%", height: 160, background: "rgba(34,126,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                <img
                  src={a.url}
                  alt={a.label ?? a.cloudinaryId}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Info */}
              <div style={{ padding: "16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: VT.text, marginBottom: 4, wordBreak: "break-all" }}>
                  {a.label ?? a.cloudinaryId.split("/").pop() ?? "Asset"}
                </div>
                <div style={{ fontSize: 9, color: VT.sub, marginBottom: 10 }}>
                  {a.mimeType ?? "image"}{a.width && a.height ? ` · ${a.width}×${a.height}` : ""}{a.subtype ? ` · ${a.subtype}` : ""}
                </div>
                {a.isPrimary && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", background: "rgba(24,201,139,0.10)",
                    border: "1px solid rgba(24,201,139,0.25)", borderRadius: 20,
                    fontSize: 8, color: VT.green, fontWeight: 700, letterSpacing: "0.12em",
                    marginBottom: 10,
                  }}>
                    PRIMARY
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <CopyBtn text={a.url} />
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                      background: "transparent", border: `1px solid ${VT.border}`, borderRadius: 6,
                      color: VT.sub, fontSize: 8, fontWeight: 700, textDecoration: "none",
                      fontFamily: VT.mono, letterSpacing: "0.10em",
                    }}
                  >
                    <ExternalLink size={9} /> VIEW
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </VendorLayout>
  );
}
