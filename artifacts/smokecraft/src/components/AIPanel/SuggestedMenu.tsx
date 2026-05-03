import { useEffect, useState } from "react";
import { fetchSuggestedMenu, type MenuItemResult } from "@/services/api";

/**
 * SuggestedMenu — orderable menu items filtered by the current pairing's
 * flavor/pairing tags. Calls /api/menu/suggested whenever `tags` changes.
 *
 * Silent failure modes:
 *   - Empty tags  → renders nothing
 *   - Network err → renders nothing (treats menu as optional UX)
 *   - Zero hits   → renders nothing
 *
 * Click handler is opt-in; without it items render as static cards.
 */
export interface SuggestedMenuProps {
  tags:    string[];
  venueId?: string;
  limit?:   number;
  onSelect?: (item: MenuItemResult) => void;
  testId?:  string;
}

export default function SuggestedMenu({
  tags,
  venueId,
  limit    = 3,
  onSelect,
  testId   = "suggested-menu",
}: SuggestedMenuProps) {
  const [items,   setItems]   = useState<MenuItemResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (tags.length === 0) { setItems([]); return; }
    setLoading(true);
    fetchSuggestedMenu({ tags, venueId, limit })
      .then((res) => { if (!cancelled) setItems(res); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tags.join(","), venueId, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || items.length === 0) return null;

  return (
    <div data-testid={testId} style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <p
        style={{
          margin: "0 0 14px", fontSize: 10,
          letterSpacing: "0.32em", textTransform: "uppercase",
          color: "#D4AF37", fontWeight: 600,
        }}
      >
        From the kitchen — pairs with this
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`${testId}-item-${item.id}`}
            onClick={() => onSelect?.(item)}
            disabled={!onSelect}
            style={{
              textAlign:    "left",
              background:   "rgba(255,255,255,0.04)",
              border:       "1px solid rgba(212,175,55,0.18)",
              borderRadius: 14,
              padding:      "14px 16px",
              cursor:       onSelect ? "pointer" : "default",
              color:        "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <h4
                style={{
                  margin: 0, fontSize: 14, fontWeight: 600,
                  color: "#FFFFFF",
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                }}
              >
                {item.name}
              </h4>
              <span style={{ fontSize: 13, color: "#D4AF37", fontWeight: 700 }}>
                ${(item.priceCents / 100).toFixed(2)}
              </span>
            </div>
            {item.description && (
              <p
                style={{
                  margin: "6px 0 0", fontSize: 12,
                  color: "#C8C0B0", lineHeight: 1.4,
                }}
              >
                {item.description}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
