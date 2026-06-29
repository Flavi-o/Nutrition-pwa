const DISH_TYPE_VALUES = ["dessert", "savory", "snack", "unknown"];
const DISH_TYPE_OVERRIDE_VALUES = ["dessert", "savory", "snack"];
const MODE_VALUES = ["equilibre", "seche"];

export const RECIPE_SCHEMA_VERSION = "recipe.v1";
export const OPTIMIZED_SCHEMA_VERSION = "recipe-optimized.v1";
export const RECIPE_MODES = new Set(MODE_VALUES);
export const DISH_TYPES = new Set(DISH_TYPE_VALUES);

function cleanString(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function toNumber(value, { min = null, max = null, fallback = 0 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (min !== null && parsed < min) return fallback;
  if (max !== null && parsed > max) return fallback;
  return parsed;
}

function toNullableNumber(value, { min = null, max = null } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (min !== null && parsed < min) return null;
  if (max !== null && parsed > max) return null;
  return parsed;
}

function toInt(value, { min = 1, max = 24, fallback = 1 } = {}) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return fallback;
  if (parsed > max) return max;
  return parsed;
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function safeParseJson(raw) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function stripCodeFence(raw) {
  const text = String(raw || "").trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = text.match(fence);
  return match ? match[1].trim() : text;
}

function parseJsonFromModelText(rawText) {
  const directText = stripCodeFence(rawText);

  const direct = safeParseJson(directText);
  if (direct && typeof direct === "object") return direct;

  const firstBrace = directText.indexOf("{");
  const lastBrace = directText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const subset = directText.slice(firstBrace, lastBrace + 1);
    const subsetJson = safeParseJson(subset);
    if (subsetJson && typeof subsetJson === "object") return subsetJson;
  }

  throw new Error("JSON invalide renvoye par le modele.");
}

function extractOutputText(payload) {
  if (!payload) return "";
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  let text = "";

  output.forEach((item) => {
    if (item?.type !== "message" || !Array.isArray(item.content)) return;
    item.content.forEach((content) => {
      if (content?.type === "output_text" && typeof content.text === "string") {
        text += content.text;
      }
    });
  });

  return text.trim();
}

async function callOpenAIJson({ apiKey, model, baseUrl, systemPrompt, userPayload, temperature = 0.2 }) {
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPayload }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errorText.slice(0, 280)}`);
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  if (!outputText) throw new Error("Reponse vide du modele.");

  return parseJsonFromModelText(outputText);
}

export function normalizeSourceUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeDishType(input) {
  const rawValue = typeof input?.value === "string" ? input.value.trim().toLowerCase() : "";
  const value = DISH_TYPES.has(rawValue) ? rawValue : "unknown";
  const confidence = clamp(input?.confidence, 0, 1, 0.5);
  const needsUserConfirmation =
    typeof input?.needs_user_confirmation === "boolean"
      ? input.needs_user_confirmation
      : value === "unknown" || confidence < 0.72;

  return {
    value,
    confidence: Number(confidence.toFixed(2)),
    needs_user_confirmation: Boolean(needsUserConfirmation),
  };
}

function normalizeIngredients(input) {
  const rawItems = Array.isArray(input) ? input : [];
  const normalized = rawItems
    .map((item) => {
      if (typeof item === "string") {
        const name = cleanString(item, 140);
        if (!name) return null;
        return { name, amount: "", notes: "" };
      }
      if (!item || typeof item !== "object") return null;

      const name = cleanString(item.name, 140);
      if (!name) return null;

      return {
        name,
        amount: cleanString(item.amount, 80),
        notes: cleanString(item.notes, 180),
      };
    })
    .filter(Boolean)
    .slice(0, 80);

  return normalized;
}

function normalizeSteps(input) {
  const rawItems = Array.isArray(input) ? input : [];
  const normalized = rawItems
    .map((step) => cleanString(step, 400))
    .filter(Boolean)
    .slice(0, 80);

  return normalized;
}

export function normalizeRecipe(input, { sourceUrl = null } = {}) {
  const raw = input && typeof input === "object" ? input : {};

  const title = cleanString(raw.title, 180) || "Recette sans titre";
  const dishType = normalizeDishType(raw.dish_type || {});
  const servings = toInt(raw.servings, { min: 1, max: 24, fallback: 1 });

  const times = raw.times && typeof raw.times === "object" ? raw.times : {};
  const prepMinutes = toNullableNumber(times.prep_minutes, { min: 0, max: 1440 });
  const cookMinutes = toNullableNumber(times.cook_minutes, { min: 0, max: 1440 });

  let totalMinutes = toNullableNumber(times.total_minutes, { min: 0, max: 1440 });
  if (totalMinutes === null && prepMinutes !== null && cookMinutes !== null) {
    totalMinutes = prepMinutes + cookMinutes;
  }

  const ingredients = normalizeIngredients(raw.ingredients);
  const steps = normalizeSteps(raw.steps);
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl) || normalizeSourceUrl(raw.source_url);

  return {
    schema_version: RECIPE_SCHEMA_VERSION,
    title,
    dish_type: dishType,
    servings,
    times: {
      prep_minutes: prepMinutes,
      cook_minutes: cookMinutes,
      total_minutes: totalMinutes,
    },
    ingredients,
    steps,
    notes: cleanString(raw.notes, 1200),
    source_url: normalizedSourceUrl,
  };
}

export function normalizeMode(value) {
  const mode = typeof value === "string" ? value.trim().toLowerCase() : "equilibre";
  return RECIPE_MODES.has(mode) ? mode : null;
}

export function normalizeDishTypeOverride(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!DISH_TYPE_OVERRIDE_VALUES.includes(normalized)) return null;
  return normalized;
}

export function normalizeTargets(input, mode = "equilibre") {
  const defaults =
    mode === "seche"
      ? {
          sugar_reduction_pct: 35,
          fat_reduction_pct: 25,
          calorie_reduction_pct: 22,
          protein_increase_pct: 28,
        }
      : {
          sugar_reduction_pct: 20,
          fat_reduction_pct: 15,
          calorie_reduction_pct: 12,
          protein_increase_pct: 15,
        };

  const source = input && typeof input === "object" ? input : {};

  return {
    sugar_reduction_pct: clamp(source.sugar_reduction_pct, 0, 80, defaults.sugar_reduction_pct),
    fat_reduction_pct: clamp(source.fat_reduction_pct, 0, 80, defaults.fat_reduction_pct),
    calorie_reduction_pct: clamp(source.calorie_reduction_pct, 0, 80, defaults.calorie_reduction_pct),
    protein_increase_pct: clamp(source.protein_increase_pct, 0, 100, defaults.protein_increase_pct),
  };
}

function normalizeChanges(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((change) => {
      if (!change || typeof change !== "object") return null;
      const from = cleanString(change.from, 240);
      const to = cleanString(change.to, 240);
      const reason = cleanString(change.reason, 320);
      if (!from || !to || !reason) return null;
      return { from, to, reason };
    })
    .filter(Boolean)
    .slice(0, 80);
}

function normalizeMacros(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    kcal: Number(toNumber(source.kcal, { min: 0, max: 4000, fallback: 0 }).toFixed(1)),
    protein_g: Number(toNumber(source.protein_g, { min: 0, max: 400, fallback: 0 }).toFixed(1)),
    carbs_g: Number(toNumber(source.carbs_g, { min: 0, max: 500, fallback: 0 }).toFixed(1)),
    fat_g: Number(toNumber(source.fat_g, { min: 0, max: 300, fallback: 0 }).toFixed(1)),
    fiber_g: Number(toNumber(source.fiber_g, { min: 0, max: 200, fallback: 0 }).toFixed(1)),
    sugar_g: Number(toNumber(source.sugar_g, { min: 0, max: 300, fallback: 0 }).toFixed(1)),
  };
}

export async function parseRecipeFromImageWithAI({ apiKey, model, baseUrl, base64, mimeType, sourceUrl = null }) {
  const parseSystemPrompt = [
    "Tu convertis une image de recette en recette structuree.",
    "Reponds uniquement avec un objet JSON valide, sans markdown.",
    "Schema attendu exactement:",
    "{",
    '  "title": "string",',
    '  "dish_type": { "value": "dessert|savory|snack|unknown", "confidence": 0.0-1.0, "needs_user_confirmation": true|false },',
    '  "servings": 1,',
    '  "times": { "prep_minutes": 0|null, "cook_minutes": 0|null, "total_minutes": 0|null },',
    '  "ingredients": [{ "name": "string", "amount": "string", "notes": "string" }],',
    '  "steps": ["string"],',
    '  "notes": "string"',
    "}",
    "Rappels:",
    "- ingredients et steps doivent etre des tableaux.",
    "- Si info inconnue: utiliser null pour les temps.",
    "- Auto-detecter le type de plat avec confiance realiste.",
    "- Si ambigu: confidence basse et needs_user_confirmation=true.",
  ].join("\n");

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: parseSystemPrompt }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64}`,
            },
            {
              type: "input_text",
              text: sourceUrl ? `Source: ${sourceUrl}\n\nExtrait la recette de cette image.` : "Extrait la recette de cette image.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI vision error (${response.status}): ${errorText.slice(0, 280)}`);
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  if (!outputText) throw new Error("Reponse vide du modele vision.");

  const modelJson = parseJsonFromModelText(outputText);
  return normalizeRecipe(modelJson, { sourceUrl });
}

