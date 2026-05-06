import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Wine, Beer, Wind, Plus, ChevronRight, Megaphone, Check } from "lucide-react";
import { usePosContext, type Product } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useVenueContext } from "@/contexts/VenueContext";
import { useEngagementContext } from "@/contexts/EngagementContext";
import KioskProductImage from "@/components/KioskProductImage";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

interface ExperienceType {
  id: string;
  title: string;
  brand: string;
  desc: string;
  tags: string;
  image: string;
  icon: typeof Sparkles;
  color: string;
  category: Product["category"];
  questions: { prompt: string; options: string[] }[];
  pairings: Record<string, string>;
}

interface ExperienceTypeRouted extends ExperienceType {
  route: string;
}

const EXPERIENCES: ExperienceTypeRouted[] = [
  {
    id: "smokecraft", title: "SmokeCraft", brand: "SmokeCraft 360",
    desc: "Premium cigar experience", tags: "CIGARS · SPIRITS · LOUNGE",
    image: "/images/scenes/smokecraft-card.jpg", route: "/smokecraft",
    icon: Sparkles, color: "#d4af37", category: "cigar",
    questions: [
      { prompt: "What strength do you prefer?", options: ["Mild", "Medium", "Full Body"] },
      { prompt: "Flavor profile?", options: ["Sweet & Creamy", "Spicy & Earthy", "Rich & Bold"] },
      { prompt: "What's the occasion?", options: ["Casual Evening", "Celebration", "Business"] },
    ],
    pairings: { default: "Pairs beautifully with aged whiskey or cognac" },
  },
  {
    id: "pourcraft", title: "PourCraft", brand: "PourCraft 360",
    desc: "Spirit & cocktail journey", tags: "WINE · COCKTAILS",
    image: "/images/scenes/pourcraft-card.jpg", route: "/pourcraft",
    icon: Wine, color: "#8b5cf6", category: "spirit",
    questions: [
      { prompt: "Choose your spirit", options: ["Whiskey", "Cognac", "Tequila", "Bourbon"] },
      { prompt: "How do you take it?", options: ["Neat", "On the Rocks", "Cocktail"] },
      { prompt: "What mood tonight?", options: ["Relaxed", "Social", "Adventurous"] },
    ],
    pairings: { default: "Try with a medium-bodied cigar for the perfect pairing" },
  },
  {
    id: "beercraft", title: "BeerCraft", brand: "BrewCraft 360",
    desc: "Craft beer selection", tags: "BEER · PAIRINGS · QUICK",
    image: "/images/scenes/brewcraft-card.jpg", route: "/brewcraft",
    icon: Beer, color: "#f59e0b", category: "beer",
    questions: [
      { prompt: "What style appeals to you?", options: ["Lager", "Ale", "IPA", "Stout"] },
      { prompt: "Flavor intensity?", options: ["Light & Crisp", "Balanced", "Bold & Hoppy"] },
      { prompt: "Pairing preference?", options: ["With Food", "Solo", "With Cigar"] },
    ],
    pairings: { default: "Complements a mild cigar or charcuterie board" },
  },
  {
    id: "vapecraft", title: "VapeCraft", brand: "VapeCraft 360",
    desc: "Vapor experience", tags: "VAPOR · FLAVOR · MODERN",
    image: "/images/scenes/vapecraft-card.jpg", route: "/vapecraft",
    icon: Wind, color: "#06b6d4", category: "cigar",
    questions: [
      { prompt: "Flavor direction?", options: ["Fruity", "Menthol", "Tobacco", "Dessert"] },
      { prompt: "Nicotine level?", options: ["None", "Low", "Medium", "High"] },
    ],
    pairings: { default: "Pair with a craft beer for a modern lounge experience" },
  },
];

