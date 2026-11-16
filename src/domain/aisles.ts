/**
 * Store aisles for the shopping list. The order is the order you walk a shop, and
 * it is also the order the Shopping tab and the copied list show the groups.
 */
export const AISLES = [
  "Produce",
  "Meat & seafood",
  "Dairy & eggs",
  "Bakery",
  "Pantry & spices",
  "Frozen",
  "Drinks",
  "Other",
] as const;

export type Aisle = (typeof AISLES)[number];

interface AisleRule {
  aisle: Aisle;
  /** Whole words to match after normalisation; plurals are handled by the matcher. */
  words: string[];
}

/**
 * Keyword rules, checked in order. Earlier aisles win, so a rule that would
 * otherwise steal a name (e.g. "bread crumbs" landing in Bakery because of
 * "bread") is handled by OVERRIDES below.
 */
const RULES: AisleRule[] = [
  { aisle: "Frozen", words: ["ice", "frozen", "popsicle", "waffle", "hash", "patty"] },
  {
    aisle: "Produce",
    words: [
      "onion",
      "garlic",
      "shallot",
      "tomato",
      "cherry tomato",
      "lettuce",
      "romaine",
      "cucumber",
      "avocado",
      "lime",
      "lemon",
      "cilantro",
      "parsley",
      "dill",
      "basil",
      "mint",
      "jalapeno",
      "pepper",
      "asparagus",
      "carrot",
      "celery",
      "cabbage",
      "coleslaw",
      "slaw",
      "mushroom",
      "potato",
      "corn",
      "watermelon",
      "strawberries",
      "blueberries",
      "banana",
      "apple",
      "orange",
      "spinach",
      "kale",
      "zucchini",
      "broccoli",
      "ginger",
      "radish",
      "sprout",
      "herb",
    ],
  },
  {
    aisle: "Meat & seafood",
    words: [
      "beef",
      "chicken",
      "pork",
      "steak",
      "salmon",
      "shrimp",
      "sausage",
      "bratwurst",
      "bacon",
      "turkey",
      "lamb",
      "fish",
      "tuna",
      "cod",
      "prawn",
    ],
  },
  {
    aisle: "Dairy & eggs",
    words: ["egg", "milk", "butter", "cheese", "cheddar", "parmesan", "feta", "yogurt", "cream", "mozzarella", "ricotta"],
  },
  {
    aisle: "Bakery",
    words: ["bun", "bagel", "tortilla", "pita", "bread", "baguette", "roll", "croissant", "muffin"],
  },
  { aisle: "Drinks", words: ["tea", "coffee", "lemonade", "soda", "juice", "beer", "wine", "water", "seltzer", "cider", "kombucha"] },
  {
    aisle: "Pantry & spices",
    words: [
      "salt",
      "paprika",
      "cumin",
      "seasoning",
      "spice",
      "flour",
      "sugar",
      "oil",
      "vinegar",
      "ketchup",
      "mustard",
      "mayo",
      "relish",
      "salsa",
      "sauce",
      "honey",
      "syrup",
      "marshmallow",
      "chocolate",
      "brownie",
      "pancake",
      "cracker",
      "chip",
      "pasta",
      "macaroni",
      "rice",
      "bean",
      "chickpea",
      "caper",
      "pickle",
      "sauerkraut",
      "tahini",
      "vinaigrette",
      "crouton",
      "oat",
      "nut",
      "almond",
      "walnut",
      "stock",
      "broth",
      "vanilla",
      "cinnamon",
      "canned",
    ],
  },
];

/**
 * Names a keyword would mis-file. Keyed by the normalised name, so these win
 * before any rule runs. Kept short: only genuinely ambiguous packaged goods.
 */
const OVERRIDES: Record<string, Aisle> = {
  "bread crumbs": "Pantry & spices",
  "tortilla chips": "Pantry & spices",
  "graham crackers": "Pantry & spices",
  "hash browns": "Frozen",
  "veg burger patties": "Frozen",
  "veggie burger patties": "Frozen",
  "iced tea bags": "Drinks",
  "lemonade concentrate": "Drinks",
  "ice cream": "Frozen",
};

/** Lowercase, strip accents, parentheticals and punctuation, collapse spaces. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Exact word, or its regular plural. Avoids "ice" matching "iced". */
function isWord(words: string[], keyword: string): boolean {
  return words.some(
    (word) =>
      word === keyword ||
      word === `${keyword}s` ||
      word === `${keyword}es` ||
      (keyword.endsWith("y") && word === `${keyword.slice(0, -1)}ies`),
  );
}

/** The aisle an ingredient belongs to. Unknown names land in "Other". */
export function aisleFor(itemName: string): Aisle {
  const name = normalize(itemName);
  if (!name) return "Other";
  const override = OVERRIDES[name];
  if (override) return override;
  const words = name.split(" ");
  for (const rule of RULES) {
    if (rule.words.some((keyword) => isWord(words, keyword))) return rule.aisle;
  }
  return "Other";
}

/**
 * Groups lines by aisle, in aisle order, alphabetised inside each group (case and
 * accents ignored). Empty aisles are left out.
 */
export function groupByAisle<T extends { name: string }>(
  lines: T[],
): { aisle: Aisle; lines: T[] }[] {
  const buckets = new Map<Aisle, T[]>();
  for (const line of lines) {
    const aisle = aisleFor(line.name);
    const bucket = buckets.get(aisle);
    if (bucket) bucket.push(line);
    else buckets.set(aisle, [line]);
  }
  const compare = (a: T, b: T) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  return AISLES.filter((aisle) => buckets.has(aisle)).map((aisle) => ({
    aisle,
    lines: [...(buckets.get(aisle) as T[])].sort(compare),
  }));
}