export async function adaptRecipeWithKnownIngredients({
  apiKey,
  model,
  baseUrl,
  recipeJson,
  knownIngredients,
}) {
  const normalizedRecipe = normalizeRecipe(recipeJson, {
    sourceUrl: normalizeSourceUrl(recipeJson?.source_url),
  });

  const adaptSystemPrompt = [
    "Tu es un nutritionniste-cuisinier.",
    "On te donne une recette externe et une liste d'ingredients disponibles (issus des recettes precedentes de l'utilisateur).",
    "Cree une nouvelle recette inspiree de la recette externe, mais qui utilise principalement les ingredients disponibles.",
    "Tu peux garder les memes etapes et la meme structure, mais adapte les ingredients.",
    "Si un ingredient de la recette externe n'est pas disponible, remplace-le par le plus proche dans la liste.",
    "Si aucun substitut n'est possible, tu peux conserver l'ingredient original (minimum).",
    "Reponds uniquement avec un objet JSON valide, sans markdown.",
    "Schema attendu exactement:",
    "{",
    '  "adapted": {',
    '    "title": "string",',
    '    "dish_type": { "value": "dessert|savory|snack|unknown", "confidence": 0.0-1.0, "needs_user_confirmation": false },',
    '    "servings": 1,',
    '    "times": { "prep_minutes": 0|null, "cook_minutes": 0|null, "total_minutes": 0|null },',
    '    "ingredients": [{ "name": "string", "amount": "string", "notes": "string" }],',
    '    "steps": ["string"],',
    '    "notes": "string",',
    '    "source_url": "string|null"',
    "  },",
    '  "substitutions": [{ "original": "string", "adapted": "string", "reason": "string" }],',
    '  "used_from_stock": ["string"],',
    '  "summary": "string"',
    "}",
  ].join("\n");

  const userPayload = JSON.stringify(
    {
      recette_externe: normalizedRecipe,
      ingredients_disponibles: knownIngredients,
    },
    null,
    2,
  );

  const modelJson = await callOpenAIJson({
    apiKey,
    model,
    baseUrl,
    systemPrompt: adaptSystemPrompt,
    userPayload,
    temperature: 0.25,
  });

  const adaptedRecipe = normalizeRecipe(modelJson?.adapted, {
    sourceUrl: normalizedRecipe.source_url,
  });

  const substitutions = Array.isArray(modelJson?.substitutions)
    ? modelJson.substitutions
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const original = cleanString(s.original, 140);
          const adapted = cleanString(s.adapted, 140);
          const reason = cleanString(s.reason, 320);
          if (!original || !adapted) return null;
          return { original, adapted, reason };
        })
        .filter(Boolean)
        .slice(0, 40)
    : [];

  const usedFromStock = Array.isArray(modelJson?.used_from_stock)
    ? modelJson.used_from_stock
        .map((s) => cleanString(s, 140))
        .filter(Boolean)
        .slice(0, 40)
    : [];

  return {
    adapted: adaptedRecipe,
    substitutions,
    used_from_stock: usedFromStock,
    summary: cleanString(modelJson?.summary, 600),
  };
}

