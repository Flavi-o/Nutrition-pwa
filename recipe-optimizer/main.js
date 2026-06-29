const refs = {
  homeLink: document.getElementById("homeLink"),
  recipeFile: document.getElementById("recipeFile"),
  fileStatus: document.getElementById("fileStatus"),
  igUrl: document.getElementById("igUrl"),
  recipeText: document.getElementById("recipeText"),
  freeText: document.getElementById("freeText"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  adaptBtn: document.getElementById("adaptBtn"),
  analyzeStatus: document.getElementById("analyzeStatus"),
  originalRecipe: document.getElementById("originalRecipe"),
  dishTypeGate: document.getElementById("dishTypeGate"),
  modeSwitch: document.getElementById("modeSwitch"),
  optimizeBtn: document.getElementById("optimizeBtn"),
  optimizeStatus: document.getElementById("optimizeStatus"),
  optimizedCard: document.getElementById("optimizedCard"),
  optimizedRecipe: document.getElementById("optimizedRecipe"),
  macroWrap: document.getElementById("macroWrap"),
  macrosPerServing: document.getElementById("macrosPerServing"),
  changesWrap: document.getElementById("changesWrap"),
  changesList: document.getElementById("changesList"),
  printBtn: document.getElementById("printBtn"),
  historyList: document.getElementById("historyList"),
  refreshHistoryBtn: document.getElementById("refreshHistoryBtn"),
};

const state = {
  mode: "equilibre",
  parsedRecipe: null,
  optimizedPayload: null,
  loadingAnalyze: false,
  loadingOptimize: false,
  loadingAdapt: false,
  loadingHistory: false,
};

function sanitizePdfName(value, fallback = "Recipe Optimizer") {
  const raw = String(value || "").trim();
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 120);
}

function mmToPx(mm) {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  probe.style.width = "1mm";
  probe.style.height = "1mm";
  document.body.appendChild(probe);
  const pxPerMm = probe.getBoundingClientRect().height || 3.7795;
  probe.remove();
  return mm * pxPerMm;
}

function prepareSinglePageOptimizerPrint() {
  const card = refs.optimizedCard;
  if (!card) return null;

  document.body.classList.add("pdf-print-mode");

  const previousStyle = {
    transform: card.style.transform,
    transformOrigin: card.style.transformOrigin,
    width: card.style.width,
    margin: card.style.margin,
  };

  card.style.transform = "none";
  card.style.transformOrigin = "top left";
  card.style.width = "100%";
  card.style.margin = "0";

  const availableHeightPx = mmToPx(297 - 12);
  const contentHeightPx = card.getBoundingClientRect().height || card.scrollHeight || 1;
  const scale = Math.min(1, Math.max(0.08, (availableHeightPx / contentHeightPx) * 0.98));

  card.style.transform = `scale(${scale})`;
  card.style.width = `${100 / scale}%`;

  return () => {
    card.style.transform = previousStyle.transform;
    card.style.transformOrigin = previousStyle.transformOrigin;
    card.style.width = previousStyle.width;
    card.style.margin = previousStyle.margin;
    document.body.classList.remove("pdf-print-mode");
  };
}

function printWithPdfName(name, options = {}) {
  const previousTitle = document.title || "Recipe Optimizer";
  const nextTitle = sanitizePdfName(name, previousTitle);
  const cleanupPrintLayout =
    typeof options.beforePrint === "function"
      ? options.beforePrint() || null
      : null;
  let restored = false;

  const restore = () => {
    if (restored) return;
    restored = true;
    if (typeof cleanupPrintLayout === "function") cleanupPrintLayout();
    document.title = previousTitle;
  };

  document.title = nextTitle;
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
  setTimeout(restore, 2500);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

function setStatus(element, message, { error = false } = {}) {
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(error));
}

function buildParseInputText() {
  const recipeText = refs.recipeText.value.trim();
  const freeText = refs.freeText.value.trim();
  const chunks = [];

  if (recipeText) chunks.push(`RECETTE:\n${recipeText}`);
  if (freeText) chunks.push(`TEXTE_LIBRE:\n${freeText}`);

  return chunks.join("\n\n").trim();
}

