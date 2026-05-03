import { useEffect, useRef, useState } from "react";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { playClick, playSwipe, playSelect } from "../services/sound";
import { haptic } from "../utils/haptics";

export interface SwipeCardItem {
  id:       string;
  title:    string;
  subtitle?: string;
  desc?:    string;
  /** Hero image (bg-image URL). Renders behind the title with a vignette
   *  scrim so text stays readable. Optional — cards without an image fall
   *  back to the original cream background + gold accent. */
  image?:   string;
  /** Optional ordered fallback chain. If the primary image fails to load
   *  (404, rate-limit, blocked), the next URL in the array is tried, then
   *  the next. Prevents silent empty cards when a single Unsplash photo
   *  goes stale. When provided, the first entry is used as the primary. */
  images?:  string[];
  /** Optional accent hex color used for the gold rule + dot tint. Defaults
   *  to the deck's house gold. */
  accent?:  string;
}

interface Props {
  items:        SwipeCardItem[];
  multiSelect?: boolean;
  onComplete:   (selected: string[]) => void;
  onCardFocus?: (id: string) => void;
  rightLabel?:  string;
  leftLabel?:   string;
}

/* ── Single top card ─────────────────────────────────────────── */
interface TopCardProps {
  item:          SwipeCardItem;
  index:         number;
  total:         number;
  onSwipeRight:  () => void;
  onSwipeLeft:   () => void;
  rightLabel:    string;
  leftLabel:     string;
}

