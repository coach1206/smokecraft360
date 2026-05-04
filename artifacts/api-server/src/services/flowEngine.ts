export interface FlowStep {
  id: string;
  label: string;
  description: string;
}

export interface FlowDefinition {
  flowId: string;
  label: string;
  description: string;
  roles: string[];
  steps: FlowStep[];
  icon: string;
  category: string;
}

const FLOWS: FlowDefinition[] = [
  {
    flowId: "add_product",
    label: "Add Product",
    description: "Add a new product to your venue inventory",
    roles: ["super_admin", "venue_owner", "manager", "brand_partner"],
    icon: "product",
    category: "inventory",
    steps: [
      { id: "select_type", label: "Select Type", description: "Choose product category" },
      { id: "details", label: "Product Details", description: "Enter name, brand, and description" },
      { id: "pricing", label: "Pricing", description: "Set price and cost" },
      { id: "images", label: "Images", description: "Upload product photos" },
      { id: "review", label: "Review", description: "Confirm and submit" },
    ],
  },
  {
    flowId: "start_experience",
    label: "Start Experience",
    description: "Begin a guided customer experience session",
    roles: ["super_admin", "venue_owner", "manager", "staff", "customer"],
    icon: "experience",
    category: "customer",
    steps: [
      { id: "preferences", label: "Preferences", description: "Flavor, strength, and mood" },
      { id: "recommendations", label: "Recommendations", description: "AI-powered suggestions" },
      { id: "select", label: "Select", description: "Choose your experience" },
      { id: "order", label: "Order", description: "Confirm your selection" },
    ],
  },
  {
    flowId: "build_recommendation",
    label: "Build Recommendation",
    description: "Create a personalized recommendation for a guest",
    roles: ["super_admin", "venue_owner", "manager", "staff"],
    icon: "recommendation",
    category: "customer",
    steps: [
      { id: "guest_profile", label: "Guest Profile", description: "Capture guest preferences" },
      { id: "generate", label: "Generate", description: "AI builds recommendations" },
      { id: "present", label: "Present", description: "Show to guest" },
    ],
  },
  {
    flowId: "confirm_order",
    label: "Confirm Order",
    description: "Verify and complete a pending order",
    roles: ["super_admin", "venue_owner", "manager", "staff"],
    icon: "order",
    category: "operations",
    steps: [
      { id: "scan", label: "Scan / Select", description: "Scan QR or find order" },
      { id: "verify", label: "Verify", description: "Confirm order details" },
      { id: "complete", label: "Complete", description: "Mark as fulfilled" },
    ],
  },
  {
    flowId: "unlock_reward",
    label: "Unlock Reward",
    description: "Redeem a loyalty reward for a guest",
    roles: ["super_admin", "venue_owner", "manager", "staff", "customer"],
    icon: "reward",
    category: "loyalty",
    steps: [
      { id: "select_reward", label: "Select Reward", description: "Choose from available rewards" },
      { id: "confirm", label: "Confirm", description: "Apply the reward" },
      { id: "receipt", label: "Receipt", description: "Show confirmation" },
    ],
  },
  {
    flowId: "create_campaign",
    label: "Create Campaign",
    description: "Launch a new promotional campaign",
    roles: ["super_admin", "venue_owner", "manager", "brand_partner"],
    icon: "campaign",
    category: "marketing",
    steps: [
      { id: "type", label: "Campaign Type", description: "Select campaign style" },
      { id: "details", label: "Details", description: "Name, dates, and budget" },
      { id: "products", label: "Products", description: "Assign products" },
      { id: "review", label: "Review & Launch", description: "Confirm and activate" },
    ],
  },
  {
    flowId: "upload_vendor_product",
    label: "Upload Product",
    description: "Submit a new product for venue review",
    roles: ["brand_partner"],
    icon: "upload",
    category: "vendor",
    steps: [
      { id: "product_info", label: "Product Info", description: "Enter product details" },
      { id: "media", label: "Media", description: "Upload images and assets" },
      { id: "submit", label: "Submit", description: "Send for approval" },
    ],
  },
  {
    flowId: "approve_campaign",
    label: "Approve Campaign",
    description: "Review and approve a sponsored campaign",
    roles: ["super_admin", "venue_owner"],
    icon: "approve",
    category: "marketing",
    steps: [
      { id: "review", label: "Review", description: "Check campaign details" },
      { id: "decision", label: "Decision", description: "Approve or reject" },
    ],
  },
  {
    flowId: "check_orders",
    label: "Check Orders",
    description: "View and manage current orders",
    roles: ["super_admin", "venue_owner", "manager", "staff"],
    icon: "orders",
    category: "operations",
    steps: [
      { id: "list", label: "Order List", description: "View active orders" },
      { id: "detail", label: "Details", description: "View order specifics" },
    ],
  },
  {
    flowId: "check_inventory",
    label: "Check Inventory",
    description: "Review current stock levels",
    roles: ["super_admin", "venue_owner", "manager", "staff"],
    icon: "inventory",
    category: "operations",
    steps: [
      { id: "overview", label: "Overview", description: "Stock summary" },
      { id: "detail", label: "Item Detail", description: "Individual item levels" },
    ],
  },
  {
    flowId: "demo_experience",
    label: "Demo Experience",
    description: "Guided walkthrough of the platform",
    roles: ["super_admin"],
    icon: "demo",
    category: "demo",
    steps: [
      { id: "intro", label: "Introduction", description: "Platform overview" },
      { id: "smokecraft", label: "SmokeCraft", description: "Cigar experience" },
      { id: "pourcraft", label: "PourCraft", description: "Spirits experience" },
      { id: "brewcraft", label: "BrewCraft", description: "Beer experience" },
      { id: "vapecraft", label: "VapeCraft", description: "Vape experience" },
      { id: "summary", label: "Summary", description: "Investment highlights" },
    ],
  },
  {
    flowId: "nda_signature",
    label: "NDA Signature",
    description: "Sign confidentiality agreement",
    roles: ["super_admin"],
    icon: "nda",
    category: "demo",
    steps: [
      { id: "read", label: "Read Agreement", description: "Review NDA terms" },
      { id: "sign", label: "Sign", description: "Provide signature" },
      { id: "confirm", label: "Confirmed", description: "Access granted" },
    ],
  },
];

export function getFlowsForRole(role: string): FlowDefinition[] {
  return FLOWS.filter((f) => f.roles.includes(role) || f.roles.includes("*"));
}

export function getFlowById(flowId: string): FlowDefinition | undefined {
  return FLOWS.find((f) => f.flowId === flowId);
}

export function getAllFlows(): FlowDefinition[] {
  return FLOWS;
}