function formatMinutes(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)} min`;
}

function formatDishType(type) {
  if (type === "dessert") return "dessert";
  if (type === "savory") return "sale";
  if (type === "snack") return "snack";
  return "inconnu";
}

function getDishTypeOverride() {
  const checked = document.querySelector("input[name='dishTypeOverride']:checked");
  return checked ? checked.value : null;
}

function clearDishTypeOverride() {
  document
    .querySelectorAll("input[name='dishTypeOverride']")
    .forEach((input) => {
      input.checked = false;
    });
}

function recipeToHtml(recipe) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const times = recipe.times && typeof recipe.times === "object" ? recipe.times : {};

  const ingredientsHtml = ingredients.length
    ? ingredients
        .map((item) => {
          const amount = item.amount ? ` - ${escapeHtml(item.amount)}` : "";
          const notes = item.notes ? ` (${escapeHtml(item.notes)})` : "";
          return `<li>${escapeHtml(item.name)}${amount}${notes}</li>`;
        })
        .join("")
    : "<li>Aucun ingredient detecte.</li>";

  const stepsHtml = steps.length
    ? steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")
    : "<li>Aucune etape detectee.</li>";

  const dishType = recipe.dish_type && typeof recipe.dish_type === "object" ? recipe.dish_type : {};
  const confidence =
    typeof dishType.confidence === "number" && Number.isFinite(dishType.confidence)
      ? `${Math.round(dishType.confidence * 100)}%`
      : "-";

  return `
    <article class="recipe-grid">
      <div class="recipe-head">
        <div>
          <h3 class="recipe-title">${escapeHtml(recipe.title || "Recette sans titre")}</h3>
          <p class="recipe-meta">
            Portions: ${escapeHtml(recipe.servings || "-")} | Type: ${formatDishType(dishType.value)} (${confidence})
          </p>
          <p class="recipe-meta">
            Prep: ${formatMinutes(times.prep_minutes)} | Cuisson: ${formatMinutes(times.cook_minutes)} | Total: ${formatMinutes(times.total_minutes)}
          </p>
        </div>
      </div>

      <section class="recipe-block">
        <h4 class="recipe-block-title">Ingredients</h4>
        <ul class="recipe-list">${ingredientsHtml}</ul>
      </section>

      <section class="recipe-block">
        <h4 class="recipe-block-title">Etapes</h4>
        <ol class="recipe-list">${stepsHtml}</ol>
      </section>

      ${
        recipe.notes
          ? `<section class="recipe-block"><h4 class="recipe-block-title">Notes</h4><p>${escapeHtml(recipe.notes)}</p></section>`
          : ""
      }
    </article>
  `;
}

function renderOriginalRecipe() {
  if (!state.parsedRecipe) {
    refs.originalRecipe.innerHTML = "Aucune recette analysee pour le moment.";
    refs.originalRecipe.classList.add("empty-state");
    refs.dishTypeGate.classList.add("hidden");
    return;
  }

  refs.originalRecipe.classList.remove("empty-state");
  refs.originalRecipe.innerHTML = recipeToHtml(state.parsedRecipe);

  const needsConfirmation = Boolean(state.parsedRecipe?.dish_type?.needs_user_confirmation);
  refs.dishTypeGate.classList.toggle("hidden", !needsConfirmation);
  if (!needsConfirmation) clearDishTypeOverride();
}

function renderMacros(macros) {
  if (!macros || typeof macros !== "object") {
    refs.macroWrap.classList.add("hidden");
    refs.macrosPerServing.innerHTML = "";
    return;
  }

  const items = [
    { key: "kcal", label: "kcal" },
    { key: "protein_g", label: "Proteines (g)" },
    { key: "carbs_g", label: "Glucides (g)" },
    { key: "fat_g", label: "Lipides (g)" },
    { key: "fiber_g", label: "Fibres (g)" },
    { key: "sugar_g", label: "Sucre (g)" },
  ];

  refs.macrosPerServing.innerHTML = items
    .map((item) => {
      const value = Number.isFinite(Number(macros[item.key])) ? Number(macros[item.key]).toFixed(1) : "-";
      return `
        <div class="macro-item">
          <span class="macro-label">${escapeHtml(item.label)}</span>
          <span class="macro-value">${escapeHtml(value)}</span>
        </div>
      `;
    })
    .join("");

  refs.macroWrap.classList.remove("hidden");
}

function renderChanges(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    refs.changesWrap.classList.add("hidden");
    refs.changesList.innerHTML = "";
    return;
  }

  refs.changesList.innerHTML = changes
    .map((change) => {
      return `
        <li>
          <strong>${escapeHtml(change.from || "-")}</strong>
          ->
          <strong>${escapeHtml(change.to || "-")}</strong><br/>
          <span>${escapeHtml(change.reason || "")}</span>
        </li>
      `;
    })
    .join("");

  refs.changesWrap.classList.remove("hidden");
}

function renderOptimizedRecipe() {
  if (!state.optimizedPayload || !state.optimizedPayload.optimized) {
    refs.optimizedRecipe.innerHTML = "Aucune optimisation executee pour le moment.";
    refs.optimizedRecipe.classList.add("empty-state");
    renderMacros(null);
    renderChanges(null);
    refs.printBtn.disabled = true;
    return;
  }

  refs.optimizedRecipe.classList.remove("empty-state");
  refs.optimizedRecipe.innerHTML = recipeToHtml(state.optimizedPayload.optimized);

  if (state.optimizedPayload.summary) {
    refs.optimizedRecipe.insertAdjacentHTML(
      "beforeend",
      `<p class="recipe-meta"><strong>Resume:</strong> ${escapeHtml(state.optimizedPayload.summary)}</p>`,
    );
  }

  renderMacros(state.optimizedPayload.macros_per_serving);
  renderChanges(state.optimizedPayload.changes);
  refs.printBtn.disabled = false;
}

function updateModeButtons() {
  refs.modeSwitch.querySelectorAll(".mode-btn").forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("active", isActive);
  });
}

function updateActionButtons() {
  refs.analyzeBtn.disabled = state.loadingAnalyze;
  refs.adaptBtn.disabled = state.loadingAdapt || !state.parsedRecipe;
  refs.optimizeBtn.disabled = state.loadingOptimize || !state.parsedRecipe;
  refs.refreshHistoryBtn.disabled = state.loadingHistory;
}

function formatHistoryDate(value) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("fr-FR");
}

function renderHistory(items) {
  if (!Array.isArray(items) || items.length === 0) {
    refs.historyList.innerHTML = '<li class="empty-state">Aucun historique en base locale.</li>';
    return;
  }

  refs.historyList.innerHTML = items
    .map((item) => {
      const source = item.source_url ? ` | ${escapeHtml(item.source_url)}` : "";
      return `
        <li>
          <button class="history-item" type="button" data-history-id="${escapeHtml(item.id)}">
            <span class="history-title">${escapeHtml(item.title || "Recette sans titre")}</span>
            <span class="history-meta">#${escapeHtml(item.id)} | ${escapeHtml(formatHistoryDate(item.created_at))}${source}</span>
          </button>
        </li>
      `;
    })
    .join("");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();

  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Erreur serveur (${response.status})`;
    const details = payload?.details ? ` ${payload.details}` : "";
    throw new Error(`${message}${details}`.trim());
  }

  return payload;
}