function TopCard({ item, index, total, onSwipeRight, onSwipeLeft, rightLabel, leftLabel }: TopCardProps) {
  const x        = useMotionValue(260);
  const rotate   = useTransform(x, [-280, 280], [-14, 14]);
  const cardOpacity = useTransform(x, [-320, -100, 0, 100, 320], [0, 1, 1, 1, 0]);
  const yesOp    = useTransform(x, [0, 50, 120], [0, 0.6, 1]);
  const skipOp   = useTransform(x, [-120, -50, 0], [1, 0.6, 0]);
  const exiting  = useRef(false);

  /* Slide in on mount */
  useEffect(() => {
    animate(x, 0, { duration: 0.38, ease: [0.22, 1, 0.36, 1] });
  }, [x]);

  function swipeRight() {
    if (exiting.current) return;
    exiting.current = true;
    playSelect();                                                  // accept chime
    haptic.select();                                               // tactile commit
    animate(x, 680, { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(onSwipeRight);
  }

  function swipeLeft() {
    if (exiting.current) return;
    exiting.current = true;
    playSwipe();                                                   // skip whoosh
    haptic.swipe();                                                // tactile skip
    animate(x, -680, { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(onSwipeLeft);
  }

  function onDragEnd(
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) {
    if (info.offset.x > 90 || info.velocity.x > 500) swipeRight();
    else if (info.offset.x < -90 || info.velocity.x < -500) swipeLeft();
  }

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity: cardOpacity,
        position: "absolute",
        inset: 0,
        zIndex: 10,
        touchAction: "none",
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.88}
      onDragEnd={onDragEnd}
    >
      {/* RIGHT — green "select" stamp */}
      <motion.div
        style={{
          opacity: yesOp,
          position: "absolute",
          top: 28,
          left: 24,
          zIndex: 20,
          border: "2.5px solid rgba(120,90,12,0.9)",
          color: "rgba(100,74,8,1)",
          borderRadius: 8,
          padding: "5px 16px",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          background: "rgba(212,175,55,0.08)",
          pointerEvents: "none",
        }}
      >
        {rightLabel}
      </motion.div>

      {/* LEFT — skip stamp */}
      <motion.div
        style={{
          opacity: skipOp,
          position: "absolute",
          top: 28,
          right: 24,
          zIndex: 20,
          border: "2.5px solid rgba(130,55,45,0.85)",
          color: "rgba(130,55,45,1)",
          borderRadius: 8,
          padding: "5px 16px",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          background: "rgba(130,55,45,0.06)",
          pointerEvents: "none",
        }}
      >
        {leftLabel}
      </motion.div>

      {/* Card body — layered shell:
            1. base cream surface
            2. optional hero photo (top 45%) with cream-fade scrim
            3. inner vignette + paper-grain warmth for depth
            4. multi-layer drop shadow (ambient + key + contact)         */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #FAF1DD 0%, #F2E5C8 100%)",
          border: "1px solid rgba(184,137,26,0.55)",
          borderRadius: 22,
          boxShadow: [
            "0 1px 0 rgba(255,255,255,0.55) inset",            // top highlight
            "0 -1px 0 rgba(120,82,16,0.18) inset",             // bottom shade
            "0 2px 4px rgba(0,0,0,0.10)",                      // contact
            "0 14px 32px rgba(20,12,4,0.32)",                  // key
            "0 36px 80px rgba(20,12,4,0.42)",                  // ambient
            `0 0 0 1px ${item.accent ?? "rgba(184,137,26,0.18)"}`, // gold ring
          ].join(", "),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "26px 32px 30px",
          userSelect: "none",
          cursor: "grab",
          gap: 8,
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        {/* Hero image (top ~60%) — uses an <img> element so we can detect
            load failures and walk through `item.images` fallbacks. The
            previous bg-image approach silently showed an empty top half
            when an Unsplash URL went stale. */}
        {(() => {
          const chain = item.images && item.images.length > 0
            ? item.images
            : item.image ? [item.image] : [];
          if (chain.length === 0) return null;
          return (
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "58%",
                background: "linear-gradient(180deg,#3a2812,#1a1208)", // warm placeholder
                zIndex: 0, overflow: "hidden",
              }}
            >
              <img
                src={chain[0]}
                alt=""
                loading="eager"
                onError={(e) => {
                  const img  = e.currentTarget;
                  const next = Number(img.dataset.idx ?? 0) + 1;
                  if (next < chain.length) {
                    img.dataset.idx = String(next);
                    img.src = chain[next];
                  }
                }}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center",
                  filter: "saturate(1.08) contrast(1.06)",
                  display: "block",
                }}
              />
            </div>
          );
        })()}
        {/* Cream scrim that fades the photo into the card body so text
            stays legible even on busy images. */}
        {(item.image || (item.images && item.images.length > 0)) && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: "70%",
              background:
                "linear-gradient(180deg, rgba(250,241,221,0) 0%, rgba(250,241,221,0.50) 60%, rgba(250,241,221,1) 100%)",
              zIndex: 1,
            }}
          />
        )}

        {/* Inner vignette adds physical depth even when no image */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(255,250,235,0) 35%, rgba(60,38,12,0.10) 100%)",
          }}
        />

        {/* Gold top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: 3,
            background: `linear-gradient(90deg, transparent, ${item.accent ?? "rgba(184,137,26,0.85)"}, transparent)`,
            borderRadius: "0 0 4px 4px",
            zIndex: 3,
          }}
        />

        {/* Progress — pushed below the hero space when image present */}
        <p
          style={{
            position: "relative", zIndex: 3,
            marginTop: item.image ? "54%" : 0,
            fontSize: 11,
            color: "rgba(80,52,12,0.78)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {index + 1} of {total}
        </p>

        {/* Title */}
        <h3
          style={{
            position: "relative", zIndex: 3,
            fontSize: "clamp(2.1rem, 6.2vw, 3.1rem)",
            fontFamily: "var(--app-font-serif)",
            fontWeight: 500,
            color: "#15100A",
            textAlign: "center",
            lineHeight: 1.05,
            letterSpacing: "0.005em",
            textShadow: "0 1px 0 rgba(255,250,235,0.6)",
          }}
        >
          {item.title}
        </h3>

        {item.subtitle && (
          <p
            style={{
              position: "relative", zIndex: 3,
              fontSize: 12,
              color: "#6B4A12",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {item.subtitle}
          </p>
        )}

        {item.desc && (
          <p
            style={{
              position: "relative", zIndex: 3,
              fontSize: 18,                                              // bumped 16.5→18 per UX brief (35–75 yo readers)
              fontWeight: 500,
              color: "#1F140A",
              textAlign: "center",
              lineHeight: 1.55,
              letterSpacing: "0.005em",
              maxWidth: 290,
              marginTop: 6,
            }}
          >
            {item.desc}
          </p>
        )}

        {/* Spacer pushes the swipe hint to the bottom of the card */}
        <div style={{ flex: 1 }} />

        {/* Swipe hint — larger, more prominent action affordance */}
        <div
          style={{
            position: "relative", zIndex: 3,
            display: "flex",
            gap: 14,
            alignItems: "stretch",
            width: "100%",
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); playClick(); swipeLeft(); }}
            style={{
              flex: 1,
              padding: "14px 12px",
              borderRadius: 12,
              border: "1.5px solid rgba(130,55,45,0.55)",
              background: "linear-gradient(135deg, rgba(130,55,45,0.08), rgba(130,55,45,0.02))",
              color: "rgba(130,55,45,0.95)",
              fontSize: 13,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              fontWeight: 700,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            ← {leftLabel}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); playClick(); swipeRight(); }}
            style={{
              flex: 1,
              padding: "14px 12px",
              borderRadius: 12,
              border: `1.5px solid ${item.accent ?? "rgba(184,137,26,0.7)"}`,
              background: "linear-gradient(135deg, rgba(212,175,55,0.20), rgba(184,137,26,0.10))",
              color: "#3A2A08",
              fontSize: 13,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(184,137,26,0.18)",
              touchAction: "manipulation",
            }}
          >
            {rightLabel} →
          </button>
        </div>

        <p
          style={{
            position: "relative", zIndex: 3,
            marginTop: 6,
            color: "rgba(70,42,12,0.42)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          or swipe the card
        </p>
      </div>
    </motion.div>
  );
}

/* ── Stack card (behind the top) ─────────────────────────────── */
function StackCard({ depth }: { depth: number }) {
  const scale = 1 - depth * 0.05;
  const translateY = depth * 12;
  // Each layer slightly darker + smaller shadow, suggesting a real stack
  // of paper sitting on a table rather than identical cards.
  const tint = depth === 1 ? 0.92 : 0.84;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10 - depth,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        background: `linear-gradient(180deg, rgba(250,241,221,${tint}) 0%, rgba(232,218,184,${tint}) 100%)`,
        border: "1px solid rgba(184,137,26,0.30)",
        borderRadius: 22,
        boxShadow: [
          "0 1px 0 rgba(255,255,255,0.4) inset",
          "0 6px 18px rgba(20,12,4,0.22)",
          `0 ${10 + depth * 6}px ${22 + depth * 8}px rgba(20,12,4,0.28)`,
        ].join(", "),
      }}
    />
  );
}

