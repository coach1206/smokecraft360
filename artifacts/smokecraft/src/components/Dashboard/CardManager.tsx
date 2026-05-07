import { useState, useCallback, useRef, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImagePlus, Check, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { uploadProductImage, type InventoryItem, updateInventoryItem } from "@/services/api";
import { cloudinaryOptimize } from "@/lib/cloudinary";

interface CardManagerProps {
  inventory: InventoryItem[];
  onRefresh: () => void;
}

type CraftCategory = "cigar" | "alcohol" | "beer" | "vape";

const CATEGORIES: { id: CraftCategory; label: string; color: string }[] = [
  { id: "cigar",   label: "Cigars",  color: "#D48B00" },
  { id: "alcohol", label: "Spirits", color: "#8b5cf6" },
  { id: "beer",    label: "Beer",    color: "#f59e0b" },
  { id: "vape",    label: "Vape",    color: "#06b6d4" },
];

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface CardState {
  status:   UploadStatus;
  progress: number;
  error:    string | null;
  dragOver: boolean;
}

const DEFAULT_STATE: CardState = { status: "idle", progress: 0, error: null, dragOver: false };

export function CardManager({ inventory, onRefresh }: CardManagerProps) {
  const [activeCategory, setActiveCategory] = useState<CraftCategory>("cigar");
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const progressTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const getState = (id: string): CardState => cardStates[id] ?? DEFAULT_STATE;

  const patchState = useCallback((id: string, patch: Partial<CardState>) => {
    setCardStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_STATE), ...patch } }));
  }, []);

  const filtered = inventory.filter(item => {
    if (activeCategory === "alcohol") return item.category === "alcohol" || item.category === "spirit";
    return item.category === activeCategory;
  });

  /** Simulate upload progress while the real upload is in-flight. */
  const startProgress = useCallback((id: string) => {
    let pct = 0;
    const timer = setInterval(() => {
      pct = Math.min(pct + Math.random() * 12 + 4, 88);
      patchState(id, { progress: pct });
    }, 200);
    progressTimers.current[id] = timer;
  }, [patchState]);

  const stopProgress = useCallback((id: string) => {
    clearInterval(progressTimers.current[id]);
    delete progressTimers.current[id];
  }, []);

  const handleUpload = useCallback(async (itemId: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      patchState(itemId, { status: "error", error: "Image must be under 8 MB" });
      setTimeout(() => patchState(itemId, DEFAULT_STATE), 3500);
      return;
    }

    patchState(itemId, { status: "uploading", progress: 0, error: null, dragOver: false });
    startProgress(itemId);

    try {
      const url = await uploadProductImage(file);
      await updateInventoryItem(itemId, { imageUrl: url });
      stopProgress(itemId);
      patchState(itemId, { status: "success", progress: 100 });
      onRefresh();
      setTimeout(() => patchState(itemId, DEFAULT_STATE), 2500);
    } catch (err: any) {
      stopProgress(itemId);
      patchState(itemId, { status: "error", error: err?.message ?? "Upload failed", progress: 0 });
      setTimeout(() => patchState(itemId, DEFAULT_STATE), 4000);
    }
  }, [patchState, startProgress, stopProgress, onRefresh]);

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  const onDragOver = useCallback((e: DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    patchState(id, { dragOver: true });
  }, [patchState]);

  const onDragLeave = useCallback((e: DragEvent, id: string) => {
    // Only clear if leaving the card entirely (not a child element)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      patchState(id, { dragOver: false });
    }
  }, [patchState]);

  const onDrop = useCallback((e: DragEvent, id: string) => {
    e.preventDefault();
    patchState(id, { dragOver: false });
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      void handleUpload(id, file);
    }
  }, [handleUpload, patchState]);

  const catColor = CATEGORIES.find(c => c.id === activeCategory)?.color ?? "#D48B00";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <ImagePlus size={16} color={catColor} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1B" }}>Card Manager</span>
        <span style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginLeft: 4 }}>
          Upload or drag-and-drop images onto any card
        </span>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: activeCategory === cat.id ? `${cat.color}20` : "rgba(26,26,27,0.05)",
              border: `1px solid ${activeCategory === cat.id ? `${cat.color}50` : "rgba(26,26,27,0.08)"}`,
              color: activeCategory === cat.id ? cat.color : "rgba(26,26,27,0.48)",
              cursor: "pointer",
            }}
          >
            {cat.label}
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: "40px 20px", textAlign: "center", borderRadius: 14,
          background: "rgba(26,26,27,0.04)", border: "1px dashed rgba(255,255,255,0.1)",
        }}>
          <ImagePlus size={32} color="rgba(26,26,27,0.20)" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "rgba(26,26,27,0.40)" }}>
            No cards in this category yet
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}>
          <AnimatePresence>
            {filtered.map((item, i) => {
              const s = getState(item.id);
              const hasImage = !!item.imageUrl;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onDragOver={e => onDragOver(e, item.id)}
                  onDragLeave={e => onDragLeave(e, item.id)}
                  onDrop={e => onDrop(e, item.id)}
                  style={{
                    borderRadius: 14, overflow: "hidden",
                    background: s.dragOver
                      ? `${catColor}10`
                      : "rgba(26,26,27,0.05)",
                    border: `1px solid ${
                      s.status === "error"   ? "rgba(239,68,68,0.4)"   :
                      s.status === "success" ? "rgba(52,211,153,0.4)"  :
                      s.dragOver             ? `${catColor}60`          :
                                               `${catColor}15`
                    }`,
                    outline: s.dragOver ? `2px dashed ${catColor}80` : "none",
                    outlineOffset: "-2px",
                    position: "relative",
                    transition: "border-color 0.15s, background 0.15s, outline 0.15s",
                  }}
                >
                  {/* Image area */}
                  <div style={{
                    width: "100%", aspectRatio: "1",
                    background: hasImage ? "none" : "rgba(26,26,27,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", overflow: "hidden",
                  }}>
                    {hasImage ? (
                      <img
                        src={cloudinaryOptimize(item.imageUrl!, 360, 360)}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <ImagePlus size={28} color="rgba(26,26,27,0.15)" />
                        {s.dragOver && (
                          <div style={{ fontSize: 10, color: catColor, marginTop: 6 }}>Drop to upload</div>
                        )}
                      </div>
                    )}

                    {/* Uploading overlay with progress ring */}
                    {s.status === "uploading" && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(26,26,27,0.30)",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 8,
                      }}>
                        <Loader2 size={24} color={catColor} style={{ animation: "spin 1s linear infinite" }} />
                        <div style={{
                          width: "60%", height: 3, borderRadius: 2,
                          background: "rgba(255,255,255,0.1)",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 2,
                            background: catColor,
                            width: `${s.progress}%`,
                            transition: "width 0.2s ease",
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(26,26,27,0.48)" }}>
                          {Math.round(s.progress)}%
                        </div>
                      </div>
                    )}

                    {/* Success overlay */}
                    {s.status === "success" && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{
                          position: "absolute", inset: 0,
                          background: "rgba(52,211,153,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Check size={28} color="#34d399" />
                      </motion.div>
                    )}

                    {/* Drag-over overlay (when card already has image) */}
                    {s.dragOver && hasImage && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: `${catColor}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backdropFilter: "blur(2px)",
                      }}>
                        <div style={{
                          textAlign: "center",
                          padding: "8px 12px", borderRadius: 8,
                          background: `${catColor}30`,
                          border: `1px solid ${catColor}60`,
                        }}>
                          <Upload size={20} color={catColor} />
                          <div style={{ fontSize: 10, color: catColor, marginTop: 4 }}>Drop to replace</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: "#1A1A1B",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      marginBottom: 2,
                    }}>
                      {item.name}
                    </div>

                    {/* Cloudinary link when image exists */}
                    {hasImage && s.status === "idle" && (
                      <a
                        href={item.imageUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 9, color: "rgba(26,26,27,0.30)",
                          textDecoration: "none", marginBottom: 6,
                        }}
                      >
                        <ExternalLink size={9} /> View on Cloudinary
                      </a>
                    )}

                    {s.status === "error" && (
                      <div style={{
                        fontSize: 10, color: "#ef4444", marginBottom: 6,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <AlertTriangle size={10} /> {s.error}
                      </div>
                    )}

                    <input
                      ref={el => { fileInputRefs.current[item.id] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(item.id, file);
                        e.target.value = "";
                      }}
                    />

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRefs.current[item.id]?.click()}
                      disabled={s.status === "uploading"}
                      style={{
                        width: "100%", padding: "8px 0", borderRadius: 8,
                        fontSize: 11, fontWeight: 600,
                        background: `${catColor}15`,
                        border: `1px solid ${catColor}30`,
                        color: catColor,
                        cursor: s.status === "uploading" ? "wait" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        opacity: s.status === "uploading" ? 0.6 : 1,
                      }}
                    >
                      <Upload size={12} />
                      {hasImage ? "Replace Image" : "Upload Image"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