export async function parseRecipeWithAI({ apiKey, model, baseUrl, text, sourceUrl = null }) {
  const parseSystemPrompt = [
    "Tu convertis du texte libre en recette structuree.",
    "Reponds uniquement avec un objet JSON valide, sans markdown.",
    "Schema attendu exactement:",
    "{",
    '  "title": "string",',
    '  "dish_type": { "value": "dessert|savory|snack|unknown", "confidence": 0.0-1.0, "needs_user_confirmation": true|false },',
    '  "servings": 1,',
    '  "times": { "prep_minutes": 0|null, "cook_minutes": 0|null, "total_minutes": 0|null },',
    '  "ingredients": [{ "name": "string", "amount": "string", "notes": "string" }],',
    '  "steps": ["string"],',
    '  "notes": "string"',
    "}",
    "Rappels:",
    "- ingredients et steps doivent etre des tableaux.",
    "- Si info inconnue: utiliser null pour les temps et conserver des chaines vides si necessaire.",
    "- Auto-detecter le type de plat (dessert/savory/snack) avec confiance realiste.",
    "- Si ambigu: confidence basse et needs_user_confirmation=true.",
  ].join("\n");

  const userPayload = [
    "Source URL:",
    sourceUrl || "",
    "",
    "Texte source:",
    text,
  ].join("\n");

  const modelJson = await callOpenAIJson({
    apiKey,
    model,
    baseUrl,
    systemPrompt: parseSystemPrompt,
    userPayload,
    temperature: 0.1,
  });

  return normalizeRecipe(modelJson, { sourceUrl });
}

