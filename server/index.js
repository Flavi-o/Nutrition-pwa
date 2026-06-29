import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { createRecipeStore } from "./recipeStore.js";
import {
  parseRecipeWithAI,
  parseRecipeFromImageWithAI,
  optimizeRecipeWithAI,
  adaptRecipeWithKnownIngredients,
  normalizeMode,
  normalizeDishTypeOverride,
  normalizeSourceUrl,
  normalizeRecipe,
} from "./recipeService.js";

dotenv.config({ override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.2";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const SQLITE_PATH = process.env.SQLITE_PATH || "data/recipes.db";

const recipeStore = createRecipeStore(SQLITE_PATH);

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateMap = new Map();

const SYSTEM_PROMPT = `Tu es un coach nutrition/entraînement spécialisé recomposition corporelle (abdos visibles) pour un utilisateur actif avec TDAH.
RÈGLES:
- Ne jamais inventer des données de tracking.
- Se baser sur tendances (moyenne 7 jours poids).
- Priorité: régularité > perfection.
- Donne conseils concrets: cantine/supermarché/repas dehors/pas de boîtes.
- 3 actions max pour 24h + 3 leviers max pour 7 jours.
- Si données insuffisantes: demande 2–3 infos max.
- Ton direct, pas de flatterie.

FORMAT DE RÉPONSE OBLIGATOIRE
1) Verdict en 1 phrase.
2) Bon / Bloque / Priorité #1.
3) Plan 24h (3 actions max).
4) Plan 7 jours (3 leviers max).
5) Questions manquantes (2–3 max, seulement si nécessaire).`;

app.use(express.json({ limit: "2mb" }));
app.set("trust proxy", true);

function rateLimit(req, res, next) {
  const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const entries = rateMap.get(key) || [];
  const recent = entries.filter((ts) => ts > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Trop de requetes. Reessaie plus tard." });
  }
  recent.push(now);
  rateMap.set(key, recent);
  return next();
}

function extractOutputText(payload) {
  if (!payload) return "";
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  let text = "";
  output.forEach((item) => {
    if (item?.type === "message" && Array.isArray(item.content)) {
      item.content.forEach((c) => {
        if (c?.type === "output_text" && typeof c.text === "string") {
          text += c.text;
        }
      });
    }
  });
  return text.trim();
}

function validateChatPayload(body) {
  if (!body || typeof body !== "object") return "Payload JSON invalide.";
  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return "Message utilisateur manquant.";
  }
  if (body.message.length > 2000) return "Message trop long (max 2000 caracteres).";
  if (body.data === undefined || body.data === null || typeof body.data !== "object") {
    return "Donnees de tracking invalides.";
  }
  return "";
}

function validateParsePayload(body) {
  if (!body || typeof body !== "object") return "Payload JSON invalide.";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return "Le champ text est requis.";
  if (text.length > 16000) return "Texte trop long (max 16000 caracteres).";

  if (body.sourceUrl !== undefined && body.sourceUrl !== null) {
    if (typeof body.sourceUrl !== "string") {
      return "sourceUrl doit etre une chaine ou null.";
    }
    if (body.sourceUrl.trim() && !normalizeSourceUrl(body.sourceUrl)) {
      return "sourceUrl invalide (URL http/https attendue).";
    }
  }

  return "";
}

function validateOptimizePayload(body) {
  if (!body || typeof body !== "object") return "Payload JSON invalide.";
  if (!body.recipeJson || typeof body.recipeJson !== "object") {
    return "recipeJson est requis et doit etre un objet.";
  }

  if (body.mode !== undefined && normalizeMode(body.mode) === null) {
    return "Mode invalide. Utilise equilibre ou seche.";
  }

  if (body.targets !== undefined && body.targets !== null && typeof body.targets !== "object") {
    return "targets doit etre un objet si fourni.";
  }

  if (body.dishTypeOverride !== undefined && body.dishTypeOverride !== null) {
    if (!normalizeDishTypeOverride(body.dishTypeOverride)) {
      return "dishTypeOverride invalide. Utilise dessert, savory ou snack.";
    }
  }

  return "";
}

async function callOpenAIChat({ message, data }) {
  const inputText = [
    `Message utilisateur: ${message}`,
    "",
    "Donnees de tracking (JSON):",
    JSON.stringify(data, null, 2),
  ].join("\n");

  const payload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: inputText }],
      },
    ],
    temperature: 0.2,
  };

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const json = await response.json();
  const reply = extractOutputText(json);
  if (!reply) throw new Error("Reponse OpenAI vide.");
  return reply;
}

