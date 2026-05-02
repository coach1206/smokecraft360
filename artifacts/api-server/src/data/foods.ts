import { FoodItem } from "../engine/types";

export const foods: FoodItem[] = [
  /* ── Wings ──────────────────────────────────────────────── */
  {
    id: "wings-honey",
    name: "Honey-Glazed Wings",
    category: "wings",
    description: "Lacquered with wildflower honey and a touch of smoked sea salt, finished over a hickory flame.",
    flavorTags: ["sweet", "caramelized", "savory", "smoky"],
    strengthMin: 1, strengthMax: 3,
  },
  {
    id: "wings-bbq",
    name: "Smoked BBQ Wings",
    category: "wings",
    description: "Slow-smoked over applewood with a deep molasses and bourbon glaze.",
    flavorTags: ["smoky", "earthy", "sweet", "bold"],
    strengthMin: 3, strengthMax: 5,
  },
  {
    id: "wings-truffle",
    name: "Truffle & Parmesan Wings",
    category: "wings",
    description: "Roasted wings finished with black truffle oil and aged Parmigiano-Reggiano shavings.",
    flavorTags: ["earthy", "creamy", "nutty", "savory"],
    strengthMin: 2, strengthMax: 4,
  },

  /* ── Steak ───────────────────────────────────────────────── */
  {
    id: "steak-wagyu",
    name: "Wagyu Striploin",
    category: "steak",
    description: "A5 Japanese wagyu dry-aged 45 days, finished with Maldon sea salt and cedar smoke.",
    flavorTags: ["rich", "cedar", "savory", "sweet"],
    strengthMin: 3, strengthMax: 5,
  },
  {
    id: "steak-filet",
    name: "Pepper-Crusted Filet",
    category: "steak",
    description: "Filet mignon coated in cracked black pepper, pan-seared and basted in cognac butter.",
    flavorTags: ["spicy", "savory", "leather", "bold"],
    strengthMin: 4, strengthMax: 5,
  },
  {
    id: "steak-ribeye",
    name: "Herb-Butter Ribeye",
    category: "steak",
    description: "Bone-in cowboy ribeye basted with rosemary, thyme and brown butter compound.",
    flavorTags: ["savory", "earthy", "rich", "nutty"],
    strengthMin: 3, strengthMax: 4,
  },

  /* ── Salad ───────────────────────────────────────────────── */
  {
    id: "salad-arugula",
    name: "Arugula & Bartlett Pear",
    category: "salad",
    description: "Peppery wild arugula with Bartlett pear, gorgonzola and candied walnut in honey-lemon vinaigrette.",
    flavorTags: ["floral", "sweet", "nutty", "spicy"],
    strengthMin: 1, strengthMax: 2,
  },
  {
    id: "salad-caprese",
    name: "Burrata Caprese",
    category: "salad",
    description: "Fresh burrata with heirloom tomatoes, micro-basil and 25-year aged balsamic.",
    flavorTags: ["creamy", "sweet", "floral", "light"],
    strengthMin: 1, strengthMax: 3,
  },
  {
    id: "salad-beet",
    name: "Beet & Walnut Salad",
    category: "salad",
    description: "Roasted golden and candy-striped beets with toasted walnuts and whipped chèvre.",
    flavorTags: ["earthy", "nutty", "sweet", "creamy"],
    strengthMin: 1, strengthMax: 3,
  },

  /* ── Appetizers ──────────────────────────────────────────── */
  {
    id: "app-charcuterie",
    name: "Artisan Charcuterie Board",
    category: "appetizers",
    description: "Reserve cured meats, cave-aged cheeses, smoked almonds, dried figs and artisan crackers.",
    flavorTags: ["smoky", "savory", "nutty", "cedar"],
    strengthMin: 2, strengthMax: 5,
  },
  {
    id: "app-foie",
    name: "Foie Gras Torchon",
    category: "appetizers",
    description: "Hudson Valley duck foie gras torchon with brioche toast and Sauternes gelée.",
    flavorTags: ["rich", "sweet", "creamy", "savory"],
    strengthMin: 2, strengthMax: 4,
  },
  {
    id: "app-oysters",
    name: "Oysters Rockefeller",
    category: "appetizers",
    description: "East-coast oysters baked with Pernod, spinach and Hollandaise, topped with caviar.",
    flavorTags: ["light", "creamy", "floral", "briny"],
    strengthMin: 1, strengthMax: 3,
  },

  /* ── Seafood ─────────────────────────────────────────────── */
  {
    id: "sea-lobster",
    name: "Butter-Poached Lobster",
    category: "seafood",
    description: "Cold-water lobster tail poached in saffron-scented beurre monté with micro herbs.",
    flavorTags: ["sweet", "creamy", "rich", "delicate"],
    strengthMin: 1, strengthMax: 3,
  },
  {
    id: "sea-salmon",
    name: "Cedar-Planked Salmon",
    category: "seafood",
    description: "Wild Pacific salmon slow-roasted on a cedar plank with citrus and dill.",
    flavorTags: ["smoky", "cedar", "rich", "floral"],
    strengthMin: 2, strengthMax: 4,
  },
  {
    id: "sea-branzino",
    name: "Grilled Branzino",
    category: "seafood",
    description: "Mediterranean sea bass charred over grapevine with preserved lemon and olive oil.",
    flavorTags: ["light", "floral", "smoky", "delicate"],
    strengthMin: 1, strengthMax: 3,
  },

  /* ── Desserts ────────────────────────────────────────────── */
  {
    id: "des-chocolate",
    name: "Dark Chocolate Fondant",
    category: "desserts",
    description: "Valrhona 72% dark chocolate with a warm molten center, fleur de sel and gold leaf.",
    flavorTags: ["cocoa", "sweet", "leather", "rich"],
    strengthMin: 3, strengthMax: 5,
  },
  {
    id: "des-brulee",
    name: "Crème Brûlée",
    category: "desserts",
    description: "Classic Madagascan vanilla bean custard with a paper-thin torched caramel crust.",
    flavorTags: ["sweet", "creamy", "caramelized", "vanilla"],
    strengthMin: 1, strengthMax: 3,
  },
  {
    id: "des-tiramisu",
    name: "Tiramisu Classico",
    category: "desserts",
    description: "Traditional tiramisu with espresso-soaked savoiardi, mascarpone and fine cocoa.",
    flavorTags: ["cocoa", "sweet", "creamy", "nutty"],
    strengthMin: 2, strengthMax: 4,
  },
  {
    id: "des-caramel",
    name: "Salted Caramel Tart",
    category: "desserts",
    description: "Breton shortcrust tart with liquid salted caramel, candied pecans and sea salt.",
    flavorTags: ["sweet", "caramelized", "nutty", "savory"],
    strengthMin: 1, strengthMax: 3,
  },
];