/* ── Deck ─────────────────────────────────────────────────────── */
export function SwipeCardDeck({
  items,
  multiSelect = false,
  onComplete,
  onCardFocus,
  rightLabel = "Select",
  leftLabel  = "Skip",
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected]         = useState<string[]>([]);

  /* Fire focus for the first card on mount */
  useEffect(() => {
    if (items[0]) onCardFocus?.(items[0].id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = items.length - currentIndex;

  function advance(select: boolean) {
    const card         = items[currentIndex];
    const newSelected  = select ? [...selected, card.id] : selected;
    const nextIndex    = currentIndex + 1;

    setSelected(newSelected);

    if (!multiSelect && select) {
      onComplete(newSelected);
      return;
    }

    if (nextIndex >= items.length) {
      onComplete(newSelected);
      return;
    }

    setCurrentIndex(nextIndex);
    onCardFocus?.(items[nextIndex].id);
  }

  if (remaining <= 0) return null;

  const showStack2 = remaining >= 2;
  const showStack3 = remaining >= 3;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        // Fluid card sizing — fills the available column on kiosk while
        // staying touch-friendly on smaller screens.
        height: "min(72vh, 580px)",
        minHeight: 480,
        maxWidth: 520,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {/* Background depth cards */}
      {showStack3 && <StackCard depth={2} />}
      {showStack2 && <StackCard depth={1} />}

      {/* Top draggable card — remount on index change for enter animation */}
      <TopCard
        key={currentIndex}
        item={items[currentIndex]}
        index={currentIndex}
        total={items.length}
        onSwipeRight={() => advance(true)}
        onSwipeLeft={() => advance(false)}
        rightLabel={rightLabel}
        leftLabel={leftLabel}
      />

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: -32,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background:
                i < currentIndex
                  ? "rgba(184,137,26,0.7)"
                  : i === currentIndex
                  ? "rgba(212,175,55,1)"
                  : "rgba(90,60,30,0.22)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
