import { useEffect, useRef, useState } from "react";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";

export interface SwipeCardItem {
  id:       string;
  title:    string;
  subtitle?: string;
  desc?:    string;
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
    animate(x, 680, { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(onSwipeRight);
  }

  function swipeLeft() {
    if (exiting.current) return;
    exiting.current = true;
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

      {/* Card body */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(245,235,221,0.97)",
          border: "2px solid rgba(184,137,26,0.40)",
          borderRadius: 20,
          boxShadow: "0 16px 60px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "44px 36px",
          userSelect: "none",
          cursor: "grab",
          gap: 12,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: 3,
            background: "linear-gradient(90deg, transparent, rgba(184,137,26,0.55), transparent)",
            borderRadius: "0 0 4px 4px",
          }}
        />

        {/* Progress */}
        <p
          style={{
            fontSize: 11,
            color: "rgba(100,72,20,0.55)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {index + 1} of {total}
        </p>

        {/* Title */}
        <h3
          style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            fontFamily: "var(--app-font-serif)",
            fontWeight: 300,
            color: "#1A1410",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {item.title}
        </h3>

        {item.subtitle && (
          <p
            style={{
              fontSize: 12,
              color: "#7B5A1E",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {item.subtitle}
          </p>
        )}

        {item.desc && (
          <p
            style={{
              fontSize: 15,
              color: "#4A3020",
              textAlign: "center",
              lineHeight: 1.65,
              maxWidth: 270,
              marginTop: 8,
            }}
          >
            {item.desc}
          </p>
        )}

        {/* Swipe hint */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 28,
            alignItems: "center",
            color: "rgba(90,60,30,0.38)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <span>← {leftLabel}</span>
          <div style={{ width: 32, height: 1, background: "rgba(90,60,30,0.18)" }} />
          <span>{rightLabel} →</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stack card (behind the top) ─────────────────────────────── */
function StackCard({ depth }: { depth: number }) {
  const scale = 1 - depth * 0.06;
  const translateY = depth * 14;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10 - depth,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        background: "rgba(245,235,221,0.88)",
        border: "2px solid rgba(184,137,26,0.25)",
        borderRadius: 20,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
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
    <div style={{ position: "relative", width: "100%", height: 380 }}>
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