async function loadHistory() {
  state.loadingHistory = true;
  updateActionButtons();

  try {
    const payload = await fetchJson("/api/recipe/history?limit=40");
    renderHistory(payload?.items || []);
  } catch (error) {
    refs.historyList.innerHTML = `<li class="empty-state">${escapeHtml(error.message)}</li>`;
  } finally {
    state.loadingHistory = false;
    updateActionButtons();
  }
}

async function openHistoryItem(id) {
  try {
    const payload = await fetchJson(`/api/recipe/history/${id}`);
    if (!payload || typeof payload !== "object") {
      throw new Error("Historique invalide.");
    }

    if (payload.original_json && typeof payload.original_json === "object") {
      state.parsedRecipe = payload.original_json;
      renderOriginalRecipe();
    }

    if (payload.optimized_json && typeof payload.optimized_json === "object") {
      state.optimizedPayload = payload.optimized_json;
      if (state.optimizedPayload.mode === "seche") {
        state.mode = "seche";
      } else {
        state.mode = "equilibre";
      }
      updateModeButtons();
      renderOptimizedRecipe();
    } else {
      state.optimizedPayload = null;
      renderOptimizedRecipe();
    }

    setStatus(refs.optimizeStatus, `Historique #${id} charge.`);
    updateActionButtons();
  } catch (error) {
    setStatus(refs.optimizeStatus, error.message, { error: true });
  }
}

