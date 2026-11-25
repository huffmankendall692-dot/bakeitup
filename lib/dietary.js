// Allergen and diet rules shared by the preferences page and the recipe check.

const DAIRY = {
  terms: ["milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "whey", "casein", "ghee", "buttermilk", "kefir", "mascarpone", "ricotta", "custard"],
  allow: ["dairy-free", "non-dairy", "vegan", "plant-based", "oat milk", "almond milk", "soy milk", "coconut milk", "coconut cream", "rice milk", "cashew milk", "peanut butter", "almond butter", "nut butter", "cashew butter", "seed butter", "apple butter", "cocoa butter", "cream of tartar"],
};
const EGGS = {
  terms: ["egg", "eggs", "yolk", "yolks", "egg white", "egg whites", "mayonnaise", "meringue"],
  allow: ["egg-free", "egg replacer", "egg substitute", "flax egg", "chia egg", "vegan"],
};
const WHEAT = {
  terms: ["wheat", "flour", "semolina", "spelt", "farina", "breadcrumbs", "bread crumbs", "graham", "couscous", "bulgur", "durum"],
  allow: ["gluten-free", "wheat-free", "almond flour", "coconut flour", "rice flour", "oat flour", "buckwheat flour", "chickpea flour", "cassava flour", "tapioca flour", "tapioca starch", "potato starch", "corn flour", "cornflour", "sorghum flour", "millet flour", "teff flour"],
};
const FISH = { terms: ["fish", "anchovy", "anchovies", "salmon", "tuna", "cod", "sardine", "sardines"], allow: [] };
const SHELLFISH = { terms: ["shrimp", "crab", "lobster", "prawn", "prawns", "scallop", "scallops", "clam", "clams", "mussel", "mussels", "oyster", "oysters"], allow: [] };
const MEAT = { terms: ["gelatin", "gelatine", "lard", "suet", "bacon", "beef", "pork", "chicken", "ham", "sausage"], allow: ["vegetarian", "vegan", "agar"] };

export const ALLERGIES = [
  { id: "peanuts", label: "Peanuts", rule: { terms: ["peanut", "peanuts"], allow: ["peanut-free"] } },
  {
    id: "tree_nuts",
    label: "Tree nuts",
    rule: {
      terms: ["almond", "almonds", "walnut", "walnuts", "pecan", "pecans", "cashew", "cashews", "pistachio", "pistachios", "hazelnut", "hazelnuts", "macadamia", "brazil nut", "brazil nuts", "pine nut", "pine nuts", "praline", "marzipan", "nutella", "frangipane"],
      allow: ["nut-free", "tree nut-free"],
    },
  },
  { id: "dairy", label: "Milk and dairy", rule: DAIRY },
  { id: "eggs", label: "Eggs", rule: EGGS },
  { id: "wheat", label: "Wheat", rule: WHEAT },
  { id: "soy", label: "Soy", rule: { terms: ["soy", "soya", "tofu", "edamame", "miso", "tempeh", "soybean", "soybeans", "soy lecithin"], allow: ["soy-free"] } },
  { id: "sesame", label: "Sesame", rule: { terms: ["sesame", "tahini", "halva", "halvah"], allow: ["sesame-free"] } },
  { id: "fish", label: "Fish", rule: FISH },
  { id: "shellfish", label: "Shellfish", rule: SHELLFISH },
];

export const DIETS = [
  { id: "vegetarian", label: "Vegetarian", rules: [MEAT, FISH, SHELLFISH] },
  { id: "vegan", label: "Vegan", rules: [MEAT, FISH, SHELLFISH, DAIRY, EGGS, { terms: ["honey"], allow: ["vegan"] }] },
  {
    id: "gluten_free",
    label: "Gluten-free",
    rules: [WHEAT, { terms: ["barley", "rye", "malt", "oats", "oat"], allow: ["gluten-free"] }],
  },
];

export const MAX_AVOID_LENGTH = 200;
const AVOID_PATTERN = /^[\p{L}\p{N} ,'\-()&/]*$/u;

export const EMPTY_PREFERENCES = { allergies: [], diets: [], avoid: "" };

export function cleanPreferences({ allergies, diets, avoid }) {
  const avoidText = typeof avoid === "string" ? avoid.trim() : "";
  if (avoidText.length > MAX_AVOID_LENGTH || !AVOID_PATTERN.test(avoidText)) {
    return null;
  }
  const allergyIds = new Set(ALLERGIES.map((a) => a.id));
  const dietIds = new Set(DIETS.map((d) => d.id));
  return {
    allergies: [...new Set(allergies)].filter((id) => allergyIds.has(id)),
    diets: [...new Set(diets)].filter((id) => dietIds.has(id)),
    avoid: avoidText,
  };
}

function avoidTerms(avoid) {
  return avoid
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2);
}

export function preferenceLabels(preferences) {
  return [
    ...ALLERGIES.filter((a) => preferences.allergies.includes(a.id)).map((a) => a.label),
    ...DIETS.filter((d) => preferences.diets.includes(d.id)).map((d) => d.label),
    ...avoidTerms(preferences.avoid),
  ];
}

// The text Claude sees. Empty when nothing is set.
export function describePreferences(preferences, alsoAvoid = []) {
  const lines = [];
  const allergies = ALLERGIES.filter((a) => preferences.allergies.includes(a.id)).map((a) => a.label);
  const diets = DIETS.filter((d) => preferences.diets.includes(d.id)).map((d) => d.label);
  const avoid = [...avoidTerms(preferences.avoid), ...alsoAvoid];
  if (allergies.length) lines.push(`Allergies: ${allergies.join(", ")}`);
  if (diets.length) lines.push(`Diet: ${diets.join(", ")}`);
  if (avoid.length) lines.push(`Also avoid: ${avoid.join(", ")}`);
  return lines.join("\n");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentions(text, term) {
  return new RegExp(`(^|[^\\p{L}])${escapeRegExp(term)}(e?s)?($|[^\\p{L}])`, "iu").test(text);
}

function breaksRule(name, rule) {
  if (rule.allow.some((phrase) => name.includes(phrase))) {
    return false;
  }
  return rule.terms.some((term) => mentions(name, term));
}

// A safety net under the prompt: lists recipe ingredients that clash with the saved preferences.
export function findConflicts(recipe, preferences) {
  const checks = [
    ...ALLERGIES.filter((a) => preferences.allergies.includes(a.id)).map((a) => ({ label: a.label, rules: [a.rule] })),
    ...DIETS.filter((d) => preferences.diets.includes(d.id)).map((d) => ({ label: d.label, rules: d.rules })),
    ...avoidTerms(preferences.avoid).map((term) => ({
      label: term,
      // "raisins" should also catch "raisin".
      rules: [{ terms: term.length > 3 && term.endsWith("s") ? [term, term.slice(0, -1)] : [term], allow: [] }],
    })),
  ];

  const conflicts = [];
  for (const ingredient of recipe.ingredients) {
    const name = ingredient.name.toLowerCase();
    for (const check of checks) {
      if (check.rules.some((rule) => breaksRule(name, rule))) {
        conflicts.push({ ingredient: ingredient.name, reason: check.label });
      }
    }
  }
  return conflicts;
}
