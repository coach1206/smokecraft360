import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Trash2, ImagePlus, Check, Loader2, AlertTriangle, X } from "lucide-react";
import { uploadProductImage, type InventoryItem, updateInventoryItem } from "@/services/api";
import { cloudinaryOptimize } from "@/lib/cloudinary";

interface CardManagerProps {
  inventory: InventoryItem[];
  onRefresh: () => void;
}

type CraftCategory = "cigar" | "alcohol" | "beer" | "vape";

const CATEGORIES: { id: CraftCategory; label: string; color: string }[] = [
  { id: "cigar", label: "Cigars", color: "#d4af37" },
  { id: "alcohol", label: "Spirits", color: "#8b5cf6" },
  { id: "beer", label: "Beer", color: "#f59e0b" },
  { id: "vape", label: "Vape", color: "#06b6d4" },
];

export function CardManager({ inventory, onRefresh }: CardManagerProps) {
  const [activeCategory, setActiveCategory] = useState<CraftCategory>("cigar");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = inventory.filter(item => {
    if (activeCategory === "alcohol") return item.category === "alcohol" || item.category === "spirit";
    return item.category === activeCategory;
  });

  const handleUpload = useCallback(async (itemId: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [itemId]: "Image must be under 8MB" }));
      setTimeout(() => setErrors(prev => { const n = { ...prev }; delete n[itemId]; return n; }), 3000);
      return;
    }

    setUploading(prev => ({ ...prev, [itemId]: true }));
    setErrors(prev => { const n = { ...prev }; delete n[itemId]; return n; });

    try {
      const url = await uploadProductImage(file);
      await updateInventoryItem(itemId, { imageUrl: url });
      setUploaded(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => setUploaded(prev => { const n = { ...prev }; delete n[itemId]; return n; }), 2500);
      onRefresh();
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [itemId]: err?.message ?? "Upload failed" }));
      setTimeout(() => setErrors(prev => { const n = { ...prev }; delete n[itemId]; return n; }), 4000);
    } finally {
      setUploading(prev => ({ ...prev, [itemId]: false }));
    }
  }, [onRefresh]);

  const handleBulkFileSelect = useCallback((file: File) => {
    setBulkFile(file);
    const url = URL.createObjectURL(file);
    setBulkPreview(url);
  }, []);

  const catColor = CATEGORIES.find(c => c.id === activeCategory)?.color ?? "#d4af37";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <ImagePlus size={16} color={catColor} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e0c8" }}>Card Manager</span>
        <span style={{ fontSize: 11, color: "rgba(232,224,200,0.4)", marginLeft: 4 }}>
          Upload & manage craft card images
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: activeCategory === cat.id ? `${cat.color}20` : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeCategory === cat.id ? `${cat.color}50` : "rgba(255,255,255,0.06)"}`,
              color: activeCategory === cat.id ? cat.color : "rgba(232,224,200,0.5)",
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
          background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)",
        }}>
          <ImagePlus size={32} color="rgba(232,224,200,0.2)" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "rgba(232,224,200,0.4)" }}>
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
              const isUploading = uploading[item.id];
              const isUploaded = uploaded[item.id];
              const error = errors[item.id];
              const hasImage = !!item.imageUrl;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    borderRadius: 14, overflow: "hidden",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${error ? "rgba(239,68,68,0.3)" : isUploaded ? "rgba(52,211,153,0.3)" : `${catColor}15`}`,
                    position: "relative",
                  }}
                >
                  <div style={{
                    width: "100%", aspectRatio: "1",
                    background: hasImage ? "none" : "rgba(255,255,255,0.02)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", overflow: "hidden",
                  }}>
                    {hasImage ? (
                      <img
                        src={cloudinaryOptimize(item.imageUrl!, 360, 360)}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                    ) : (
                      <ImagePlus size={28} color="rgba(232,224,200,0.15)" />
                    )}
                    {isUploading && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Loader2 size={24} color={catColor} style={{ animation: "spin 1s linear infinite" }} />
                      </div>
                    )}
                    {isUploaded && (
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
                  </div>

                  <div style={{ padding: "10px 12px" }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: "#e8e0c8",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      marginBottom: 6,
                    }}>
                      {item.name}
                    </div>

                    {error && (
                      <div style={{
                        fontSize: 10, color: "#ef4444", marginBottom: 6,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <AlertTriangle size={10} /> {error}
                      </div>
                    )}

                    <input
                      ref={el => { fileInputRefs.current[item.id] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(item.id, file);
                        e.target.value = "";
                      }}
                    />

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRefs.current[item.id]?.click()}
                      disabled={isUploading}
                      style={{
                        width: "100%", padding: "8px 0", borderRadius: 8,
                        fontSize: 11, fontWeight: 600,
                        background: `${catColor}15`,
                        border: `1px solid ${catColor}30`,
                        color: catColor,
                        cursor: isUploading ? "wait" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
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
