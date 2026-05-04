import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: "pending" | "completed";
  createdAt: string;
  rewardApplied: boolean;
}

interface PosState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  currentUser: { name: string; role: string; pin: string } | null;
  rewardMessage: string | null;
  setCurrentUser: (u: { name: string; role: string; pin: string } | null) => void;
  addToCart: (productId: string) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  checkout: () => Order | null;
  dismissReward: () => void;
}

const REWARD_THRESHOLD = 50;

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

export function PosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    INITIAL_PRODUCTS.map(p => ({ ...p }))
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; pin: string } | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  const addToCart = useCallback((productId: string): boolean => {
    const prod = products.find(p => p.id === productId);
    if (!prod || prod.stock <= 0) return false;

    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, stock: p.stock - 1 } : p
    ));

    setCart(prev => {
      const existing = prev.find(c => c.product.id === productId);
      if (existing) {
        return prev.map(c =>
          c.product.id === productId
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
    return true;
  }, [products]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => {
      const item = prev.find(c => c.product.id === productId);
      if (!item) return prev;
      setProducts(pp => pp.map(p =>
        p.id === productId ? { ...p, stock: p.stock + item.quantity } : p
      ));
      return prev.filter(c => c.product.id !== productId);
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(c => c.product.id === productId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        setProducts(pp => pp.map(p =>
          p.id === productId ? { ...p, stock: p.stock + item.quantity } : p
        ));
        return prev.filter(c => c.product.id !== productId);
      }
      if (delta > 0) {
        const prod = products.find(p => p.id === productId);
        if (!prod || prod.stock <= 0) return prev;
        setProducts(pp => pp.map(p =>
          p.id === productId ? { ...p, stock: p.stock - 1 } : p
        ));
      } else {
        setProducts(pp => pp.map(p =>
          p.id === productId ? { ...p, stock: p.stock + 1 } : p
        ));
      }
      return prev.map(c =>
        c.product.id === productId ? { ...c, quantity: newQty } : c
      );
    });
  }, [products]);

  const clearCart = useCallback(() => {
    setCart(prev => {
      for (const item of prev) {
        setProducts(pp => pp.map(p =>
          p.id === item.product.id ? { ...p, stock: p.stock + item.quantity } : p
        ));
      }
      return [];
    });
  }, []);

  const checkout = useCallback((): Order | null => {
    let createdOrder: Order | null = null;
    setCart(currentCart => {
      if (currentCart.length === 0) return currentCart;
      const total = currentCart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
      const rewardApplied = total >= REWARD_THRESHOLD;
      const order: Order = {
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        items: [...currentCart],
        total: rewardApplied ? Math.round(total * 0.9 * 100) / 100 : total,
        status: "completed",
        createdAt: new Date().toISOString(),
        rewardApplied,
      };
      createdOrder = order;
      setOrders(prev => [order, ...prev]);
      if (rewardApplied) {
        setRewardMessage(`You unlocked a reward! 10% off applied — saved $${(total - order.total).toFixed(2)}`);
      }
      return [];
    });
    return createdOrder;
  }, []);

  const dismissReward = useCallback(() => setRewardMessage(null), []);

  return (
    <PosContext.Provider value={{
      products, cart, orders, currentUser,
      rewardMessage, setCurrentUser,
      addToCart, removeFromCart, updateQuantity,
      clearCart, checkout, dismissReward,
    }}>
      {children}
    </PosContext.Provider>
  );
}