export async function optimizeRecipeWithAI({
  apiKey,
  model,
  baseUrl,
  recipeJson,
  mode,
  targets,
  dishTypeOverride,
}) {
  const normalizedRecipe = normalizeRecipe(recipeJson, {
    sourceUrl: normalizeSourceUrl(recipeJson?.source_url),
  });

  const normalizedMode = normalizeMode(mode) || "equilibre";
  const normalizedTargets = normalizeTargets(targets, normalizedMode);
  const normalizedDishTypeOverride = normalizeDishTypeOverride(dishTypeOverride);

  const recipeForModel = {
    ...normalizedRecipe,
    dish_type: normalizedDishTypeOverride
      ? {
          value: normalizedDishTypeOverride,
          confidence: 1,
          needs_user_confirmation: false,
        }
      : normalizedRecipe.dish_type,
  };

  const optimizeSystemPrompt = [
    "Tu es un nutritionniste-cuisinier.",
    "Optimise la recette en conservant le gout au maximum.",
    "Objectifs globaux: moins sucre, moins gras, moins calorique, plus proteine.",
    "Mode equilibre: priorite au gout puis macros.",
    "Mode seche: priorite aux macros puis gout.",
    "Reponds uniquement avec un objet JSON valide, sans markdown.",
    "Schema attendu exactement:",
    "{",
    '  "optimized": {',
    '    "title": "string",',
    '    "dish_type": { "value": "dessert|savory|snack|unknown", "confidence": 0.0-1.0, "needs_user_confirmation": true|false },',
    '    "servings": 1,',
    '    "times": { "prep_minutes": 0|null, "cook_minutes": 0|null, "total_minutes": 0|null },',
    '    "ingredients": [{ "name": "string", "amount": "string", "notes": "string" }],',
    '    "steps": ["string"],',
    '    "notes": "string",',
    '    "source_url": "string|null"',
    "  },",
    '  "changes": [{ "from": "string", "to": "string", "reason": "string" }],',
    '  "macros_per_serving": {',
    '    "kcal": 0,',
    '    "protein_g": 0,',
    '    "carbs_g": 0,',
    '    "fat_g": 0,',
    '    "fiber_g": 0,',
    '    "sugar_g": 0',
    "  },",
    '  "summary": "string"',
    "}",
    "Rappels:",
    "- Fournir 3 changements minimum avec relation from -> to.",
    "- Les macros doivent etre des estimations realistes par portion.",
  ].join("\n");

  const userPayload = JSON.stringify(
    {
      mode: normalizedMode,
      targets: normalizedTargets,
      recipe: recipeForModel,
    },
    null,
    2,
  );

  const modelJson = await callOpenAIJson({
    apiKey,
    model,
    baseUrl,
    systemPrompt: optimizeSystemPrompt,
    userPayload,
    temperature: normalizedMode === "seche" ? 0.15 : 0.25,
  });

  const optimizedRecipe = normalizeRecipe(modelJson?.optimized, {
    sourceUrl: normalizedRecipe.source_url,
  });

  if (normalizedDishTypeOverride) {
    optimizedRecipe.dish_type = {
      value: normalizedDishTypeOverride,
      confidence: 1,
      needs_user_confirmation: false,
    };
  }

  const changes = normalizeChanges(modelJson?.changes);
  const macrosPerServing = normalizeMacros(modelJson?.macros_per_serving);

  return {
    schema_version: OPTIMIZED_SCHEMA_VERSION,
    mode: normalizedMode,
    optimized: optimizedRecipe,
    changes,
    macros_per_serving: macrosPerServing,
    summary: cleanString(modelJson?.summary, 600),
  };
}
