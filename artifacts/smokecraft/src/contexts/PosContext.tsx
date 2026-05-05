import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { getStoredUser, fetchWithRetry } from "@/services/auth";

export interface Product {
  id: string;
  name: string;
  category: "cigar" | "spirit" | "beer" | "food";
  price: number;
  image: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "refunded" | "voided";

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: PaymentStatus;
  createdAt: string;
  rewardApplied: boolean;
  failureReason?: string;
  stockDeducted?: boolean;
}

export interface InventoryLogEntry {
  id: string;
  productId: string;
  productName: string;
  beforeStock: number;
  afterStock: number;
  reason: string;
  userId: string;
  timestamp: string;
}

interface PosState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  inventoryLog: InventoryLogEntry[];
  currentUser: { name: string; role: string; pin: string } | null;
  rewardMessage: string | null;
  rewardBlocked: string | null;
  rewardCooldownActive: boolean;
  processingLock: boolean;
  paymentError: string | null;
  setCurrentUser: (u: { name: string; role: string; pin: string } | null) => void;
  addToCart: (productId: string) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  checkout: () => Promise<Order | null>;
  retryCheckout: (orderId: string) => Promise<Order | null>;
  refundOrder: (orderId: string) => boolean;
  manualStockAdjust: (productId: string, delta: number, reason: string) => { needsConfirmation: boolean; error?: string };
  confirmLargeAdjustment: (productId: string, delta: number, reason: string) => boolean;
  dismissReward: () => void;
  dismissRewardBlocked: () => void;
  clearPaymentError: () => void;
}

const REWARD_THRESHOLD = 50;
const REWARD_COOLDOWN_MS = 5 * 60 * 1000;
const LARGE_ADJUSTMENT_THRESHOLD = 10;

/** Maps API product category to POS Product category. */
function mapCategory(raw: string): Product["category"] {
  switch (raw.toLowerCase()) {
    case "cigar":   return "cigar";
    case "alcohol":
    case "wine":
    case "cocktail":
    case "spirit":  return "spirit";
    case "beer":    return "beer";
    case "food":    return "food";
    default:        return "cigar";
  }
}

/** Derive a sensible default price from the product tier. */
function tierPrice(tier?: string): number {
  switch (tier) {
    case "premium":  return 38;
    case "mid":      return 22;
    case "standard": return 12;
    default:         return 18;
  }
}

const PosContext = createContext<PosState | null>(null);

