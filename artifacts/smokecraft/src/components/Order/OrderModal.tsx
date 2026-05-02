/**
 * OrderModal — full order placement flow.
 *
 * Shows:
 *  1. Summary of selected products (cigar, drink, food)
 *  2. Order type selector: Request at Table / Pickup / Delivery
 *  3. Delivery availability check via browser Geolocation + Haversine math
 *  4. Table number input for table orders
 *  5. Submit → POST /api/orders
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  X, MapPin, Loader2, CheckCircle, XCircle,
  UtensilsCrossed, Wine, Cigarette, ShoppingBag, Hash,
} from "lucide-react";
import {
  createOrder, createCheckoutSession,
  type ProductResult, type FoodResult, type OrderType,
} from "@/services/api";

interface OrderModalProps {
  isOpen:    boolean;
  cigar?:    ProductResult;
  drink?:    ProductResult;
  food?:     FoodResult;
  venueId?:  string;
  onClose:   () => void;
  onSuccess: (orderId: string, orderType: OrderType) => void;
}

// Demo venue location — Times Square, NYC
const VENUE_LAT = 40.7580;
const VENUE_LON = -73.9855;
const DELIVERY_RADIUS_MI = 10;

type DeliveryStatus = "idle" | "checking" | "available" | "unavailable" | "denied" | "error";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R     = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLon  = toRad(lon2 - lon1);
  const a     =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ORDER_TYPES: { type: OrderType; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { type: "table",    label: "Request at Table", sublabel: "Staff will bring it to you",  icon: <Hash size={16} /> },
  { type: "pickup",   label: "Pickup",           sublabel: "Collect from the bar",         icon: <ShoppingBag size={16} /> },
  { type: "delivery", label: "Delivery",         sublabel: "Delivered to your location",  icon: <MapPin size={16} /> },
];

export function OrderModal({ isOpen, cigar, drink, food, venueId, onClose, onSuccess }: OrderModalProps) {
  const [selectedType,    setSelectedType]    = useState<OrderType | null>(null);
  const [deliveryStatus,  setDeliveryStatus]  = useState<DeliveryStatus>("idle");
  const [deliveryMiles,   setDeliveryMiles]   = useState<number | null>(null);
  const [tableNumber,     setTableNumber]     = useState("");
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [isRedirecting,   setIsRedirecting]   = useState(false);
  const [submitError,     setSubmitError]     = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType(null);
      setDeliveryStatus("idle");
      setDeliveryMiles(null);
      setTableNumber("");
      setSubmitError(null);
    }
  }, [isOpen]);

  const checkDelivery = useCallback(() => {
    if (!navigator.geolocation) {
      setDeliveryStatus("error");
      return;
    }
    setDeliveryStatus("checking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          VENUE_LAT,
          VENUE_LON,
        );
        setDeliveryMiles(Math.round(dist * 10) / 10);
        setDeliveryStatus(dist <= DELIVERY_RADIUS_MI ? "available" : "unavailable");
      },
      (err) => {
        setDeliveryStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { timeout: 8000 },
    );
  }, []);

  const handleTypeSelect = (type: OrderType) => {
    setSelectedType(type);
    setSubmitError(null);
    if (type === "delivery" && deliveryStatus === "idle") {
      checkDelivery();
    }
  };

  const canSubmit =
    selectedType !== null &&
    !(selectedType === "delivery" && deliveryStatus === "unavailable") &&
    !(selectedType === "delivery" && deliveryStatus === "checking") &&
    !isSubmitting &&
    !isRedirecting;

  const handleSubmit = async () => {
    if (!selectedType || !canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Step 1 — persist the order record
      const order = await createOrder({
        cigarId:     cigar?.id,
        cigarName:   cigar?.name,
        drinkId:     drink?.id,
        drinkName:   drink?.name,
        foodId:      food?.id,
        foodName:    food?.name,
        orderType:   selectedType,
        tableNumber: selectedType === "table" ? tableNumber || undefined : undefined,
        venueId,
      });

      // Step 2 — table orders go straight to confirmation (no payment required)
      if (selectedType === "table") {
        onSuccess(order.id, selectedType);
        return;
      }

      // Step 3 — pickup / delivery → redirect to Stripe Checkout
      setIsRedirecting(true);
      const { url } = await createCheckoutSession({
        items:   [{ name: "SmokeCraft 360 Experience", price: 4500, quantity: 1 }],
        orderId: order.id,
        venueId,
      });
      // Navigate away — intentionally not resetting submitting state
      window.location.href = url;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not place order. Try again.");
      setIsSubmitting(false);
      setIsRedirecting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(5,3,1,0.88)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg z-50"
            style={{ transform: "translate(-50%, -50%)", ...(typeof window !== "undefined" && window.innerWidth < 640 ? { transform: "none" } : {}) }}
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="rounded-t-2xl sm:rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(155deg, rgba(30,20,8,0.98), rgba(16,10,4,0.99))",
                border:     "1px solid rgba(212,175,55,0.22)",
                boxShadow:  "0 -8px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.08) inset",
              }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, hsl(43 85% 52%), hsl(43 75% 42%))" }} />
                    <h2 className="font-serif text-xl" style={{ fontWeight: 300, color: "rgba(235,215,175,0.92)" }}>
                      Order Your Experience
                    </h2>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.28em] pl-3" style={{ color: "rgba(212,175,55,0.4)" }}>
                    No payment required
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full transition-colors duration-200"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}>
                  <X size={16} style={{ color: "rgba(180,155,100,0.55)" }} />
                </button>
              </div>

              {/* Divider */}
              <div className="mx-6 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)" }} />

              <div className="px-6 py-5 space-y-6">

                {/* Selection summary */}
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] mb-3" style={{ color: "rgba(180,155,100,0.45)" }}>Your Selection</p>
                  <div className="space-y-2">
                    {cigar && <SelectionRow icon={<Cigarette size={13} />} label={cigar.name} sublabel="CIGAR" color="rgba(212,175,55,0.7)" />}
                    {drink && <SelectionRow icon={<Wine size={13} />}       label={drink.name} sublabel="PAIRING" color="rgba(130,170,220,0.7)" />}
                    {food  && <SelectionRow icon={<UtensilsCrossed size={13} />} label={food.name} sublabel="FOOD" color="rgba(180,120,60,0.7)" />}
                    {!cigar && !drink && !food && (
                      <p className="text-sm italic" style={{ color: "rgba(180,155,100,0.4)" }}>No items selected</p>
                    )}
                  </div>
                </div>

                {/* Order type selector */}
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] mb-3" style={{ color: "rgba(180,155,100,0.45)" }}>How would you like it?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ORDER_TYPES.map(({ type, label, sublabel, icon }) => {
                      const isSelected  = selectedType === type;
                      const isDisabled  = type === "delivery" && deliveryStatus === "unavailable";
                      return (
                        <motion.button
                          key={type}
                          onClick={() => !isDisabled && handleTypeSelect(type)}
                          disabled={isDisabled}
                          className="relative flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all duration-300"
                          style={isSelected ? {
                            background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(180,130,30,0.1))",
                            border:     "1px solid rgba(212,175,55,0.5)",
                            color:      "rgba(235,215,175,0.95)",
                          } : isDisabled ? {
                            background: "rgba(255,255,255,0.02)",
                            border:     "1px solid rgba(255,255,255,0.05)",
                            color:      "rgba(180,155,100,0.25)",
                            cursor:     "not-allowed",
                          } : {
                            background: "rgba(255,255,255,0.04)",
                            border:     "1px solid rgba(255,255,255,0.08)",
                            color:      "rgba(180,155,100,0.6)",
                          }}
                          whileHover={!isDisabled && !isSelected ? { borderColor: "rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.8)" } : {}}
                          whileTap={!isDisabled ? { scale: 0.97 } : {}}
                        >
                          {isSelected && (
                            <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.08), transparent)" }} />
                          )}
                          <span style={{ color: isSelected ? "rgba(212,175,55,0.9)" : "inherit" }}>{icon}</span>
                          <div>
                            <p className="text-[10px] font-medium leading-tight">{label}</p>
                            <p className="text-[8px] mt-0.5 leading-tight" style={{ color: isSelected ? "rgba(212,175,55,0.5)" : "rgba(180,155,100,0.35)" }}>{sublabel}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Table number input */}
                <AnimatePresence>
                  {selectedType === "table" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}>
                      <label className="block text-[9px] uppercase tracking-[0.25em] mb-2" style={{ color: "rgba(180,155,100,0.45)" }}>
                        Table Number (optional)
                      </label>
                      <input
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. 12"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{
                          background:  "rgba(255,255,255,0.05)",
                          border:      "1px solid rgba(255,255,255,0.1)",
                          color:       "rgba(230,210,175,0.9)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(212,175,55,0.4)")}
                        onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Delivery availability */}
                <AnimatePresence>
                  {selectedType === "delivery" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}>
                      <DeliveryStatusBadge
                        status={deliveryStatus}
                        miles={deliveryMiles}
                        radius={DELIVERY_RADIUS_MI}
                        onRetry={checkDelivery}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence>
                  {submitError && (
                    <motion.p className="text-sm px-4 py-3 rounded-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)" }}>
                      {submitError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full py-4 rounded-xl font-serif text-base tracking-[0.18em] uppercase relative overflow-hidden"
                  style={canSubmit ? {
                    background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                    color:      "hsl(22 18% 6%)",
                    boxShadow:  "0 4px 24px rgba(212,175,55,0.3)",
                  } : {
                    background: "rgba(255,255,255,0.05)",
                    color:      "rgba(180,155,100,0.3)",
                    cursor:     "not-allowed",
                  }}
                  whileHover={canSubmit ? { scale: 1.01, boxShadow: "0 6px 32px rgba(212,175,55,0.4)" } : {}}
                  whileTap={canSubmit ? { scale: 0.98 } : {}}
                >
                  {isRedirecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />Redirecting to Payment…
                    </span>
                  ) : isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />Placing Order…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingBag size={14} />
                      {selectedType === "table"
                        ? "Request at Table"
                        : selectedType
                          ? `Pay & Confirm ${ORDER_TYPES.find(o => o.type === selectedType)?.label}`
                          : "Select Order Type"}
                    </span>
                  )}
                </motion.button>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SelectionRow({ icon, label, sublabel, color }: { icon: React.ReactNode; label: string; sublabel: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color }} className="flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "rgba(220,200,165,0.85)" }}>{label}</p>
        <p className="text-[8px] uppercase tracking-[0.2em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>{sublabel}</p>
      </div>
    </div>
  );
}

