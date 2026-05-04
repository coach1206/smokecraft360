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

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: phase === "select" ? "start" : "center", padding: "24px 20px", gap: 16 }}>
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
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ width: "100%", maxWidth: 600 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: activeExp.color, marginBottom: 8 }}>Your Recommendation</div>
                <h2 style={{ fontSize: 22, fontWeight: 600, color: "#e8e0c8", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>
                  Based on your preferences
                </h2>
                <p style={{ fontSize: 13, color: "rgba(232,224,200,0.4)", fontStyle: "italic" }}>
                  {answers.join(" · ")}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {recommended.map(prod => {
                  const added = addedIds.has(prod.id);
                  return (
                    <motion.div key={prod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: "flex", gap: 16, padding: 16, borderRadius: 16,
                        background: "rgba(255,255,255,0.04)", border: `1px solid ${activeExp.color}20`,
                        alignItems: "center",
                      }}>
                      <KioskProductImage
                        src={prod.image}
                        alt={prod.name}
                        category={prod.category}
                        width={90}
                        height={90}
                        borderRadius={12}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e0c8", marginBottom: 4 }}>{prod.name}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: activeExp.color, marginBottom: 4 }}>${prod.price}</div>
                        <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)", fontStyle: "italic" }}>
                          {activeExp.pairings.default}
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => handleAddToOrder(prod.id)}
                        disabled={added}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "12px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                          background: added ? "rgba(52,211,153,0.1)" : `linear-gradient(135deg, ${activeExp.color}, ${activeExp.color}cc)`,
                          color: added ? "#34d399" : "#0a0806",
                          border: added ? "1px solid rgba(52,211,153,0.3)" : "none",
                          cursor: added ? "default" : "pointer", minHeight: 46, flexShrink: 0,
                        }}>
                        <Plus size={16} /> {added ? "Added" : "Add to Order"}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
                  style={{
                    padding: "14px 32px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(232,224,200,0.5)", cursor: "pointer", minHeight: 48,
                  }}>Try Another Experience</motion.button>
                {addedIds.size > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/pos")}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      marginLeft: 12, padding: "14px 32px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                      background: "linear-gradient(135deg, #d4af37, #a98828)",
                      color: "#0a0806", border: "none", cursor: "pointer", minHeight: 48,
                    }}>Go to POS →</motion.button>
                )}
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
