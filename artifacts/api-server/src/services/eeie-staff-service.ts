/**
 * EEIE Staff Service
 * In-memory state for staff cockpit sessions, product catalog (with real images),
 * and media library assets. No DB required — all state is runtime.
 */

const nowIso = () => new Date().toISOString();

// ── Image catalog (Unsplash) ──────────────────────────────────

export const PRODUCT_IMAGES = {
  padron1964:    "https://images.unsplash.com/photo-1603575448878-868a20723f5d?auto=format&fit=crop&w=600&q=80",
  arturoFuente:  "https://images.unsplash.com/photo-1565608087341-404b25492fee?auto=format&fit=crop&w=600&q=80",
  myFather:      "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=600&q=80",
  padron1926:    "https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&w=600&q=80",
  woodford:      "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=600&q=80",
  balvenie:      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80",
  hennessy:      "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=600&q=80",
  macallan:      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80",
  sliders:       "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=600&q=80",
  charcuterie:   "https://images.unsplash.com/photo-1546039907-7fa05f864c02?auto=format&fit=crop&w=600&q=80",
  cremeBrulee:   "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=600&q=80",
  cheeseFlight:  "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80",
  whiskeyglass:  "https://images.unsplash.com/photo-1585494156145-1c60a4fe952b?auto=format&fit=crop&w=600&q=80",
  luxuryBar:     "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=600&q=80",
  loungeVibes:   "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80",
};

// ── Product catalog ───────────────────────────────────────────

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Product {
  id: string; name: string; brand: string; category: string;
  price: number; matchScore: number; stock: StockStatus;
  flavorTags: string[]; pairingTags: string[];
  isAIRec: boolean; isManagerPick: boolean;
  image: string; imageColor: string;
  description: string; strength: string;
}