function DeliveryStatusBadge({
  status,
  miles,
  radius,
  onRetry,
}: {
  status:  DeliveryStatus;
  miles:   number | null;
  radius:  number;
  onRetry: () => void;
}) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
        <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "rgba(212,175,55,0.6)" }} />
        <p className="text-xs" style={{ color: "rgba(212,175,55,0.65)" }}>Checking delivery availability…</p>
      </div>
    );
  }
  if (status === "available") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.22)" }}>
        <CheckCircle size={14} className="flex-shrink-0" style={{ color: "rgba(74,222,128,0.8)" }} />
        <div>
          <p className="text-xs font-medium" style={{ color: "rgba(74,222,128,0.85)" }}>Delivery Available</p>
          {miles !== null && (
            <p className="text-[9px] mt-0.5" style={{ color: "rgba(74,222,128,0.5)" }}>
              You are {miles} mi from the venue (within {radius} mi radius)
            </p>
          )}
        </div>
      </div>
    );
  }
  if (status === "unavailable") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <XCircle size={14} className="flex-shrink-0" style={{ color: "rgba(239,68,68,0.7)" }} />
        <div>
          <p className="text-xs font-medium" style={{ color: "rgba(239,68,68,0.8)" }}>Pickup Only</p>
          {miles !== null && (
            <p className="text-[9px] mt-0.5" style={{ color: "rgba(239,68,68,0.45)" }}>
              You are {miles} mi away — delivery is only within {radius} mi
            </p>
          )}
        </div>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
        <MapPin size={14} className="flex-shrink-0" style={{ color: "rgba(180,155,100,0.5)" }} />
        <div>
          <p className="text-xs" style={{ color: "rgba(180,155,100,0.65)" }}>Location access denied</p>
          <p className="text-[9px] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>
            Enable location in your browser settings to check delivery availability
          </p>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <MapPin size={14} className="flex-shrink-0" style={{ color: "rgba(180,155,100,0.45)" }} />
        <div className="flex-1">
          <p className="text-xs" style={{ color: "rgba(180,155,100,0.6)" }}>Could not check location</p>
        </div>
        <button onClick={onRetry} className="text-[9px] uppercase tracking-[0.12em] px-2 py-1 rounded"
          style={{ background: "rgba(212,175,55,0.1)", color: "rgba(212,175,55,0.65)" }}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}