function getLocalLibraryIngredients() {
  const names = new Set();

  try {
    const rawProducts = localStorage.getItem("nutrition-pwa-products");
    const products = rawProducts ? JSON.parse(rawProducts) : [];
    if (Array.isArray(products)) {
      for (const p of products) {
        const name = typeof p?.name === "string" ? p.name.trim().toLowerCase() : "";
        if (name) names.add(name);
      }
    }
  } catch {
    // localStorage inaccessible ou JSON invalide
  }

  try {
    const rawRecipes = localStorage.getItem("nutrition-pwa-recipes");
    const recipes = rawRecipes ? JSON.parse(rawRecipes) : [];
    if (Array.isArray(recipes)) {
      for (const r of recipes) {
        const ingredients = Array.isArray(r?.ingredients) ? r.ingredients : [];
        for (const ing of ingredients) {
          const name = typeof ing?.name === "string" ? ing.name.trim().toLowerCase() : "";
          if (name) names.add(name);
        }
      }
    }
  } catch {
    // localStorage inaccessible ou JSON invalide
  }

  return [...names].sort();
}

async function handleAdapt() {
  if (!state.parsedRecipe) {
    setStatus(refs.analyzeStatus, "Analyse la recette avant d'adapter.", { error: true });
    return;
  }

  state.loadingAdapt = true;
  updateActionButtons();
  setStatus(refs.analyzeStatus, "Adaptation avec tes ingredients en cours...");

  const extraIngredients = getLocalLibraryIngredients();

  try {
    const payload = await fetchJson("/api/recipe/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeJson: state.parsedRecipe, extraIngredients }),
    });

    if (!payload || typeof payload !== "object") {
      throw new Error("Reponse adapt invalide.");
    }

    state.optimizedPayload = {
      schema_version: "recipe-adapted.v1",
      mode: "adapte",
      optimized: payload.adapted,
      changes: payload.substitutions
        ? payload.substitutions.map((s) => ({ from: s.original, to: s.adapted, reason: s.reason }))
        : [],
      macros_per_serving: null,
      summary: payload.summary,
    };

    renderOptimizedRecipe();

    const historyLabel = payload.history_id ? ` (historique #${payload.history_id})` : "";
    setStatus(refs.analyzeStatus, `Adaptation terminee${historyLabel}. Recette sauvegardee en bibliotheque.`);

    await loadHistory();
  } catch (error) {
    setStatus(refs.analyzeStatus, error.message, { error: true });
  } finally {
    state.loadingAdapt = false;
    updateActionButtons();
  }
}

async function handleFileUpload(file) {
  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    setStatus(refs.fileStatus, "Type non supporte. Utilise JPEG, PNG, WebP ou PDF.", { error: true });
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setStatus(refs.fileStatus, "Fichier trop lourd (max 10 Mo).", { error: true });
    return;
  }

  setStatus(refs.fileStatus, "Analyse du fichier en cours...");
  state.loadingAnalyze = true;
  updateActionButtons();

  try {
    const formData = new FormData();
    formData.append("file", file);
    const sourceUrlRaw = refs.igUrl.value.trim();
    if (sourceUrlRaw) formData.append("sourceUrl", sourceUrlRaw);

    const response = await fetch("/api/recipe/parse-file", {
      method: "POST",
      body: formData,
    });

    const raw = await response.text();
    let payload = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }

    if (!response.ok) {
      const message = payload?.error || `Erreur serveur (${response.status})`;
      const details = payload?.details ? ` ${payload.details}` : "";
      throw new Error(`${message}${details}`.trim());
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Reponse parse-file invalide.");
    }

    state.parsedRecipe = payload;
    state.optimizedPayload = null;

    renderOriginalRecipe();
    renderOptimizedRecipe();
    updateActionButtons();

    setStatus(refs.fileStatus, `Fichier analyse : ${escapeHtml(file.name)}`);
    setStatus(refs.optimizeStatus, "");
    setStatus(refs.analyzeStatus, "");
  } catch (error) {
    setStatus(refs.fileStatus, error.message, { error: true });
  } finally {
    state.loadingAnalyze = false;
    updateActionButtons();
  }
}