let products: Product[] = [
  {
    id: "p1", name: "Padron 1964 Exclusivo", brand: "Padron",
    category: "Cigar", price: 42, matchScore: 92, stock: "low_stock",
    flavorTags: ["Creamy","Nutty","Cocoa"], pairingTags: ["Bourbon","Aged Scotch"],
    isAIRec: true, isManagerPick: false,
    image: PRODUCT_IMAGES.padron1964, imageColor: "#7C3AED",
    description: "Sun-grown maduro wrapper with deep espresso and dark chocolate notes.",
    strength: "medium-full",
  },
  {
    id: "p2", name: "Woodford Reserve Double Oaked", brand: "Woodford",
    category: "Bourbon", price: 22, matchScore: 95, stock: "in_stock",
    flavorTags: ["Vanilla","Oak","Caramel"], pairingTags: ["Full Cigar","Dessert"],
    isAIRec: true, isManagerPick: true,
    image: PRODUCT_IMAGES.woodford, imageColor: "#D97706",
    description: "Twice-barreled for a richer oak and vanilla character. Silky finish.",
    strength: "medium",
  },
  {
    id: "p3", name: "Arturo Fuente Opus X", brand: "Arturo Fuente",
    category: "Cigar", price: 45, matchScore: 88, stock: "in_stock",
    flavorTags: ["Spicy","Leather","Pepper"], pairingTags: ["Cognac","Dark Rum"],
    isAIRec: false, isManagerPick: true,
    image: PRODUCT_IMAGES.arturoFuente, imageColor: "#059669",
    description: "Dominican puro in a rare Rosado wrapper. Bold, complex, legendary.",
    strength: "full",
  },
  {
    id: "p4", name: "Hennessy VSOP", brand: "Hennessy",
    category: "Cognac", price: 26, matchScore: 84, stock: "in_stock",
    flavorTags: ["Dark Fruit","Spice","Oak"], pairingTags: ["Bold Cigar","Chocolate"],
    isAIRec: false, isManagerPick: false,
    image: PRODUCT_IMAGES.hennessy, imageColor: "#B45309",
    description: "Classic VSOP with layers of dark fruit and warm oak spice.",
    strength: "medium",
  },
  {
    id: "p5", name: "My Father Le Bijou 1922", brand: "My Father",
    category: "Cigar", price: 38, matchScore: 96, stock: "in_stock",
    flavorTags: ["Sweet","Floral","Vanilla"], pairingTags: ["Single Malt","Port"],
    isAIRec: true, isManagerPick: true,
    image: PRODUCT_IMAGES.myFather, imageColor: "#0891B2",
    description: "Stunning floral and sweet notes with a long buttery finish.",
    strength: "medium",
  },
  {
    id: "p6", name: "Balvenie DoubleWood 17", brand: "Balvenie",
    category: "Scotch", price: 34, matchScore: 91, stock: "low_stock",
    flavorTags: ["Honey","Toast","Dried Fruit"], pairingTags: ["Light Cigar","Cheese"],
    isAIRec: true, isManagerPick: false,
    image: PRODUCT_IMAGES.balvenie, imageColor: "#7C3AED",
    description: "Aged in traditional oak then European sherry wood. Honeyed and complex.",
    strength: "medium",
  },
  {
    id: "p7", name: "Smoked Short Rib Sliders", brand: "Kitchen",
    category: "Food", price: 18, matchScore: 87, stock: "in_stock",
    flavorTags: ["Smoky","Savory","Oak"], pairingTags: ["Full Cigar","Bold Bourbon"],
    isAIRec: true, isManagerPick: false,
    image: PRODUCT_IMAGES.sliders, imageColor: "#DC2626",
    description: "Slow-smoked short rib, brioche bun, pickled jalapeño aioli.",
    strength: "medium",
  },
  {
    id: "p8", name: "Truffle Charcuterie Board", brand: "Kitchen",
    category: "Food", price: 28, matchScore: 83, stock: "in_stock",
    flavorTags: ["Earthy","Umami","Rich"], pairingTags: ["Any Cigar","Scotch"],
    isAIRec: false, isManagerPick: true,
    image: PRODUCT_IMAGES.charcuterie, imageColor: "#065F46",
    description: "Prosciutto, aged manchego, truffle honey, cured meats, artisan crackers.",
    strength: "medium",
  },
  {
    id: "p9", name: "Vanilla Crème Brûlée", brand: "Kitchen",
    category: "Dessert", price: 14, matchScore: 82, stock: "in_stock",
    flavorTags: ["Sweet","Vanilla","Caramel"], pairingTags: ["Light Cigar","Single Malt"],
    isAIRec: false, isManagerPick: false,
    image: PRODUCT_IMAGES.cremeBrulee, imageColor: "#F59E0B",
    description: "Classic French crème brûlée, house-made Madagascar vanilla.",
    strength: "light",
  },
  {
    id: "p10", name: "Aged Cheese Flight", brand: "Kitchen",
    category: "Dessert", price: 22, matchScore: 78, stock: "in_stock",
    flavorTags: ["Creamy","Nutty","Savory"], pairingTags: ["Any Cigar","Scotch"],
    isAIRec: false, isManagerPick: false,
    image: PRODUCT_IMAGES.cheeseFlight, imageColor: "#A16207",
    description: "Selection of three aged cheeses with honeycomb, walnuts, and fig jam.",
    strength: "light",
  },
  {
    id: "p11", name: "Macallan 18 Sherry Oak", brand: "Macallan",
    category: "Scotch", price: 48, matchScore: 93, stock: "low_stock",
    flavorTags: ["Sherry","Dried Fruit","Ginger"], pairingTags: ["Premium Cigar","Dark Chocolate"],
    isAIRec: true, isManagerPick: true,
    image: PRODUCT_IMAGES.macallan, imageColor: "#92400E",
    description: "The benchmark single malt, aged in sherry-seasoned oak casks from Jerez.",
    strength: "full",
  },
  {
    id: "p12", name: "Padron 1926 Series No. 6", brand: "Padron",
    category: "Cigar", price: 52, matchScore: 98, stock: "in_stock",
    flavorTags: ["Cocoa","Leather","Earth"], pairingTags: ["Aged Bourbon","Cognac"],
    isAIRec: true, isManagerPick: true,
    image: PRODUCT_IMAGES.padron1926, imageColor: "#78350F",
    description: "The crown jewel of the Padron line. 80-year-old legacy in every draw.",
    strength: "full",
  },
];