app.get("/api/health", (_req, res) => {
  return res.json({
    ok: true,
    sqlite_path: recipeStore.dbPath,
  });
});

app.post("/api/chat", rateLimit, async (req, res) => {
  const error = validateChatPayload(req.body);
  if (error) return res.status(400).json({ error });

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante sur le serveur." });
  }

  try {
    const reply = await callOpenAIChat(req.body);
    return res.json({ reply });
  } catch (err) {
    console.error("AI call failed:", err?.message || err);
    return res.status(502).json({
      error: "Erreur lors de l'appel IA.",
      details: err?.message || "Erreur inconnue.",
    });
  }
});

app.post("/api/recipe/parse-file", rateLimit, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Fichier manquant ou type non supporte (JPEG, PNG, WebP, PDF)." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante sur le serveur." });
  }

  const sourceUrl = normalizeSourceUrl(req.body?.sourceUrl);
  const mimeType = req.file.mimetype;

  try {
    let parsedRecipe;

    if (mimeType === "application/pdf") {
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const pdfData = await pdfParse(req.file.buffer);
      const text = pdfData.text?.trim();
      if (!text || text.length < 10) {
        return res.status(422).json({ error: "Impossible d'extraire du texte de ce PDF." });
      }
      parsedRecipe = await parseRecipeWithAI({
        apiKey: OPENAI_API_KEY,
        model: OPENAI_MODEL,
        baseUrl: OPENAI_BASE_URL,
        text: text.slice(0, 16000),
        sourceUrl,
      });
    } else {
      const base64 = req.file.buffer.toString("base64");
      parsedRecipe = await parseRecipeFromImageWithAI({
        apiKey: OPENAI_API_KEY,
        model: OPENAI_MODEL,
        baseUrl: OPENAI_BASE_URL,
        base64,
        mimeType,
        sourceUrl,
      });
    }

    return res.json(parsedRecipe);
  } catch (err) {
    console.error("Recipe parse-file failed:", err?.message || err);
    return res.status(502).json({
      error: "Erreur lors de l'analyse du fichier.",
      details: err?.message || "Erreur inconnue.",
    });
  }
});

app.post("/api/recipe/parse", rateLimit, async (req, res) => {
  const error = validateParsePayload(req.body);
  if (error) return res.status(400).json({ error });

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante sur le serveur." });
  }

  const text = req.body.text.trim();
  const sourceUrl = normalizeSourceUrl(req.body.sourceUrl);

  try {
    const parsedRecipe = await parseRecipeWithAI({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      baseUrl: OPENAI_BASE_URL,
      text,
      sourceUrl,
    });

    return res.json(parsedRecipe);
  } catch (err) {
    console.error("Recipe parse failed:", err?.message || err);
    return res.status(502).json({
      error: "Erreur lors du parsing recette.",
      details: err?.message || "Erreur inconnue.",
    });
  }
});

