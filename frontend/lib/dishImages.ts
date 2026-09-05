// Picks an illustrated placeholder image for a dish based on its name/category.
// All placeholders are local SVGs under public/dishes/ so they work without internet.

type Rule = { keys: string[]; image: string };

const RULES: Rule[] = [
  // drinks
  { keys: ["chai", "tea"], image: "chai" },
  { keys: ["coffee", "espresso", "latte", "cappuccino", "cappucino", "mocha", "americano"], image: "coffee" },
  { keys: ["lassi", "chaas", "chaach", "buttermilk", "milkshake"], image: "lassi" },
  {
    keys: [
      "juice", "smoothie", "lemonade", "lemon", "mojito", "mocktail", "cocktail", "soda", "cola",
      "pepsi", "coke", "shake", "thandai", "beverage", "drink", "water", "cooler", "iced",
    ],
    image: "juice",
  },
  // soups & noodle bowls
  { keys: ["soup", "shorba", "broth", "consomme"], image: "soup" },
  { keys: ["ramen", "pho", "udon", "soba"], image: "ramen" },
  // asian
  { keys: ["sushi", "maki", "sashimi", "nigiri", "roll"], image: "sushi" },
  { keys: ["noodle", "chowmein", "chow mein", "hakka", "lo mein", "pad thai", "schezwan"], image: "noodles" },
  { keys: ["momos", "momo", "dumpling", "gyoza", "wonton"], image: "samosa" },
  // italian / western
  { keys: ["pasta", "spaghetti", "penne", "alfredo", "macaroni", "mac and cheese", "lasagna"], image: "pasta" },
  { keys: ["pizza", "margherita", "calzone", "bruschetta"], image: "pizza" },
  { keys: ["burger", "sliders", "sandwich", "patty"], image: "burger" },
  { keys: ["fries", "chips", "wedges", "hash brown", "nuggets"], image: "fries" },
  { keys: ["salad", "caesar", "coleslaw", "kachumber", "kosambari", "buddha"], image: "salad" },
  { keys: ["pancake", "waffle", "french toast", "croissant", "churros"], image: "dessert" },
  // indian mains
  { keys: ["biryani", "biriyani", "pulao", "pilaf", "fried rice", "rice"], image: "biryani" },
  {
    keys: [
      "curry", "masala", "korma", "kofta", "dal", "daal", "makhani", "chana", "chole", "chickpea",
      "saag", "palak", "vindaloo", "madras", "kadhai", "kadai", "butter chicken", "rogan",
    ],
    image: "curry",
  },
  { keys: ["tikka", "tandoori", "paneer", "malai", "grill"], image: "tikka" },
  { keys: ["kebab", "kabab", "seekh", "shami", "galouti", "tikki", "soya", "champ", "chaap"], image: "kebab" },
  { keys: ["dosa", "idli", "idly", "uttapam", "vada", "pongal", "poha", "upma"], image: "dosa" },
  {
    keys: ["naan", "roti", "paratha", "chapati", "kulcha", "bhature", "pita", "puri", "poori", "tortilla", "bread", "toast"],
    image: "naan",
  },
  { keys: ["samosa", "pakora", "pakoda", "fritter", "kachori", "cutlet", "spring roll"], image: "samosa" },
  { keys: ["chicken", "mutton", "lamb", "goat", "meat", "prawn", "shrimp", "fish", "steak", "bbq"], image: "curry" },
  // sweets
  {
    keys: [
      "cake", "dessert", "gulab", "rasgulla", "rasmalai", "ras malai", "halwa", "kheer", "brownie",
      "pastry", "jalebi", "laddu", "laddoo", "peda", "barfi", "pudding", "tiramisu", "cheesecake", "sweet",
    ],
    image: "dessert",
  },
  { keys: ["ice cream", "icecream", "ice-cream", "gelato", "sundae", "kulfi", "falooda"], image: "icecream" },
  // breakfast
  { keys: ["egg", "omelette", "omelet", "bhurji", "burji", "frittata"], image: "egg" },
];

const MATCHERS = RULES.map((rule) => ({
  image: rule.image,
  patterns: rule.keys.map((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")),
}));

/** Returns the best matching placeholder image path for a dish. */
export function dishPlaceholder(name?: string | null, category?: string | null): string {
  const haystack = [name, category].filter(Boolean).join(" ");
  if (haystack) {
    for (const matcher of MATCHERS) {
      if (matcher.patterns.some((p) => p.test(haystack))) return `/dishes/${matcher.image}.svg`;
    }
  }
  return "/dishes/default.svg";
}