// ── Staff sessions ────────────────────────────────────────────

export interface CartItem {
  productId: string; name: string; category: string; price: number; qty: number;
}

export interface StaffSession {
  id: string; table: string; guestName: string; initials: string;
  loyaltyTier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Obsidian";
  returning: boolean; status: "active" | "paused" | "attention" | "closing";
  startedAt: string; moodTag: string; xp: number; strength: string;
  aiMatchScore: number; flavors: string[];
  favCigarId: string; favLiquorId: string;
  cart: CartItem[]; notes: string[];
}

let sessions: StaffSession[] = [
  {
    id: "s1", table: "Table 1", guestName: "Marcus R.", initials: "MR",
    loyaltyTier: "Gold", returning: true, status: "active",
    startedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    moodTag: "Premium", xp: 4200, strength: "medium-full", aiMatchScore: 92,
    flavors: ["Creamy", "Nutty", "Cocoa", "Woody"],
    favCigarId: "p1", favLiquorId: "p2",
    cart: [], notes: [],
  },
  {
    id: "s2", table: "Table 4", guestName: "Elena V.", initials: "EV",
    loyaltyTier: "Platinum", returning: true, status: "attention",
    startedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    moodTag: "VIP Active", xp: 8900, strength: "full", aiMatchScore: 96,
    flavors: ["Spicy", "Leather", "Pepper", "Earthy"],
    favCigarId: "p3", favLiquorId: "p4",
    cart: [{ productId: "p3", name: "Arturo Fuente Opus X", category: "Cigar", price: 45, qty: 1 }],
    notes: ["Requested no ice in drinks"],
  },
  {
    id: "s3", table: "Table 7", guestName: "Sophia L.", initials: "SL",
    loyaltyTier: "Silver", returning: false, status: "paused",
    startedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    moodTag: "Calm", xp: 1100, strength: "medium", aiMatchScore: 88,
    flavors: ["Sweet", "Floral", "Vanilla"],
    favCigarId: "p5", favLiquorId: "p6",
    cart: [], notes: [],
  },
  {
    id: "s4", table: "Bar", guestName: "James O.", initials: "JO",
    loyaltyTier: "Bronze", returning: false, status: "active",
    startedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    moodTag: "Social", xp: 320, strength: "light", aiMatchScore: 81,
    flavors: ["Sweet", "Nutty", "Citrus"],
    favCigarId: "p5", favLiquorId: "p9",
    cart: [], notes: [],
  },
];

let staffLogs: { id: string; action: string; table: string; detail: string; createdAt: string }[] = [];

function addStaffLog(action: string, table: string, detail: string) {
  staffLogs = [{
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    action, table, detail, createdAt: nowIso(),
  }, ...staffLogs].slice(0, 50);
}

export function getSessions() {
  const sessionProducts = sessions.map(s => {
    const cigar  = products.find(p => p.id === s.favCigarId)!;
    const liquor = products.find(p => p.id === s.favLiquorId)!;
    return { ...s, cigar, liquor };
  });
  return { ok: true, mode: "local", modeLabel: "Local Mode", isLive: false, sessions: sessionProducts };
}

export function addItemToCart(sessionId: string, productId: string) {
  const session = sessions.find(s => s.id === sessionId);
  const product = products.find(p => p.id === productId);
  if (!session || !product) return { ok: false, error: "Session or product not found" };
  const existing = session.cart.find(c => c.productId === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    session.cart.push({ productId, name: product.name, category: product.category, price: product.price, qty: 1 });
  }
  addStaffLog("cart_add", session.table, `${product.name} added to cart`);
  return { ok: true, session };
}