export function usePosContext(): PosState {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePosContext must be inside PosProvider");
  return ctx;
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryLog, setInventoryLog] = useState<InventoryLogEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; pin: string } | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [rewardBlocked, setRewardBlocked] = useState<string | null>(null);
  const [processingLock, setProcessingLock] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [rewardCooldownActive, setRewardCooldownActive] = useState(false);
  const lockRef = useRef(false);
  const cartRef = useRef<CartItem[]>([]);
  const ordersRef = useRef<Order[]>([]);
  const productsRef = useRef<Product[]>([]);
  const userRef = useRef<{ name: string; role: string; pin: string } | null>(null);
  const inventoryLogRef = useRef<InventoryLogEntry[]>([]);
  const lastRewardTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncCart = useCallback((c: CartItem[]) => { cartRef.current = c; setCart(c); }, []);
  const syncOrders = useCallback((o: Order[]) => { ordersRef.current = o; setOrders(o); }, []);
  const syncProducts = useCallback((p: Product[]) => { productsRef.current = p; setProducts(p); }, []);
  const syncUser = useCallback((u: { name: string; role: string; pin: string } | null) => { userRef.current = u; setCurrentUser(u); }, []);

  const addInventoryLog = useCallback((productId: string, productName: string, before: number, after: number, reason: string) => {
    const entry: InventoryLogEntry = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId,
      productName,
      beforeStock: before,
      afterStock: after,
      reason,
      userId: userRef.current?.name ?? "System",
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...inventoryLogRef.current].slice(0, 200);
    inventoryLogRef.current = updated;
    setInventoryLog(updated);
  }, []);

  const addToCart = useCallback((productId: string): boolean => {
    if (lockRef.current) return false;
    const prod = productsRef.current.find(p => p.id === productId);
    if (!prod || prod.stock <= 0) return false;

    const before = prod.stock;
    const updatedProducts = productsRef.current.map(p =>
      p.id === productId ? { ...p, stock: p.stock - 1 } : p
    );
    syncProducts(updatedProducts);
    addInventoryLog(productId, prod.name, before, before - 1, "cart.add");

    const existing = cartRef.current.find(c => c.product.id === productId);
    if (existing) {
      syncCart(cartRef.current.map(c =>
        c.product.id === productId ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      syncCart([...cartRef.current, { product: prod, quantity: 1 }]);
    }
    return true;
  }, [syncProducts, syncCart, addInventoryLog]);

  const removeFromCart = useCallback((productId: string) => {
    if (lockRef.current) return;
    const item = cartRef.current.find(c => c.product.id === productId);
    if (!item) return;
    const prod = productsRef.current.find(p => p.id === productId);
    const before = prod?.stock ?? 0;
    syncProducts(productsRef.current.map(p =>
      p.id === productId ? { ...p, stock: p.stock + item.quantity } : p
    ));
    addInventoryLog(productId, item.product.name, before, before + item.quantity, "cart.remove");
    syncCart(cartRef.current.filter(c => c.product.id !== productId));
  }, [syncProducts, syncCart, addInventoryLog]);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    if (lockRef.current) return;
    const item = cartRef.current.find(c => c.product.id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    const prod = productsRef.current.find(p => p.id === productId);
    const before = prod?.stock ?? 0;
    if (newQty <= 0) {
      syncProducts(productsRef.current.map(p =>
        p.id === productId ? { ...p, stock: p.stock + item.quantity } : p
      ));
      addInventoryLog(productId, item.product.name, before, before + item.quantity, "cart.remove");
      syncCart(cartRef.current.filter(c => c.product.id !== productId));
      return;
    }
    if (delta > 0) {
      if (!prod || prod.stock <= 0) return;
      syncProducts(productsRef.current.map(p =>
        p.id === productId ? { ...p, stock: p.stock - 1 } : p
      ));
      addInventoryLog(productId, item.product.name, before, before - 1, "cart.add");
    } else {
      syncProducts(productsRef.current.map(p =>
        p.id === productId ? { ...p, stock: p.stock + 1 } : p
      ));
      addInventoryLog(productId, item.product.name, before, before + 1, "cart.reduce");
    }
    syncCart(cartRef.current.map(c =>
      c.product.id === productId ? { ...c, quantity: newQty } : c
    ));
  }, [syncProducts, syncCart, addInventoryLog]);

  const clearCart = useCallback(() => {
    if (lockRef.current) return;
    const currentCart = cartRef.current;
    if (currentCart.length === 0) return;
    let prods = productsRef.current;
    for (const item of currentCart) {
      const prod = prods.find(p => p.id === item.product.id);
      const before = prod?.stock ?? 0;
      prods = prods.map(p =>
        p.id === item.product.id ? { ...p, stock: p.stock + item.quantity } : p
      );
      addInventoryLog(item.product.id, item.product.name, before, before + item.quantity, "cart.clear");
    }
    syncProducts(prods);
    syncCart([]);
  }, [syncProducts, syncCart, addInventoryLog]);

  const restoreStockForItems = useCallback((items: CartItem[], reason: string) => {
    let prods = productsRef.current;
    for (const item of items) {
      const prod = prods.find(p => p.id === item.product.id);
      const before = prod?.stock ?? 0;
      prods = prods.map(p =>
        p.id === item.product.id ? { ...p, stock: p.stock + item.quantity } : p
      );
      addInventoryLog(item.product.id, item.product.name, before, before + item.quantity, reason);
    }
    syncProducts(prods);
  }, [syncProducts, addInventoryLog]);

  const startRewardCooldown = useCallback(() => {
    setRewardCooldownActive(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setRewardCooldownActive(false);
      cooldownTimerRef.current = null;
    }, REWARD_COOLDOWN_MS);
  }, []);

  const checkout = useCallback(async (): Promise<Order | null> => {
    if (lockRef.current) return null;

    const snapshotCart = [...cartRef.current];
    if (snapshotCart.length === 0) return null;

    lockRef.current = true;
    setProcessingLock(true);
    setPaymentError(null);

    const total = snapshotCart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);

    const now = Date.now();
    const cooldownActive = (now - lastRewardTimeRef.current) < REWARD_COOLDOWN_MS;
    let rewardApplied = false;

    if (total >= REWARD_THRESHOLD) {
      if (cooldownActive) {
        const remaining = Math.ceil((REWARD_COOLDOWN_MS - (now - lastRewardTimeRef.current)) / 1000);
        setRewardBlocked(`Reward cooldown active — ${remaining}s remaining. One reward per 5 minutes.`);
      } else {
        rewardApplied = true;
      }
    }

    const finalTotal = rewardApplied ? Math.round(total * 0.9 * 100) / 100 : total;

    if (rewardApplied) {
      lastRewardTimeRef.current = Date.now();
      startRewardCooldown();
    }

    const order: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items: snapshotCart.map(c => ({ ...c })),
      total: finalTotal,
      status: "pending",
      createdAt: new Date().toISOString(),
      rewardApplied,
      stockDeducted: true,
    };

    syncOrders([order, ...ordersRef.current]);
    syncCart([]);

    order.status = "processing";
    syncOrders(ordersRef.current.map(o => o.id === order.id ? { ...o, status: "processing" } : o));

    const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const storedUser = getStoredUser();

    try {
      const res = await fetchWithRetry("/api/orders/basket", {
        method: "POST",
        body: JSON.stringify({
          items: snapshotCart.map(c => ({
            productId: c.product.id,
            name:      c.product.name,
            category:  c.product.category,
            quantity:  c.quantity,
            unitPrice: c.product.price,
          })),
          venueId:        storedUser?.venueId ?? undefined,
          idempotencyKey,
          orderType:      "table",
          rewardApplied,
          totalCents:     Math.round(finalTotal * 100),
        }),
      });

      if (res.ok) {
        const serverOrder = await res.json() as { id?: string };
        const serverId = serverOrder.id ?? order.id;
        order.status = "paid";
        syncOrders(ordersRef.current.map(o =>
          o.id === order.id ? { ...o, id: serverId, status: "paid" } : o
        ));
        if (rewardApplied) {
          setRewardMessage(`You unlocked a reward! 10% off applied — saved $${(total - finalTotal).toFixed(2)}`);
        }
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const errMsg = body.error ?? "Payment failed";
        order.status = "failed";
        order.failureReason = errMsg;
        syncOrders(ordersRef.current.map(o =>
          o.id === order.id ? { ...o, status: "failed", failureReason: errMsg, stockDeducted: false } : o
        ));
        restoreStockForItems(snapshotCart, "payment.failed");
        setPaymentError(errMsg);
      }
    } catch {
      const errMsg = "Network error — please try again";
      order.status = "failed";
      order.failureReason = errMsg;
      syncOrders(ordersRef.current.map(o =>
        o.id === order.id ? { ...o, status: "failed", failureReason: errMsg, stockDeducted: false } : o
      ));
      restoreStockForItems(snapshotCart, "payment.failed");
      setPaymentError(errMsg);
    }

    lockRef.current = false;
    setProcessingLock(false);
    return order;
  }, [restoreStockForItems, syncOrders, syncCart, startRewardCooldown]);

  const retryCheckout = useCallback(async (orderId: string): Promise<Order | null> => {
    if (lockRef.current) return null;

    const failedOrder = ordersRef.current.find(o => o.id === orderId && o.status === "failed");
    if (!failedOrder) return null;

    const needsStockDeduction = !failedOrder.stockDeducted;

    lockRef.current = true;
    setProcessingLock(true);
    setPaymentError(null);

    if (needsStockDeduction) {
      for (const item of failedOrder.items) {
        const prod = productsRef.current.find(p => p.id === item.product.id);
        if (!prod || prod.stock < item.quantity) {
          lockRef.current = false;
          setProcessingLock(false);
          setPaymentError("Insufficient stock — some items are no longer available");
          return null;
        }
      }

      let prods = productsRef.current;
      for (const item of failedOrder.items) {
        const prod = prods.find(p => p.id === item.product.id);
        const before = prod?.stock ?? 0;
        prods = prods.map(p =>
          p.id === item.product.id ? { ...p, stock: p.stock - item.quantity } : p
        );
        addInventoryLog(item.product.id, item.product.name, before, before - item.quantity, "checkout.retry");
      }
      syncProducts(prods);
    }

    syncOrders(ordersRef.current.map(o =>
      o.id === orderId ? { ...o, status: "pending" as PaymentStatus, failureReason: undefined, stockDeducted: true } : o
    ));

    syncOrders(ordersRef.current.map(o =>
      o.id === orderId ? { ...o, status: "processing" as PaymentStatus } : o
    ));

    const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const storedUser = getStoredUser();
    const returnOrder: Order = { ...failedOrder, failureReason: undefined };

    try {
      const res = await fetchWithRetry("/api/orders/basket", {
        method: "POST",
        body: JSON.stringify({
          items: failedOrder.items.map(c => ({
            productId: c.product.id,
            name:      c.product.name,
            category:  c.product.category,
            quantity:  c.quantity,
            unitPrice: c.product.price,
          })),
          venueId:        storedUser?.venueId ?? undefined,
          idempotencyKey,
          orderType:      "table",
          rewardApplied:  failedOrder.rewardApplied,
          totalCents:     Math.round(failedOrder.total * 100),
        }),
      });

      if (res.ok) {
        const serverOrder = await res.json() as { id?: string };
        const serverId = serverOrder.id ?? orderId;
        returnOrder.status = "paid";
        syncOrders(ordersRef.current.map(o =>
          o.id === orderId ? { ...o, id: serverId, status: "paid" as PaymentStatus } : o
        ));
        if (failedOrder.rewardApplied) {
          const rawTotal = failedOrder.items.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
          setRewardMessage(`You unlocked a reward! 10% off applied — saved $${(rawTotal - failedOrder.total).toFixed(2)}`);
        }
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const errMsg = body.error ?? "Payment failed";
        returnOrder.status = "failed";
        returnOrder.failureReason = errMsg;
        syncOrders(ordersRef.current.map(o =>
          o.id === orderId ? { ...o, status: "failed" as PaymentStatus, failureReason: errMsg, stockDeducted: false } : o
        ));
        restoreStockForItems(failedOrder.items, "retry.failed");
        setPaymentError(errMsg);
      }
    } catch {
      const errMsg = "Network error — please try again";
      returnOrder.status = "failed";
      returnOrder.failureReason = errMsg;
      syncOrders(ordersRef.current.map(o =>
        o.id === orderId ? { ...o, status: "failed" as PaymentStatus, failureReason: errMsg, stockDeducted: false } : o
      ));
      restoreStockForItems(failedOrder.items, "retry.failed");
      setPaymentError(errMsg);
    }

    lockRef.current = false;
    setProcessingLock(false);
    return returnOrder;
  }, [restoreStockForItems, syncProducts, syncOrders, addInventoryLog]);

  const refundOrder = useCallback((orderId: string): boolean => {
    const role = userRef.current?.role?.toLowerCase();
    if (role !== "owner" && role !== "manager") return false;
    const order = ordersRef.current.find(o => o.id === orderId && o.status === "paid");
    if (!order) return false;
    restoreStockForItems(order.items, "order.refunded");
    syncOrders(ordersRef.current.map(o => o.id === orderId ? { ...o, status: "refunded" as PaymentStatus } : o));
    return true;
  }, [restoreStockForItems, syncOrders]);

  const applyStockDelta = useCallback((productId: string, delta: number, reason: string) => {
    const prod = productsRef.current.find(p => p.id === productId);
    if (!prod) return;
    const before = prod.stock;
    const after = Math.max(0, before + delta);
    syncProducts(productsRef.current.map(p =>
      p.id === productId ? { ...p, stock: after } : p
    ));
    addInventoryLog(productId, prod.name, before, after, reason);
  }, [syncProducts, addInventoryLog]);

  const manualStockAdjust = useCallback((productId: string, delta: number, reason: string): { needsConfirmation: boolean; error?: string } => {
    const prod = productsRef.current.find(p => p.id === productId);
    if (!prod) return { needsConfirmation: false, error: "Product not found" };

    if (Math.abs(delta) > LARGE_ADJUSTMENT_THRESHOLD) {
      const role = userRef.current?.role?.toLowerCase();
      if (role !== "owner" && role !== "manager") {
        return { needsConfirmation: true };
      }
    }

    applyStockDelta(productId, delta, reason || "manual.adjustment");
    return { needsConfirmation: false };
  }, [applyStockDelta]);

  const confirmLargeAdjustment = useCallback((productId: string, delta: number, reason: string): boolean => {
    const role = userRef.current?.role?.toLowerCase();
    if (role !== "owner" && role !== "manager") return false;
    applyStockDelta(productId, delta, reason || "manual.adjustment.confirmed");
    return true;
  }, [applyStockDelta]);

  // Load real products from /api/products on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetchWithRetry("/api/products");
        if (!res.ok) return;
        const data = await res.json() as Array<Record<string, unknown>>;
        if (!Array.isArray(data) || data.length === 0) return;

        const mapped: Product[] = data
          .map(p => ({
            id:       String(p.id ?? ""),
            name:     String(p.name ?? ""),
            category: mapCategory(String(p.category ?? "")),
            price:    typeof p.price === "number" ? p.price : tierPrice(p.tier as string | undefined),
            image:    String(p.imageUrl ?? p.image ?? ""),
            stock:    typeof p.quantity === "number" ? p.quantity as number :
                      typeof p.stock    === "number" ? p.stock    as number : 20,
          }))
          .filter(p => p.id && p.name);

        if (mapped.length > 0) syncProducts(mapped);
      } catch {
        // Keep empty state — no mock fallback
      }
    }
    void loadProducts();
  }, [syncProducts]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const dismissReward = useCallback(() => setRewardMessage(null), []);
  const dismissRewardBlocked = useCallback(() => setRewardBlocked(null), []);
  const clearPaymentError = useCallback(() => setPaymentError(null), []);

  return (
    <PosContext.Provider value={{
      products, cart, orders, inventoryLog, currentUser,
      rewardMessage, rewardBlocked, rewardCooldownActive, processingLock, paymentError,
      setCurrentUser: syncUser,
      addToCart, removeFromCart, updateQuantity,
      clearCart, checkout, retryCheckout, refundOrder,
      manualStockAdjust, confirmLargeAdjustment,
      dismissReward, dismissRewardBlocked, clearPaymentError,
    }}>
      {children}
    </PosContext.Provider>
  );
}
