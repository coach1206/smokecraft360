import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

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
const PAYMENT_SIMULATE_MS = 1800;
const PAYMENT_FAILURE_RATE = 0.1;
const REWARD_COOLDOWN_MS = 5 * 60 * 1000;
const LARGE_ADJUSTMENT_THRESHOLD = 10;

const INITIAL_PRODUCTS: Product[] = [
  { id: "cig-1", name: "Arturo Fuente Opus X", category: "cigar", price: 42, image: "https://images.unsplash.com/photo-1589561253898-768105ca91a8?w=300&h=300&fit=crop&q=80", stock: 8 },
  { id: "cig-2", name: "Padron 1964 Anniversary", category: "cigar", price: 35, image: "https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=300&h=300&fit=crop&q=80", stock: 12 },
  { id: "cig-3", name: "Cohiba Behike 52", category: "cigar", price: 45, image: "https://images.unsplash.com/photo-1574279606130-09958dc756f7?w=300&h=300&fit=crop&q=80", stock: 5 },
  { id: "cig-4", name: "Liga Privada No. 9", category: "cigar", price: 28, image: "https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?w=300&h=300&fit=crop&q=80", stock: 15 },
  { id: "spr-1", name: "Macallan 18 Sherry Oak", category: "spirit", price: 28, image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop&q=80", stock: 10 },
  { id: "spr-2", name: "Hennessy XO Cognac", category: "spirit", price: 24, image: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&h=300&fit=crop&q=80", stock: 7 },
  { id: "spr-3", name: "Clase Azul Reposado", category: "spirit", price: 22, image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&h=300&fit=crop&q=80", stock: 9 },
  { id: "spr-4", name: "Woodford Reserve", category: "spirit", price: 16, image: "https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=300&h=300&fit=crop&q=80", stock: 18 },
  { id: "beer-1", name: "Guinness Draught", category: "beer", price: 9, image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop&q=80", stock: 24 },
  { id: "beer-2", name: "Sierra Nevada Pale Ale", category: "beer", price: 8, image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop&q=80", stock: 20 },
  { id: "beer-3", name: "Blue Moon Belgian White", category: "beer", price: 9, image: "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=300&h=300&fit=crop&q=80", stock: 16 },
  { id: "beer-4", name: "Lagunitas IPA", category: "beer", price: 10, image: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&h=300&fit=crop&q=80", stock: 14 },
  { id: "food-1", name: "Wagyu Beef Sliders", category: "food", price: 24, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=80", stock: 10 },
  { id: "food-2", name: "Truffle Fries", category: "food", price: 14, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=300&fit=crop&q=80", stock: 20 },
  { id: "food-3", name: "Charcuterie Board", category: "food", price: 22, image: "https://images.unsplash.com/photo-1541529086526-db283c563270?w=300&h=300&fit=crop&q=80", stock: 8 },
  { id: "food-4", name: "Smoked Salmon Crostini", category: "food", price: 18, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop&q=80", stock: 12 },
];

const PosContext = createContext<PosState | null>(null);

export function usePosContext(): PosState {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePosContext must be inside PosProvider");
  return ctx;
}

function simulatePayment(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (Math.random() < PAYMENT_FAILURE_RATE) {
        resolve({ success: false, error: "Payment declined — card issuer rejected the transaction" });
      } else {
        resolve({ success: true });
      }
    }, PAYMENT_SIMULATE_MS);
  });
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    INITIAL_PRODUCTS.map(p => ({ ...p }))
  );
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
  const productsRef = useRef<Product[]>(INITIAL_PRODUCTS);
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

    const result = await simulatePayment();

    if (result.success) {
      order.status = "paid";
      syncOrders(ordersRef.current.map(o => o.id === order.id ? { ...o, status: "paid" } : o));
      if (rewardApplied) {
        lastRewardTimeRef.current = Date.now();
        startRewardCooldown();
        setRewardMessage(`You unlocked a reward! 10% off applied — saved $${(total - finalTotal).toFixed(2)}`);
      }
    } else {
      order.status = "failed";
      order.failureReason = result.error;
      syncOrders(ordersRef.current.map(o =>
        o.id === order.id ? { ...o, status: "failed", failureReason: result.error, stockDeducted: false } : o
      ));
      restoreStockForItems(snapshotCart, "payment.failed");
      setPaymentError(result.error ?? "Payment failed");
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

    const result = await simulatePayment();
    const returnOrder: Order = { ...failedOrder, failureReason: undefined };

    if (result.success) {
      returnOrder.status = "paid";
      syncOrders(ordersRef.current.map(o => o.id === orderId ? { ...o, status: "paid" as PaymentStatus } : o));
      if (failedOrder.rewardApplied) {
        lastRewardTimeRef.current = Date.now();
        startRewardCooldown();
        const rawTotal = failedOrder.items.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
        setRewardMessage(`You unlocked a reward! 10% off applied — saved $${(rawTotal - failedOrder.total).toFixed(2)}`);
      }
    } else {
      returnOrder.status = "failed";
      returnOrder.failureReason = result.error;
      syncOrders(ordersRef.current.map(o =>
        o.id === orderId ? { ...o, status: "failed" as PaymentStatus, failureReason: result.error, stockDeducted: false } : o
      ));
      restoreStockForItems(failedOrder.items, "retry.failed");
      setPaymentError(result.error ?? "Payment failed");
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