export function removeFromCart(sessionId: string, productId: string) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  session.cart = session.cart.filter(c => c.productId !== productId);
  addStaffLog("cart_remove", session.table, `${productId} removed from cart`);
  return { ok: true, session };
}

export function sendToPOS(sessionId: string) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  if (session.cart.length === 0) return { ok: false, error: "Cart is empty" };
  const items = [...session.cart];
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  session.cart = [];
  addStaffLog("send_to_pos", session.table, `${items.length} items ($${total}) sent to POS`);
  return { ok: true, session, items, total, message: `${items.length} item(s) sent to Commerce Infrastructure` };
}

export function toggleSessionPause(sessionId: string) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  session.status = session.status === "paused" ? "active" : "paused";
  addStaffLog("session_toggle", session.table, `Session ${session.status}`);
  return { ok: true, session };
}

export function addNote(sessionId: string, note: string) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  session.notes = [note, ...session.notes].slice(0, 10);
  addStaffLog("note_added", session.table, `Note: ${note}`);
  return { ok: true, session };
}

export function getStaffLogs() {
  return { ok: true, mode: "local", modeLabel: "Local Mode", isLive: false, logs: staffLogs };
}

// ── Products ──────────────────────────────────────────────────

export function getProducts() {
  return { ok: true, mode: "local", modeLabel: "Local Mode", isLive: false, products };
}

export function updateProductStock(productId: string, stock: StockStatus) {
  const product = products.find(p => p.id === productId);
  if (!product) return { ok: false, error: "Product not found" };
  product.stock = stock;
  addStaffLog("stock_update", "Manager", `${product.name} stock → ${stock}`);
  return { ok: true, product };
}

// ── Media Library ─────────────────────────────────────────────

export type MediaStatus = "approved" | "pending" | "rejected";
export type MediaSource = "upload" | "external_url" | "cloudinary";

export interface MediaAsset {
  id: string; title: string; category: string;
  status: MediaStatus; source: MediaSource;
  imageUrl: string; availability: string;
  addedAt: string; addedBy: string; notes: string;
}

let mediaAssets: MediaAsset[] = [
  {
    id: "m1", title: "Padron 1964 Exclusivo", category: "Cigars",
    status: "approved", source: "upload",
    imageUrl: PRODUCT_IMAGES.padron1964,
    availability: "low_stock", addedAt: nowIso(), addedBy: "Manager",
    notes: "Primary product image, approved for all surfaces.",
  },
  {
    id: "m2", title: "Woodford Reserve Double Oaked", category: "Bourbon",
    status: "approved", source: "upload",
    imageUrl: PRODUCT_IMAGES.woodford,
    availability: "in_stock", addedAt: nowIso(), addedBy: "Manager",
    notes: "High-res bottle shot. Approved.",
  },
  {
    id: "m3", title: "Hennessy VSOP", category: "Cognac",
    status: "pending", source: "external_url",
    imageUrl: PRODUCT_IMAGES.hennessy,
    availability: "in_stock", addedAt: nowIso(), addedBy: "Staff",
    notes: "Sourced from distributor portal. Awaiting brand approval.",
  },
  {
    id: "m4", title: "Truffle Charcuterie Board", category: "Food",
    status: "pending", source: "upload",
    imageUrl: PRODUCT_IMAGES.charcuterie,
    availability: "in_stock", addedAt: nowIso(), addedBy: "Chef",
    notes: "Shot in-house last Tuesday. Awaiting manager review.",
  },
  {
    id: "m5", title: "Balvenie DoubleWood 17", category: "Scotch",
    status: "rejected", source: "external_url",
    imageUrl: PRODUCT_IMAGES.balvenie,
    availability: "low_stock", addedAt: nowIso(), addedBy: "Staff",
    notes: "Image too low resolution for Product Wall. Needs replacement.",
  },
  {
    id: "m6", title: "Smoked Short Rib Sliders", category: "Food",
    status: "approved", source: "upload",
    imageUrl: PRODUCT_IMAGES.sliders,
    availability: "in_stock", addedAt: nowIso(), addedBy: "Manager",
    notes: "Styled dish shot. Approved for all food pairings.",
  },
  {
    id: "m7", title: "Vanilla Crème Brûlée", category: "Dessert",
    status: "approved", source: "upload",
    imageUrl: PRODUCT_IMAGES.cremeBrulee,
    availability: "in_stock", addedAt: nowIso(), addedBy: "Manager",
    notes: "High-key dessert shot. Approved.",
  },
  {
    id: "m8", title: "Arturo Fuente Opus X", category: "Cigars",
    status: "pending", source: "upload",
    imageUrl: PRODUCT_IMAGES.arturoFuente,
    availability: "in_stock", addedAt: nowIso(), addedBy: "Staff",
    notes: "New image from brand. Awaiting approval.",
  },
];