async function handleAnalyze() {
  const text = buildParseInputText();
  if (!text) {
    setStatus(refs.analyzeStatus, "Saisis au moins un texte recette ou texte libre.", { error: true });
    return;
  }

  const sourceUrlRaw = refs.igUrl.value.trim();

  setStatus(refs.analyzeStatus, "Analyse en cours...");
  state.loadingAnalyze = true;
  updateActionButtons();

  try {
    const payload = await fetchJson("/api/recipe/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        sourceUrl: sourceUrlRaw || null,
      }),
    });

    if (!payload || typeof payload !== "object") {
      throw new Error("Reponse parse invalide.");
    }

    state.parsedRecipe = payload;
    state.optimizedPayload = null;

    renderOriginalRecipe();
    renderOptimizedRecipe();
    updateActionButtons();

    setStatus(refs.optimizeStatus, "");
    setStatus(refs.analyzeStatus, "Analyse terminee.");
  } catch (error) {
    setStatus(refs.analyzeStatus, error.message, { error: true });
  } finally {
    state.loadingAnalyze = false;
    updateActionButtons();
  }
}

async function handleOptimize() {
  if (!state.parsedRecipe) {
    setStatus(refs.optimizeStatus, "Analyse la recette avant optimisation.", { error: true });
    return;
  }

  const needsConfirmation = Boolean(state.parsedRecipe?.dish_type?.needs_user_confirmation);
  const dishTypeOverride = getDishTypeOverride();

  if (needsConfirmation && !dishTypeOverride) {
    setStatus(refs.optimizeStatus, "Confirme le type de plat (dessert/sale/snack).", {
      error: true,
    });
    return;
  }

  state.loadingOptimize = true;
  updateActionButtons();
  setStatus(refs.optimizeStatus, "Optimisation en cours...");

  try {
    const body = {
      recipeJson: state.parsedRecipe,
      mode: state.mode,
    };

    if (dishTypeOverride) {
      body.dishTypeOverride = dishTypeOverride;
    }

    const payload = await fetchJson("/api/recipe/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!payload || typeof payload !== "object") {
      throw new Error("Reponse optimize invalide.");
    }

    state.optimizedPayload = payload;
    renderOptimizedRecipe();

    const historyLabel = payload.history_id ? ` (historique #${payload.history_id})` : "";
    setStatus(refs.optimizeStatus, `Optimisation terminee${historyLabel}.`);

    await loadHistory();
  } catch (error) {
    setStatus(refs.optimizeStatus, error.message, { error: true });
  } finally {
    state.loadingOptimize = false;
    updateActionButtons();
  }
}

refs.recipeFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) handleFileUpload(file);
});

refs.analyzeBtn.addEventListener("click", () => {
  handleAnalyze();
});

refs.adaptBtn.addEventListener("click", () => {
  handleAdapt();
});

refs.optimizeBtn.addEventListener("click", () => {
  handleOptimize();
});

refs.modeSwitch.addEventListener("click", (event) => {
  const target = event.target.closest(".mode-btn");
  if (!target) return;
  const mode = target.dataset.mode;
  if (mode !== "equilibre" && mode !== "seche") return;
  state.mode = mode;
  updateModeButtons();
});

refs.printBtn.addEventListener("click", () => {
  const recipeTitle =
    state.optimizedPayload?.optimized?.title ||
    state.parsedRecipe?.title ||
    "Recipe Optimizer";
  printWithPdfName(recipeTitle, { beforePrint: prepareSinglePageOptimizerPrint });
});

refs.refreshHistoryBtn.addEventListener("click", () => {
  loadHistory();
});

refs.historyList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-history-id]");
  if (!target) return;
  const id = target.getAttribute("data-history-id");
  if (!id) return;
  openHistoryItem(id);
});

if (refs.homeLink) {
  refs.homeLink.addEventListener("click", (event) => {
    try {
      if (!document.referrer) return;
      const referrerUrl = new URL(document.referrer);
      if (referrerUrl.origin !== window.location.origin) return;
      event.preventDefault();
      window.history.back();
    } catch {
      // fallback to regular navigation
    }
  });
}

updateModeButtons();
updateActionButtons();
renderOriginalRecipe();
renderOptimizedRecipe();
loadHistory();