const CAMPAIGN_TEMPLATES = [
  { id: "happy-hour", name: "Happy Hour Special", desc: "Discounted pairings 4-7pm", color: "#f59e0b" },
  { id: "tasting-event", name: "Tasting Event", desc: "Guided tasting experience for groups", color: "#8b5cf6" },
  { id: "loyalty-boost", name: "Loyalty Boost", desc: "Double rewards for repeat visitors", color: "#34d399" },
  { id: "new-arrival", name: "New Arrival Spotlight", desc: "Feature a new product with samples", color: "#5b8def" },
];

type Phase = "select" | "questions" | "result" | "campaigns";

export default function ExperiencesModule() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();
  const { getBackground } = useVenueContext();
  const engagement = useEngagementContext();
  const [phase, setPhase] = useState<Phase>("select");
  const [activeExp, setActiveExp] = useState<ExperienceType | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [createdCampaigns, setCreatedCampaigns] = useState<Set<string>>(new Set());

  const startExperience = useCallback((exp: ExperienceType) => {
    setActiveExp(exp);
    setQuestionIdx(0);
    setAnswers([]);
    setPhase("questions");
    engagement.trackAction("experience_start", { experienceId: exp.id });
  }, [engagement]);

  const answerQuestion = useCallback((answer: string) => {
    if (!activeExp) return;
    engagement.trackAction("experience_answer", { answer });
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (questionIdx < activeExp.questions.length - 1) {
      setQuestionIdx(prev => prev + 1);
    } else {
      const prods = pos.products.filter(p => p.category === activeExp.category && p.stock > 0);
      const shuffled = [...prods].sort(() => Math.random() - 0.5);
      setRecommended(shuffled.slice(0, 2));
      setPhase("result");
      engagement.trackAction("experience_complete", { experienceId: activeExp.id });
    }
  }, [activeExp, answers, questionIdx, pos.products, engagement]);

  const handleAddToOrder = useCallback((productId: string) => {
    const ok = pos.addToCart(productId);
    if (ok) {
      setAddedIds(prev => new Set(prev).add(productId));
      engagement.trackAction("select", { productId });
    }
  }, [pos, engagement]);

  const createCampaign = useCallback((templateId: string, templateName: string) => {
    setCreatedCampaigns(prev => new Set(prev).add(templateId));
    cc.addAuditEntry("campaign.created", `Campaign created: ${templateName}`, pos.currentUser?.name);
  }, [cc, pos.currentUser]);

  const reset = useCallback(() => {
    setPhase("select");
    setActiveExp(null);
    setQuestionIdx(0);
    setAnswers([]);
    setRecommended([]);
    setAddedIds(new Set());
  }, []);

  const featured = recommended[0];
  const secondary = recommended.slice(1, 4);
  const f = featured as (Product & {
    isSponsored?: boolean; campaignTag?: string; brandTag?: string;
    xpReward?: number; rewardLabel?: string;
    tastingNotes?: string[]; whyItWorks?: string;
    strength?: string; tier?: string;
  }) | undefined;
  const tastingNotes = f?.tastingNotes ?? answers.slice(0, 4);
  const whyItWorks = activeExp ? (f?.whyItWorks
    ?? `Selected for its ${answers.slice(-2).join(" and ").toLowerCase() || "balanced"} character — a precise match for ${activeExp.title.toLowerCase()} preferences. ${activeExp.pairings.default}`) : "";
  const stepLabels = activeExp ? [...activeExp.questions.map((_q, i) => `Step ${i + 1}`), "Reveal"] : [];

  return (
    <BackgroundLayer image={getBackground("experiences")} style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={phase === "select" ? () => navigate("/dashboard") : phase === "campaigns" ? () => setPhase("select") : reset}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e8e0c8", fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>
            {phase === "campaigns" ? "Campaigns" : phase === "select" ? "Craft Your Experience" : activeExp?.title}
          </div>
          <div style={{ fontSize: 10, color: "rgba(232,224,200,0.45)", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 2 }}>
            {phase === "campaigns" ? "Create promotional campaigns" : phase === "select" ? "Tap to begin your journey" : phase === "questions" ? `Question ${questionIdx + 1} of ${activeExp?.questions.length}` : "Your recommendation"}
          </div>
        </div>
        {phase === "select" && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPhase("campaigns")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)",
              color: "#d4af37", cursor: "pointer", minHeight: 42,
            }}>
            <Megaphone size={14} /> Campaigns
          </motion.button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: phase === "result" ? "stretch" : "center", justifyContent: phase === "select" ? "start" : phase === "result" ? "stretch" : "center", padding: phase === "result" ? 0 : "24px 20px", gap: 16 }}>
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18, width: "100%", maxWidth: 1100 }}>
              {EXPERIENCES.map((exp, i) => (
                <motion.button key={exp.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    engagement.trackAction("experience_start", { experienceId: exp.id });
                    navigate(exp.route);
                  }}
                  style={{
                    display: "flex", flexDirection: "column", justifyContent: "flex-end",
                    aspectRatio: "1 / 2", padding: 0, minHeight: 420,
                    background: "#0a0806",
                    border: `1px solid ${exp.color}40`, borderRadius: 16,
                    cursor: "pointer", textAlign: "left",
                    position: "relative", overflow: "hidden",
                    boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${exp.color}10`,
                  }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url(${exp.image})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    pointerEvents: "none",
                  }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(180deg, rgba(10,8,6,0.1) 0%, rgba(10,8,6,0.4) 50%, rgba(10,8,6,0.92) 100%)`,
                    pointerEvents: "none",
                  }} />
                  <div style={{ position: "relative", padding: "18px 20px 20px", textAlign: "left" }}>
                    <div style={{
                      fontSize: 22, fontWeight: 700, color: "#fff",
                      fontFamily: "'Playfair Display', serif",
                      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                      marginBottom: 6,
                    }}>{exp.brand}</div>
                    <div style={{
                      fontSize: 9, color: exp.color, letterSpacing: "0.25em",
                      textShadow: "0 1px 4px rgba(0,0,0,0.8)", fontWeight: 600,
                    }}>{exp.tags}</div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {phase === "questions" && activeExp && (
            <motion.div key={`q-${questionIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              style={{ width: "100%", maxWidth: 500, textAlign: "center" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: activeExp.color,
                boxShadow: `0 0 16px ${activeExp.color}`, margin: "0 auto 20px",
              }} />
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#e8e0c8", marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
                {activeExp.questions[questionIdx].prompt}
              </h2>
              <div style={{
                display: "flex", gap: 4, justifyContent: "center", marginBottom: 28,
              }}>
                {activeExp.questions.map((_, qi) => (
                  <div key={qi} style={{
                    width: 32, height: 4, borderRadius: 2,
                    background: qi <= questionIdx ? activeExp.color : "rgba(255,255,255,0.08)",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeExp.questions[questionIdx].options.map(opt => (
                  <motion.button key={opt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => answerQuestion(opt)}
                    style={{
                      padding: "18px 24px", borderRadius: 14, fontSize: 16, fontWeight: 500,
                      background: "rgba(255,255,255,0.04)", border: `1px solid ${activeExp.color}25`,
                      color: "#e8e0c8", cursor: "pointer", minHeight: 56,
                      transition: "all 0.15s",
                    }}>
                    {opt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "result" && activeExp && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ width: "100%", minHeight: "100%", position: "relative", zIndex: 2 }}>
              {/* Dim/blur veil so the lounge background reads as ambience, not noise */}
              <div style={{
                position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
                background: "radial-gradient(ellipse at center, rgba(10,8,6,0.65) 0%, rgba(10,8,6,0.93) 75%)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              }} />
              <div style={{
                position: "relative", zIndex: 2,
                display: "grid",
                gridTemplateColumns: "minmax(180px, 220px) minmax(0, 1fr) minmax(280px, 360px)",
                gap: 24, padding: "28px 28px 36px",
                minHeight: "100%", alignItems: "start",
              }}>
                {/* ─────────── LEFT: Step / Progression ─────────── */}
                <aside style={{
                  position: "sticky", top: 0,
                  padding: "20px 18px",
                  background: "linear-gradient(180deg, rgba(14,10,8,0.85), rgba(10,8,6,0.65))",
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
                  display: "flex", flexDirection: "column", gap: 18,
                }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(232,224,200,0.45)", marginBottom: 6 }}>Experience Hub</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#f4ecd4", fontFamily: "'Playfair Display', serif" }}>{activeExp.title} 360</div>
                  </div>
                  <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${activeExp.color}40, transparent)` }} />
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {stepLabels.map((label, i) => {
                      const isCurrent = i === stepLabels.length - 1;
                      const isDone = i < stepLabels.length - 1;
                      const sub = i < activeExp.questions.length ? answers[i] : "Crafted";
                      return (
                        <li key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700,
                            background: isCurrent ? `${activeExp.color}` : isDone ? `${activeExp.color}25` : "rgba(255,255,255,0.05)",
                            border: `1px solid ${isCurrent || isDone ? activeExp.color + "80" : "rgba(255,255,255,0.1)"}`,
                            color: isCurrent ? "#0a0806" : isDone ? activeExp.color : "rgba(232,224,200,0.4)",
                          }}>{isDone ? <Check size={11} /> : i + 1}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: isCurrent ? "#f4ecd4" : isDone ? "rgba(232,224,200,0.7)" : "rgba(232,224,200,0.35)" }}>{label}</div>
                            {sub && <div style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10,
                        fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
                        background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(232,224,200,0.55)", cursor: "pointer",
                      }}>↺ Start Over</motion.button>
                  </div>
                </aside>

                {/* ─────────── CENTER: Featured + Secondary ─────────── */}
                <main style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
                  <div style={{ textAlign: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.32em", color: activeExp.color, marginBottom: 8, fontWeight: 600 }}>Your Experience Is Ready</div>
                    <h2 style={{ fontSize: 32, fontWeight: 600, color: "#f4ecd4", fontFamily: "'Playfair Display', serif", margin: "0 0 8px", letterSpacing: "0.01em" }}>
                      Crafted for your moment
                    </h2>
                    <p style={{ fontSize: 12, color: "rgba(232,224,200,0.5)", fontStyle: "italic", letterSpacing: "0.06em", margin: 0 }}>
                      {answers.join("  ·  ")}
                    </p>
                  </div>

                  {featured && (() => {
                    const added = addedIds.has(featured.id);
                    const fp = f!;
                    return (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        style={{
                          position: "relative", overflow: "hidden", borderRadius: 22,
                          background: "linear-gradient(150deg, rgba(26,20,14,0.94), rgba(14,10,8,0.88))",
                          border: `1px solid ${activeExp.color}55`,
                          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 36px ${activeExp.color}22`,
                          padding: 26, display: "flex", gap: 24, alignItems: "center",
                        }}>
                        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 0% 50%, ${activeExp.color}18, transparent 55%)`, pointerEvents: "none" }} />
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{ position: "absolute", inset: -10, borderRadius: 24, background: `radial-gradient(circle, ${activeExp.color}40, transparent 70%)`, filter: "blur(16px)" }} />
                          <KioskProductImage src={featured.image} alt={featured.name} category={featured.category} width={180} height={180} borderRadius={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 4, background: `${activeExp.color}20`, color: activeExp.color, border: `1px solid ${activeExp.color}50` }}>Top Match</span>
                            {fp.isSponsored && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 4, background: "rgba(212,175,55,0.18)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.35)" }}>Sponsored</span>}
                            {fp.brandTag && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "rgba(232,224,200,0.75)", border: "1px solid rgba(255,255,255,0.12)" }}>{fp.brandTag}</span>}
                            {fp.campaignTag && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 4, background: `${activeExp.color}18`, color: activeExp.color, border: `1px solid ${activeExp.color}40` }}>{fp.campaignTag}</span>}
                          </div>
                          <div style={{ fontSize: 28, fontWeight: 600, color: "#f4ecd4", fontFamily: "'Playfair Display', serif", lineHeight: 1.1 }}>{featured.name}</div>
                          <div style={{ fontSize: 13, color: "rgba(232,224,200,0.55)", fontStyle: "italic", lineHeight: 1.4 }}>{activeExp.pairings.default}</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
                            <div style={{ fontSize: 32, fontWeight: 700, color: activeExp.color, fontFamily: "'Playfair Display', serif", textShadow: `0 0 28px ${activeExp.color}66` }}>${featured.price}</div>
                            {(fp.xpReward || fp.rewardLabel) && (
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,175,55,0.9)" }}>
                                ★ {fp.rewardLabel ?? `+${fp.xpReward} XP`}
                              </div>
                            )}
                          </div>
                          <motion.button whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.02 }}
                            onClick={() => handleAddToOrder(featured.id)} disabled={added}
                            style={{
                              marginTop: 12, alignSelf: "flex-start",
                              display: "inline-flex", alignItems: "center", gap: 8,
                              padding: "16px 28px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                              letterSpacing: "0.16em", textTransform: "uppercase",
                              background: added ? "rgba(52,211,153,0.14)" : `linear-gradient(135deg, ${activeExp.color}, ${activeExp.color}cc)`,
                              color: added ? "#34d399" : "#0a0806",
                              border: added ? "1px solid rgba(52,211,153,0.35)" : "none",
                              cursor: added ? "default" : "pointer", minHeight: 52,
                              boxShadow: added ? "none" : `0 10px 26px ${activeExp.color}55`,
                            }}>
                            {added ? <><Check size={16} /> Added to Order</> : <><Plus size={16} /> Add to Order</>}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {secondary.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(232,224,200,0.5)", marginBottom: 12, fontWeight: 600 }}>Also recommended</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        {secondary.map((prod, idx) => {
                          const added = addedIds.has(prod.id);
                          const sp = prod as Product & { isSponsored?: boolean; brandTag?: string };
                          return (
                            <motion.div key={prod.id}
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 + idx * 0.06 }}
                              style={{
                                display: "flex", gap: 12, padding: 12, borderRadius: 14,
                                background: "linear-gradient(145deg, rgba(20,16,12,0.7), rgba(14,10,8,0.55))",
                                border: "1px solid rgba(255,255,255,0.07)",
                                alignItems: "center",
                              }}>
                              <KioskProductImage src={prod.image} alt={prod.name} category={prod.category} width={64} height={64} borderRadius={10} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e0c8", lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: activeExp.color }}>${prod.price}</div>
                                  {sp.isSponsored && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(212,175,55,0.7)" }}>SPON</span>}
                                  {sp.brandTag && !sp.isSponsored && <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(232,224,200,0.5)" }}>{sp.brandTag}</span>}
                                </div>
                              </div>
                              <motion.button whileTap={{ scale: 0.92 }}
                                onClick={() => handleAddToOrder(prod.id)} disabled={added}
                                style={{
                                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: added ? "rgba(52,211,153,0.14)" : `${activeExp.color}25`,
                                  color: added ? "#34d399" : activeExp.color,
                                  border: `1px solid ${added ? "rgba(52,211,153,0.35)" : activeExp.color + "55"}`,
                                  cursor: added ? "default" : "pointer",
                                }}>
                                {added ? <Check size={16} /> : <Plus size={16} />}
                              </motion.button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {addedIds.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                      <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} onClick={() => navigate("/pos")}
                        style={{
                          padding: "16px 40px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                          letterSpacing: "0.18em", textTransform: "uppercase",
                          background: "linear-gradient(135deg, #d4af37, #a98828)",
                          color: "#0a0806", border: "none", cursor: "pointer", minHeight: 54,
                          boxShadow: "0 12px 32px rgba(212,175,55,0.45)",
                        }}>Order Now →</motion.button>
                    </motion.div>
                  )}
                </main>

                {/* ─────────── RIGHT: Signature Highlight ─────────── */}
                <aside style={{
                  position: "sticky", top: 0,
                  padding: "22px 20px",
                  background: "linear-gradient(180deg, rgba(20,16,12,0.92), rgba(14,10,8,0.78))",
                  border: `1px solid ${activeExp.color}40`, borderRadius: 18,
                  boxShadow: `0 18px 48px rgba(0,0,0,0.5), 0 0 28px ${activeExp.color}15`,
                  display: "flex", flexDirection: "column", gap: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: activeExp.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" }}>
                    <Sparkles size={12} /> Signature {activeExp.category === "cigar" ? "Cigar" : activeExp.category === "spirit" ? "Pour" : activeExp.category === "beer" ? "Brew" : "Pick"}
                  </div>
                  {featured ? (
                    <>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: "#f4ecd4", fontFamily: "'Playfair Display', serif", lineHeight: 1.15, marginBottom: 4 }}>{featured.name}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(232,224,200,0.5)" }}>{f?.tier ?? "Premium"}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          { label: "Strength", value: f?.strength ?? "Medium" },
                          { label: "Type", value: featured.category[0].toUpperCase() + featured.category.slice(1) },
                          { label: "Mood", value: answers[answers.length - 1] ?? "Social" },
                          { label: "Tier", value: f?.tier ?? "Premium" },
                        ].map((stat) => (
                          <div key={stat.label} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                            <div style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,224,200,0.4)", marginBottom: 3 }}>{stat.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e8e0c8" }}>{stat.value}</div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(232,224,200,0.5)", marginBottom: 8, fontWeight: 600 }}>Tasting Notes</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {tastingNotes.slice(0, 6).map((n) => (
                            <span key={n} style={{ fontSize: 11, padding: "5px 11px", borderRadius: 999, background: `${activeExp.color}15`, border: `1px solid ${activeExp.color}35`, color: "#e8e0c8" }}>{n}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{
                        padding: "14px 14px", borderRadius: 12,
                        background: `linear-gradient(145deg, ${activeExp.color}10, transparent)`,
                        border: `1px solid ${activeExp.color}25`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: activeExp.color, marginBottom: 8 }}>
                          <Sparkles size={11} /> Why It Works
                        </div>
                        <p style={{ fontSize: 12, color: "rgba(232,224,200,0.78)", lineHeight: 1.55, margin: 0 }}>{whyItWorks}</p>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(232,224,200,0.5)", fontStyle: "italic" }}>No matching products in stock right now.</div>
                  )}
                </aside>
              </div>
            </motion.div>
          )}
          {phase === "campaigns" && (
            <motion.div key="campaigns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, width: "100%", maxWidth: 800 }}>
              {CAMPAIGN_TEMPLATES.map((tpl, i) => {
                const created = createdCampaigns.has(tpl.id);
                return (
                  <motion.div key={tpl.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      padding: "20px", borderRadius: 18,
                      background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                      border: `1px solid ${tpl.color}30`,
                      position: "relative", overflow: "hidden",
                    }}>
                    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 15% 50%, ${tpl.color}12, transparent 60%)`, pointerEvents: "none" }} />
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, marginBottom: 12,
                        background: `${tpl.color}12`, border: `1px solid ${tpl.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Megaphone size={20} color={tpl.color} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e0c8", marginBottom: 4 }}>{tpl.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)", marginBottom: 14 }}>{tpl.desc}</div>
                      <motion.button whileTap={{ scale: 0.93 }}
                        onClick={() => !created && createCampaign(tpl.id, tpl.name)}
                        disabled={created}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                          background: created ? "rgba(52,211,153,0.1)" : `linear-gradient(135deg, ${tpl.color}, ${tpl.color}cc)`,
                          color: created ? "#34d399" : "#0a0806",
                          border: created ? "1px solid rgba(52,211,153,0.3)" : "none",
                          cursor: created ? "default" : "pointer", minHeight: 42,
                        }}>
                        {created ? <><Check size={14} /> Created</> : <><Plus size={14} /> Create Campaign</>}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BackgroundLayer>
  );
}