let mediaLogs: { id: string; action: string; assetId: string; title: string; detail: string; createdAt: string }[] = [];

function addMediaLog(action: string, assetId: string, title: string, detail: string) {
  mediaLogs = [{
    id: `mlog_${Date.now()}`,
    action, assetId, title, detail, createdAt: nowIso(),
  }, ...mediaLogs].slice(0, 50);
}

export function getMediaAssets(category?: string, status?: string) {
  let assets = mediaAssets;
  if (category && category !== "all") assets = assets.filter(a => a.category === category);
  if (status && status !== "all") assets = assets.filter(a => a.status === status);
  return { ok: true, mode: "local", modeLabel: "Local Mode", isLive: false, assets };
}

export function approveMediaAsset(id: string) {
  const asset = mediaAssets.find(a => a.id === id);
  if (!asset) return { ok: false, error: "Asset not found" };
  asset.status = "approved";
  addMediaLog("approved", id, asset.title, `${asset.title} approved and visible to staff & guests.`);
  return { ok: true, asset };
}

export function rejectMediaAsset(id: string, reason?: string) {
  const asset = mediaAssets.find(a => a.id === id);
  if (!asset) return { ok: false, error: "Asset not found" };
  asset.status = "rejected";
  asset.notes = reason ?? "Rejected by manager.";
  addMediaLog("rejected", id, asset.title, `${asset.title} rejected. ${asset.notes}`);
  return { ok: true, asset };
}

export function addMediaAssetFromUrl(url: string, title: string, category: string) {
  const asset: MediaAsset = {
    id: `m${Date.now()}`, title, category,
    status: "pending", source: "external_url",
    imageUrl: url, availability: "in_stock",
    addedAt: nowIso(), addedBy: "Staff",
    notes: "Linked from external URL. Awaiting review.",
  };
  mediaAssets = [asset, ...mediaAssets];
  addMediaLog("url_linked", asset.id, title, `External URL linked: ${title}`);
  return { ok: true, asset };
}

export function simulateMediaUpload(title: string, category: string) {
  const fallbackImages = [
    PRODUCT_IMAGES.whiskeyglass,
    PRODUCT_IMAGES.cheeseFlight,
    PRODUCT_IMAGES.cremeBrulee,
  ];
  const asset: MediaAsset = {
    id: `m${Date.now()}`, title: title || "Untitled Upload",
    category: category || "Uncategorized",
    status: "pending", source: "upload",
    imageUrl: fallbackImages[Math.floor(Math.random() * fallbackImages.length)],
    availability: "in_stock", addedAt: nowIso(), addedBy: "Staff",
    notes: "Uploaded by staff. Awaiting review.",
  };
  mediaAssets = [asset, ...mediaAssets];
  addMediaLog("upload", asset.id, asset.title, `Image uploaded: ${asset.title}`);
  return { ok: true, asset };
}

export function getMediaLogs() {
  return { ok: true, mode: "local", modeLabel: "Local Mode", isLive: false, logs: mediaLogs };
}