app.post("/api/recipe/optimize", rateLimit, async (req, res) => {
  const error = validateOptimizePayload(req.body);
  if (error) return res.status(400).json({ error });

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante sur le serveur." });
  }

  const mode = normalizeMode(req.body.mode) || "equilibre";
  const dishTypeOverride = normalizeDishTypeOverride(req.body.dishTypeOverride);
  const normalizedOriginalRecipe = normalizeRecipe(req.body.recipeJson, {
    sourceUrl: normalizeSourceUrl(req.body.recipeJson?.source_url),
  });

  try {
    const optimizedPayload = await optimizeRecipeWithAI({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      baseUrl: OPENAI_BASE_URL,
      recipeJson: normalizedOriginalRecipe,
      mode,
      targets: req.body.targets,
      dishTypeOverride,
    });

    const historyId = recipeStore.saveRecipeHistory({
      title: optimizedPayload?.optimized?.title || normalizedOriginalRecipe.title,
      sourceUrl: optimizedPayload?.optimized?.source_url || normalizedOriginalRecipe.source_url,
      originalJson: normalizedOriginalRecipe,
      optimizedJson: optimizedPayload,
    });

    return res.json({
      ...optimizedPayload,
      history_id: historyId,
    });
  } catch (err) {
    console.error("Recipe optimize failed:", err?.message || err);
    return res.status(502).json({
      error: "Erreur lors de l'optimisation recette.",
      details: err?.message || "Erreur inconnue.",
    });
  }
});

app.post("/api/recipe/adapt", rateLimit, async (req, res) => {
  if (!req.body || !req.body.recipeJson || typeof req.body.recipeJson !== "object") {
    return res.status(400).json({ error: "recipeJson est requis et doit etre un objet." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante sur le serveur." });
  }

  const dbIngredients = recipeStore.getKnownIngredients();

  const extraIngredients = Array.isArray(req.body.extraIngredients)
    ? req.body.extraIngredients
        .filter((s) => typeof s === "string" && s.trim().length > 0 && s.length <= 140)
        .map((s) => s.trim().toLowerCase())
    : [];

  const knownIngredients = [...new Set([...dbIngredients, ...extraIngredients])].sort();

  if (knownIngredients.length === 0) {
    return res.status(400).json({
      error: "Aucun ingredient connu. Ajoute des produits dans ta bibliotheque ou optimise d'abord quelques recettes.",
    });
  }

  const normalizedRecipe = normalizeRecipe(req.body.recipeJson, {
    sourceUrl: normalizeSourceUrl(req.body.recipeJson?.source_url),
  });

  try {
    const adaptedPayload = await adaptRecipeWithKnownIngredients({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      baseUrl: OPENAI_BASE_URL,
      recipeJson: normalizedRecipe,
      knownIngredients,
    });

    const historyId = recipeStore.saveRecipeHistory({
      title: adaptedPayload?.adapted?.title || normalizedRecipe.title,
      sourceUrl: adaptedPayload?.adapted?.source_url || normalizedRecipe.source_url,
      originalJson: normalizedRecipe,
      optimizedJson: adaptedPayload,
    });

    return res.json({
      ...adaptedPayload,
      history_id: historyId,
    });
  } catch (err) {
    console.error("Recipe adapt failed:", err?.message || err);
    return res.status(502).json({
      error: "Erreur lors de l'adaptation recette.",
      details: err?.message || "Erreur inconnue.",
    });
  }
});

app.get("/api/recipe/history", (req, res) => {
  try {
    const limitParam = Number.parseInt(String(req.query.limit || "20"), 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;
    const items = recipeStore.listRecipeHistory(limit);
    return res.json({ items });
  } catch (err) {
    console.error("Recipe history list failed:", err?.message || err);
    return res.status(500).json({ error: "Impossible de charger l'historique." });
  }
});

app.get("/api/recipe/history/:id", (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalide." });
  }

  try {
    const item = recipeStore.getRecipeHistoryById(id);
    if (!item) return res.status(404).json({ error: "Recette introuvable." });

    return res.json(item);
  } catch (err) {
    console.error("Recipe history by id failed:", err?.message || err);
    return res.status(500).json({ error: "Impossible de charger la recette." });
  }
});

if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, "..", "dist");

  app.use(express.static(distPath));

  app.get("/recipe-optimizer", (_req, res) => {
    res.redirect(301, "/recipe-optimizer/");
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT}`);
  console.log(`Recipe history DB: ${recipeStore.dbPath}`);
});
