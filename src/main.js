import "./style.css";
import "./mobile.css";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const root = document.querySelector("#app");

root.innerHTML = `
  <style>
    @media print {
      #globalEntryNav, #appShell > h1 { display: none !important; }
      #appNav, #cloudSyncPanel, #pageRecipes, #pageProducts, #pageCompare, #pageJournal, #pageWeekPlan, #pageRappel, #pageTrash, #pageImport { display: none !important; }
      #pageCreate { display: block !important; }
      #pageCreate > * { display: none !important; }
      #printCard { display: block !important; margin: 0 !important; padding: 0 !important; }
      #appShell { padding: 0 !important; margin: 0 !important; max-width: none !important; }
      body { background: #fff; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
      @page { size: A4; margin: 5mm; }
      html, body { height: 100% !important; overflow: hidden !important; }
      #printCardInner { transform-origin: top left; width: 100%; page-break-after: avoid !important; break-after: avoid !important; }
      #printCardInner .print-card { page-break-inside: avoid !important; break-inside: avoid !important; }
      #printCardInner .print-card { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      #printCardInner .print-ingredients .ing-line { break-inside: avoid !important; display: block !important; }
      #printCardInner .print-steps li { break-inside: avoid !important; }
      #printCardInner .print-cover { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
  <div id="appShell" style="font-family:system-ui; padding:16px; max-width:1100px; margin:0 auto;">
    <h1>Nutrition Recettes</h1>


    <div id="appNav" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
      <button id="navRecipes">Mes recettes</button>
      <button id="navCreate">Création de recette</button>
      <button id="navProducts">Bibliothèque de produit</button>
      <button id="navCompare">Comparer produits</button>
      <button id="navJournal">Journal & Planning</button>
      <button id="navShop">🛒 Courses</button>
      <button id="navRappel">Rappel</button>
      <button id="navTrash">Poubelle</button>
      <button id="navImport">Importer recette</button>
      <button id="navCloud" style="background:#0ea5e9; color:#fff; border:none; border-radius:8px; padding:7px 12px; font-weight:700; cursor:pointer;">☁️ Sync</button>
    </div>

    <div id="cloudModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:2000; align-items:center; justify-content:center; padding:16px;">
      <div style="background:#fff; border-radius:16px; padding:24px; width:100%; max-width:400px; box-shadow:0 8px 32px rgba(0,0,0,.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <strong style="font-size:17px;">☁️ Synchronisation cloud</strong>
          <button id="cloudModalClose" style="background:none; border:none; font-size:22px; cursor:pointer; padding:0 4px;">✕</button>
        </div>
        <div id="cloudStatus" style="font-size:13px; color:#555; margin-bottom:12px;"></div>

        <div id="cloudAuth" style="display:flex; flex-direction:column;">
          <input id="cloudEmail" type="email" placeholder="Email" style="width:100%; margin-bottom:8px; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:15px;" />
          <input id="cloudPassword" type="password" placeholder="Mot de passe" style="width:100%; margin-bottom:12px; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:15px;" />
          <div style="display:flex; gap:8px;">
            <button id="cloudSignIn" style="flex:1; background:#4f46e5; color:#fff; border:none; border-radius:8px; padding:10px; font-size:15px; font-weight:600; cursor:pointer;">Se connecter</button>
            <button id="cloudSignUp" style="flex:1; background:#e5e7eb; color:#111; border:none; border-radius:8px; padding:10px; font-size:15px; cursor:pointer;">Créer compte</button>
          </div>
        </div>

        <div id="cloudSignedIn" style="display:none; flex-direction:column; gap:8px;">
          <div id="cloudUserEmail" style="font-size:13px; color:#555;"></div>
          <button id="cloudPush" style="background:#4f46e5; color:#fff; border:none; border-radius:8px; padding:12px; font-size:15px; font-weight:600; cursor:pointer;">⬆️ Envoyer mes données vers le cloud</button>
          <button id="cloudPull" style="background:#0ea5e9; color:#fff; border:none; border-radius:8px; padding:12px; font-size:15px; font-weight:600; cursor:pointer;">⬇️ Récupérer les données du cloud</button>
          <button id="cloudSignOut" style="background:#f3f4f6; color:#111; border:none; border-radius:8px; padding:10px; font-size:14px; cursor:pointer;">Se déconnecter</button>
        </div>

        <div id="cloudHelp" style="font-size:12px; color:#888; margin-top:12px;"></div>
      </div>
    </div>

    <div id="pageRecipes">
      <h2>Mes recettes</h2>
      <div id="storageIndicator" style="font-size:12px; opacity:.7; margin:4px 0 8px;"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end; margin-bottom:8px;">
        <div style="flex:1; min-width:200px;">
          <label>Recherche</label><br/>
          <input id="recipeSearch" style="width:100%;" placeholder="Tape un nom…" />
        </div>
        <div style="width:170px;">
          <label>Trier</label><br/>
          <select id="recipeSort" style="width:100%;">
            <option value="recent">Plus récent</option>
            <option value="name">Nom (A→Z)</option>
            <option value="rating">Meilleures notes</option>
            <option value="madeit">Déjà fait en premier</option>
            <option value="notmadeit">Jamais fait en premier</option>
          </select>
        </div>
        <div style="display:flex; gap:6px; align-items:end; flex-wrap:wrap;">
          <button id="createRecipeFromList">Créer une nouvelle recette</button>
          <button id="exportData">Exporter</button>
          <button id="importData">Importer</button>
          <button id="autoExportToggle">Export auto: ON</button>
          <input id="importFile" type="file" accept="application/json" style="display:none;" />
        </div>
      </div>
      <div id="recipeList"></div>
      <div id="recipeSelected" style="font-size:12px; opacity:.7; margin-top:6px;"></div>
    </div>

    <div id="pageCreate" style="display:none;">
      <div id="createHeaderRow" style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
        <div style="flex:1; min-width:240px;">
          <label>Nom du repas</label><br/>
          <input id="mealName" style="width:100%;" placeholder="Pâtes pesto" />
        </div>
        <div style="width:140px;">
          <label>Portions</label><br/>
          <input id="portions" type="text" inputmode="decimal" value="1" style="width:100%;" />
        </div>
        <div style="width:200px;">
          <label>Multiplier (personnes/repas)</label><br/>
          <div style="display:flex; gap:6px; align-items:center;">
            <input id="portionMultiplier" type="text" inputmode="decimal" value="1" style="width:70px;" />
            <button id="applyMultiplier">Appliquer</button>
          </div>
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button data-mult="2">x2</button>
            <button data-mult="3">x3</button>
            <button data-mult="4">x4</button>
            <button data-mult="5">x5</button>
          </div>
        </div>
        <div style="min-width:170px;">
          <label>Format PDF</label><br/>
          <select id="pdfFormat" style="width:100%;">
            <option value="public">Public</option>
            <option value="computer">Ordinateur</option>
          </select>
        </div>
        <div style="display:flex; gap:8px; align-items:end; flex-wrap:wrap;">
          <button id="saveRecipe">Enregistrer</button>
          <button id="newRecipe">Nouvelle</button>
          <button id="exportPdf">Exporter PDF</button>
          <button id="recipeClaudeBtn" style="background:#7c3aed; color:#fff; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600;">🤖 Envoyer à Claude</button>
        </div>
      </div>
      <div style="font-size:12px; opacity:.7; margin-top:6px;">
        Brouillon enregistré automatiquement.
      </div>

      <hr style="margin:16px 0;" />

      <h2>Détails de la recette</h2>
      <div style="display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items:end;">
        <div style="grid-column: 1 / -1;">
          <label>Description</label><br/>
          <textarea id="recipeDesc" rows="2" style="width:100%;" placeholder="Description courte de la recette"></textarea>
        </div>
        <div>
          <label>Préparation (min)</label><br/>
          <input id="prepTime" type="text" inputmode="decimal" style="width:100%;" placeholder="ex: 15" />
        </div>
        <div>
          <label>Cuisson (min)</label><br/>
          <input id="cookTime" type="text" inputmode="decimal" style="width:100%;" placeholder="ex: 30" />
        </div>
        <div>
          <label>Difficulté</label><br/>
          <select id="difficulty" style="width:100%;">
            <option value="">--</option>
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="difficile">Difficile</option>
          </select>
        </div>
        <div>
          <label>Coût</label><br/>
          <select id="cost" style="width:100%;">
            <option value="">--</option>
            <option value="bon_marche">Bon marché</option>
            <option value="moyen">Moyen</option>
            <option value="cher">Assez cher</option>
          </select>
        </div>
        <div style="grid-column: 1 / -1;">
          <label>Source (lien)</label><br/>
          <input id="sourceLink" style="width:100%;" placeholder="Lien de la recette" />
        </div>
        <div style="grid-column: 1 / -1;">
          <label>Photo du plat (URL)</label><br/>
          <input id="recipeImageUrl" style="width:100%;" placeholder="https://..." />
          <div style="margin-top:6px;">
            <input id="recipeImageFile" type="file" accept="image/jpeg,image/jpg" />
          </div>
          <div id="recipeImagePreview" style="margin:8px auto 0; width:10cm; height:5.625cm; border:1px dashed #ccc; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#777; background:#fafafa;">
            Aperçu photo
          </div>
          <div style="font-size:12px; opacity:.6; margin-top:6px;">Astuce: place l’image dans le dossier public.</div>
        </div>
        <div style="grid-column: 1 / -1; display:flex; justify-content:flex-start;">
          <button id="goToProducts" style="background:#111; color:#fff; border:none; padding:10px 14px; border-radius:999px; font-weight:600; cursor:pointer;">
            Bibliothèque de produit
          </button>
        </div>
        <div style="grid-column: 1 / -1;">
          <label>Étapes</label><br/>
          <textarea id="recipeSteps" rows="5" style="width:100%;" placeholder="Étapes de préparation (1 par ligne)"></textarea>
          <div id="stepsPreview" style="margin-top:8px; display:grid; gap:8px;"></div>
        </div>
      </div>

      <hr style="margin:16px 0;" />

      <div id="createSplit" style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px; margin-top:16px;">
        <div>
          <h2>Ingrédients</h2>
          <div id="list"></div>
          <div style="margin-top:16px; border:2px dashed #fbbf24; border-radius:12px; padding:12px; background:#fffbeb;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span style="font-size:15px; font-weight:700; color:#92400e;">⭐ Extras</span>
              <span style="font-size:12px; color:#b45309; opacity:.8;">Ingrédients qui s'ajoutent aux macros sans modifier la recette de base</span>
            </div>
            <div id="extrasList"></div>
          </div>
        </div>
        <div>
          <h2>Résultat</h2>
          <pre id="totals" style="white-space:pre-wrap; background:#f6f6f6; padding:12px; border-radius:12px;"></pre>
        </div>
      </div>

      <div id="printCard" style="display:none; margin-top:16px;">
        <div id="printCardInner"></div>
      </div>

      <div id="recipeClaudePanel" style="display:none; margin-top:16px; border:2px solid #7c3aed; border-radius:12px; background:#faf7ff; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <strong style="font-size:15px;">🤖 Fichier pour Claude</strong>
          <div style="display:flex; gap:6px;">
            <button id="recipeClaudeCopy" style="background:#7c3aed; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:13px;">📋 Copier</button>
            <button id="recipeClaudeDownload" style="background:#1a2b4a; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:13px;">⬇️ .md</button>
            <button id="recipeClaudeClose" style="font-size:14px; padding:2px 8px; cursor:pointer;">✕</button>
          </div>
        </div>
        <div style="font-size:12px; color:#7c3aed; margin-bottom:8px;">👉 Copie ce texte et colle-le dans <strong>claude.ai</strong></div>
        <textarea id="recipeClaudeText" readonly style="width:100%; height:320px; font-size:12px; font-family:monospace; border:1px solid #d8b4fe; border-radius:8px; padding:10px; background:#fff; resize:vertical; box-sizing:border-box;"></textarea>
      </div>
    </div>

    <div id="pageProducts" style="display:none;">
      <h2>Bibliothèque de produits</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end; margin-bottom:8px;">
        <div style="flex:1; min-width:200px;">
          <label>Recherche produit</label><br/>
          <input id="productSearch" style="width:100%;" placeholder="Tape un nom de produit…" />
        </div>
        <div style="width:160px;">
          <label>Quantité ajoutée</label><br/>
          <input id="productQty" type="text" inputmode="decimal" value="100" style="width:100%;" />
        </div>
        <div style="width:220px;">
          <label>Unité recette</label><br/>
          <select id="productQtyUnit" style="width:100%;">
            <option value="base">unité du produit</option>
            <option value="g">grammes</option>
            <option value="tbsp">cuillère à soupe (15g / 15ml)</option>
            <option value="tsp">cuillère à café (5g / 5ml)</option>
          </select>
        </div>
        <div style="width:180px;">
          <label>Catégorie</label><br/>
          <select id="productCategoryFilter" style="width:100%;">
            <option value="">Toutes</option>
          </select>
        </div>
      </div>

      <div id="prodFormScroll" style="overflow-x:auto; padding-bottom:8px; scrollbar-gutter: stable;">
        <div id="prodFormGrid" style="display:grid; gap:10px; grid-template-columns: 1.2fr 140px 90px 80px repeat(10, 110px) 220px; align-items:end; min-width:max-content;">
          <input id="prodName" placeholder="Nom produit (ex: lardons)" />
          <input id="prodCategory" placeholder="Catégorie (ex: viande)" />

          <input id="prodBaseQty" type="text" inputmode="decimal" value="100" placeholder="Base (ex: 100)" />
          <select id="prodUnit">
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>

          <input id="prodKj" type="text" inputmode="decimal" placeholder="kJ" />
          <input id="prodKcal" type="text" inputmode="decimal" placeholder="kcal" />
          <input id="prodFat" type="text" inputmode="decimal" placeholder="matières grasses g" />
          <input id="prodSat" type="text" inputmode="decimal" placeholder="acides gras saturés g" />
          <input id="prodCarb" type="text" inputmode="decimal" placeholder="glucides g" />
          <input id="prodSugar" type="text" inputmode="decimal" placeholder="sucres g" />
          <input id="prodFiber" type="text" inputmode="decimal" placeholder="fibres alimentaires g" />
          <input id="prodProt" type="text" inputmode="decimal" placeholder="protéines g" />
          <input id="prodSalt" type="text" inputmode="decimal" placeholder="sel g" />
          <input id="prodCalcium" type="text" inputmode="decimal" placeholder="calcium g" />

          <div style="display:flex; gap:8px; align-items:center;">
            <button id="addProduct">Ajouter produit</button>
            <button id="cancelProductEdit" style="display:none;">Annuler</button>
          </div>
        </div>
      </div>
      <div id="prodImageGrid" style="display:grid; gap:10px; grid-template-columns: 1.2fr 1fr 180px; margin-top:8px; align-items:end;">
        <div>
          <label>Image (URL)</label><br/>
          <input id="prodImageUrl" style="width:100%;" placeholder="https://..." />
        </div>
        <div>
          <label>Image (fichier)</label><br/>
          <input id="prodImageFile" type="file" accept="image/*" />
        </div>
        <div id="prodImagePreview" style="height:64px; border:1px dashed #ccc; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#777;">
          Aperçu image
        </div>
      </div>
      <div style="margin:14px 0; border:1px solid #bbdefb; border-radius:10px; padding:12px; background:#e3f2fd;">
        <div style="font-weight:600; margin-bottom:8px;">🔍 Importer depuis Open Food Facts</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input id="offSearch" placeholder="Nom du produit (ex: yaourt grec)…" style="flex:1; min-width:180px;" />
          <button id="offSearchBtn">Rechercher</button>
          <label id="offScanBtn" style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; background:#1565c0; color:#fff; border-radius:6px; cursor:pointer; font-size:14px; font-weight:600;">
            📷 Scanner
            <input id="offScanInput" type="file" accept="image/*" capture="environment" style="display:none;" />
          </label>
        </div>
        <div id="offResults" style="margin-top:8px;"></div>
      </div>

      <div id="productList" style="margin-top:8px;"></div>
      <div style="font-size:12px; opacity:.7; margin-top:4px;">
        Clique sur un produit pour l’ajouter à la recette.
      </div>
    </div>

    <div id="pageCompare" style="display:none;">
      <h2>Comparer des produits</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end; margin-bottom:8px;">
        <div style="flex:1; min-width:200px;">
          <label>Recherche produit</label><br/>
          <input id="compareSearch" style="width:100%;" placeholder="Tape un nom de produit…" />
        </div>
        <div style="width:180px;">
          <label>Catégorie</label><br/>
          <select id="compareCategory" style="width:100%;">
            <option value="">Toutes</option>
          </select>
        </div>
        <div style="display:flex; gap:6px; align-items:end;">
          <button id="compareClear">Vider sélection</button>
        </div>
      </div>
      <div id="compareSelectionInfo" style="font-size:12px; opacity:.7; margin-bottom:8px;"></div>
      <div id="compareSelected" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;"></div>
      <div id="compareTableWrap" style="overflow-x:auto; border:1px solid #e5e5e5; border-radius:12px; padding:10px; background:#fafafa;"></div>
      <h3 style="margin-top:16px;">Catalogue</h3>
      <div id="compareList"></div>
    </div>

    <div id="pageJournal" style="display:none;"></div>
    <div id="pageShop" style="display:none;"></div>

    <div id="pageTrash" style="display:none;">
      <h2>Poubelle</h2>
      <div style="font-size:12px; opacity:.7; margin-bottom:10px;">
        Les éléments supprimés sont conservés 30 jours avant suppression définitive.
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <button id="trashEmpty">Vider la poubelle</button>
      </div>
      <div id="trashRecipes"></div>
      <div id="trashProducts" style="margin-top:16px;"></div>
    </div>

    <div id="pageImport" style="display:none;">
      <h2>Importer une recette externe</h2>
      <p style="font-size:13px; opacity:.7; margin-bottom:12px;">
        Colle le texte d'une recette (depuis Instagram, un site, un livre...). Le système detecte les ingrédients que tu as déjà dans ta bibliothèque.
      </p>
      <label for="importTitle" style="font-weight:600; display:block; margin-bottom:4px;">Titre de la recette</label>
      <input id="importTitle" type="text" placeholder="Ex: Poulet rôti aux herbes" style="width:100%; margin-bottom:10px;" />
      <label for="importText" style="font-weight:600; display:block; margin-bottom:4px;">Texte brut de la recette</label>
      <textarea id="importText" rows="10" placeholder="Colle ici la recette complète (ingrédients + étapes)..." style="width:100%; margin-bottom:10px;"></textarea>
      <button id="importParseBtn" style="margin-bottom:12px;">Analyser</button>
      <div id="importResult" style="display:none;">
        <div id="importMatchSection" style="margin-bottom:16px;">
          <h3 style="margin:0 0 6px;">Ingrédients détectés</h3>
          <div id="importMatchList"></div>
        </div>
        <div style="margin-bottom:12px;">
          <label for="importSteps" style="font-weight:600; display:block; margin-bottom:4px;">Étapes (modifiables)</label>
          <textarea id="importSteps" rows="8" style="width:100%;"></textarea>
        </div>
        <button id="importSaveBtn" style="font-weight:700;">Sauvegarder dans mes recettes</button>
        <p id="importSaveStatus" style="font-size:13px; margin-top:8px;"></p>
      </div>
    </div>

    <div id="pageWeekPlan" style="display:none;"></div>

    <div id="pageRappel" style="display:none;">
      <div style="max-width:720px; margin:0 auto; font-family:system-ui,sans-serif; color:#1a1a1a;">

        <!-- EN-TÊTE -->
        <div style="background:#1a2b4a; color:#fff; border-radius:12px 12px 0 0; padding:20px 24px 16px;">
          <div style="font-size:22px; font-weight:800; letter-spacing:.01em; margin-bottom:6px;">FICHE NUTRITION — SÈCHE 12%</div>
          <div style="font-size:13px; opacity:.75;">1,80m &bull; 68,5 kg &bull; Objectif : abdos visibles + muscles conservés</div>
        </div>

        <!-- MACROS RÉSUMÉ -->
        <div style="display:grid; grid-template-columns:repeat(4,1fr); border:1px solid #dde3ee; border-top:none; border-radius:0; overflow:hidden; margin-bottom:20px;">
          ${[
            { label: "CALORIES",  value: "2 100 – 2 200 kcal", color: "#e8501a" },
            { label: "PROTÉINES", value: "130 – 140 g",        color: "#2563eb" },
            { label: "GLUCIDES",  value: "220 – 240 g",        color: "#16a34a" },
            { label: "LIPIDES",   value: "55 – 65 g",          color: "#9333ea" },
          ].map((m, i) => `
            <div style="padding:14px 10px; text-align:center; ${i > 0 ? "border-left:1px solid #dde3ee;" : ""} background:#f8faff;">
              <div style="font-size:10px; font-weight:700; letter-spacing:.12em; color:${m.color}; margin-bottom:6px;">&#9632; ${m.label}</div>
              <div style="font-size:15px; font-weight:800; color:#1a1a1a;">${m.value}</div>
            </div>`).join("")}
        </div>

        <!-- SECTIONS MACROS -->
        ${[
          {
            color: "#2563eb",
            title: "PROTÉINES — 130 à 140g/jour",
            quoi: "Les briques de construction de tes muscles.",
            pourquoi: "Sans assez de protéines, ton corps mange ses propres muscles pour faire de l’énergie. En sèche c’est le macro le <strong>PLUS IMPORTANT</strong> — il préserve ta masse musculaire tout en perdant du gras.",
            aliments: "Poulet &bull; Dinde &bull; Œufs &bull; Thon &bull; Saumon &bull; Fromage blanc 0% &bull; Yaourt grec &bull; Cottage cheese &bull; Tofu",
            exemples: "200g de poulet = ~46g de protéines &nbsp;|&nbsp; 2 œufs = ~12g &nbsp;|&nbsp; 1 boîte de thon = ~26g",
          },
          {
            color: "#16a34a",
            title: "GLUCIDES — 220 à 240g/jour",
            quoi: "Le carburant principal de ton corps et de tes muscles.",
            pourquoi: "Ils donnent l’énergie pour t’entraîner et empêchent ton corps d’utiliser les protéines comme carburant. Sans glucides → fatigue, mauvaises performances, fonte musculaire.",
            aliments: "Riz &bull; Flocons d’avoine &bull; Patate douce &bull; Pain complet &bull; Lentilles &bull; Pois chiches &bull; Fruits &bull; Pâtes complètes",
            exemples: "150g de riz cuit = ~38g &nbsp;|&nbsp; 1 patate douce = ~26g &nbsp;|&nbsp; 1 banane = ~25g",
          },
          {
            color: "#9333ea",
            title: "LIPIDES — 55 à 65g/jour",
            quoi: "Les graisses essentielles pour ton corps et tes hormones.",
            pourquoi: "Les lipides régulent tes hormones (dont la testostérone — clé pour la muscu), absorbent les vitamines et protègent les articulations. Pas zéro gras — les bons gras !",
            aliments: "Huile d’olive &bull; Avocat &bull; Amandes &bull; Noix &bull; Saumon &bull; Œufs entiers &bull; Beurre de cacahuète",
            exemples: "1 c. à soupe d’huile d’olive = ~14g &nbsp;|&nbsp; ½ avocat = ~15g &nbsp;|&nbsp; 30g d’amandes = ~15g",
          },
        ].map(s => `
          <div style="border:1px solid #dde3ee; border-radius:10px; margin-bottom:14px; overflow:hidden;">
            <div style="background:${s.color}18; padding:10px 16px; border-bottom:2px solid ${s.color}30;">
              <span style="font-size:13px; font-weight:700; color:${s.color};">&#9632; ${s.title}</span>
            </div>
            <div style="padding:12px 16px; font-size:13px; line-height:1.65;">
              <div style="font-style:italic; margin-bottom:7px; opacity:.75;">C’est quoi ? ${s.quoi}</div>
              <div style="margin-bottom:7px;"><strong>Pourquoi c’est important ?</strong> ${s.pourquoi}</div>
              <div style="margin-bottom:7px;"><strong>Aliments clés :</strong> ${s.aliments}</div>
              <div style="font-style:italic; opacity:.7; font-size:12px;"><em>Exemples : ${s.exemples}</em></div>
            </div>
          </div>`).join("")}

        <!-- JOURNÉE TYPE -->
        <div style="border:1px solid #dde3ee; border-radius:10px; overflow:hidden; margin-bottom:14px;">
          <div style="background:#1a2b4a; padding:12px 16px;">
            <span style="font-size:14px; font-weight:700; color:#fff; letter-spacing:.04em;">&#9632; EXEMPLE DE JOURNÉE TYPE</span>
          </div>
          <div style="padding:0 16px;">
            ${[
              { icon: "☀️", label: "Petit-déjeuner", desc: "Flocons d’avoine 80g + lait écrémé + 1 banane + 3 œufs brouillés", macros: "~620 kcal | P: 35g G: 75g L: 18g" },
              { icon: "🍽️", label: "Déjeuner",       desc: "150g riz cuit + 200g poulet grillé + légumes rôtis + 1 c. huile d’olive", macros: "~580 kcal | P: 50g G: 60g L: 10g" },
              { icon: "🍎", label: "Collation",      desc: "Yaourt grec 200g + 30g amandes + 1 pomme", macros: "~360 kcal | P: 20g G: 35g L: 16g" },
              { icon: "🐟", label: "Dîner",          desc: "200g saumon + 200g patate douce + salade verte + vinaigrette", macros: "~550 kcal | P: 40g G: 45g L: 18g" },
              { icon: "🌙", label: "Collation soir", desc: "Cottage cheese 150g + 1 c. miel + quelques noix", macros: "~220 kcal | P: 22g G: 18g L: 8g" },
            ].map((m, i) => `
              <div style="display:grid; grid-template-columns:130px 1fr auto; gap:10px; align-items:center; padding:11px 0; font-size:13px; ${i > 0 ? "border-top:1px solid #eef0f5;" : ""}">
                <div style="font-weight:700;">${m.icon} ${m.label}</div>
                <div style="opacity:.8;">${m.desc}</div>
                <div style="font-size:11.5px; color:#555; white-space:nowrap; text-align:right;">${m.macros}</div>
              </div>`).join("")}
            <div style="display:grid; grid-template-columns:130px 1fr auto; gap:10px; align-items:center; padding:11px 0; border-top:2px solid #1a2b4a; font-size:13px;">
              <div style="font-weight:800; color:#1a2b4a;">TOTAL JOURNÉE</div>
              <div></div>
              <div style="font-weight:800; color:#1a2b4a; white-space:nowrap; text-align:right;">~2 330 kcal | P: 167g G: 233g L: 70g</div>
            </div>
          </div>
        </div>

        <!-- RÈGLES D’OR -->
        <div style="background:#e8501a; color:#fff; border-radius:10px; padding:13px 18px; font-size:13px; line-height:1.7; margin-bottom:8px;">
          <strong>&#9632; RÈGLES D’OR :</strong>
          Mange tes protéines EN PREMIER à chaque repas &bull;
          Ne saute JAMAIS un repas &bull;
          Bois 2,5L d’eau/jour &bull;
          Dors 8h minimum — c’est là que les muscles se construisent
        </div>

      </div>
    </div>
  </div>

`;

const $ = (q) => document.querySelector(q);
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const AUTO_IMPORT_URL = import.meta.env.VITE_AUTO_IMPORT_URL || "/auto-import.json";
const AUTO_EXPORT_KEY = "nutrition-pwa-auto-export";
const AUTO_IMPORT_APPLIED_KEY = "nutrition-pwa-auto-import-applied";
const DRAFT_KEY = "nutrition-pwa-draft";
const RECIPES_KEY = "nutrition-pwa-recipes";
const PRODUCTS_KEY = "nutrition-pwa-products";
const FREE_DISHES_KEY = "nutrition-pwa-free-dishes";
const BACKUP_KEY = "nutrition-pwa-backup";
const BACKUP_HISTORY_KEY = "nutrition-pwa-backup-history";
const SESSION_NAV_BACKUP_KEY = "nutrition-pwa-session-backup";
const TRACK_KEY = "nutrition-pwa-track";
const TRACK_WEEK_TOTALS_KEY = "nutrition-pwa-track-week-totals";
const WEEK_PLANS_KEY = "nutrition-pwa-week-plans";
const TRASH_KEY = "nutrition-pwa-trash";
const SHOP_LISTS_KEY = "nutrition-pwa-shop-lists";
const FREE_DAYS_KEY = "nutrition-pwa-free-days";
const LOCAL_UPDATED_AT_KEY = "nutrition-pwa-local-updated-at";
const CLOUD_TABLE = "nutrition_sync";
const DB_NAME = "nutrition-pwa-db";
const DB_STORE = "kv";
const BACKUP_HISTORY_LIMIT = 20;
const BACKUP_HISTORY_INTERVAL_MS = 10 * 60 * 1000;
const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const PDF_IMAGE_WIDTH = 3840;
const PDF_IMAGE_HEIGHT = 2160;

let storageMode = "local";
let dbPromise = null;
let supabase = null;
let cloudUser = null;
let cloudSyncTimer = null;
let cloudSyncPending = false;
let cloudBusy = false;
let suppressCloudSync = false;
let periodicBackupTimer = null;
let printCoverOverride = "";
let lastPdfCoverSource = "";
let lastPdfCoverSquare = "";

function openDb() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const req = store.put({ key, value });
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

function storageGetLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storageSetLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

async function storageGet(key) {
  if (storageMode !== "idb") return storageGetLocal(key);
  const value = await idbGet(key);
  if (value !== null) return value;
  const localValue = storageGetLocal(key);
  if (localValue !== null) {
    idbSet(key, localValue);
    return localValue;
  }
  return null;
}

function storageSet(key, value) {
  if (storageMode === "idb") {
    idbSet(key, value);
    storageSetLocal(key, value);
    return true;
  }
  return storageSetLocal(key, value);
}

async function migrateLocalToIdb() {
  const keys = [DRAFT_KEY, RECIPES_KEY, PRODUCTS_KEY, FREE_DISHES_KEY, BACKUP_KEY, TRACK_KEY, TRACK_WEEK_TOTALS_KEY, TRASH_KEY];
  for (const key of keys) {
    const data = storageGetLocal(key);
    if (data === null) continue;
    const ok = await idbSet(key, data);
    if (ok) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}

async function initStorage() {
  const db = await openDb();
  if (db) {
    storageMode = "idb";
    await migrateLocalToIdb();
  } else {
    storageMode = "local";
  }
}

function setLocalUpdatedAt(ts = Date.now()) {
  try {
    localStorage.setItem(LOCAL_UPDATED_AT_KEY, String(ts));
  } catch {
    // ignore
  }
}

function getLocalUpdatedAt() {
  try {
    const raw = localStorage.getItem(LOCAL_UPDATED_AT_KEY);
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function isAutoExportEnabled() {
  try {
    const raw = localStorage.getItem(AUTO_EXPORT_KEY);
    if (raw === null) return true;
    return raw !== "0";
  } catch {
    return true;
  }
}

function setAutoExportEnabled(next) {
  try {
    localStorage.setItem(AUTO_EXPORT_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
  updateAutoExportButton();
}

function updateAutoExportButton() {
  const btn = $("#autoExportToggle");
  if (!btn) return;
  const enabled = isAutoExportEnabled();
  btn.textContent = enabled ? "Export auto: ON" : "Export auto: OFF";
}

function ensureAutoExportDefault() {
  try {
    if (localStorage.getItem(AUTO_EXPORT_KEY) === null) {
      localStorage.setItem(AUTO_EXPORT_KEY, "1");
    }
  } catch {
    // ignore
  }
}

function formatDateTime(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return "";
  try {
    return new Date(ts).toLocaleString("fr-FR");
  } catch {
    return "";
  }
}

function sanitizePdfName(value, fallback = "Nutrition Recettes") {
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

function prepareSinglePageRecipePrint() {
  const printRoot = $("#printCard");
  const wrapper = $("#printCardInner");
  const card = wrapper?.querySelector(".print-card");
  if (!wrapper || !card) return null;

  const prevStyles = {
    printRoot: printRoot?.style.cssText || "",
    wrapper: wrapper.style.cssText,
    card: card.style.cssText,
  };

  const pageWidthPx = mmToPx(210 - 10);
  const pageHeightPx = mmToPx(283);

  // Positionne hors écran pour mesurer
  if (printRoot) {
    printRoot.style.display = "block";
    printRoot.style.position = "fixed";
    printRoot.style.left = "-20000px";
    printRoot.style.top = "0";
    printRoot.style.width = `${pageWidthPx}px`;
    printRoot.style.margin = "0";
    printRoot.style.visibility = "hidden";
    printRoot.style.pointerEvents = "none";
    printRoot.style.zIndex = "-1";
  }
  wrapper.style.transform = "none";
  wrapper.style.transformOrigin = "top left";
  wrapper.style.width = "100%";
  wrapper.style.margin = "0";
  card.style.margin = "0";

  // Recherche binaire : trouve la taille de police qui remplit exactement la page.
  // Plafond à 13px : au-delà les caractères deviennent grossiers.
  // La carte utilise des em, donc changer font-size sur le card suffit.
  let lo = 7.5, hi = 13, bestSize = 10;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    card.style.fontSize = `${mid}px`;
    const h = card.scrollHeight;
    if (h <= pageHeightPx * 0.995) {
      bestSize = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  card.style.fontSize = `${bestSize}px`;

  if (printRoot) {
    printRoot.style.cssText = prevStyles.printRoot;
  }

  return () => {
    if (printRoot) printRoot.style.cssText = prevStyles.printRoot;
    wrapper.style.cssText = prevStyles.wrapper;
    card.style.cssText = prevStyles.card;
  };
}

function printWithPdfName(name, options = {}) {
  const previousTitle = document.title || "Nutrition Recettes";
  const nextTitle = sanitizePdfName(name, previousTitle);
  const cleanupPrintLayout =
    typeof options.beforePrint === "function"
      ? options.beforePrint() || null
      : null;
  const afterPrint =
    typeof options.afterPrint === "function"
      ? options.afterPrint
      : null;
  let restored = false;

  const restore = () => {
    if (restored) return;
    restored = true;
    if (typeof cleanupPrintLayout === "function") cleanupPrintLayout();
    if (typeof afterPrint === "function") afterPrint();
    document.title = previousTitle;
  };

  document.title = nextTitle;
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
  setTimeout(restore, 2500);
}

function hasDraftContent(draft) {
  if (!draft || typeof draft !== "object") return false;
  if (typeof draft.name === "string" && draft.name.trim()) return true;
  if (typeof draft.description === "string" && draft.description.trim()) return true;
  if (typeof draft.steps === "string" && draft.steps.trim()) return true;
  if (typeof draft.image === "string" && draft.image.trim()) return true;
  if (Array.isArray(draft.ingredients) && draft.ingredients.length > 0) return true;
  return false;
}

function getTrackItemCount(track) {
  if (!track || typeof track !== "object") return 0;
  if (Array.isArray(track.items)) {
    return track.items.filter(isTrackItemSupported).length;
  }
  const days = track.days && typeof track.days === "object" ? track.days : null;
  if (!days) return 0;
  return Object.values(days).reduce((sum, items) => {
    return sum + (Array.isArray(items) ? items.filter(isTrackItemSupported).length : 0);
  }, 0);
}

function hasTrackData(track) {
  return getTrackItemCount(track) > 0;
}

function hasFreeDishesData(freeDishes) {
  return Array.isArray(freeDishes) && freeDishes.length > 0;
}

function hasTrashData(trash) {
  const products = Array.isArray(trash?.products) ? trash.products : [];
  const recipes = Array.isArray(trash?.recipes) ? trash.recipes : [];
  return products.length > 0 || recipes.length > 0;
}

function hasTrackWeekTotalsData(weeks) {
  return Array.isArray(weeks) && weeks.length > 0;
}

function hasStateData() {
  if (state.recipes.length > 0 || state.products.length > 0) return true;
  if (hasFreeDishesData(state.freeDishes)) return true;
  if (hasDraftContent({
    name: state.name,
    description: state.description,
    steps: state.steps,
    image: state.image,
    ingredients: state.ingredients,
  })) return true;
  if (hasTrackData(buildTrackPayload())) return true;
  if (hasTrackWeekTotalsData(state.trackWeekTotals)) return true;
  if (hasTrashData(state.trash)) return true;
  return false;
}

function parseBackupInfo(payload) {
  if (!payload || typeof payload !== "object") return null;
  const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
  const products = Array.isArray(payload.products) ? payload.products : [];
  const freeDishes = Array.isArray(payload.freeDishes) ? payload.freeDishes : [];
  const hasDraft = hasDraftContent(payload.draft);
  const hasTrack = hasTrackData(payload.track);
  const hasTrackWeekTotals = hasTrackWeekTotalsData(payload.trackWeekTotals);
  const hasTrash = hasTrashData(payload.trash);
  const updatedAt = Number(payload.updatedAt) || Number(payload.exportedAt) || 0;
  const hasData = recipes.length > 0 || products.length > 0 || freeDishes.length > 0 || hasDraft || hasTrack || hasTrackWeekTotals || hasTrash;
  return {
    payload,
    recipesCount: recipes.length,
    productsCount: products.length,
    freeDishesCount: freeDishes.length,
    trackCount: getTrackItemCount(payload.track),
    updatedAt,
    hasData,
  };
}

async function getLocalBackupInfo() {
  const payload = await storageGet(BACKUP_KEY);
  return parseBackupInfo(payload);
}

function isAutoImportApplied() {
  try {
    return localStorage.getItem(AUTO_IMPORT_APPLIED_KEY) === "1";
  } catch {
    return false;
  }
}

function markAutoImportApplied() {
  try {
    localStorage.setItem(AUTO_IMPORT_APPLIED_KEY, "1");
  } catch {
    // ignore
  }
}

function clearSessionNavBackup() {
  try {
    sessionStorage.removeItem(SESSION_NAV_BACKUP_KEY);
  } catch {
    // ignore
  }
}

function readSessionNavBackup() {
  try {
    const raw = sessionStorage.getItem(SESSION_NAV_BACKUP_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function saveSessionNavBackup() {
  try {
    const payload = buildExportPayload();
    sessionStorage.setItem(SESSION_NAV_BACKUP_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

async function storageSetHistory(key, value) {
  if (storageMode === "idb") {
    return idbSet(key, value);
  }
  return storageSetLocal(key, value);
}

async function loadBackupHistory() {
  const data = await storageGet(BACKUP_HISTORY_KEY);
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const ts = Number(entry.ts) || Number(entry.updatedAt) || Number(entry.payload?.updatedAt) || 0;
      if (!ts) return null;
      return {
        ts,
        payload: entry.payload,
        recipesCount: Number(entry.recipesCount) || 0,
        productsCount: Number(entry.productsCount) || 0,
        trackCount: Number(entry.trackCount) || 0,
      };
    })
    .filter(Boolean);
}

async function saveBackupHistory(payload) {
  try {
    const info = parseBackupInfo(payload);
    if (!info || !info.hasData) return false;
    const history = await loadBackupHistory();
    const last = history[history.length - 1];
    const ts = Number(info.updatedAt) || Date.now();
    if (last && ts - last.ts < BACKUP_HISTORY_INTERVAL_MS) return false;
    const next = history.concat([{
      ts,
      payload,
      recipesCount: info.recipesCount,
      productsCount: info.productsCount,
      trackCount: info.trackCount,
    }]);
    while (next.length > BACKUP_HISTORY_LIMIT) next.shift();
    await storageSetHistory(BACKUP_HISTORY_KEY, next);
    return true;
  } catch {
    return false;
  }
}

async function restoreBackupFromHistory() {
  const history = await loadBackupHistory();
  if (history.length === 0) {
    alert("Aucun historique de sauvegardes.");
    return false;
  }
  const ordered = [...history].sort((a, b) => b.ts - a.ts);
  const lines = ordered.map((entry, idx) => {
    const when = formatDateTime(entry.ts);
    const detail = `${entry.recipesCount} recette(s), ${entry.productsCount} produit(s)`;
    const track = entry.trackCount ? `, ${entry.trackCount} élément(s) track` : "";
    return `${idx + 1}) ${when || "Date inconnue"} — ${detail}${track}`;
  }).join("\n");
  const choice = prompt(`Choisis une sauvegarde à restaurer :\n${lines}`);
  if (!choice) return false;
  const index = Number(choice) - 1;
  if (!Number.isFinite(index) || index < 0 || index >= ordered.length) {
    alert("Choix invalide.");
    return false;
  }
  const entry = ordered[index];
  const when = formatDateTime(entry.ts);
  const ok = confirm(`Restaurer la sauvegarde du ${when || "moment choisi"} ?`);
  if (!ok) return false;
  if (!entry.payload || typeof entry.payload !== "object") {
    alert("Sauvegarde invalide.");
    return false;
  }
  applyImportPayload(entry.payload, { suppressCloud: true, localUpdatedAt: entry.ts || Date.now() });
  return true;
}

function startPeriodicBackup() {
  if (periodicBackupTimer) return;
  periodicBackupTimer = setInterval(() => {
    try {
      syncStateFromInputs();
      pruneTrash();
      saveBackup();
      maybeAutoExportDownload();
    } catch {
      // ignore
    }
  }, BACKUP_HISTORY_INTERVAL_MS);
}

function maybeAutoExportDownload() {
  if (!isAutoExportEnabled()) return;
  if (document.visibilityState === "hidden") return;
  const payload = buildExportPayload();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(payload, `nutrition-pwa-auto-${stamp}.json`);
}

function applyBackupInfo(info) {
  const ts = Number.isFinite(info.updatedAt) && info.updatedAt > 0 ? info.updatedAt : Date.now();
  applyImportPayload(info.payload, { suppressCloud: true, localUpdatedAt: ts });
  setCloudStatus("Sauvegarde locale restaurée.");
}

async function restoreLocalBackup({ prompt = true } = {}) {
  const info = await getLocalBackupInfo();
  if (!info || !info.hasData) {
    if (prompt) alert("Aucune sauvegarde locale trouvée.");
    return false;
  }
  if (prompt) {
    const when = formatDateTime(info.updatedAt);
    const detail = `${info.recipesCount} recette(s), ${info.productsCount} produit(s)`;
    const ok = confirm(
      `Sauvegarde locale trouvée (${detail}${when ? " • " + when : ""}). Restaurer ?`
    );
    if (!ok) return false;
  }
  applyBackupInfo(info);
  return true;
}

async function maybeRestoreSessionBackupOnEmpty() {
  if (hasStateData()) return false;
  const payload = readSessionNavBackup();
  const info = parseBackupInfo(payload);
  if (!info || !info.hasData) return false;
  const ts = Number.isFinite(info.updatedAt) && info.updatedAt > 0 ? info.updatedAt : Date.now();
  applyImportPayload(payload, { suppressCloud: true, localUpdatedAt: ts });
  clearSessionNavBackup();
  setCloudStatus("Session precedente restauree.");
  return true;
}

async function maybeRestoreBackupOnEmpty() {
  if (hasStateData()) return;
  const info = await getLocalBackupInfo();
  if (!info || !info.hasData) return;
  const when = formatDateTime(info.updatedAt);
  const detail = `${info.recipesCount} recette(s), ${info.productsCount} produit(s)`;
  const ok = confirm(
    `Sauvegarde locale trouvée (${detail}${when ? " • " + when : ""}). Restaurer ?`
  );
  if (!ok) return;
  applyBackupInfo(info);
}

async function maybeAutoImportFromUrl() {
  if (!AUTO_IMPORT_URL) return false;
  if (isAutoImportApplied()) return false;
  if (hasStateData()) return false;
  const backupInfo = await getLocalBackupInfo();
  if (backupInfo?.hasData) return false;
  try {
    const res = await fetch(AUTO_IMPORT_URL, { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    const ts = Number(data?.exportedAt) || Date.now();
    applyImportPayload(data, { suppressCloud: true, localUpdatedAt: ts });
    markAutoImportApplied();
    setCloudStatus("Import auto terminé.");
    return true;
  } catch {
    return false;
  }
}

function setCloudStatus(text) {
  const el = $("#cloudStatus");
  if (el) el.textContent = text;
}

function setCloudHelp(text) {
  const el = $("#cloudHelp");
  if (el) el.textContent = text;
}

function updateCloudUI() {
  const auth = $("#cloudAuth");
  const signed = $("#cloudSignedIn");
  const email = $("#cloudUserEmail");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (auth) auth.style.display = "none";
    if (signed) signed.style.display = "none";
    setCloudStatus("Sync cloud non configurée.");
    setCloudHelp("Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.");
    return;
  }
  if (cloudUser) {
    if (auth) auth.style.display = "none";
    if (signed) signed.style.display = "flex";
    if (email) email.textContent = `Connecté: ${cloudUser.email || "utilisateur"}`;
    setCloudHelp("Sync automatique active.");
  } else {
    if (auth) auth.style.display = "flex";
    if (signed) signed.style.display = "none";
    if (email) email.textContent = "";
    setCloudHelp("Connecte-toi pour synchroniser tes données.");
  }
}

async function fetchCloudPayload() {
  if (!supabase || !cloudUser) return null;
  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select("payload, updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    setCloudStatus("Erreur lors du chargement cloud.");
    return null;
  }
  if (!data || !data.payload) return null;
  const remoteAt = Number(data.payload.exportedAt) || Date.parse(data.updated_at) || 0;
  return { payload: data.payload, remoteAt };
}

async function pullFromCloud({ promptIfRemoteNewer = false } = {}) {
  if (!supabase || !cloudUser) return;
  if (cloudBusy) return;
  cloudBusy = true;
  setCloudStatus("Sync: récupération...");
  const remote = await fetchCloudPayload();
  if (!remote) {
    setCloudStatus("Aucune donnée cloud.");
    cloudBusy = false;
    return;
  }
  const localAt = getLocalUpdatedAt();
  if (promptIfRemoteNewer && localAt && remote.remoteAt && remote.remoteAt > localAt) {
    const ok = confirm("Données cloud plus récentes détectées. Remplacer les données locales ?");
    if (!ok) {
      setCloudStatus("Données locales conservées.");
      cloudBusy = false;
      return;
    }
  }
  applyImportPayload(remote.payload, { suppressCloud: true });
  setLocalUpdatedAt(remote.remoteAt || Date.now());
  setCloudStatus("Données cloud chargées.");
  cloudBusy = false;
}

async function pushToCloud() {
  if (!supabase || !cloudUser) return;
  if (cloudBusy) return;
  cloudBusy = true;
  setCloudStatus("Sync: envoi...");
  const payload = buildExportPayload();
  setLocalUpdatedAt(payload.exportedAt || Date.now());
  const { error } = await supabase
    .from(CLOUD_TABLE)
    .upsert({
      user_id: cloudUser.id,
      payload,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    setCloudStatus("Erreur lors de l'envoi cloud.");
  } else {
    setCloudStatus("Sync cloud ok.");
  }
  cloudSyncPending = false;
  cloudBusy = false;
}

function scheduleCloudSync() {
  if (!supabase || !cloudUser) return;
  cloudSyncPending = true;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    if (cloudSyncPending) pushToCloud();
  }, 1500);
}

function markLocalUpdated() {
  setLocalUpdatedAt(Date.now());
  if (!suppressCloudSync) scheduleCloudSync();
}

async function handleCloudSession(session) {
  cloudUser = session?.user || null;
  updateCloudUI();
  if (!cloudUser) return;

  setCloudStatus("Connecté.");
  const remote = await fetchCloudPayload();
  const localAt = getLocalUpdatedAt();
  if (!remote) {
    if (localAt) await pushToCloud();
    return;
  }
  if (!localAt) {
    applyImportPayload(remote.payload, { suppressCloud: true });
    setLocalUpdatedAt(remote.remoteAt || Date.now());
    setCloudStatus("Données cloud chargées.");
    return;
  }
  if (remote.remoteAt > localAt) {
    const ok = confirm("Données cloud plus récentes détectées. Remplacer les données locales ?");
    if (ok) {
      applyImportPayload(remote.payload, { suppressCloud: true });
      setLocalUpdatedAt(remote.remoteAt || Date.now());
      setCloudStatus("Données cloud chargées.");
    } else {
      await pushToCloud();
    }
    return;
  }
  if (localAt > remote.remoteAt) {
    await pushToCloud();
    return;
  }
  setCloudStatus("Sync à jour.");
}

async function initCloud() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    updateCloudUI();
    return;
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await supabase.auth.getSession();
  await handleCloudSession(data?.session || null);
  supabase.auth.onAuthStateChange((_event, session) => {
    handleCloudSession(session);
  });
}

const _history = [];
const HISTORY_MAX = 30;
let _undoing = false;

const _ingHistory = [];
const ING_HISTORY_MAX = 30;
function pushIngHistory() {
  _ingHistory.push(JSON.parse(JSON.stringify(state.ingredients)));
  if (_ingHistory.length > ING_HISTORY_MAX) _ingHistory.shift();
}
function undoIngredient() {
  if (_ingHistory.length === 0) return false;
  state.ingredients = _ingHistory.pop();
  render();
  showUndoToast();
  return true;
}

function pushHistory() {
  if (_undoing) return;
  _history.push({
    recipes: JSON.parse(JSON.stringify(state.recipes)),
    products: JSON.parse(JSON.stringify(state.products)),
  });
  if (_history.length > HISTORY_MAX) _history.shift();
}

function undo() {
  if (_history.length === 0) return;
  const snapshot = _history.pop();
  _undoing = true;
  state.recipes = snapshot.recipes.map(normalizeRecipe);
  state.products = snapshot.products;
  saveRecipes();
  saveProducts();
  _undoing = false;
  render();
  renderRecipeList();
  renderProductLibrary();
  showUndoToast();
}

function showUndoToast() {
  let toast = document.getElementById("_undoToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "_undoToast";
    toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;";
    document.body.appendChild(toast);
  }
  toast.textContent = "Annulé ✓";
  toast.style.opacity = "1";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = "0"; }, 1800);
}

// ── Open Food Facts ─────────────────────────────────────────────────────────

let _offResults = [];
let _offSearching = false;

function _offGet(nutriments, key) {
  const v = nutriments?.[key + "_100g"];
  return v !== undefined && v !== null ? v : null;
}

function _offFill(id, val) {
  const el = document.getElementById(id);
  if (el && val !== null && val !== undefined) el.value = typeof val === "number" ? parseFloat(val.toFixed(2)) : val;
}

function renderOFFResults(products) {
  _offResults = products;
  const div = $("#offResults");
  if (!div) return;
  if (!products.length) { div.innerHTML = "<p style='opacity:.7'>Aucun produit trouvé.</p>"; return; }
  div.innerHTML = products.map((p, i) => {
    const n = p.nutriments || {};
    const kcal = _offGet(n, "energy-kcal") ?? (_offGet(n, "energy") ? Math.round(_offGet(n, "energy") / 4.184) : "?");
    const prot = _offGet(n, "proteins");
    const carb = _offGet(n, "carbohydrates");
    const fat  = _offGet(n, "fat");
    const name = p.product_name || p.product_name_fr || "Produit sans nom";
    const img  = p.image_front_small_url || p.image_small_url || "";
    const fmt  = (v) => v !== null ? parseFloat(v.toFixed(1)) : "?";
    return `<div style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:6px;background:#fff;">
      ${img ? `<img src="${img}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" onerror="this.style.display='none'" />` : `<div style="width:48px;height:48px;border-radius:6px;background:#eee;flex-shrink:0;"></div>`}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
        <div style="font-size:12px;opacity:.7;">100g : ${kcal} kcal | P ${fmt(prot)}g | G ${fmt(carb)}g | L ${fmt(fat)}g</div>
      </div>
      <button onclick="offImport(${i})" style="flex-shrink:0;background:#1976d2;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;">Importer</button>
    </div>`;
  }).join("");
}

async function offSearchByName(query) {
  const div = $("#offResults");
  if (!div || !query.trim()) return;
  div.innerHTML = "<p style='opacity:.7'>Recherche en cours…</p>";
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=8&search_simple=1&action=process&lc=fr&fields=product_name,product_name_fr,nutriments,image_front_small_url,image_small_url,categories_tags`;
    const res = await fetch(url);
    const data = await res.json();
    renderOFFResults(data.products || []);
  } catch {
    div.innerHTML = "<p style='color:red;'>Erreur de connexion à Open Food Facts.</p>";
  }
}

async function _offFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function offSearchByBarcode(barcode) {
  if (_offSearching) return;
  _offSearching = true;
  const div = $("#offResults");
  if (div) div.innerHTML = `<p style='opacity:.7'>Code détecté : <strong>${barcode}</strong> — recherche en cours…</p>`;
  const fields = "product_name,product_name_fr,nutriments,image_front_small_url,image_small_url,categories_tags";
  try {
    // Use same search endpoint as name search (avoids CORS issues with /api/v2/)
    const data = await _offFetch(
      `https://world.openfoodfacts.org/cgi/search.pl?code=${encodeURIComponent(barcode)}&json=true&page_size=1&action=process&fields=${fields}`
    );
    const products = data.products || [];
    if (products.length > 0) {
      renderOFFResults(products);
    } else {
      if (div) div.innerHTML = `<p style='opacity:.7'>Produit (${barcode}) non trouvé dans Open Food Facts.</p>`;
    }
  } catch (err) {
    if (div) div.innerHTML = `<p style='color:orange;'>Code scanné : <strong>${barcode}</strong><br>Clique sur "Rechercher" pour réessayer, ou vérifie ta connexion (${err.message}).</p>`;
  } finally {
    _offSearching = false;
  }
}

window.offImport = function(index) {
  const p = _offResults[index];
  if (!p) return;
  const n = p.nutriments || {};
  const kcalRaw = _offGet(n, "energy-kcal");
  const kjRaw   = _offGet(n, "energy");
  const kcal = kcalRaw ?? (kjRaw ? kjRaw / 4.184 : null);
  const kj   = kjRaw   ?? (kcalRaw ? kcalRaw * 4.184 : null);
  const name = p.product_name || p.product_name_fr || "";
  _offFill("prodName",  name);
  _offFill("prodKcal",  kcal);
  _offFill("prodKj",    kj);
  _offFill("prodFat",   _offGet(n, "fat"));
  _offFill("prodSat",   _offGet(n, "saturated-fat"));
  _offFill("prodCarb",  _offGet(n, "carbohydrates"));
  _offFill("prodSugar", _offGet(n, "sugars"));
  _offFill("prodFiber", _offGet(n, "fiber"));
  _offFill("prodProt",  _offGet(n, "proteins"));
  _offFill("prodSalt",  _offGet(n, "salt"));
  _offFill("prodBaseQty", 100);
  const imgSrc = p.image_front_small_url || p.image_small_url || "";
  _offFill("prodImageUrl", imgSrc);
  setProductImagePreview(imgSrc);
  if (p.categories_tags?.length) {
    const cat = p.categories_tags[0].replace(/^(fr|en):/, "").replace(/-/g, " ");
    _offFill("prodCategory", cat);
  }
  $("#offResults").innerHTML = `<p style="color:#1976d2;font-weight:600;">✓ Formulaire rempli avec « ${name} ». Vérifie les valeurs et clique sur Ajouter produit.</p>`;
  $("#prodName").scrollIntoView({ behavior: "smooth", block: "center" });
  $("#prodName").focus();
};

async function offDecodePhoto(file) {
  const div = $("#offResults");
  if (div) div.innerHTML = "<p style='opacity:.7'>Analyse de la photo…</p>";

  // Try native BarcodeDetector first
  if ("BarcodeDetector" in window) {
    try {
      const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      const codes = await detector.detect(file);
      if (codes.length > 0) {
        const code = codes[0].rawValue;
        if ($("#offSearch")) $("#offSearch").value = code;
        return offSearchByBarcode(code);
      }
    } catch { /* fallthrough to ZXing */ }
  }

  // Fallback: ZXing image decode
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const url = URL.createObjectURL(file);
    try {
      const result = await reader.decodeFromImageUrl(url);
      const code = result.getText();
      if ($("#offSearch")) $("#offSearch").value = code;
      return offSearchByBarcode(code);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    if (div) div.innerHTML = "<p style='color:orange;'>Code-barres non reconnu sur la photo.<br>Essaie de te rapprocher ou d'améliorer l'éclairage, puis rescanne.</p>";
  }
}

// ────────────────────────────────────────────────────────────────────────────

const state = {
  name: "",
  portions: 1,
  description: "",
  image: "",
  prepTime: "",
  cookTime: "",
  difficulty: "",
  cost: "",
  source: "",
  steps: "",
  ingredients: [],
  products: [],
  recipes: [],
  trash: { products: [], recipes: [] },
  selectedId: null,
  search: "",
  sort: "recent",
  productSearch: "",
  productQty: "100",
  productQtyUnit: "base",
  productCategoryFilter: "",
  compareSearch: "",
  compareCategory: "",
  compareSelected: [],
  productEditId: null,
  page: "recipes",
  track: { date: "", items: [] },
  trackHistory: {},
  trackProductSearch: "",
  trackRecipeSearch: "",
  trackProductQty: "100",
  trackRecipePortions: "1",
  trackRecipeUnit: "portion",
  trackWeekTotals: [],
  freeDishes: [],
  extras: [],
  weekPlans: {},
  weekPlanDate: "",
  journalDay: "",
  _wpClipboard: null,
  shopLists: [],
  freeDays: {},
  pdfFormat: "public",
};

const FIELDS = [
  { key: "kj", label: "Valeur énergétique (kJ)", short: "kJ", unit: "kJ", decimals: 0 },
  { key: "kcal", label: "Valeur énergétique (kcal)", short: "kcal", unit: "kcal", decimals: 0 },
  { key: "fat", label: "Matières grasses (lipides)", short: "matières grasses", unit: "g", decimals: 1 },
  { key: "sat", label: "Acides gras saturés", short: "acides gras saturés", unit: "g", decimals: 1 },
  { key: "carb", label: "Glucides", short: "glucides", unit: "g", decimals: 1 },
  { key: "sugar", label: "Sucres", short: "sucres", unit: "g", decimals: 1 },
  { key: "fiber", label: "Fibres alimentaires", short: "fibres", unit: "g", decimals: 1 },
  { key: "prot", label: "Protéines", short: "protéines", unit: "g", decimals: 1 },
  { key: "salt", label: "Sel", short: "sel", unit: "g", decimals: 2 },
  { key: "calcium", label: "Calcium", short: "calcium", unit: "g", decimals: 3 },
];

const FIELDS_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

const BOLD_KEYS = new Set(["kcal", "prot", "fiber", "fat", "carb"]);
const RECIPE_SUMMARY_KEYS = ["kcal", "fat", "carb", "fiber", "prot"];
const RECIPE_SUMMARY_LABELS = {
  kcal: "kcal",
  fat: "lipides",
  carb: "glucides",
  fiber: "fibres",
  prot: "protéines",
};

const QTY_STEP = 10;
const COMPARE_MAX = 4;
const WEEKLY_KCAL_TARGET = 15000;
const TRACK_WEEK_TOTALS_LIMIT = 104;
const INGREDIENT_SPOON_GRAMS = { tbsp: 15, tsp: 5 };

function num(v) {
  if (v === null || v === undefined) return null;
  const str = String(v).trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function normalizeAddIngredientQtyUnit(value) {
  if (value === "g") return "g";
  if (value === "tbsp") return "tbsp";
  if (value === "tsp") return "tsp";
  return "base";
}

function normalizeIngredientBaseUnit(value) {
  return value === "ml" ? "ml" : "g";
}

function normalizeIngredientUnit(value, baseUnit = "g") {
  const normalizedBase = normalizeIngredientBaseUnit(baseUnit);
  if (value === "tbsp" || value === "tsp") return value;
  if (normalizedBase === "ml") return "ml";
  return "g";
}

function formatIngredientUnit(unit, baseUnit = "g") {
  const normalized = normalizeIngredientUnit(unit, baseUnit);
  if (normalized === "tbsp") return "càs";
  if (normalized === "tsp") return "càc";
  return normalized;
}

function convertIngredientQtyToBaseQty(qty, unit, baseUnit = "g") {
  const value = num(qty);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalizedUnit = normalizeIngredientUnit(unit, baseUnit);
  if (normalizedUnit === "tbsp") return value * INGREDIENT_SPOON_GRAMS.tbsp;
  if (normalizedUnit === "tsp") return value * INGREDIENT_SPOON_GRAMS.tsp;
  return value;
}

function convertBaseQtyToIngredientQty(qty, unit, baseUnit = "g") {
  const value = num(qty);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalizedUnit = normalizeIngredientUnit(unit, baseUnit);
  if (normalizedUnit === "tbsp") return value / INGREDIENT_SPOON_GRAMS.tbsp;
  if (normalizedUnit === "tsp") return value / INGREDIENT_SPOON_GRAMS.tsp;
  return value;
}

function getIngredientQtyInBaseUnit(ing) {
  return convertIngredientQtyToBaseQty(
    ing?.qty,
    ing?.unit,
    ing?.baseUnit || ing?.unit || "g",
  );
}

function getIngredientQtyStep(ing) {
  const unit = normalizeIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
  return unit === "tbsp" || unit === "tsp" ? 1 : QTY_STEP;
}

function normalizeNameKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}

function round(v, d = 1) {
  if (v === null) return null;
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function formatNumberFr(value, decimals = 1) {
  const n = Number.isFinite(value) ? value : 0;
  const rounded = round(n, decimals);
  if (!Number.isFinite(rounded)) return "0";
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function formatWeightGrams(value) {
  const grams = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${formatNumberFr(grams, 1)} g`;
}

function normalizePerQty(value) {
  const n = num(value);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

function formatPerQty(value) {
  const n = normalizePerQty(value);
  return n % 1 === 0 ? String(n) : String(round(n, 2));
}

function formatNutrientLine(f, value) {
  const label = BOLD_KEYS.has(f.key)
    ? `<strong>${escapeHtml(f.label)}</strong>`
    : escapeHtml(f.label);
  return `- ${label}: ${round(value, f.decimals)} ${escapeHtml(f.unit)}`;
}

function formatRecipeNutritionSummary(total) {
  return RECIPE_SUMMARY_KEYS.map((key) => {
    const field = FIELDS_BY_KEY[key];
    const raw = Number.isFinite(total?.[key]) ? total[key] : 0;
    const value = round(raw, field?.decimals ?? 1);
    const unit = field?.unit ? ` ${field.unit}` : "";
    if (key === "kcal") {
      return `${value}${unit}`;
    }
    const label = RECIPE_SUMMARY_LABELS[key] || field?.short || field?.label || key;
    return `${value}${unit} ${label}`.replace(/\s+/g, " ").trim();
  }).join(" • ");
}

function hasRecipeNutritionData(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return false;
  return ingredients.some((ing) => (
    RECIPE_SUMMARY_KEYS.some((key) => Number.isFinite(ing?.per100?.[key]))
  ));
}

function buildPublicRecipePrintCardMarkup({
  name,
  difficultyLabel,
  cover,
  portions,
  prepTime,
  cookTime,
  per,
  ingredientsLines,
  steps,
  extrasForPdf = [],
}) {
  const hasCover = Boolean(cover);
  const hasDifficulty = difficultyLabel && difficultyLabel !== "—";

  const n = (key, dec = 1) => {
    const v = per?.[key];
    return Number.isFinite(v) ? round(v, dec) : "—";
  };

  const nutBar = [
    { emoji: "🔥", label: "Calories",   value: `${n("kcal", 0)} kcal` },
    { emoji: "💪", label: "Protéines",  value: `${n("prot")} g` },
    { emoji: "🍞", label: "Glucides",   value: `${n("carb")} g` },
    { emoji: "🧈", label: "Lipides",    value: `${n("fat")} g` },
    { emoji: "🌿", label: "Fibres",     value: `${n("fiber")} g` },
    { emoji: "🍬", label: "Sucres",     value: `${n("sugar")} g` },
  ];

  const coverHtml = hasCover ? `
    <div class="print-cover" style="
      width: 30%; flex-shrink:0; height:7em;
      overflow:hidden;
    ">
      <img src="${cover}" alt=""
           style="width:100%; height:100%; object-fit:cover; object-position:center; display:block;" />
    </div>` : "";

  return `
    <div class="print-card" style="
      border: 1.5px solid #b09575;
      padding: 16px 18px;
      font-family: 'Palatino Linotype', Palatino, Georgia, serif;
      color: #211508;
      background: #fdfaf6;
      box-sizing: border-box;
      font-size: 10px;
      display: flex;
      flex-direction: column;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    ">

      <!-- EN-TÊTE -->
      <div style="display:flex; align-items:flex-start; gap:14px; flex-shrink:0; padding-bottom:11px; border-bottom:1px solid #b09575;">
        <div style="flex:1;">
          <div style="font-size:0.68em; letter-spacing:.38em; text-transform:uppercase; color:#b09575; margin-bottom:5px;">— Fiche Recette —</div>
          <div class="print-title" style="font-size:2.5em; font-weight:normal; font-style:italic; letter-spacing:.01em; line-height:1.08; margin-bottom:7px;">${escapeHtml(name || "Recette")}</div>
          ${hasDifficulty ? `<div style="display:inline-block; border:1px solid #211508; padding:2px 9px; font-size:0.68em; letter-spacing:.18em; text-transform:uppercase;">${escapeHtml(difficultyLabel)}</div>` : ""}
        </div>
        ${coverHtml}
      </div>

      <!-- NUTRITION -->
      <div style="display:flex; flex-shrink:0; border-bottom:1px solid #e4d9cc;">
        ${nutBar.map((item, i) => `
          <div style="flex:1; text-align:center; padding:7px 3px; ${i > 0 ? "border-left:1px solid #e4d9cc;" : ""}">
            <div style="font-size:1.25em; line-height:1;">${item.emoji}</div>
            <div style="font-size:0.92em; font-weight:bold; margin-top:2px;">${item.value}</div>
            <div style="font-size:0.6em; text-transform:uppercase; letter-spacing:.09em; opacity:.5; margin-top:1px;">${item.label}</div>
          </div>`).join("")}
      </div>

      <!-- META -->
      <div style="display:flex; justify-content:center; flex-shrink:0; border-bottom:1px solid #e4d9cc;">
        <div style="padding:6px 22px; text-align:center; border-right:1px solid #e4d9cc;">
          <div style="font-size:0.6em; letter-spacing:.16em; text-transform:uppercase; opacity:.45;">Portions</div>
          <div style="font-size:1.1em; font-weight:bold; margin-top:2px;">${escapeHtml(String(portions || 1))}</div>
        </div>
        <div style="padding:6px 22px; text-align:center; border-right:1px solid #e4d9cc;">
          <div style="font-size:0.6em; letter-spacing:.16em; text-transform:uppercase; opacity:.45;">Préparation</div>
          <div style="font-size:1.1em; font-weight:bold; margin-top:2px;">${escapeHtml(prepTime)}</div>
        </div>
        <div style="padding:6px 22px; text-align:center;">
          <div style="font-size:0.6em; letter-spacing:.16em; text-transform:uppercase; opacity:.45;">Cuisson</div>
          <div style="font-size:1.1em; font-weight:bold; margin-top:2px;">${escapeHtml(cookTime)}</div>
        </div>
      </div>

      <!-- CORPS -->
      <div style="flex:1; display:grid; grid-template-columns:38% 62%; padding-top:12px; min-height:0;">

        <!-- Ingrédients -->
        <div style="padding-right:16px;">
          <div style="font-size:0.62em; letter-spacing:.28em; text-transform:uppercase; font-weight:bold; color:#b09575; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #e4d9cc;">Ingrédients</div>
          <div style="font-size:0.95em; line-height:1.72;">
            ${ingredientsLines.length
              ? ingredientsLines.map((l) => `<div style="display:flex; gap:6px; padding:1px 0; break-inside:avoid;"><span style="color:#b09575; flex-shrink:0; margin-top:.1em;">—</span><span>${l}</span></div>`).join("")
              : `<em style="opacity:.4">Aucun ingrédient.</em>`}
          </div>
          ${extrasForPdf.length > 0 ? `
            <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #e4d9cc;">
              <div style="font-size:0.58em; letter-spacing:.22em; text-transform:uppercase; font-weight:bold; color:#b09575; margin-bottom:6px;">⭐ Extras</div>
              ${extrasForPdf.map((e) => `
                <div style="padding:3px 0; border-bottom:1px solid #f5ede0; break-inside:avoid; ${e.included ? "" : "opacity:.4;"}">
                  <div style="font-size:0.88em; font-weight:600; ${e.included ? "" : "text-decoration:line-through;"}">— ${escapeHtml(e.name)} ${escapeHtml(e.qtyLabel)}</div>
                  ${e.included ? `<div style="font-size:0.75em; opacity:.65; margin-left:8px;">/portion : ${round(e.perPortion.kcal || 0, 0)} kcal · P ${round(e.perPortion.prot || 0, 1)}g · G ${round(e.perPortion.carb || 0, 1)}g · L ${round(e.perPortion.fat || 0, 1)}g</div>` : ""}
                </div>`).join("")}
            </div>` : ""}
        </div>

        <!-- Étapes -->
        <div style="padding-left:16px; border-left:1px solid #e4d9cc;">
          <div style="font-size:0.62em; letter-spacing:.28em; text-transform:uppercase; font-weight:bold; color:#b09575; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #e4d9cc;">Préparation</div>
          <div style="font-size:0.95em; line-height:1.68;">
            ${steps.length
              ? steps.map((s, i) => `
                <div style="display:flex; gap:9px; margin-bottom:7px; break-inside:avoid;">
                  <span style="flex-shrink:0; font-size:0.8em; font-weight:bold; color:#b09575; min-width:1.8em; text-align:right; margin-top:.18em; letter-spacing:.04em;">${String(i + 1).padStart(2, "0")}.</span>
                  <span>${escapeHtml(s)}</span>
                </div>`).join("")
              : `<em style="opacity:.4">Aucune étape.</em>`}
          </div>
        </div>
      </div>

      <!-- Fermeture -->
      <div style="flex-shrink:0; border-top:1px solid #b09575; margin-top:12px;"></div>

    </div>
  `;
}

function buildComputerRecipePrintCardMarkup({
  name,
  portions,
  totalWeightLabel,
  ingredients,
  total,
  extrasForPdf = [],
}) {
  const ingredientLines = ingredients.length
    ? ingredients.map((ing) => {
      const unit = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
      return `- ${escapeHtml(ing.name)} ${escapeHtml(formatNumberFr(ing.qty, 1))} ${escapeHtml(unit)}`;
    }).join("<br/>")
    : "Aucun ingrédient.";

  return `
    <div class="print-card print-card-computer" style="border:1px solid #111; padding:18px; background:#fff; color:#111; font-family:'Courier New', Courier, monospace;">
      <div style="font-size:22px; font-weight:700;">Nom : ${escapeHtml(name || "Recette")}</div>

      <div style="margin-top:18px; font-size:15px; line-height:1.6;">
        <div><strong>Portions :</strong> ${escapeHtml(String(portions || 1))}</div>
        <div><strong>Poids total :</strong> ${escapeHtml(totalWeightLabel)}</div>
      </div>

      <div class="print-block" style="margin-top:22px; border-top:1px solid #111; padding-top:14px;">
        <div class="print-section-title" style="font-size:16px; font-weight:700;">Ingrédients :</div>
        <div style="margin-top:10px; font-size:15px; line-height:1.65;">
          ${ingredientLines}
        </div>
      </div>

      ${extrasForPdf.length > 0 ? `
      <div class="print-block" style="margin-top:22px; border-top:1px solid #111; padding-top:14px;">
        <div class="print-section-title" style="font-size:16px; font-weight:700;">⭐ Extras :</div>
        <div style="margin-top:10px; font-size:14px; line-height:1.65;">
          ${extrasForPdf.map((e) => `
            <div style="${e.included ? "" : "opacity:.4; text-decoration:line-through;"}">
              - ${escapeHtml(e.name)} ${escapeHtml(e.qtyLabel)}
              ${e.included ? `<span style="font-size:12px; opacity:.65;"> → /portion : ${round(e.perPortion.kcal || 0, 0)} kcal · P ${round(e.perPortion.prot || 0, 1)}g · G ${round(e.perPortion.carb || 0, 1)}g · L ${round(e.perPortion.fat || 0, 1)}g</span>` : ""}
            </div>`).join("")}
        </div>
      </div>` : ""}

      <div class="print-block" style="margin-top:22px; border-top:1px solid #111; padding-top:14px;">
        <div class="print-section-title" style="font-size:16px; font-weight:700;">Macros totales :</div>
        <div style="margin-top:10px; font-size:15px; line-height:1.65;">
          <div>${formatKcal(total.kcal || 0)}</div>
          <div>P ${escapeHtml(formatNumberFr(total.prot || 0, 1))} g</div>
          <div>G ${escapeHtml(formatNumberFr(total.carb || 0, 1))} g</div>
          <div>L ${escapeHtml(formatNumberFr(total.fat || 0, 1))} g</div>
          <div>Fibres ${escapeHtml(formatNumberFr(total.fiber || 0, 1))} g</div>
        </div>
      </div>
    </div>
  `;
}

function applyRecipeMultiplier(factor) {
  const mult = num(factor);
  if (!mult || mult <= 0) return alert("Multiplier invalide.");
  syncStateFromInputs();
  state.ingredients = state.ingredients.map((ing) => ({
    ...ing,
    qty: round((ing.qty || 0) * mult, 2),
  }));
  state.portions = Math.max(1, round(state.portions * mult, 2));
  $("#portions").value = state.portions;
  $("#portionMultiplier").value = "1";
  render();
}

function handlePortionsChange() {
  const next = num($("#portions").value);
  if (!next || next <= 0) {
    $("#portions").value = state.portions || 1;
    return;
  }
  const current = state.portions || 1;
  if (next === current) return;
  const factor = next / current;
  state.ingredients = state.ingredients.map((ing) => ({
    ...ing,
    qty: round((ing.qty || 0) * factor, 2),
  }));
  state.portions = next;
  $("#portionMultiplier").value = "1";
  render();
}

function formatDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return formatDateKey(new Date());
}

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function normalizeTrackDateKey(value, fallback = todayKey()) {
  const parsed = parseDateKey(value);
  return parsed ? formatDateKey(parsed) : fallback;
}

function formatTrackDate(value, { weekday = true } = {}) {
  const parsed = parseDateKey(value);
  if (!parsed) return String(value || "");
  return parsed.toLocaleDateString("fr-FR", {
    weekday: weekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getWeekDateKeys(dateKey) {
  const parsed = parseDateKey(normalizeTrackDateKey(dateKey));
  if (!parsed) return [];
  const start = new Date(parsed);
  const weekday = start.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + offset);
  return Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(start);
    day.setDate(start.getDate() + idx);
    return formatDateKey(day);
  });
}

function formatTrackWeekRange(dateKey) {
  const days = getWeekDateKeys(dateKey);
  if (days.length !== 7) return "";
  const first = parseDateKey(days[0]);
  const last = parseDateKey(days[6]);
  if (!first || !last) return "";
  const firstLabel = first.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const lastLabel = last.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${firstLabel} - ${lastLabel}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const precision = idx === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[idx]}`;
}

function getIngredientImage(ing) {
  if (ing?.image) return ing.image;
  if (ing?.productId) {
    const prod = state.products.find((p) => p.id === ing.productId);
    return prod?.image || "";
  }
  return "";
}

function compactIngredientsForSave(list) {
  return list.map((ing) => {
    const keepImage = !ing?.productId;
    return {
      ...ing,
      image: keepImage ? (ing?.image || "") : "",
    };
  });
}

function compactRecipeForSave(recipe) {
  return {
    ...recipe,
    ingredients: Array.isArray(recipe?.ingredients) ? compactIngredientsForSave(recipe.ingredients) : [],
    extras: Array.isArray(recipe?.extras) ? compactIngredientsForSave(recipe.extras) : [],
  };
}

function estimateStorageBytes() {
  try {
    const payload = {
      draft: buildDraftPayload(),
      recipes: state.recipes.map(compactRecipeForSave),
      products: state.products,
      freeDishes: state.freeDishes,
      trash: state.trash,
      track: buildTrackPayload(),
      trackWeekTotals: state.trackWeekTotals,
    };
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
}

function updateStorageIndicator() {
  const el = $("#storageIndicator");
  if (!el) return;
  const bytes = estimateStorageBytes();
  const mode = storageMode === "idb" ? "IndexedDB" : "localStorage";
  el.textContent = `Stockage: ~${formatBytes(bytes)} (${mode})`;
}

function cloneProducts(list) {
  return list.map((p) => ({
    ...p,
    per100: { ...p.per100 },
  }));
}

function resizeImageFile(file, maxSize = 512, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = Math.max(img.width, img.height) || 1;
        const scale = Math.min(1, maxSize / maxDim);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(String(reader.result || ""));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function loadImageForCanvas(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("empty-image"));
      return;
    }
    const img = new Image();
    if (!String(src).startsWith("data:")) {
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

async function buildPdfCoverImage(src) {
  const source = String(src || "").trim();
  if (!source) return "";
  if (source === lastPdfCoverSource && lastPdfCoverSquare) {
    return lastPdfCoverSquare;
  }

  try {
    const img = await loadImageForCanvas(source);
    const sw = Math.max(1, img.naturalWidth || img.width || 1);
    const sh = Math.max(1, img.naturalHeight || img.height || 1);

    const canvas = document.createElement("canvas");
    canvas.width = PDF_IMAGE_WIDTH;
    canvas.height = PDF_IMAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      lastPdfCoverSource = source;
      lastPdfCoverSquare = source;
      return source;
    }

    ctx.fillStyle = "#f3eee7";
    ctx.fillRect(0, 0, PDF_IMAGE_WIDTH, PDF_IMAGE_HEIGHT);
    const scale = Math.min(PDF_IMAGE_WIDTH / sw, PDF_IMAGE_HEIGHT / sh);
    const drawW = Math.max(1, Math.round(sw * scale));
    const drawH = Math.max(1, Math.round(sh * scale));
    const dx = Math.floor((PDF_IMAGE_WIDTH - drawW) / 2);
    const dy = Math.floor((PDF_IMAGE_HEIGHT - drawH) / 2);
    ctx.drawImage(
      img,
      0,
      0,
      sw,
      sh,
      dx,
      dy,
      drawW,
      drawH,
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    lastPdfCoverSource = source;
    lastPdfCoverSquare = dataUrl;
    return dataUrl;
  } catch {
    lastPdfCoverSource = source;
    lastPdfCoverSquare = source;
    return source;
  }
}

function syncIngredientQuantities() {
  document.querySelectorAll("[data-qty]").forEach((input) => {
    const id = input.getAttribute("data-qty");
    const value = num(input.value);
    if (value === null || value < 0) return;
    const idx = state.ingredients.findIndex((x) => x.id === id);
    if (idx >= 0) {
      state.ingredients[idx] = { ...state.ingredients[idx], qty: value };
    }
  });
  document.querySelectorAll("[data-unit]").forEach((select) => {
    const id = select.getAttribute("data-unit");
    const idx = state.ingredients.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const current = state.ingredients[idx];
    const baseUnit = normalizeIngredientBaseUnit(current?.baseUnit || current?.unit || "g");
    const unit = normalizeIngredientUnit(select.value, baseUnit);
    state.ingredients[idx] = { ...current, unit, baseUnit };
  });
}

function syncStateFromInputs() {
  state.name = $("#mealName").value.trim();
  state.portions = Math.max(1, num($("#portions").value) || 1);
  state.description = $("#recipeDesc").value.trim();
  state.image = $("#recipeImageUrl").value.trim();
  state.prepTime = $("#prepTime").value.trim();
  state.cookTime = $("#cookTime").value.trim();
  state.difficulty = $("#difficulty").value;
  state.cost = $("#cost").value;
  state.source = $("#sourceLink").value.trim();
  state.steps = $("#recipeSteps").value.trim();
  state.productSearch = $("#productSearch").value.trim();
  state.productQty = $("#productQty").value.trim();
  state.productQtyUnit = normalizeAddIngredientQtyUnit($("#productQtyUnit").value);
  state.productCategoryFilter = $("#productCategoryFilter").value;
  state.compareSearch = $("#compareSearch").value.trim();
  state.compareCategory = $("#compareCategory").value;
  state.pdfFormat = $("#pdfFormat").value === "computer" ? "computer" : "public";
  syncIngredientQuantities();
}

function syncInputsFromState() {
  $("#mealName").value = state.name || "";
  $("#portions").value = state.portions || 1;
  $("#recipeDesc").value = state.description || "";
  $("#recipeImageUrl").value = state.image || "";
  $("#recipeImageFile").value = "";
  setRecipeImagePreview(state.image || "");
  $("#prepTime").value = state.prepTime || "";
  $("#cookTime").value = state.cookTime || "";
  $("#difficulty").value = state.difficulty || "";
  $("#cost").value = state.cost || "";
  $("#sourceLink").value = state.source || "";
  $("#recipeSteps").value = state.steps || "";
  const multInput = $("#portionMultiplier");
  if (multInput) multInput.value = "1";
  $("#recipeSearch").value = state.search || "";
  $("#recipeSort").value = state.sort || "recent";
  $("#productSearch").value = state.productSearch || "";
  $("#productQty").value = state.productQty === "" || state.productQty === null || state.productQty === undefined
    ? "100"
    : state.productQty;
  $("#productQtyUnit").value = normalizeAddIngredientQtyUnit(state.productQtyUnit);
  $("#productCategoryFilter").value = state.productCategoryFilter || "";
  $("#compareSearch").value = state.compareSearch || "";
  $("#compareCategory").value = state.compareCategory || "";
  $("#pdfFormat").value = state.pdfFormat === "computer" ? "computer" : "public";
}

function computeTotals() {
  const portions = Math.max(1, num($("#portions").value) || 1);
  const base = computeTotalsForIngredients(state.ingredients, portions);
  // Extras sont en brut (pas divisés par portions) : chaque portion reçoit la totalité de l'extra
  const extrasRaw = computeTotalsForIngredients((state.extras || []).filter((e) => e.included !== false), 1);
  const total = { ...base.total };
  const per = { ...base.per };
  for (const f of FIELDS) {
    per[f.key]   = (base.per[f.key]   || 0) + (extrasRaw.total[f.key] || 0);
    total[f.key] = (base.total[f.key] || 0) + (extrasRaw.total[f.key] || 0) * portions;
  }
  return { total, per, portions };
}

function addProductToExtras(id) {
  const prod = state.products.find((p) => p.id === id);
  if (!prod) return;
  const qty = num($("#productQty").value);
  if (qty === null || qty < 0) return alert("Mets une quantité ≥ 0.");
  const addUnit = normalizeAddIngredientQtyUnit($("#productQtyUnit")?.value || state.productQtyUnit);
  const baseUnit = normalizeIngredientBaseUnit(prod.unit);
  let ingredientUnit = baseUnit;
  if (addUnit === "tbsp" || addUnit === "tsp") ingredientUnit = addUnit;
  if (!state.extras) state.extras = [];
  state.extras.push({
    id: crypto.randomUUID(),
    name: prod.name,
    unit: ingredientUnit,
    baseUnit,
    qty,
    included: true,
    image: prod.image || "",
    productId: prod.id,
    perQty: prod.perQty,
    per100: { ...prod.per100 },
  });
  render();
}

function computeTotalsForIngredients(ingredients, portions = 1) {
  const total = {};
  for (const f of FIELDS) {
    let sum = 0;
    for (const ing of ingredients) {
      const v100 = ing?.per100?.[f.key];
      if (v100 === null || v100 === undefined) continue;
      const baseQty = normalizePerQty(ing?.perQty);
      const qtyInBase = getIngredientQtyInBaseUnit(ing);
      sum += v100 * (qtyInBase / baseQty);
    }
    total[f.key] = sum;
  }
  const safePortions = Math.max(1, Number.isFinite(portions) ? portions : 1);
  const per = {};
  for (const f of FIELDS) {
    per[f.key] = total[f.key] / safePortions;
  }
  return { total, per, portions: safePortions };
}

function getRecipeTotalWeight(recipe) {
  if (!Array.isArray(recipe?.ingredients)) return 0;
  let total = 0;
  recipe.ingredients.forEach((ing) => {
    const qty = getIngredientQtyInBaseUnit(ing);
    if (!Number.isFinite(qty) || qty <= 0) return;
    total += qty;
  });
  return total;
}

function getRecipePortionWeight(recipe) {
  const total = getRecipeTotalWeight(recipe);
  const portions = Math.max(1, Number.isFinite(num(recipe?.portions)) ? num(recipe.portions) : 1);
  return total > 0 ? total / portions : 0;
}

function getRecipePortionsFromTrackItem(item, recipe) {
  if (!item || !recipe) return 0;
  const grams = num(item.grams);
  if (item.unit === "g" || Number.isFinite(grams)) {
    if (!grams || grams <= 0) return 0;
    const portionWeight = getRecipePortionWeight(recipe);
    if (!portionWeight || portionWeight <= 0) return 0;
    return grams / portionWeight;
  }
  const portions = num(item.portions);
  return Number.isFinite(portions) && portions > 0 ? portions : 0;
}

function computeTrackTotals() {
  return computeTrackTotalsForItems(state.track.items);
}

function computeTrackTotalsForItems(items = []) {
  const totals = {};
  for (const f of FIELDS) totals[f.key] = 0;

  items.forEach((item) => {
    if (item.type === "product") {
      const prod = state.products.find((p) => p.id === item.productId);
      const snap = item.snapshot && typeof item.snapshot === "object" ? item.snapshot : null;
      const source = prod || snap;
      if (!source) return;
      const qty = Number.isFinite(num(item.qty)) ? num(item.qty) : 0;
      if (qty <= 0) return;
      for (const f of FIELDS) {
        const v100 = source?.per100?.[f.key];
        if (v100 === null || v100 === undefined) continue;
        const baseQty = normalizePerQty(source?.perQty);
        totals[f.key] += v100 * (qty / baseQty);
      }
      return;
    }
    if (item.type === "recipe") {
      const recipe = state.recipes.find((r) => r.id === item.recipeId);
      if (!recipe) return;
      const portionsEaten = getRecipePortionsFromTrackItem(item, recipe);
      if (portionsEaten <= 0) return;
      const recipeTotals = computeTotalsForIngredients(recipe.ingredients, recipe.portions || 1);
      for (const f of FIELDS) {
        totals[f.key] += (recipeTotals.per[f.key] || 0) * portionsEaten;
      }
      return;
    }
    if (item.type === "free" && item.per100 && typeof item.name === "string") {
      const qty = Number.isFinite(num(item.qty)) ? num(item.qty) : 0;
      if (qty <= 0) return;
      const baseQty = normalizePerQty(item.perQty);
      for (const f of FIELDS) {
        const v100 = item?.per100?.[f.key];
        if (v100 === null || v100 === undefined) continue;
        totals[f.key] += v100 * (qty / baseQty);
      }
    }
  });

  return totals;
}

function formatKcal(value) {
  const n = Number.isFinite(value) ? value : 0;
  return `${Math.round(n)} kcal`;
}

function buildProductSnapshot(prod) {
  if (!prod || typeof prod !== "object") return null;
  return {
    id: prod.id,
    name: prod.name,
    category: prod.category,
    unit: prod.unit,
    image: prod.image,
    perQty: normalizePerQty(prod.perQty),
    per100: { ...prod.per100 },
  };
}

function isTrackItemSupported(item) {
  return item && typeof item === "object" && ["product", "recipe", "free"].includes(item.type);
}

function normalizeTrackItems(items) {
  return Array.isArray(items) ? items.filter(isTrackItemSupported) : [];
}

function normalizeTrackHistory(days) {
  if (!days || typeof days !== "object") return {};
  const history = {};
  Object.entries(days).forEach(([dateKey, items]) => {
    const normalizedDate = normalizeTrackDateKey(dateKey, "");
    if (!normalizedDate) return;
    const normalizedItems = normalizeTrackItems(items);
    if (normalizedItems.length > 0) {
      history[normalizedDate] = normalizedItems;
    }
  });
  return history;
}

function parseTrackPayload(data) {
  const today = todayKey();
  if (!data || typeof data !== "object") {
    return { selectedDate: today, days: {} };
  }
  if (data.days && typeof data.days === "object") {
    return {
      selectedDate: normalizeTrackDateKey(data.selectedDate || today),
      days: normalizeTrackHistory(data.days),
    };
  }
  const date = normalizeTrackDateKey(data.date || today);
  const items = normalizeTrackItems(data.items);
  return {
    selectedDate: normalizeTrackDateKey(data.selectedDate || data.date || today),
    days: items.length > 0 ? { [date]: items } : {},
  };
}

function normalizeTrackWeekTotalsEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const weekStart = normalizeTrackDateKey(entry.weekStart, "");
  const weekEnd = normalizeTrackDateKey(entry.weekEnd, "");
  if (!weekStart || !weekEnd || weekStart > weekEnd) return null;

  const totals = {};
  FIELDS.forEach((field) => {
    const value = num(entry?.totals?.[field.key]);
    totals[field.key] = Number.isFinite(value) ? value : 0;
  });

  const filledDaysRaw = Number(entry.filledDays);
  const filledDays = Number.isFinite(filledDaysRaw)
    ? Math.min(7, Math.max(0, Math.round(filledDaysRaw)))
    : 0;

  const savedAtRaw = Number(entry.savedAt) || Number(entry.updatedAt) || 0;
  const fallbackSavedAt = parseDateKey(weekEnd)?.getTime() || Date.now();
  const savedAt = savedAtRaw > 0 ? savedAtRaw : fallbackSavedAt;

  return {
    weekStart,
    weekEnd,
    totals,
    filledDays,
    savedAt,
  };
}

function parseTrackWeekTotalsPayload(data) {
  if (!Array.isArray(data)) return [];
  const byWeek = new Map();
  data.forEach((entry) => {
    const normalized = normalizeTrackWeekTotalsEntry(entry);
    if (!normalized) return;
    byWeek.set(normalized.weekStart, normalized);
  });
  return [...byWeek.values()]
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, TRACK_WEEK_TOTALS_LIMIT);
}

function cloneTrackWeekTotalsList(list = state.trackWeekTotals) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => ({
    ...entry,
    totals: { ...(entry?.totals || {}) },
  }));
}

function getTrackWeekSummary(baseDate = state.track.date) {
  syncTrackDayToHistory();
  const normalizedBaseDate = normalizeTrackDateKey(baseDate || state.track.date || todayKey());
  const weekDates = getWeekDateKeys(normalizedBaseDate);
  if (weekDates.length !== 7) return null;

  const weeklyTotals = Object.fromEntries(FIELDS.map((field) => [field.key, 0]));
  const daySummaries = weekDates.map((dateKey) => {
    const items = dateKey === state.track.date
      ? normalizeTrackItems(state.track.items)
      : normalizeTrackItems(state.trackHistory[dateKey] || []);
    const totals = computeTrackTotalsForItems(items);
    FIELDS.forEach((field) => {
      weeklyTotals[field.key] += totals[field.key] || 0;
    });
    return {
      dateKey,
      totals,
      itemCount: items.length,
      active: dateKey === state.track.date,
    };
  });

  const filledDays = daySummaries.filter((day) => day.itemCount > 0);
  const weeklyKcal = weeklyTotals.kcal || 0;
  const weeklyDelta = WEEKLY_KCAL_TARGET - weeklyKcal;

  return {
    baseDate: normalizedBaseDate,
    weekDates,
    weeklyTotals,
    daySummaries,
    filledDays,
    weeklyKcal,
    weeklyDelta,
  };
}

function formatTrackMacroSummaryLine(totals) {
  return RECIPE_SUMMARY_KEYS.map((key) => {
    const field = FIELDS_BY_KEY[key];
    return `${field.short}: ${round(totals?.[key] || 0, field.decimals)} ${field.unit}`;
  }).join(" • ");
}

function syncTrackDayToHistory() {
  const dateKey = normalizeTrackDateKey(state.track.date || todayKey());
  const items = normalizeTrackItems(state.track.items);
  state.track.date = dateKey;
  state.track.items = items;
  if (items.length > 0) {
    state.trackHistory[dateKey] = items;
  } else {
    delete state.trackHistory[dateKey];
  }
}

function loadTrackDay(dateKey) {
  const nextDate = normalizeTrackDateKey(dateKey || todayKey());
  const items = normalizeTrackItems(state.trackHistory[nextDate] || []);
  if (items.length > 0) {
    state.trackHistory[nextDate] = items;
  }
  state.track = {
    date: nextDate,
    items,
  };
}

function cloneTrackItem(item) {
  if (!isTrackItemSupported(item)) return null;
  const next = { ...item, id: crypto.randomUUID() };
  if (next.snapshot && typeof next.snapshot === "object") {
    next.snapshot = {
      ...next.snapshot,
      per100: next.snapshot.per100 && typeof next.snapshot.per100 === "object"
        ? { ...next.snapshot.per100 }
        : next.snapshot.per100,
    };
  }
  if (next.per100 && typeof next.per100 === "object") {
    next.per100 = { ...next.per100 };
  }
  return next;
}

function cloneTrackItems(items) {
  return normalizeTrackItems(items)
    .map((item) => cloneTrackItem(item))
    .filter(Boolean);
}

function buildTrackPayload() {
  syncTrackDayToHistory();
  return {
    version: 2,
    selectedDate: state.track.date,
    days: state.trackHistory,
  };
}

function collectProductCandidatesFromRecipes() {
  const map = new Map();
  state.recipes.forEach((recipe) => {
    if (!Array.isArray(recipe?.ingredients)) return;
    recipe.ingredients.forEach((ing) => {
      const id = typeof ing?.productId === "string" ? ing.productId : "";
      if (!id || map.has(id)) return;
      map.set(id, normalizeProduct({
        id,
        name: ing?.name,
        unit: ing?.baseUnit || ing?.unit,
        perQty: ing?.perQty,
        per100: ing?.per100,
      }));
    });
  });
  return map;
}

function collectProductCandidatesFromTrack() {
  const map = new Map();
  syncTrackDayToHistory();
  Object.values(state.trackHistory).forEach((items) => {
    normalizeTrackItems(items).forEach((item) => {
      if (item?.type !== "product") return;
      const snap = item?.snapshot;
      const id = typeof snap?.id === "string" ? snap.id : "";
      if (!id || map.has(id)) return;
      map.set(id, normalizeProduct(snap));
    });
  });
  return map;
}

function buildTrackRecapData(items = state.track.items) {
  const recipes = new Map();
  const products = new Map();
  const freeItems = [];
  const freeNotes = [];
  let totalKcal = 0;

  items.forEach((item) => {
    if (item.type === "product") {
      const prod = state.products.find((p) => p.id === item.productId);
      const snap = item.snapshot && typeof item.snapshot === "object" ? item.snapshot : null;
      const source = prod || snap;
      const name = source?.name || "Produit supprimé";
      const unit = source?.unit || "g";
      const qty = Number.isFinite(num(item.qty)) ? num(item.qty) : 0;
      if (qty <= 0) return;
      const key = prod ? prod.id : (snap?.id || `deleted-product-${name}`);
      const entry = products.get(key) || { id: key, name, unit, qty: 0, kcal: 0, nutrients: {} };
      entry.nutrients = entry.nutrients || {};
      const baseQty = normalizePerQty(source?.perQty);
      const factor = qty / baseQty;
      let kcal = 0;
      for (const f of FIELDS) {
        const v100 = source?.per100?.[f.key];
        if (v100 === null || v100 === undefined) continue;
        const numeric = Number.isFinite(v100) ? v100 : Number(v100);
        if (!Number.isFinite(numeric)) continue;
        const add = numeric * factor;
        entry.nutrients[f.key] = (entry.nutrients[f.key] || 0) + add;
        if (f.key === "kcal") kcal = add;
      }
      entry.qty += qty;
      entry.kcal += kcal;
      products.set(key, entry);
      totalKcal += kcal;
      return;
    }
    if (item.type === "recipe") {
      const recipe = state.recipes.find((r) => r.id === item.recipeId);
      const name = recipe ? recipe.name : "Recette supprimée";
      const portions = recipe
        ? getRecipePortionsFromTrackItem(item, recipe)
        : (Number.isFinite(num(item?.portions)) ? num(item.portions) : 0);
      if (portions <= 0) return;
      let kcal = 0, recipeProt = 0;
      if (recipe) {
        const recipeTotals = computeTotalsForIngredients(recipe.ingredients, recipe.portions || 1);
        kcal = (recipeTotals.per.kcal || 0) * portions;
        recipeProt = (recipeTotals.per.prot || 0) * portions;
      }
      const key = recipe ? recipe.id : `deleted-recipe-${name}`;
      const entry = recipes.get(key) || { id: key, name, portions: 0, kcal: 0, prot: 0, ingredients: new Map() };
      entry.portions += portions;
      entry.kcal += kcal;
      entry.prot += recipeProt;
      if (recipe && Array.isArray(recipe.ingredients)) {
        const safePortions = Math.max(1, Number.isFinite(recipe.portions) ? recipe.portions : 1);
        const factor = portions / safePortions;
        recipe.ingredients.forEach((ing) => {
          const qty = Number.isFinite(num(ing?.qty)) ? num(ing.qty) : 0;
          if (qty <= 0) return;
          const scaled = qty * factor;
          const unit = normalizeIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
          const ingName = typeof ing?.name === "string" ? ing.name : "Ingrédient";
          const ingKey = `${ing?.productId || ""}::${ingName}::${unit}`;
          const ingEntry = entry.ingredients.get(ingKey) || { name: ingName, unit, qty: 0 };
          ingEntry.qty += scaled;
          entry.ingredients.set(ingKey, ingEntry);
        });
      }
      recipes.set(key, entry);
      totalKcal += kcal;
      return;
    }
    if (item.type === "free") {
      if (item.per100 && typeof item.name === "string") {
        const qty = Number.isFinite(num(item.qty)) ? num(item.qty) : 0;
        if (qty <= 0) return;
        const baseQty = normalizePerQty(item.perQty);
        const comment = typeof item.comment === "string" ? item.comment.trim() : "";
        let kcal = 0;
        const nutrients = {};
        for (const f of FIELDS) {
          const v100 = item?.per100?.[f.key];
          if (v100 === null || v100 === undefined) continue;
          const numeric = Number.isFinite(v100) ? v100 : Number(v100);
          if (!Number.isFinite(numeric)) continue;
          const add = numeric * (qty / baseQty);
          nutrients[f.key] = add;
          if (f.key === "kcal") kcal = add;
        }
        freeItems.push({
          id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
          name: item.name,
          comment,
          unit: normalizeFreeDishUnit(item.unit),
          qty,
          kcal,
          nutrients,
        });
        totalKcal += kcal;
        return;
      }
      const text = typeof item.text === "string" ? item.text.trim() : "";
      if (!text) return;
      freeNotes.push({
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        text,
      });
    }
  });

  const recipesList = [...recipes.values()].map((r) => {
    const ingredients = r.ingredients instanceof Map
      ? [...r.ingredients.values()].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
      : [];
    return { ...r, ingredients };
  }).sort((a, b) => (b.kcal || 0) - (a.kcal || 0));
  const productsList = [...products.values()].sort((a, b) => (b.kcal || 0) - (a.kcal || 0));

  return {
    recipes: recipesList,
    products: productsList,
    freeItems,
    freeNotes,
    totalKcal,
    hasItems: recipesList.length > 0 || productsList.length > 0 || freeItems.length > 0 || freeNotes.length > 0,
  };
}

function buildTrackPdfHtml(recap, dateLabel, totals, advice) {
  const formatProductDetails = (nutrients) => {
    if (!nutrients || typeof nutrients !== "object") {
      return "Détails nutritionnels indisponibles.";
    }
    const parts = FIELDS.filter((f) => !["kj", "kcal"].includes(f.key))
      .map((f) => {
        const v = nutrients[f.key];
        if (v === null || v === undefined) return null;
        return `${escapeHtml(f.short)}: ${round(v, f.decimals)} ${escapeHtml(f.unit)}`;
      })
      .filter(Boolean);
    return parts.length > 0
      ? `Détails: ${parts.join(" • ")}`
      : "Détails nutritionnels indisponibles.";
  };
  const recipesRows = recap.recipes.map((r) => {
    const ingredientsLine = Array.isArray(r.ingredients) && r.ingredients.length > 0
      ? r.ingredients.map((ing) => (
        `${escapeHtml(ing.name)} (${round(ing.qty || 0, 1)} ${escapeHtml(formatIngredientUnit(ing?.unit, ing?.unit || "g"))})`
      )).join(", ")
      : "Ingrédients indisponibles.";
    return `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td style="text-align:right;">${round(r.portions || 0, 2)}</td>
        <td style="text-align:right;">${formatKcal(r.kcal)}</td>
      </tr>
      <tr class="ingredients-row">
        <td colspan="3" class="ingredients-cell">${ingredientsLine}</td>
      </tr>
    `;
  }).join("");
  const productsRows = recap.products.map((p) => {
    const details = formatProductDetails(p.nutrients);
    return `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td style="text-align:right;">${round(p.qty || 0, 1)} ${escapeHtml(p.unit || "g")}</td>
        <td style="text-align:right;">${formatKcal(p.kcal)}</td>
      </tr>
      <tr class="details-row">
        <td colspan="3" class="details-cell">${details}</td>
      </tr>
    `;
  }).join("");
  const freeRows = recap.freeItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td style="text-align:right;">${round(item.qty || 0, 1)} ${escapeHtml(item.unit || "g")}</td>
      <td style="text-align:right;">${formatKcal(item.kcal)}</td>
    </tr>
    ${item.comment ? `
      <tr class="details-row">
        <td colspan="3" class="details-cell">Commentaire: ${escapeHtml(item.comment)}</td>
      </tr>
    ` : ""}
    <tr class="details-row">
      <td colspan="3" class="details-cell">${formatProductDetails(item.nutrients)}</td>
    </tr>
  `).join("");
  const freeNotesRows = recap.freeNotes.map((item) => `
    <tr>
      <td>${escapeHtml(item.text)}</td>
      <td style="text-align:right; color:#666;">hors bilan</td>
    </tr>
  `).join("");
  const totalsRows = totals
    ? FIELDS.map((f) => {
      const v = totals[f.key];
      const value = Number.isFinite(v) ? v : 0;
      return `
        <tr>
          <td>${escapeHtml(f.label)}</td>
          <td style="text-align:right;">${round(value, f.decimals)} ${escapeHtml(f.unit)}</td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="2" style="text-align:center; color:#777;">Bilan indisponible</td></tr>`;
  const adviceLine = typeof advice === "string" && advice.trim()
    ? `<div class="advice">${escapeHtml(advice)}</div>`
    : "";

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Récap repas</title>
      <style>
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111; }
        h1 { font-size: 20px; margin: 0 0 6px; }
        h2 { font-size: 15px; margin: 18px 0 8px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 6px 4px; border-bottom: 1px solid #e5e5e5; }
        th { text-align: left; font-size: 12px; color: #666; }
        .ingredients-row td, .details-row td { border-bottom: 1px dashed #efefef; }
        .ingredients-cell, .details-cell { font-size: 12px; color: #555; padding-top: 2px; padding-bottom: 8px; }
        .totals-table td { border-bottom: 1px dashed #efefef; }
        .advice { margin-top: 8px; font-size: 12px; color: #555; font-style: italic; }
        .total { margin-top: 12px; display: flex; justify-content: space-between; font-weight: 700; }
      </style>
    </head>
    <body>
      <h1>Récapitulatif des repas</h1>
      <div class="meta">Date: ${escapeHtml(dateLabel)}</div>

      <h2>Menus / Recettes</h2>
      <table>
        <thead>
          <tr>
            <th>Menu</th>
            <th style="text-align:right;">Portions</th>
            <th style="text-align:right;">Calories</th>
          </tr>
        </thead>
        <tbody>
          ${recipesRows || `<tr><td colspan="3" style="text-align:center; color:#777;">Aucune recette</td></tr>`}
        </tbody>
      </table>

      <h2>Produits</h2>
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th style="text-align:right;">Quantité</th>
            <th style="text-align:right;">Calories</th>
          </tr>
        </thead>
        <tbody>
          ${productsRows || `<tr><td colspan="3" style="text-align:center; color:#777;">Aucun produit</td></tr>`}
        </tbody>
      </table>

      <h2>Plats libres</h2>
      <table>
        <thead>
          <tr>
            <th>Plat</th>
            <th style="text-align:right;">Quantité</th>
            <th style="text-align:right;">Calories</th>
          </tr>
        </thead>
        <tbody>
          ${freeRows || `<tr><td colspan="3" style="text-align:center; color:#777;">Aucun plat libre</td></tr>`}
        </tbody>
      </table>

      <h2>Notes libres</h2>
      <table>
        <thead>
          <tr>
            <th>Texte</th>
            <th style="text-align:right;">Info</th>
          </tr>
        </thead>
        <tbody>
          ${freeNotesRows || `<tr><td colspan="2" style="text-align:center; color:#777;">Aucune note libre</td></tr>`}
        </tbody>
      </table>

      <h2>Bilan de la journee</h2>
      <table class="totals-table">
        <thead>
          <tr>
            <th>Nutriment</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${totalsRows}
        </tbody>
      </table>
      ${adviceLine}

      <div class="total">
        <div>Total estimé</div>
        <div>${formatKcal(recap.totalKcal)}</div>
      </div>
      <script>
        window.onload = () => {
          window.focus();
          window.print();
        };
      </script>
    </body>
  </html>`;
}

function buildTrackAdvice(totals) {
  const lines = [];
  const kcal = totals.kcal || 0;
  const protein = totals.prot || 0;
  const fiber = totals.fiber || 0;
  const sugar = totals.sugar || 0;
  const sat = totals.sat || 0;
  const salt = totals.salt || 0;

  if (kcal > 2600) lines.push("Apports énergétiques élevés aujourd’hui.");
  if (kcal > 0 && kcal < 1200) lines.push("Apports énergétiques plutôt bas aujourd’hui.");
  if (protein > 0 && protein < 60) lines.push("Protéines plutôt basses : ajoute une source protéinée.");
  if (fiber > 0 && fiber < 25) lines.push("Fibres plutôt basses : ajoute légumes, légumineuses ou céréales complètes.");
  if (sugar > 50) lines.push("Sucres élevés : équilibre avec des aliments plus complets.");
  if (sat > 20) lines.push("Acides gras saturés élevés : limite les produits très gras.");
  if (salt > 5) lines.push("Sel élevé : pense à boire et à réduire les produits très salés.");

  if (lines.length === 0) {
    return "Bilan équilibré selon des repères généraux.";
  }
  return `${lines.join(" ")} (Repères indicatifs, à adapter à tes objectifs.)`;
}

function normalizeIngredient(ing) {
  const qty = num(ing?.qty);
  const baseUnit = normalizeIngredientBaseUnit(ing?.baseUnit || ing?.unit);
  const unit = normalizeIngredientUnit(ing?.unit, baseUnit);
  return {
    id: ing?.id || crypto.randomUUID(),
    name: typeof ing?.name === "string" ? ing.name : "Ingrédient",
    unit,
    baseUnit,
    qty: Number.isFinite(qty) ? qty : 0,
    image: typeof ing?.image === "string" ? ing.image : "",
    productId: typeof ing?.productId === "string" ? ing.productId : null,
    isImported: Boolean(ing?.isImported),
    perQty: normalizePerQty(ing?.perQty),
    per100: {
      kj: num(ing?.per100?.kj),
      kcal: num(ing?.per100?.kcal),
      fat: num(ing?.per100?.fat),
      sat: num(ing?.per100?.sat),
      carb: num(ing?.per100?.carb),
      sugar: num(ing?.per100?.sugar),
      fiber: num(ing?.per100?.fiber),
      prot: num(ing?.per100?.prot),
      salt: num(ing?.per100?.salt),
      calcium: num(ing?.per100?.calcium),
    },
  };
}

function normalizeProduct(prod) {
  return {
    id: prod?.id || crypto.randomUUID(),
    name: typeof prod?.name === "string" ? prod.name : "Produit",
    category: typeof prod?.category === "string" ? prod.category : "",
    unit: prod?.unit === "ml" ? "ml" : "g",
    image: typeof prod?.image === "string" ? prod.image : "",
    perQty: normalizePerQty(prod?.perQty),
    per100: {
      kj: num(prod?.per100?.kj),
      kcal: num(prod?.per100?.kcal),
      fat: num(prod?.per100?.fat),
      sat: num(prod?.per100?.sat),
      carb: num(prod?.per100?.carb),
      sugar: num(prod?.per100?.sugar),
      fiber: num(prod?.per100?.fiber),
      prot: num(prod?.per100?.prot),
      salt: num(prod?.per100?.salt),
      calcium: num(prod?.per100?.calcium),
    },
  };
}

function normalizeFreeDishUnit(unit) {
  if (unit === "ml") return "ml";
  if (unit === "portion") return "portion";
  return "g";
}

function getDefaultFreeDishPerQty(unit) {
  return normalizeFreeDishUnit(unit) === "portion" ? 1 : 100;
}

function normalizeFreeDish(dish) {
  const qty = num(dish?.qty);
  const rawPerQty = num(dish?.perQty);
  const unit = normalizeFreeDishUnit(dish?.unit);
  const perQty = Number.isFinite(rawPerQty) && rawPerQty > 0
    ? rawPerQty
    : getDefaultFreeDishPerQty(unit);
  return {
    id: typeof dish?.id === "string" ? dish.id : crypto.randomUUID(),
    name: typeof dish?.name === "string" ? dish.name : "Plat libre",
    comment: typeof dish?.comment === "string" ? dish.comment.trim() : "",
    unit,
    image: typeof dish?.image === "string" ? dish.image : "",
    perQty,
    per100: {
      kj: num(dish?.per100?.kj),
      kcal: num(dish?.per100?.kcal),
      fat: num(dish?.per100?.fat),
      sat: num(dish?.per100?.sat),
      carb: num(dish?.per100?.carb),
      sugar: num(dish?.per100?.sugar),
      fiber: num(dish?.per100?.fiber),
      prot: num(dish?.per100?.prot),
      salt: num(dish?.per100?.salt),
      calcium: num(dish?.per100?.calcium),
    },
    qty: Number.isFinite(qty) && qty > 0 ? qty : perQty,
    updatedAt: Number.isFinite(Number(dish?.updatedAt)) ? Number(dish.updatedAt) : Date.now(),
  };
}

function normalizeRecipe(recipe) {
  const portions = num(recipe?.portions);
  return {
    id: recipe?.id || crypto.randomUUID(),
    name: typeof recipe?.name === "string" ? recipe.name : "Recette",
    portions: Number.isFinite(portions) ? Math.max(1, portions) : 1,
    description: typeof recipe?.description === "string" ? recipe.description : "",
    image: typeof recipe?.image === "string" ? recipe.image : "",
    prepTime: recipe?.prepTime === "" || recipe?.prepTime === null || recipe?.prepTime === undefined ? "" : String(recipe.prepTime),
    cookTime: recipe?.cookTime === "" || recipe?.cookTime === null || recipe?.cookTime === undefined ? "" : String(recipe.cookTime),
    difficulty: typeof recipe?.difficulty === "string" ? recipe.difficulty : "",
    cost: typeof recipe?.cost === "string" ? recipe.cost : "",
    source: typeof recipe?.source === "string" ? recipe.source : "",
    steps: typeof recipe?.steps === "string" ? recipe.steps : "",
    ingredients: Array.isArray(recipe?.ingredients)
      ? recipe.ingredients.map(normalizeIngredient).filter((ing) => ing.qty >= 0)
      : [],
    extras: Array.isArray(recipe?.extras)
      ? recipe.extras.map((ing) => ({ ...normalizeIngredient(ing), included: ing.included !== false })).filter((ing) => ing.qty >= 0)
      : [],
    updatedAt: Number.isFinite(Number(recipe?.updatedAt)) ? Number(recipe.updatedAt) : Date.now(),
    rating: Number.isInteger(recipe?.rating) && recipe.rating >= 0 && recipe.rating <= 5 ? recipe.rating : 0,
    madeIt: recipe?.madeIt === true,
    notes: typeof recipe?.notes === "string" ? recipe.notes : "",
  };
}

function normalizeTrashEntry(entry, type) {
  if (!entry || typeof entry !== "object") return null;
  const deletedAt = Number(entry.deletedAt) || 0;
  const rawItem = entry.item || entry.product || entry.recipe;
  if (!rawItem || typeof rawItem !== "object") return null;
  const item = type === "product" ? normalizeProduct(rawItem) : normalizeRecipe(rawItem);
  return { deletedAt: deletedAt || Date.now(), item };
}

function normalizeTrashData(data) {
  const products = Array.isArray(data?.products) ? data.products : [];
  const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
  return {
    products: products.map((entry) => normalizeTrashEntry(entry, "product")).filter(Boolean),
    recipes: recipes.map((entry) => normalizeTrashEntry(entry, "recipe")).filter(Boolean),
  };
}

function pruneTrash({ persist = true } = {}) {
  const cutoff = Date.now() - TRASH_RETENTION_MS;
  const beforeProducts = state.trash.products.length;
  const beforeRecipes = state.trash.recipes.length;
  state.trash.products = state.trash.products.filter((entry) => (Number(entry?.deletedAt) || 0) > cutoff);
  state.trash.recipes = state.trash.recipes.filter((entry) => (Number(entry?.deletedAt) || 0) > cutoff);
  const changed = beforeProducts !== state.trash.products.length || beforeRecipes !== state.trash.recipes.length;
  if (changed && persist) saveTrash();
  return changed;
}

function addToTrash(type, item) {
  if (!item || typeof item !== "object") return;
  const key = type === "product" ? "products" : "recipes";
  const normalized = type === "product" ? normalizeProduct(item) : normalizeRecipe(item);
  const next = (state.trash[key] || []).filter((entry) => entry?.item?.id !== normalized.id);
  next.unshift({ deletedAt: Date.now(), item: normalized });
  state.trash[key] = next;
  pruneTrash({ persist: false });
  saveTrash();
}

function restoreTrashItem(type, id) {
  const key = type === "product" ? "products" : "recipes";
  const list = state.trash[key] || [];
  const idx = list.findIndex((entry) => entry?.item?.id === id);
  if (idx < 0) return;
  const entry = list[idx];
  const restored = type === "product" ? normalizeProduct(entry.item) : normalizeRecipe(entry.item);
  list.splice(idx, 1);
  if (type === "product") {
    const existingIdx = state.products.findIndex((p) => p.id === restored.id);
    if (existingIdx >= 0) {
      state.products[existingIdx] = restored;
    } else {
      state.products.push(restored);
    }
    if (!saveProducts()) {
      list.splice(idx, 0, entry);
      state.trash[key] = list;
      alert("Restauration impossible (stockage local plein).");
      return;
    }
  } else {
    const existingIdx = state.recipes.findIndex((r) => r.id === restored.id);
    if (existingIdx >= 0) {
      state.recipes[existingIdx] = restored;
    } else {
      state.recipes.unshift(restored);
    }
    const ok = saveRecipes();
    if (ok === false) {
      list.splice(idx, 0, entry);
      state.trash[key] = list;
      alert("Restauration impossible (stockage local plein).");
      return;
    }
  }
  state.trash[key] = list;
  saveTrash();
  render();
}

function deleteTrashItem(type, id) {
  const key = type === "product" ? "products" : "recipes";
  state.trash[key] = (state.trash[key] || []).filter((entry) => entry?.item?.id !== id);
  saveTrash();
  render();
}

function formatTrashMeta(deletedAt) {
  const ts = Number(deletedAt) || 0;
  const now = Date.now();
  const ageMs = Math.max(0, now - ts);
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const remainingMs = Math.max(0, TRASH_RETENTION_MS - ageMs);
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const dateLabel = ts ? new Date(ts).toLocaleDateString("fr-FR") : "";
  return { ageDays, remainingDays, dateLabel };
}

function buildExportPayload() {
  return {
    version: 6,
    exportedAt: Date.now(),
    products: state.products,
    recipes: state.recipes,
    freeDishes: state.freeDishes,
    trash: state.trash,
    draft: buildDraftPayload(),
    track: buildTrackPayload(),
    trackWeekTotals: state.trackWeekTotals,
    weekPlans: state.weekPlans || {},
  };
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function applyImportPayload(data, { suppressCloud = false, localUpdatedAt = null } = {}) {
  if (!data || typeof data !== "object") throw new Error("Fichier invalide");
  const products = Array.isArray(data.products) ? data.products.map(normalizeProduct) : [];
  const recipes = Array.isArray(data.recipes) ? data.recipes.map(normalizeRecipe) : [];
  const freeDishes = Array.isArray(data.freeDishes) ? data.freeDishes.map(normalizeFreeDish) : [];
  const trash = normalizeTrashData(data.trash || {});
  const track = parseTrackPayload(data.track);
  const trackWeekTotals = parseTrackWeekTotalsPayload(data.trackWeekTotals);
  state.products = products;
  state.recipes = recipes;
  state.freeDishes = freeDishes;
  state.trash = trash;
  pruneTrash({ persist: false });
  state.trackHistory = track.days;
  state.trackWeekTotals = trackWeekTotals;
  loadTrackDay(track.selectedDate || todayKey());
  state.selectedId = null;
  state.ingredients = [];
  state.name = "";
  state.portions = 1;
  state.description = "";
  state.image = "";
  state.prepTime = "";
  state.cookTime = "";
  state.difficulty = "";
  state.cost = "";
  state.source = "";
  state.steps = "";
  if (data.draft) applyDraftData(data.draft);
  // Restore weekPlans if present
  if (data.weekPlans && typeof data.weekPlans === "object") {
    state.weekPlans = data.weekPlans;
  }
  suppressCloudSync = !!suppressCloud;
  try {
    saveProducts();
    saveRecipes();
    saveFreeDishes();
    saveTrash();
    saveDraft();
    saveTrack();
    saveTrackWeekTotals();
    saveWeekPlans();
  } finally {
    suppressCloudSync = false;
  }
  const overrideTs = Number(localUpdatedAt);
  if (Number.isFinite(overrideTs) && overrideTs > 0) {
    setLocalUpdatedAt(overrideTs);
  }
  syncInputsFromState();
  render();
  state.page = "recipes";
  location.hash = "recipes";
  renderPage();
  const n = state.recipes.length;
  const p = state.products.length;
  setTimeout(() => alert(`✅ Import réussi — ${n} recette(s) et ${p} produit(s) restaurés.`), 200);
}

async function importDataFromFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  applyImportPayload(data);
}

function updateSaveButton() {
  const btn = $("#saveRecipe");
  if (!btn) return;
  btn.textContent = state.selectedId ? "Mettre à jour" : "Enregistrer";
}

function updateProductEditUI() {
  const addBtn = $("#addProduct");
  const cancelBtn = $("#cancelProductEdit");
  if (!addBtn || !cancelBtn) return;
  const editing = !!state.productEditId;
  addBtn.textContent = editing ? "Mettre à jour produit" : "Ajouter produit";
  cancelBtn.style.display = editing ? "inline-block" : "none";
}

function setRecipeImagePreview(src) {
  const preview = $("#recipeImagePreview");
  if (!preview) return;
  if (!src) {
    preview.innerHTML = "Aperçu photo";
    preview.style.color = "#777";
    return;
  }
  preview.innerHTML = `<img src="${src}" alt="" style="width:100%; height:100%; object-fit:contain; object-position:center; border-radius:10px; background:#fff; display:block;" />`;
  preview.style.color = "";
}

function setProductImagePreview(src) {
  const preview = $("#prodImagePreview");
  if (!preview) return;
  if (!src) {
    preview.innerHTML = "Aperçu image";
    preview.style.color = "#777";
    return;
  }
  preview.innerHTML = `<img src="${src}" alt="" style="width:64px; height:64px; object-fit:cover; border-radius:8px;" />`;
  preview.style.color = "";
}

function setTrackFreeImagePreview(src) {
  const preview = $("#trackFreeImagePreview");
  if (!preview) return;
  if (!src) {
    preview.innerHTML = "Aperçu image";
    preview.style.color = "#777";
    return;
  }
  preview.innerHTML = `<img src="${src}" alt="" style="width:64px; height:64px; object-fit:cover; border-radius:8px;" />`;
  preview.style.color = "";
}

function resetProductForm() {
  $("#prodName").value = "";
  $("#prodCategory").value = "";
  $("#prodBaseQty").value = "100";
  $("#prodUnit").value = "g";
  $("#prodKj").value = "";
  $("#prodKcal").value = "";
  $("#prodFat").value = "";
  $("#prodSat").value = "";
  $("#prodCarb").value = "";
  $("#prodSugar").value = "";
  $("#prodFiber").value = "";
  $("#prodProt").value = "";
  $("#prodSalt").value = "";
  $("#prodCalcium").value = "";
  $("#prodImageUrl").value = "";
  $("#prodImageFile").value = "";
  setProductImagePreview("");
}

function startEditProduct(id) {
  const prod = state.products.find((p) => p.id === id);
  if (!prod) return;
  $("#prodName").value = prod.name;
  $("#prodCategory").value = prod.category || "";
  $("#prodBaseQty").value = formatPerQty(prod.perQty);
  $("#prodUnit").value = prod.unit;
  $("#prodKj").value = prod.per100.kj ?? "";
  $("#prodKcal").value = prod.per100.kcal ?? "";
  $("#prodFat").value = prod.per100.fat ?? "";
  $("#prodSat").value = prod.per100.sat ?? "";
  $("#prodCarb").value = prod.per100.carb ?? "";
  $("#prodSugar").value = prod.per100.sugar ?? "";
  $("#prodFiber").value = prod.per100.fiber ?? "";
  $("#prodProt").value = prod.per100.prot ?? "";
  $("#prodSalt").value = prod.per100.salt ?? "";
  $("#prodCalcium").value = prod.per100.calcium ?? "";
  $("#prodImageUrl").value = prod.image || "";
  $("#prodImageFile").value = "";
  setProductImagePreview(prod.image || "");
  state.productEditId = id;
  updateProductEditUI();
}

function cancelProductEdit() {
  state.productEditId = null;
  resetProductForm();
  updateProductEditUI();
}

function syncIngredientsFromProducts(products) {
  const list = Array.isArray(products) ? products : [products];
  const byId = new Map();
  list.forEach((prod) => {
    if (prod && typeof prod.id === "string") byId.set(prod.id, prod);
  });
  if (byId.size === 0) return { recipesChanged: false, draftChanged: false };

  const applyProduct = (ing, prod) => normalizeIngredient({
    ...ing,
    name: prod.name,
    unit: normalizeIngredientUnit(ing?.unit, prod.unit),
    baseUnit: prod.unit,
    image: prod.image || "",
    perQty: prod.perQty,
    per100: { ...prod.per100 },
  });

  let draftChanged = false;
  if (Array.isArray(state.ingredients) && state.ingredients.length > 0) {
    const nextDraft = state.ingredients.map((ing) => {
      const prod = byId.get(ing?.productId);
      if (!prod) return ing;
      draftChanged = true;
      return applyProduct(ing, prod);
    });
    if (draftChanged) state.ingredients = nextDraft;
  }

  let recipesChanged = false;
  if (Array.isArray(state.recipes) && state.recipes.length > 0) {
    const nextRecipes = state.recipes.map((recipe) => {
      if (!Array.isArray(recipe?.ingredients) || recipe.ingredients.length === 0) return recipe;
      let changed = false;
      const nextIngredients = recipe.ingredients.map((ing) => {
        const prod = byId.get(ing?.productId);
        if (!prod) return ing;
        changed = true;
        return applyProduct(ing, prod);
      });
      if (!changed) return recipe;
      recipesChanged = true;
      return { ...recipe, ingredients: nextIngredients };
    });
    if (recipesChanged) state.recipes = nextRecipes;
  }

  return { recipesChanged, draftChanged };
}

function linkIngredientsToProductsByName() {
  if (!Array.isArray(state.products) || state.products.length === 0) {
    return { recipesChanged: false, draftChanged: false };
  }
  const byName = new Map();
  const duplicates = new Set();
  state.products.forEach((prod) => {
    const key = normalizeNameKey(prod?.name);
    if (!key) return;
    if (byName.has(key)) {
      duplicates.add(key);
      return;
    }
    byName.set(key, prod);
  });
  duplicates.forEach((key) => byName.delete(key));
  if (byName.size === 0) return { recipesChanged: false, draftChanged: false };

  const productIds = new Set(state.products.map((p) => p.id));
  const applyProduct = (ing, prod) => normalizeIngredient({
    ...ing,
    productId: prod.id,
    name: prod.name,
    unit: normalizeIngredientUnit(ing?.unit, prod.unit),
    baseUnit: prod.unit,
    image: prod.image || "",
    perQty: prod.perQty,
    per100: { ...prod.per100 },
  });

  let draftChanged = false;
  if (Array.isArray(state.ingredients) && state.ingredients.length > 0) {
    const nextDraft = state.ingredients.map((ing) => {
      const hasValidProduct = ing?.productId && productIds.has(ing.productId);
      if (hasValidProduct) return ing;
      const key = normalizeNameKey(ing?.name);
      const prod = byName.get(key);
      if (!prod) return ing;
      draftChanged = true;
      return applyProduct(ing, prod);
    });
    if (draftChanged) state.ingredients = nextDraft;
  }

  let recipesChanged = false;
  if (Array.isArray(state.recipes) && state.recipes.length > 0) {
    const nextRecipes = state.recipes.map((recipe) => {
      if (!Array.isArray(recipe?.ingredients) || recipe.ingredients.length === 0) return recipe;
      let changed = false;
      const nextIngredients = recipe.ingredients.map((ing) => {
        const hasValidProduct = ing?.productId && productIds.has(ing.productId);
        if (hasValidProduct) return ing;
        const key = normalizeNameKey(ing?.name);
        const prod = byName.get(key);
        if (!prod) return ing;
        changed = true;
        return applyProduct(ing, prod);
      });
      if (!changed) return recipe;
      recipesChanged = true;
      return { ...recipe, ingredients: nextIngredients };
    });
    if (recipesChanged) state.recipes = nextRecipes;
  }

  return { recipesChanged, draftChanged };
}

function addProduct() {
  const name = $("#prodName").value.trim();
  if (!name) return alert("Ajoute un nom de produit.");
  const category = $("#prodCategory").value.trim();
  const perQty = num($("#prodBaseQty").value);
  if (!perQty || perQty <= 0) return alert("Quantité de base invalide.");
  const unit = $("#prodUnit").value;
  const image = $("#prodImageUrl").value.trim();
  const previous = cloneProducts(state.products);
  const per100 = {
    kj: num($("#prodKj").value),
    kcal: num($("#prodKcal").value),
    fat: num($("#prodFat").value),
    sat: num($("#prodSat").value),
    carb: num($("#prodCarb").value),
    sugar: num($("#prodSugar").value),
    fiber: num($("#prodFiber").value),
    prot: num($("#prodProt").value),
    salt: num($("#prodSalt").value),
    calcium: num($("#prodCalcium").value),
  };
  let updatedProduct = null;

  if (state.productEditId) {
    const idx = state.products.findIndex((p) => p.id === state.productEditId);
    if (idx >= 0) {
      state.products[idx] = normalizeProduct({
        ...state.products[idx],
        name,
        category,
        perQty,
        unit,
        image,
        per100,
      });
      updatedProduct = state.products[idx];
    }
    state.productEditId = null;
  } else {
    const product = normalizeProduct({ name, category, perQty, unit, image, per100 });
    state.products.push(product);
  }
  if (!saveProducts()) {
    state.products = previous;
    alert("Sauvegarde impossible (stockage local plein). Réduis la taille des images ou supprime des produits.");
    renderProductLibrary();
    return;
  }
  let synced = { recipesChanged: false, draftChanged: false };
  if (updatedProduct) {
    const previousRecipes = state.recipes;
    synced = syncIngredientsFromProducts([updatedProduct]);
    if (synced.recipesChanged && !saveRecipes()) {
      state.recipes = previousRecipes;
      synced.recipesChanged = false;
      alert("Sauvegarde des recettes impossible (stockage local plein). Les recettes n'ont pas été mises à jour.");
    }
  }
  state.productSearch = "";
  state.productCategoryFilter = "";
  $("#productSearch").value = "";
  $("#productCategoryFilter").value = "";
  resetProductForm();
  updateProductEditUI();
  if (synced.recipesChanged || synced.draftChanged) {
    render();
  } else {
    renderProductLibrary();
  }
}

function deleteProduct(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  if (!confirm(`Supprimer le produit "${product.name}" ?`)) return;
  const previous = cloneProducts(state.products);
  state.products = state.products.filter((p) => p.id !== id);
  if (state.productEditId === id) state.productEditId = null;
  if (!saveProducts()) {
    state.products = previous;
    alert("Suppression impossible (stockage local plein).");
    renderProductLibrary();
    return;
  }
  addToTrash("product", product);
  updateProductEditUI();
  renderProductLibrary();
}

function renderRecipeList() {
  const list = $("#recipeList");
  if (!list) return;
  updateStorageIndicator();
  updateAutoExportButton();

  const query = (state.search || "").toLowerCase().trim();
  let items = [...state.recipes];
  if (query) items = items.filter((r) => r.name.toLowerCase().includes(query));
  if (state.sort === "name") {
    items.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  } else if (state.sort === "rating") {
    items.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  } else if (state.sort === "madeit") {
    items.sort((a, b) => (b.madeIt ? 1 : 0) - (a.madeIt ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  } else if (state.sort === "notmadeit") {
    items.sort((a, b) => (a.madeIt ? 1 : 0) - (b.madeIt ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  } else {
    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  const selected = $("#recipeSelected");
  if (selected) {
    const current = state.recipes.find((r) => r.id === state.selectedId);
    selected.textContent = current
      ? `Recette sélectionnée: ${current.name} (modifie puis clique “Mettre à jour”).`
      : "Aucune recette sélectionnée.";
  }

  if (items.length === 0) {
    list.innerHTML = `
      <p style="opacity:.7; margin:0 0 6px;">Aucune recette enregistrée.</p>
      <p style="font-size:12px; opacity:.6; margin:0;">
        Si tout a disparu, essaie "Restaurer sauvegarde" ou "Récupérer cloud".
      </p>
    `;
    return;
  }

  list.innerHTML = items.map((r) => {
    const active = r.id === state.selectedId;
    const date = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString("fr-FR") : "";
    const includedExtras = (r.extras || []).filter((e) => e.included !== false);
    const baseTotals = computeTotalsForIngredients(r.ingredients || [], r.portions || 1);
    const extrasRaw = computeTotalsForIngredients(includedExtras, 1);
    const totals = { per: {} };
    for (const f of FIELDS) {
      totals.per[f.key] = (baseTotals.per[f.key] || 0) + (extrasRaw.total[f.key] || 0);
    }
    let nutritionSummary = "Par portion: ";
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
      nutritionSummary += "aucun ingrédient.";
    } else if (!hasRecipeNutritionData(r.ingredients)) {
      nutritionSummary += "données nutritionnelles manquantes.";
    } else {
      nutritionSummary += formatRecipeNutritionSummary(totals.per);
    }
    const stars = [1,2,3,4,5].map((n) =>
      `<span data-rate="${r.id}" data-star="${n}" style="cursor:pointer; font-size:18px; line-height:1; color:${n <= (r.rating||0) ? "#f5a623" : "#ccc"};">★</span>`
    ).join("");
    const madeItBtn = `<button data-madeit="${r.id}" title="${r.madeIt ? "Marquer comme non fait" : "Marquer comme déjà fait"}" style="font-size:12px; padding:3px 8px; border-radius:20px; border:1.5px solid ${r.madeIt ? "#1a7a3c" : "#bbb"}; background:${r.madeIt ? "#e8f8ee" : "transparent"}; color:${r.madeIt ? "#1a7a3c" : "#888"}; cursor:pointer;">${r.madeIt ? "✓ Déjà fait" : "Jamais fait"}</button>`;
    const notesId = `notes-${r.id}`;
    const hasNotes = r.notes && r.notes.trim().length > 0;
    return `
      <div data-recipe-row="${r.id}" style="border:1px solid #ddd; border-radius:12px; padding:10px; margin-bottom:8px; cursor:pointer; ${active ? "background:#f6f6f6;" : ""}">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700">${r.name}</div>
            <div style="font-size:12px; opacity:.7;">${r.ingredients.length} ingrédient(s) • ${r.portions} portion(s)${date ? " • " + date : ""}</div>
            <div style="font-size:12px; opacity:.75; margin-top:4px;">${nutritionSummary}</div>
            <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
              <div style="display:flex; gap:1px;" title="${r.rating ? r.rating + "/5" : "Non noté"}">${stars}</div>
              ${madeItBtn}
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end;">
            <button data-plan-recipe="${r.id}" title="Ajouter au planning" style="background:#f0f7ff; border-color:#bcd;">📅</button>
            <button data-edit-recipe="${r.id}">Modifier</button>
            <button data-duplicate-recipe="${r.id}">Dupliquer</button>
            <button data-del="${r.id}">Supprimer</button>
          </div>
        </div>
        <div style="margin-top:8px;" onclick="event.stopPropagation()">
          <textarea
            id="${notesId}"
            data-notes="${r.id}"
            placeholder="📝 Notes personnelles..."
            rows="2"
            style="width:100%; box-sizing:border-box; font-size:12.5px; font-family:inherit; line-height:1.5; padding:7px 10px; border-radius:8px; border:1.5px solid ${hasNotes ? "#f0d070" : "#e5e5e5"}; background:${hasNotes ? "#fffdf0" : "#fafafa"}; color:#444; resize:vertical; outline:none; transition:border-color .15s, background .15s;"
            onfocus="this.style.borderColor='#f5c518'; this.style.background='#fffdf0';"
            onblur="this.style.borderColor=this.value.trim() ? '#f0d070' : '#e5e5e5'; this.style.background=this.value.trim() ? '#fffdf0' : '#fafafa';"
          >${escapeHtml(r.notes || "")}</textarea>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      deleteRecipe(id);
    });
  });

  list.querySelectorAll("[data-edit-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-recipe");
      loadRecipe(id);
    });
  });

  list.querySelectorAll("[data-duplicate-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-duplicate-recipe");
      duplicateRecipe(id);
    });
  });

  list.querySelectorAll("[data-notes]").forEach((textarea) => {
    textarea.addEventListener("blur", () => {
      const id = textarea.getAttribute("data-notes");
      const recipe = state.recipes.find((r) => r.id === id);
      if (!recipe) return;
      recipe.notes = textarea.value;
      saveRecipes();
    });
    textarea.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
  });

  list.querySelectorAll("[data-rate]").forEach((star) => {
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = star.getAttribute("data-rate");
      const n = parseInt(star.getAttribute("data-star"), 10);
      const recipe = state.recipes.find((r) => r.id === id);
      if (!recipe) return;
      recipe.rating = recipe.rating === n ? 0 : n;
      saveRecipes();
      renderRecipeList();
    });
  });

  list.querySelectorAll("[data-madeit]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-madeit");
      const recipe = state.recipes.find((r) => r.id === id);
      if (!recipe) return;
      recipe.madeIt = !recipe.madeIt;
      saveRecipes();
      renderRecipeList();
    });
  });

  list.querySelectorAll("[data-plan-recipe]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-plan-recipe");
      const recipe = state.recipes.find((r) => r.id === id);
      if (!recipe) return;
      openAddToPlanModal({ type: "recipe", id, name: recipe.name, defaultQty: 1, unit: "portion(s)" });
    });
  });

  list.querySelectorAll("[data-recipe-row]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const id = row.getAttribute("data-recipe-row");
      if (!id) return;
      state.selectedId = id;
      renderRecipeList();
      saveDraft();
    });
    row.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      const id = row.getAttribute("data-recipe-row");
      if (!id) return;
      loadRecipe(id);
    });
  });
}

function renderProductLibrary() {
  const list = $("#productList");
  if (!list) return;

  const query = (state.productSearch || "").toLowerCase().trim();
  const categories = [...new Set(state.products.map((p) => p.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  if (state.productCategoryFilter) {
    const hasCategory = categories.some(
      (c) => c.toLowerCase() === state.productCategoryFilter.toLowerCase()
    );
    if (!hasCategory) state.productCategoryFilter = "";
  }
  let items = [...state.products];
  if (query) items = items.filter((p) => p.name.toLowerCase().includes(query));
  if (state.productCategoryFilter) {
    items = items.filter((p) => (p.category || "").toLowerCase() === state.productCategoryFilter.toLowerCase());
  }
  items.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  const filter = $("#productCategoryFilter");
  if (filter) {
    const current = state.productCategoryFilter;
    filter.innerHTML = `<option value="">Toutes</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");
    filter.value = current || "";
  }

  if (items.length === 0) {
    list.innerHTML = `<p style="opacity:.7">Aucun produit enregistré.</p>`;
    return;
  }

  list.innerHTML = items.map((p) => {
    const values = FIELDS.map((f) => {
      const v = p.per100[f.key];
      const label = f.short || f.label;
      return `${label}: ${v === null ? 0 : v}${f.unit}`;
    }).join(" | ");
    const cat = p.category ? `<span style="font-size:11px; padding:2px 6px; border-radius:999px; background:#f2f2f2; margin-left:6px;">${p.category}</span>` : "";
    const image = p.image
      ? `<img src="${p.image}" alt="" style="width:52px; height:52px; object-fit:cover; border-radius:10px;" />`
      : `<div style="width:52px; height:52px; border-radius:10px; background:#eee; display:flex; align-items:center; justify-content:center; font-size:11px; color:#777;">No image</div>`;

    return `
      <div data-prod-card="${p.id}" style="border:1px solid #ddd; border-radius:12px; padding:10px; margin-bottom:8px; cursor:pointer;">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${image}
              <div>
                <div style="font-weight:700">${p.name}${cat}</div>
                <div style="font-size:12px; opacity:.7;">valeurs /${formatPerQty(p.perQty)}${p.unit}</div>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
            <button data-plan-product="${p.id}" title="Ajouter au planning" style="background:#f0f7ff; border-color:#bcd;">📅</button>
            <button data-prod-add="${p.id}">Ajouter</button>
            <button data-prod-extra="${p.id}" style="background:#fef9c3; border-color:#fbbf24;" title="Ajouter aux Extras">+ Extras</button>
            <button data-prod-edit="${p.id}">Modifier</button>
            <button data-prod-del="${p.id}">Supprimer</button>
          </div>
        </div>
        <div style="margin-top:6px; font-size:13px; opacity:.9;">${values}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-prod-card]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const id = card.getAttribute("data-prod-card");
      addProductToRecipe(id);
    });
  });

  list.querySelectorAll("[data-prod-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-prod-add");
      addProductToRecipe(id);
    });
  });

  list.querySelectorAll("[data-prod-extra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      addProductToExtras(btn.getAttribute("data-prod-extra"));
    });
  });

  list.querySelectorAll("[data-prod-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-prod-edit");
      startEditProduct(id);
    });
  });

  list.querySelectorAll("[data-prod-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-prod-del");
      deleteProduct(id);
    });
  });

  list.querySelectorAll("[data-plan-product]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-plan-product");
      const prod = state.products.find((p) => p.id === id);
      if (!prod) return;
      openAddToPlanModal({ type: "product", id, name: prod.name, defaultQty: 100, unit: prod.unit });
    });
  });
}

function renderTrashPage() {
  const page = $("#pageTrash");
  if (!page) return;
  pruneTrash();

  const recipesWrap = $("#trashRecipes");
  const productsWrap = $("#trashProducts");
  const emptyBtn = $("#trashEmpty");
  const total = state.trash.recipes.length + state.trash.products.length;

  if (emptyBtn) {
    emptyBtn.disabled = total === 0;
    emptyBtn.onclick = () => {
      if (total === 0) return;
      const ok = confirm("Vider la poubelle ? La suppression sera définitive.");
      if (!ok) return;
      state.trash = { products: [], recipes: [] };
      saveTrash();
      renderTrashPage();
    };
  }

  const recipeEntries = [...state.trash.recipes].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  if (recipesWrap) {
    if (recipeEntries.length === 0) {
      recipesWrap.innerHTML = `<p style="opacity:.7; margin:0;">Aucune recette supprimée.</p>`;
    } else {
      recipesWrap.innerHTML = `
        <h3 style="margin:0 0 8px;">Recettes supprimées</h3>
        ${recipeEntries.map((entry) => {
          const r = entry.item || {};
          const meta = formatTrashMeta(entry.deletedAt);
          const ageLabel = meta.ageDays <= 0 ? "Supprimé aujourd'hui" : `Supprimé il y a ${meta.ageDays} jour${meta.ageDays > 1 ? "s" : ""}`;
          const remainingLabel = meta.remainingDays <= 0
            ? "Suppression auto imminente"
            : `Suppression auto dans ${meta.remainingDays} jour${meta.remainingDays > 1 ? "s" : ""}`;
          const detail = `${ageLabel}${meta.dateLabel ? " • " + meta.dateLabel : ""} • ${remainingLabel}`;
          const ingredientsCount = Array.isArray(r.ingredients) ? r.ingredients.length : 0;
          return `
            <div style="border:1px solid #ddd; border-radius:12px; padding:10px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div>
                  <div style="font-weight:700;">${escapeHtml(r.name || "Recette")}</div>
                  <div style="font-size:12px; opacity:.7;">${ingredientsCount} ingrédient(s) • ${r.portions || 1} portion(s)</div>
                  <div style="font-size:12px; opacity:.7; margin-top:4px;">${detail}</div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button data-trash-restore data-trash-type="recipe" data-trash-id="${r.id}">Restaurer</button>
                  <button data-trash-delete data-trash-type="recipe" data-trash-id="${r.id}">Supprimer définitivement</button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      `;
    }
  }

  const productEntries = [...state.trash.products].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  if (productsWrap) {
    if (productEntries.length === 0) {
      productsWrap.innerHTML = `<p style="opacity:.7; margin:0;">Aucun ingrédient supprimé.</p>`;
    } else {
      productsWrap.innerHTML = `
        <h3 style="margin:0 0 8px;">Ingrédients supprimés</h3>
        ${productEntries.map((entry) => {
          const p = entry.item || {};
          const meta = formatTrashMeta(entry.deletedAt);
          const ageLabel = meta.ageDays <= 0 ? "Supprimé aujourd'hui" : `Supprimé il y a ${meta.ageDays} jour${meta.ageDays > 1 ? "s" : ""}`;
          const remainingLabel = meta.remainingDays <= 0
            ? "Suppression auto imminente"
            : `Suppression auto dans ${meta.remainingDays} jour${meta.remainingDays > 1 ? "s" : ""}`;
          const detail = `${ageLabel}${meta.dateLabel ? " • " + meta.dateLabel : ""} • ${remainingLabel}`;
          const perLabel = `/${formatPerQty(p.perQty)}${p.unit || "g"}`;
          return `
            <div style="border:1px solid #ddd; border-radius:12px; padding:10px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div style="display:flex; gap:8px; align-items:center;">
                  ${renderProductImage(p, 44)}
                  <div>
                    <div style="font-weight:700;">${escapeHtml(p.name || "Ingrédient")}</div>
                    <div style="font-size:12px; opacity:.7;">${perLabel}</div>
                    <div style="font-size:12px; opacity:.7; margin-top:4px;">${detail}</div>
                  </div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button data-trash-restore data-trash-type="product" data-trash-id="${p.id}">Restaurer</button>
                  <button data-trash-delete data-trash-type="product" data-trash-id="${p.id}">Supprimer définitivement</button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      `;
    }
  }

  page.querySelectorAll("[data-trash-restore]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-trash-type");
      const id = btn.getAttribute("data-trash-id");
      if (!type || !id) return;
      restoreTrashItem(type, id);
    });
  });

  page.querySelectorAll("[data-trash-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-trash-type");
      const id = btn.getAttribute("data-trash-id");
      if (!type || !id) return;
      const ok = confirm("Supprimer définitivement ? Cette action est irréversible.");
      if (!ok) return;
      deleteTrashItem(type, id);
    });
  });
}

function formatCompareValue(field, product) {
  const raw = product?.per100?.[field.key];
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return "—";
  const value = round(raw, field.decimals);
  return `${value} ${field.unit}`;
}

function renderProductImage(product, size = 40) {
  const px = Number.isFinite(size) ? Math.max(24, size) : 40;
  if (product?.image) {
    return `<img src="${product.image}" alt="" style="width:${px}px; height:${px}px; object-fit:cover; border-radius:10px; border:1px solid #e5e5e5;" />`;
  }
  return `<div style="width:${px}px; height:${px}px; border-radius:10px; border:1px dashed #ccc; display:flex; align-items:center; justify-content:center; font-size:10px; color:#777; background:#fff;">Sans image</div>`;
}

function toggleCompareProduct(id) {
  if (!id) return;
  const idx = state.compareSelected.indexOf(id);
  if (idx >= 0) {
    state.compareSelected.splice(idx, 1);
  } else {
    if (state.compareSelected.length >= COMPARE_MAX) {
      alert(`Limite de comparaison: ${COMPARE_MAX} produits.`);
      return;
    }
    state.compareSelected = [...state.compareSelected, id];
  }
  saveDraft();
  renderComparePage();
}

function clearCompareSelection() {
  state.compareSelected = [];
  saveDraft();
  renderComparePage();
}

function renderComparePage() {
  const list = $("#compareList");
  const tableWrap = $("#compareTableWrap");
  const selectedWrap = $("#compareSelected");
  const info = $("#compareSelectionInfo");
  if (!list || !tableWrap || !selectedWrap || !info) return;

  const query = (state.compareSearch || "").toLowerCase().trim();
  const categories = [...new Set(state.products.map((p) => p.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  if (state.compareCategory) {
    const hasCategory = categories.some(
      (c) => c.toLowerCase() === state.compareCategory.toLowerCase()
    );
    if (!hasCategory) state.compareCategory = "";
  }

  let items = [...state.products];
  if (query) items = items.filter((p) => p.name.toLowerCase().includes(query));
  if (state.compareCategory) {
    items = items.filter((p) => (p.category || "").toLowerCase() === state.compareCategory.toLowerCase());
  }
  items.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  const filter = $("#compareCategory");
  if (filter) {
    const current = state.compareCategory;
    filter.innerHTML = `<option value="">Toutes</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");
    filter.value = current || "";
  }

  const selected = state.compareSelected
    .map((id) => state.products.find((p) => p.id === id))
    .filter(Boolean);
  if (selected.length !== state.compareSelected.length) {
    state.compareSelected = selected.map((p) => p.id);
    saveDraft();
  }

  info.textContent = selected.length === 0
    ? `Sélectionne jusqu'à ${COMPARE_MAX} produits pour comparer.`
    : `Sélection: ${selected.length}/${COMPARE_MAX}.`;

  if (selected.length === 0) {
    selectedWrap.innerHTML = `<div style="font-size:12px; opacity:.6;">Aucun produit sélectionné.</div>`;
  } else {
    selectedWrap.innerHTML = selected.map((p) => {
      const cat = p.category
        ? `<span style="font-size:11px; padding:2px 6px; border-radius:999px; background:#f2f2f2; margin-left:6px;">${escapeHtml(p.category)}</span>`
        : "";
      return `
        <div style="display:flex; gap:8px; align-items:center; border:1px solid #ddd; border-radius:999px; padding:4px 10px; background:#fff;">
          ${renderProductImage(p, 28)}
          <span style="font-size:12px; font-weight:600;">${escapeHtml(p.name)}</span>
          ${cat}
          <button data-compare-remove="${p.id}" style="font-size:12px;">Retirer</button>
        </div>
      `;
    }).join("");
  }

  if (selected.length === 0) {
    tableWrap.innerHTML = `<div style="font-size:12px; opacity:.7;">Ajoute des produits pour voir la comparaison.</div>`;
  } else {
    const headerCells = selected.map((p) => `
      <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e5e5; min-width:170px;">
        <div style="display:flex; gap:8px; align-items:center;">
          ${renderProductImage(p, 44)}
          <div>
            <div style="font-weight:700;">${escapeHtml(p.name)}</div>
            <div style="font-size:11px; opacity:.6;">/${formatPerQty(p.perQty)}${p.unit}</div>
          </div>
        </div>
      </th>
    `).join("");

    const rows = [
      { label: "Catégorie", values: selected.map((p) => p.category || "—") },
      ...FIELDS.map((f) => ({
        label: f.label,
        values: selected.map((p) => formatCompareValue(f, p)),
      })),
    ];

    const rowsHtml = rows.map((row) => `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #eee; font-weight:600; white-space:nowrap;">${escapeHtml(row.label)}</td>
        ${row.values.map((value) => `
          <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(String(value))}</td>
        `).join("")}
      </tr>
    `).join("");

    tableWrap.innerHTML = `
      <table style="width:100%; border-collapse:collapse; background:#fff; border-radius:10px; overflow:hidden;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #e5e5e5;">Nutriment</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  if (items.length === 0) {
    list.innerHTML = `<p style="opacity:.7">Aucun produit enregistré.</p>`;
  } else {
    const selectedSet = new Set(state.compareSelected);
    list.innerHTML = items.map((p) => {
      const isSelected = selectedSet.has(p.id);
      const isLimit = !isSelected && selected.length >= COMPARE_MAX;
      const label = isSelected ? "Retirer" : "Ajouter";
      const disabled = isLimit ? "disabled" : "";
      const cat = p.category
        ? `<span style="font-size:11px; padding:2px 6px; border-radius:999px; background:#f2f2f2; margin-left:6px;">${escapeHtml(p.category)}</span>`
        : "";
      return `
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; border-bottom:1px solid #f0f0f0; padding:6px 0;">
          <div style="display:flex; gap:8px; align-items:center;">
            ${renderProductImage(p, 36)}
            <div>
              <div style="font-weight:600;">${escapeHtml(p.name)}${cat}</div>
              <div style="font-size:11px; opacity:.6;">/${formatPerQty(p.perQty)}${p.unit}</div>
            </div>
          </div>
          <button data-compare-toggle="${p.id}" ${disabled}>${label}</button>
        </div>
      `;
    }).join("");
  }

  selectedWrap.querySelectorAll("[data-compare-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-compare-remove");
      toggleCompareProduct(id);
    });
  });

  list.querySelectorAll("[data-compare-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-compare-toggle");
      toggleCompareProduct(id);
    });
  });
}

function renderJournalPage() {
  const weekStart = getWeekStartKey(state.weekPlanDate || todayKey());
  state.weekPlanDate = weekStart;
  const days = getWeekDayKeys(weekStart);
  _journalWeekStart = weekStart;
  _journalDays = days;
  if (!state.journalDay || !days.includes(state.journalDay)) {
    state.journalDay = days.includes(todayKey()) ? todayKey() : days[0];
  }
  const page = $("#pageJournal");
  if (!page) return;

  const fmt = (k) => parseDateKey(k)?.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) || k;
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  page.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px;">
      <button id="jPrev" style="padding:7px 13px; border-radius:8px;">← Semaine préc.</button>
      <strong style="min-width:180px; text-align:center;">${fmt(days[0])} — ${fmt(days[6])}</strong>
      <button id="jNext" style="padding:7px 13px; border-radius:8px;">Semaine suiv. →</button>
      <button id="jToday" style="padding:7px 13px; border-radius:8px;">Aujourd'hui</button>
      <div style="flex:1;"></div>
      <button id="jExportPdf" style="background:#e8501a; color:#fff; border:none; padding:7px 13px; border-radius:8px; cursor:pointer; font-weight:600;">📄 PDF semaine</button>
      <button id="jExportClaude" style="background:#7c3aed; color:#fff; border:none; padding:7px 13px; border-radius:8px; cursor:pointer; font-weight:600;">🤖 Claude</button>
    </div>

    <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-bottom:16px;">
      ${days.map((dk, i) => {
        const isToday = dk === todayKey();
        const isSelected = dk === state.journalDay;
        const d = parseDateKey(dk);
        const macros = computeWeekPlanDayMacros(weekStart, dk);
        const hasItems = MEAL_TYPES.some((m) => getWeekPlanMealItems(weekStart, dk, m.key).length > 0);
        return `<button data-j-day="${dk}" style="padding:8px 4px; border-radius:10px; cursor:pointer; text-align:center; background:${isSelected ? "#1a2b4a" : isToday ? "#e8f0fe" : "#f8f9fa"}; color:${isSelected ? "#fff" : "#1a1a1a"}; border:2px solid ${isSelected ? "#1a2b4a" : isToday ? "#2563eb" : "#e0e0e0"}; font-size:12px;">
          <div style="font-weight:700; font-size:10px; letter-spacing:.05em;">${dayNames[i]}</div>
          <div style="font-size:17px; font-weight:800; line-height:1.3;">${d ? d.getDate() : ""}</div>
          <div style="font-size:10px; margin-top:2px; ${isSelected ? "color:#a5b4fc" : "color:#e8501a"};">${hasItems ? `🔥${macros.kcal}` : "—"}</div>
        </button>`;
      }).join("")}
    </div>

    <div id="jDayDetail"></div>

    <!-- Bilan semaine -->
    <div id="jWeekBilan" style="margin-top:16px;"></div>

    <div id="jClaudePanel" style="display:none; margin-top:16px; border:2px solid #7c3aed; border-radius:12px; background:#faf7ff; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="font-size:15px;">🤖 Fichier pour Claude</strong>
        <div style="display:flex; gap:6px;">
          <button id="jClaudeCopy" style="background:#7c3aed; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:13px;">📋 Copier</button>
          <button id="jClaudeDownload" style="background:#1a2b4a; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:13px;">⬇️ .md</button>
          <button id="jClaudeClose" style="font-size:14px; padding:2px 8px;">✕</button>
        </div>
      </div>
      <div style="font-size:12px; color:#7c3aed; margin-bottom:8px;">👉 Copie ce texte et colle-le dans <strong>claude.ai</strong></div>
      <textarea id="jClaudeText" readonly style="width:100%; height:280px; font-size:12px; font-family:monospace; border:1px solid #d8b4fe; border-radius:8px; padding:10px; background:#fff; resize:vertical; box-sizing:border-box;"></textarea>
    </div>`;

  renderJournalDayDetail(weekStart, state.journalDay);
  _refreshWeekBilan(weekStart, days);

  // Week navigation
  page.querySelector("#jPrev").addEventListener("click", () => {
    const d = parseDateKey(weekStart);
    if (!d) return;
    d.setDate(d.getDate() - 7);
    state.weekPlanDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    renderJournalPage();
  });
  page.querySelector("#jNext").addEventListener("click", () => {
    const d = parseDateKey(weekStart);
    if (!d) return;
    d.setDate(d.getDate() + 7);
    state.weekPlanDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    renderJournalPage();
  });
  page.querySelector("#jToday").addEventListener("click", () => {
    state.weekPlanDate = todayKey();
    state.journalDay = todayKey();
    renderJournalPage();
  });

  // Day strip click
  page.querySelectorAll("[data-j-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.journalDay = btn.getAttribute("data-j-day");
      page.querySelectorAll("[data-j-day]").forEach((b) => {
        const dk = b.getAttribute("data-j-day");
        const isSel = dk === state.journalDay;
        const isTod = dk === todayKey();
        b.style.background = isSel ? "#1a2b4a" : isTod ? "#e8f0fe" : "#f8f9fa";
        b.style.color = isSel ? "#fff" : "#1a1a1a";
        b.style.borderColor = isSel ? "#1a2b4a" : isTod ? "#2563eb" : "#e0e0e0";
        const sub = b.querySelector("div:last-child");
        if (sub) sub.style.color = isSel ? "#a5b4fc" : "#e8501a";
      });
      renderJournalDayDetail(weekStart, state.journalDay);
    });
  });

  // Export
  page.querySelector("#jExportPdf").addEventListener("click", () => exportWeekPlanPdf(weekStart, days));
  page.querySelector("#jExportClaude").addEventListener("click", () => {
    const md = buildWeekPlanMarkdown(weekStart, days);
    if (!md) return alert("Le planning est vide.");
    const textarea = page.querySelector("#jClaudeText");
    const panel = page.querySelector("#jClaudePanel");
    if (textarea) textarea.value = md;
    if (panel) { panel.style.display = "block"; panel.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  page.querySelector("#jClaudeClose").addEventListener("click", () => { const p = page.querySelector("#jClaudePanel"); if (p) p.style.display = "none"; });
  page.querySelector("#jClaudeCopy").addEventListener("click", () => {
    const t = page.querySelector("#jClaudeText");
    if (!t) return;
    navigator.clipboard.writeText(t.value).then(() => {
      const b = page.querySelector("#jClaudeCopy");
      if (b) { b.textContent = "✅ Copié !"; setTimeout(() => { b.textContent = "📋 Copier"; }, 2000); }
    });
  });
  page.querySelector("#jClaudeDownload").addEventListener("click", () => {
    const t = page.querySelector("#jClaudeText");
    if (!t) return;
    const blob = new Blob([t.value], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planning-semaine-${weekStart}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function renderJournalDayDetail(weekStart, dateKey) {
  const el = document.getElementById("jDayDetail");
  if (!el) return;
  const dayLabel = parseDateKey(dateKey)?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) || dateKey;
  const totals = computeWeekPlanDayMacros(weekStart, dateKey);

  const isFreeDay = !!state.freeDays[dateKey];
  const goals = isFreeDay ? GOALS_FREE : GOALS_JOURNALIER;

  el.innerHTML = `
    <div style="background:${isFreeDay ? "#7c2d12" : "#1a2b4a"}; color:#fff; border-radius:12px 12px 0 0; padding:14px 20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:17px; font-weight:800; text-transform:capitalize;">${escapeHtml(dayLabel)}</div>
          ${isFreeDay ? `<span style="background:#f97316; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:100px; letter-spacing:.05em;">FREE</span>` : ""}
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end;">
          <button id="jDayFreeToggle" style="background:${isFreeDay ? "#f97316" : "rgba(255,255,255,.15)"}; color:#fff; border:${isFreeDay ? "none" : "1px solid rgba(255,255,255,.3)"}; padding:5px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; white-space:nowrap;">${isFreeDay ? "🎉 FREE ON" : "🎉 FREE"}</button>
          <button id="jDayCopy" style="background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.3); padding:5px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; white-space:nowrap;">📋 Copier</button>
          ${state._wpClipboard ? `<button id="jDayPaste" style="background:#e8501a; color:#fff; border:none; padding:5px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; white-space:nowrap;">📌 Coller</button>` : ""}
          <button id="jDayNotes" style="background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.3); padding:5px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; white-space:nowrap;">📝 Notes</button>
          <button id="jDayClaude" style="background:#7c3aed; color:#fff; border:none; padding:5px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; white-space:nowrap;">🤖 Claude</button>
        </div>
      </div>
      <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px;">
        <span>🔥 <strong>${totals.kcal}</strong> kcal</span>
        <span>💪 <strong>${totals.prot}g</strong> prot.</span>
        <span>🍞 <strong>${totals.carb}g</strong> gluc.</span>
        <span>🧈 <strong>${totals.fat}g</strong> lip.</span>
        <span>🌿 <strong>${totals.fiber}g</strong> fibres</span>
      </div>
    </div>
    <!-- Goals du jour -->
    <div style="margin:10px 0; border:1px solid #dde3ee; border-radius:10px; overflow:hidden;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f0f4fb;">
            <th style="padding:8px 14px; text-align:left; font-weight:700; border-bottom:1px solid #dde3ee; color:#1a2b4a;">Nutriment</th>
            <th style="padding:8px 14px; text-align:right; font-weight:700; border-bottom:1px solid #dde3ee; color:#e8501a;">Réel</th>
            <th style="padding:8px 14px; text-align:right; font-weight:700; border-bottom:1px solid #dde3ee; color:#555;">Objectif</th>
            <th style="padding:8px 14px; text-align:center; font-weight:700; border-bottom:1px solid #dde3ee; color:#555;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${[
            { emoji:"🔥", label:"Calories",  key:"kcal",  unit:"kcal" },
            { emoji:"💪", label:"Protéines", key:"prot",  unit:"g"    },
            { emoji:"🍞", label:"Glucides",  key:"carb",  unit:"g"    },
            { emoji:"🧈", label:"Lipides",   key:"fat",   unit:"g"    },
            { emoji:"🌿", label:"Fibres",    key:"fiber", unit:"g"    },
            { emoji:"🧂", label:"Sel",       key:"salt",  unit:"g"    },
          ].map((g, i) => {
            const [gMin, gMax] = goals[g.key] || [null, null];
            const maxOnly = gMin === null;
            const actual = totals[g.key] || 0;
            let statusHtml;
            if (maxOnly) {
              if (actual <= gMax) {
                statusHtml = `<span style="color:#1a7a3c; font-size:16px;">✅</span>`;
              } else {
                const over = round(actual - gMax, 2);
                statusHtml = `<span style="color:#e8501a;">⚠️ +${over}${g.unit}</span>`;
              }
            } else {
              if (actual >= gMin && actual <= gMax) {
                statusHtml = `<span style="color:#1a7a3c; font-size:16px;">✅</span>`;
              } else if (actual < gMin) {
                const diff = round(gMin - actual, g.key === "kcal" ? 0 : 1);
                statusHtml = `<span style="color:#b45309;">⚠️ −${diff}${g.unit}</span>`;
              } else {
                const diff = round(actual - gMax, g.key === "kcal" ? 0 : 1);
                statusHtml = `<span style="color:#e8501a;">⚠️ +${diff}${g.unit}</span>`;
              }
            }
            const objLabel = maxOnly ? `< ${gMax}${g.unit}` : `${gMin}–${gMax}${g.unit}`;
            return `<tr style="${i > 0 ? "border-top:1px solid #f0f4f8;" : ""}">
              <td style="padding:9px 14px; font-weight:600;">${g.emoji} ${g.label}</td>
              <td style="padding:9px 14px; text-align:right; font-weight:700; color:#1a1a1a;">${actual}${g.unit}</td>
              <td style="padding:9px 14px; text-align:right; color:#666;">${objLabel}</td>
              <td style="padding:9px 14px; text-align:center;">${statusHtml}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>


    <div style="border:1px solid #dde3ee; border-top:none; border-radius:0 0 12px 12px; overflow:hidden;">
      ${MEAL_TYPES.map((meal, mi) => {
        const items = getWeekPlanMealItems(weekStart, dateKey, meal.key);
        const mealKcal = round(items.reduce((s, it) => s + (computeWeekPlanItemMacros(it).kcal || 0), 0), 0);
        const mealProt = round(items.reduce((s, it) => s + (computeWeekPlanItemMacros(it).prot || 0), 0), 1);
        const itemsHtml = items.length === 0
          ? `<div style="font-size:12px; opacity:.4; padding:6px 18px 10px; font-style:italic;">Rien de prévu</div>`
          : items.map((it, idx) => {
              const m = computeWeekPlanItemMacros(it);
              const qty = it.type === "recipe" ? `${it.portions || 1} portion(s)` : it.type === "ephemeral" ? "✨ éphémère" : `${it.qty || ""}${it.unit || "g"}`;
              const hidden = !!it.hidden;
              const nameEl = it.type === "recipe"
                ? `<button data-j-goto-recipe="${escapeHtml(it.recipeId)}" style="font-weight:600;font-size:13px;background:none;border:none;padding:0;cursor:pointer;color:${hidden ? "#bbb" : "#1a2b4a"};text-decoration:${hidden ? "line-through" : "underline dotted"};text-align:left;">${escapeHtml(it.name)}</button>`
                : `<span style="font-weight:600;font-size:13px;color:${hidden ? "#bbb" : "inherit"};${hidden ? "text-decoration:line-through;" : ""}">${escapeHtml(it.name)}</span>`;
              const editPanel = it.type === "ephemeral" ? "" : `
                <div id="jedit-${escapeHtml(it.id)}" style="display:none; padding:8px 18px 10px; background:#f0f4ff; border-top:1px solid #dde3ee;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:12px; font-weight:600; color:#1a2b4a;">${it.type === "recipe" ? "Portions :" : "Quantité :"}</span>
                    <input type="number" id="jedit-val-${escapeHtml(it.id)}" value="${it.type === "recipe" ? (it.portions || 1) : (it.qty || "")}" min="0.01" step="any" inputmode="decimal" style="width:75px; padding:4px 8px; border:1px solid #a5b4fc; border-radius:6px; font-size:13px; font-weight:600;" />
                    ${it.type !== "recipe" ? `<input type="text" id="jedit-unit-${escapeHtml(it.id)}" value="${escapeHtml(it.unit || "g")}" placeholder="g" style="width:48px; padding:4px 8px; border:1px solid #a5b4fc; border-radius:6px; font-size:13px;" />` : `<span style="font-size:12px;color:#666;">portion(s)</span>`}
                    <button data-j-edit-ok="${escapeHtml(it.id)}" data-j-day="${dateKey}" data-j-meal="${meal.key}" style="padding:4px 14px; background:#e8501a; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">✔ OK</button>
                    <button data-j-edit-cancel="${escapeHtml(it.id)}" style="padding:4px 10px; background:#e0e0e0; border:none; border-radius:6px; font-size:12px; cursor:pointer;">✕</button>
                  </div>
                </div>`;
              return `<div style="border-top:1px solid #f0f4f8;${hidden ? "opacity:.55;" : ""}">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px 18px;">
                  <div style="display:flex; flex-direction:column; gap:1px; flex-shrink:0;">
                    <button data-j-up="${escapeHtml(it.id)}" data-j-day="${dateKey}" data-j-meal="${meal.key}" ${idx === 0 ? "disabled" : ""} style="padding:0 5px;font-size:10px;line-height:1.4;border:1px solid #dde3ee;border-radius:4px;background:#f8faff;cursor:pointer;color:#666;${idx === 0 ? "opacity:.3;" : ""}">▲</button>
                    <button data-j-dn="${escapeHtml(it.id)}" data-j-day="${dateKey}" data-j-meal="${meal.key}" ${idx === items.length - 1 ? "disabled" : ""} style="padding:0 5px;font-size:10px;line-height:1.4;border:1px solid #dde3ee;border-radius:4px;background:#f8faff;cursor:pointer;color:#666;${idx === items.length - 1 ? "opacity:.3;" : ""}">▼</button>
                  </div>
                  <div style="min-width:0; flex:1;">
                    ${nameEl}
                    <span style="font-size:11px; color:#999; margin-left:6px;">${qty}</span>
                    ${!hidden && m.kcal > 0 ? `<span style="font-size:11px; color:#e8501a; margin-left:8px;">🔥${m.kcal} kcal &nbsp;💪${m.prot}g</span>` : ""}
                    ${hidden ? `<span style="font-size:10px; color:#aaa; margin-left:8px;">non comptabilisé</span>` : ""}
                  </div>
                  <div style="display:flex;gap:4px;flex-shrink:0;">
                    ${it.type !== "ephemeral" ? `<button data-j-edit="${escapeHtml(it.id)}" data-j-day="${dateKey}" data-j-meal="${meal.key}" title="Modifier la quantité" style="padding:2px 7px;font-size:12px;border:1px solid #a5b4fc;border-radius:5px;background:#f0f4ff;cursor:pointer;">✏️</button>` : ""}
                    <button data-j-toggle="${escapeHtml(it.id)}" data-j-day="${dateKey}" data-j-meal="${meal.key}" title="${hidden ? "Réactiver" : "Masquer"}" style="padding:2px 7px;font-size:12px;border:1px solid #dde3ee;border-radius:5px;background:${hidden ? "#fff3e0" : "#fff"};cursor:pointer;">${hidden ? "🙈" : "👁"}</button>
                    <button data-j-del="${escapeHtml(it.id)}" data-j-day="${dateKey}" data-j-meal="${meal.key}" style="padding:2px 7px;font-size:11px;color:#999;border:1px solid #e0e0e0;border-radius:5px;background:#fff;cursor:pointer;">✕</button>
                  </div>
                </div>
                ${editPanel}
              </div>`;
            }).join("");
        return `<div ${mi > 0 ? 'style="border-top:1px solid #dde3ee;"' : ""}>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 18px; background:#f8faff;">
            <div style="font-weight:700; font-size:13px;">${meal.label}</div>
            <div style="display:flex; align-items:center; gap:10px;">
              ${mealKcal > 0 ? `<span style="font-size:11px; color:#e8501a; font-weight:600;">🔥${mealKcal} kcal &nbsp;💪${mealProt}g</span>` : ""}
              <button data-j-open-add="${meal.key}" data-j-open-day="${dateKey}" style="background:#1a2b4a; color:#fff; border:none; padding:4px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">+ Ajouter</button>
            </div>
          </div>
          ${itemsHtml}
          <div id="jadd-${meal.key}" style="display:none; padding:12px 18px; border-top:1px solid #dde3ee; background:#fcfaff;">
            <input type="text" placeholder="🔍 Rechercher produit ou recette..." id="jaddsearch-${meal.key}" style="width:100%; margin-bottom:8px; padding:8px 10px; border:1px solid #dde3ee; border-radius:8px; font-size:13px; box-sizing:border-box;" />
            <div id="jaddresults-${meal.key}" style="max-height:240px; overflow-y:auto; display:grid; gap:4px;"></div>
            <div style="margin-top:8px; border-top:1px dashed #dde3ee; padding-top:8px;">
              <button id="jeph-${meal.key}" style="width:100%; padding:7px; background:#fff7e6; border:1px dashed #e8501a; border-radius:8px; font-size:12px; font-weight:600; color:#e8501a; cursor:pointer;">✨ Ingrédient éphémère (saisie manuelle)</button>
              <div id="jephform-${meal.key}" style="display:none; margin-top:8px; padding:10px; background:#fff; border:1px solid #e8d5b0; border-radius:8px; gap:6px;">
                <input type="text" id="jephname-${meal.key}" placeholder="Nom de l'ingrédient" style="padding:6px 10px; border:1px solid #dde3ee; border-radius:6px; font-size:13px; width:100%; box-sizing:border-box; margin-bottom:6px;" />
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                  <div><div style="font-size:11px; opacity:.6; margin-bottom:2px;">🔥 Kcal</div><input type="number" id="jephkcal-${meal.key}" min="0" placeholder="0" style="width:100%; padding:5px 8px; border:1px solid #dde3ee; border-radius:6px; font-size:13px; box-sizing:border-box;" /></div>
                  <div><div style="font-size:11px; opacity:.6; margin-bottom:2px;">💪 Protéines (g)</div><input type="number" id="jephprot-${meal.key}" min="0" placeholder="0" style="width:100%; padding:5px 8px; border:1px solid #dde3ee; border-radius:6px; font-size:13px; box-sizing:border-box;" /></div>
                  <div><div style="font-size:11px; opacity:.6; margin-bottom:2px;">🍞 Glucides (g)</div><input type="number" id="jephcarb-${meal.key}" min="0" placeholder="0" style="width:100%; padding:5px 8px; border:1px solid #dde3ee; border-radius:6px; font-size:13px; box-sizing:border-box;" /></div>
                  <div><div style="font-size:11px; opacity:.6; margin-bottom:2px;">🧈 Lipides (g)</div><input type="number" id="jephfat-${meal.key}" min="0" placeholder="0" style="width:100%; padding:5px 8px; border:1px solid #dde3ee; border-radius:6px; font-size:13px; box-sizing:border-box;" /></div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button id="jephok-${meal.key}" style="flex:1; padding:7px; background:#e8501a; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">✔ Ajouter</button>
                  <button id="jephcancel-${meal.key}" style="padding:7px 12px; background:#f0f0f0; border:none; border-radius:6px; font-size:13px; cursor:pointer;">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>

    <details style="margin-top:12px;">
      <summary style="cursor:pointer; font-size:13px; font-weight:700; padding:10px 14px; background:#f8faff; border:1px solid #dde3ee; border-radius:10px; list-style:none; display:flex; align-items:center; gap:6px;">▸ Détail nutritionnel complet</summary>
      <div style="border:1px solid #dde3ee; border-top:none; border-radius:0 0 10px 10px; padding:12px 16px; background:#fff;">
        ${[
          { emoji:"🔥", label:"Énergie", val:`${totals.kcal} kcal / ${totals.kj} kJ` },
          { emoji:"💪", label:"Protéines", val:`${totals.prot} g` },
          { emoji:"🍞", label:"Glucides", val:`${totals.carb} g`, sub:`dont sucres : ${totals.sugar} g` },
          { emoji:"🧈", label:"Lipides", val:`${totals.fat} g`, sub:`dont saturés : ${totals.sat} g` },
          { emoji:"🌿", label:"Fibres alimentaires", val:`${totals.fiber} g` },
          { emoji:"🧂", label:"Sel", val:`${totals.salt} g` },
          { emoji:"🦴", label:"Calcium", val:`${totals.calcium} g` },
        ].map(r => `<div style="display:flex; justify-content:space-between; align-items:baseline; padding:6px 0; border-bottom:1px solid #f0f0f0; font-size:13px;"><span>${r.emoji} ${r.label}</span><span style="font-weight:600; text-align:right;">${r.val}${r.sub ? `<br><span style="font-size:11px; font-weight:400; opacity:.6;">${r.sub}</span>` : ""}</span></div>`).join("")}
      </div>
    </details>

    <div id="jNotesPanel" style="display:none; margin-top:12px; border:2px solid #334155; border-radius:12px; background:#f8fafc; padding:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="font-size:14px;">📝 Notes de la journée</strong>
        <div style="display:flex; gap:6px;">
          <button id="jNotesCopy" style="background:#334155; color:#fff; border:none; padding:5px 11px; border-radius:7px; cursor:pointer; font-size:12px;">📋 Copier</button>
          <button id="jNotesDownload" style="background:#1a2b4a; color:#fff; border:none; padding:5px 11px; border-radius:7px; cursor:pointer; font-size:12px;">⬇️ .txt</button>
          <button id="jNotesClose" style="font-size:14px; padding:2px 8px; border:none; background:none; cursor:pointer;">✕</button>
        </div>
      </div>
      <textarea id="jNotesText" readonly style="width:100%; height:260px; font-size:13px; font-family:monospace; border:1px solid #cbd5e1; border-radius:8px; padding:10px; background:#fff; resize:vertical; box-sizing:border-box; line-height:1.6;"></textarea>
    </div>`;

  // Delete listeners
  el.querySelectorAll("[data-j-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeWeekPlanItem(weekStart, btn.getAttribute("data-j-day"), btn.getAttribute("data-j-meal"), btn.getAttribute("data-j-del"));
      saveWeekPlans();
      renderJournalDayDetail(weekStart, dateKey);
      _refreshDayStrip(weekStart, dateKey);
    });
  });


  // FREE day toggle
  el.querySelector("#jDayFreeToggle")?.addEventListener("click", () => {
    if (state.freeDays[dateKey]) {
      delete state.freeDays[dateKey];
    } else {
      state.freeDays[dateKey] = true;
    }
    saveFreeDays();
    renderJournalDayDetail(weekStart, dateKey);
    _refreshDayStrip(weekStart, dateKey);
  });

  // Toggle hidden
  el.querySelectorAll("[data-j-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const arr = state.weekPlans?.[weekStart]?.[btn.getAttribute("data-j-day")]?.[btn.getAttribute("data-j-meal")];
      if (!arr) return;
      const item = arr.find((it) => it.id === btn.getAttribute("data-j-toggle"));
      if (!item) return;
      item.hidden = !item.hidden;
      saveWeekPlans();
      renderJournalDayDetail(weekStart, dateKey);
      _refreshDayStrip(weekStart, dateKey);
    });
  });

  // Move up/down listeners
  el.querySelectorAll("[data-j-up],[data-j-dn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.hasAttribute("data-j-up") ? "up" : "down";
      const itemId = btn.getAttribute("data-j-up") || btn.getAttribute("data-j-dn");
      moveWeekPlanItem(weekStart, btn.getAttribute("data-j-day"), btn.getAttribute("data-j-meal"), itemId, dir);
      saveWeekPlans();
      renderJournalDayDetail(weekStart, dateKey);
      _refreshDayStrip(weekStart, dateKey);
    });
  });

  // Edit qty/portions — toggle panel
  el.querySelectorAll("[data-j-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-j-edit");
      const panel = document.getElementById(`jedit-${id}`);
      if (!panel) return;
      const isOpen = panel.style.display !== "none";
      panel.style.display = isOpen ? "none" : "block";
      if (!isOpen) panel.querySelector("input")?.focus();
    });
  });

  el.querySelectorAll("[data-j-edit-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(`jedit-${btn.getAttribute("data-j-edit-cancel")}`);
      if (panel) panel.style.display = "none";
    });
  });

  el.querySelectorAll("[data-j-edit-ok]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-j-edit-ok");
      const mealKey = btn.getAttribute("data-j-meal");
      const day = btn.getAttribute("data-j-day");
      const arr = state.weekPlans?.[weekStart]?.[day]?.[mealKey];
      if (!arr) return;
      const item = arr.find((it) => it.id === id);
      if (!item) return;
      const rawVal = document.getElementById(`jedit-val-${id}`)?.value.replace(",", ".") || "";
      const val = parseFloat(rawVal);
      if (!Number.isFinite(val) || val <= 0) return;
      if (item.type === "recipe") {
        item.portions = val;
      } else {
        item.qty = val;
        const unitEl = document.getElementById(`jedit-unit-${id}`);
        if (unitEl) item.unit = unitEl.value.trim() || item.unit || "g";
      }
      saveWeekPlans();
      renderJournalDayDetail(weekStart, dateKey);
      _refreshDayStrip(weekStart, dateKey);
    });
  });

  // Click on recipe name → go to recipe page
  el.querySelectorAll("[data-j-goto-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadRecipe(btn.getAttribute("data-j-goto-recipe"));
    });
  });

  // Open/close add panel
  el.querySelectorAll("[data-j-open-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mealKey = btn.getAttribute("data-j-open-add");
      const panel = document.getElementById(`jadd-${mealKey}`);
      if (!panel) return;
      const isOpen = panel.style.display !== "none";
      el.querySelectorAll("[id^='jadd-']").forEach((p) => { p.style.display = "none"; });
      if (!isOpen) {
        panel.style.display = "block";
        const s = document.getElementById(`jaddsearch-${mealKey}`);
        if (s) { s.value = ""; s.focus(); renderJournalAddResults(weekStart, dateKey, mealKey, ""); }
      }
    });
  });

  // Notes day export
  el.querySelector("#jDayNotes")?.addEventListener("click", () => {
    const hasMeals = MEAL_TYPES.some((m) => getWeekPlanMealItems(weekStart, dateKey, m.key).length > 0);
    if (!hasMeals) return alert("Journée vide — ajoute des repas avant d'exporter.");
    const panel = el.querySelector("#jNotesPanel");
    const textarea = el.querySelector("#jNotesText");
    if (!panel || !textarea) return;
    textarea.value = buildDayNotes(weekStart, dateKey);
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    if (panel.style.display === "block") panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  el.querySelector("#jNotesCopy")?.addEventListener("click", () => {
    const t = el.querySelector("#jNotesText");
    if (!t) return;
    navigator.clipboard.writeText(t.value).then(() => {
      const btn = el.querySelector("#jNotesCopy");
      if (btn) { btn.textContent = "✔ Copié !"; setTimeout(() => { if (btn.isConnected) btn.textContent = "📋 Copier"; }, 1500); }
    });
  });
  el.querySelector("#jNotesDownload")?.addEventListener("click", () => {
    const t = el.querySelector("#jNotesText");
    if (!t) return;
    const blob = new Blob([t.value], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `journal-${dateKey}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  el.querySelector("#jNotesClose")?.addEventListener("click", () => {
    const panel = el.querySelector("#jNotesPanel");
    if (panel) panel.style.display = "none";
  });

  // Claude day export
  el.querySelector("#jDayClaude")?.addEventListener("click", () => {
    const md = buildDayMarkdown(weekStart, dateKey);
    if (!md) return alert("Journée vide — ajoute des repas avant d'exporter.");
    const textarea = document.getElementById("jClaudeText");
    const panel = document.getElementById("jClaudePanel");
    if (textarea) textarea.value = md;
    if (panel) { panel.style.display = "block"; panel.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });

  // Copy day
  el.querySelector("#jDayCopy")?.addEventListener("click", () => {
    const snap = {};
    for (const meal of MEAL_TYPES) {
      const items = getWeekPlanMealItems(weekStart, dateKey, meal.key);
      if (items.length) snap[meal.key] = JSON.parse(JSON.stringify(items));
    }
    if (!Object.keys(snap).length) return alert("Journée vide — rien à copier.");
    state._wpClipboard = snap;
    const btn = el.querySelector("#jDayCopy");
    if (btn) { btn.textContent = "✔ Copié !"; setTimeout(() => { if (btn.isConnected) btn.textContent = "📋 Copier"; }, 1500); }
    renderJournalDayDetail(weekStart, dateKey); // refresh to show Paste button
  });

  // Paste day
  el.querySelector("#jDayPaste")?.addEventListener("click", () => {
    if (!state._wpClipboard) return;
    const hasContent = MEAL_TYPES.some((m) => getWeekPlanMealItems(weekStart, dateKey, m.key).length > 0);
    if (hasContent && !confirm("Cette journée a déjà des repas. Remplacer par la journée copiée ?")) return;
    if (!state.weekPlans[weekStart]) state.weekPlans[weekStart] = {};
    if (!state.weekPlans[weekStart][dateKey]) state.weekPlans[weekStart][dateKey] = {};
    for (const meal of MEAL_TYPES) {
      if (state._wpClipboard[meal.key]) {
        // Give fresh IDs to avoid collisions
        state.weekPlans[weekStart][dateKey][meal.key] = state._wpClipboard[meal.key].map((it) => ({ ...it, id: crypto.randomUUID() }));
      } else {
        state.weekPlans[weekStart][dateKey][meal.key] = [];
      }
    }
    saveWeekPlans();
    renderJournalDayDetail(weekStart, dateKey);
    _refreshDayStrip(weekStart, dateKey);
  });

  // Search listeners
  MEAL_TYPES.forEach((meal) => {
    const s = document.getElementById(`jaddsearch-${meal.key}`);
    if (s) s.addEventListener("input", (e) => renderJournalAddResults(weekStart, dateKey, meal.key, e.target.value));
  });

  // Ephemeral ingredient listeners
  MEAL_TYPES.forEach((meal) => {
    const ephBtn  = document.getElementById(`jeph-${meal.key}`);
    const ephForm = document.getElementById(`jephform-${meal.key}`);
    if (!ephBtn || !ephForm) return;

    ephBtn.addEventListener("click", () => {
      const open = ephForm.style.display !== "none";
      ephForm.style.display = open ? "none" : "grid";
      if (!open) document.getElementById(`jephname-${meal.key}`)?.focus();
    });

    const addEphemeral = () => {
      const name = document.getElementById(`jephname-${meal.key}`)?.value.trim();
      const kcal = Number(document.getElementById(`jephkcal-${meal.key}`)?.value) || 0;
      const prot = Number(document.getElementById(`jephprot-${meal.key}`)?.value) || 0;
      const carb = Number(document.getElementById(`jephcarb-${meal.key}`)?.value) || 0;
      const fat  = Number(document.getElementById(`jephfat-${meal.key}`)?.value)  || 0;
      if (!name) { alert("Donnez un nom à l'ingrédient éphémère."); return; }
      const item = {
        id: crypto.randomUUID(),
        type: "ephemeral",
        name,
        macros: { kcal, prot, carb, fat, kj: round(kcal * 4.184, 0), sugar: 0, sat: 0, fiber: 0, salt: 0, calcium: 0 },
      };
      addWeekPlanItem(weekStart, dateKey, meal.key, item);
      saveWeekPlans();
      document.getElementById(`jadd-${meal.key}`)?.style && (document.getElementById(`jadd-${meal.key}`).style.display = "none");
      renderJournalDayDetail(weekStart, dateKey);
      _refreshDayStrip(weekStart, dateKey);
      const toast = document.createElement("div");
      toast.textContent = `✔ ${name} ajouté (éphémère)`;
      toast.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#e8501a;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;z-index:2000;box-shadow:0 4px 12px rgba(0,0,0,.2);";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    };

    document.getElementById(`jephok-${meal.key}`)?.addEventListener("click", addEphemeral);
    document.getElementById(`jephcancel-${meal.key}`)?.addEventListener("click", () => { ephForm.style.display = "none"; });
  });
}

function _refreshDayStrip(weekStart, dateKey) {
  const btn = document.querySelector(`[data-j-day="${dateKey}"]`);
  if (btn) {
    const macros = computeWeekPlanDayMacros(weekStart, dateKey);
    const sub = btn.querySelector("div:last-child");
    if (sub) sub.textContent = macros.kcal > 0 ? `🔥${macros.kcal}` : "—";
  }
  _refreshWeekBilan(_journalWeekStart, _journalDays);
}

function _refreshWeekBilan(weekStart, days) {
  const el = document.getElementById("jWeekBilan");
  if (!el) return;
  const wt = emptyNutrients();
  for (const dk of days) {
    const d = computeWeekPlanDayMacros(weekStart, dk);
    for (const f of FIELDS) wt[f.key] = round((wt[f.key] || 0) + (d[f.key] || 0), f.decimals);
  }
  const rows = [
    { emoji: "🔥", label: "Calories",  key: "kcal", unit: "kcal", dayMin: GOALS_JOURNALIER.kcal[0], dayMax: GOALS_JOURNALIER.kcal[1] },
    { emoji: "💪", label: "Protéines", key: "prot", unit: "g",    dayMin: GOALS_JOURNALIER.prot[0], dayMax: GOALS_JOURNALIER.prot[1] },
    { emoji: "🍞", label: "Glucides",  key: "carb", unit: "g",    dayMin: GOALS_JOURNALIER.carb[0], dayMax: GOALS_JOURNALIER.carb[1] },
    { emoji: "🧈", label: "Lipides",   key: "fat",  unit: "g",    dayMin: GOALS_JOURNALIER.fat[0],  dayMax: GOALS_JOURNALIER.fat[1]  },
  ];
  el.innerHTML = `
    <div style="border:1px solid #dde3ee; border-radius:12px; overflow:hidden;">
      <div style="background:#1a2b4a; color:#fff; padding:10px 18px; font-size:13px; font-weight:700; letter-spacing:.03em;">📊 Bilan de la semaine</div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#f0f4fb; text-align:left;">
              <th style="padding:8px 14px; font-weight:700; border-bottom:2px solid #dde3ee;">Macro</th>
              <th style="padding:8px 14px; font-weight:700; border-bottom:2px solid #dde3ee; color:#e8501a;">Consommé cette semaine</th>
              <th style="padding:8px 14px; font-weight:700; border-bottom:2px solid #dde3ee; color:#1a7a3c;">Objectif semaine</th>
              <th style="padding:8px 14px; font-weight:700; border-bottom:2px solid #dde3ee; color:#555;">Objectif / jour</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => {
              const actual = wt[r.key] || 0;
              const weekMin = r.dayMin * 7;
              const weekMax = r.dayMax * 7;
              const pct = weekMax > 0 ? Math.min(Math.round(actual / weekMax * 100), 100) : 0;
              const ok = actual >= weekMin && actual <= weekMax;
              const over = actual > weekMax;
              const barColor = over ? "#e8501a" : ok ? "#1a7a3c" : "#2563eb";
              return `<tr style="${i > 0 ? "border-top:1px solid #f0f4f8;" : ""}">
                <td style="padding:10px 14px; font-weight:600;">${r.emoji} ${r.label}</td>
                <td style="padding:10px 14px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:700; color:${barColor};">${actual} ${r.unit}</span>
                    <div style="flex:1; min-width:60px; height:6px; background:#e8eef8; border-radius:3px; overflow:hidden;">
                      <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:3px;"></div>
                    </div>
                    <span style="font-size:11px; color:${barColor}; font-weight:600;">${pct}%</span>
                  </div>
                </td>
                <td style="padding:10px 14px; color:#1a7a3c; font-weight:600;">${weekMin.toLocaleString("fr")} – ${weekMax.toLocaleString("fr")} ${r.unit}</td>
                <td style="padding:10px 14px; color:#888;">${r.dayMin} – ${r.dayMax} ${r.unit}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderJournalAddResults(weekStart, dateKey, mealKey, query) {
  const resultsEl = document.getElementById(`jaddresults-${mealKey}`);
  if (!resultsEl) return;
  const q = query.toLowerCase().trim();

  const recipes = state.recipes.filter((r) => !q || r.name.toLowerCase().includes(q)).slice(0, 12)
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  const products = state.products.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 12)
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  if (!recipes.length && !products.length) {
    resultsEl.innerHTML = `<div style="font-size:12px; opacity:.6; padding:6px;">Aucun résultat.</div>`;
    return;
  }

  const makeRow = (type, id, name, unit, defaultQty, img) => `
    <div data-j-pick="${type}" data-j-id="${escapeHtml(id)}" data-j-name="${escapeHtml(name)}" data-j-unit="${escapeHtml(unit)}" data-j-default="${defaultQty}"
      style="display:flex; gap:8px; align-items:center; padding:6px 8px; border:1px solid #e8eef8; border-radius:8px; background:#fff; cursor:pointer; user-select:none;">
      ${img}
      <div style="flex:1; min-width:0;">
        <div style="font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name)}</div>
        <div style="font-size:10px; opacity:.55;">${type === "recipe" ? "Recette" : "Produit"} • ${unit}</div>
      </div>
      <span style="font-size:10px; background:${type === "recipe" ? "#f0ebe4" : "#f0f4ff"}; color:${type === "recipe" ? "#9a6a3a" : "#3a6a9a"}; padding:2px 6px; border-radius:4px; flex-shrink:0;">${type === "recipe" ? "recette" : "produit"}</span>
    </div>`;

  const recipeHtml = recipes.map((r) => {
    const img = r.image
      ? `<img src="${escapeHtml(r.image)}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" />`
      : `<div style="width:36px; height:36px; border-radius:6px; background:#f0ebe4; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">🍳</div>`;
    return makeRow("recipe", r.id, r.name, `${r.portions || 1} portion(s)`, "1", img);
  }).join("");

  const productHtml = products.map((p) => {
    const img = p.image
      ? `<img src="${escapeHtml(p.image)}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" />`
      : `<div style="width:36px; height:36px; border-radius:6px; background:#f0f4ff; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">🛒</div>`;
    return makeRow("product", p.id, p.name, p.unit || "g", "100", img);
  }).join("");

  resultsEl.innerHTML = `
    ${recipes.length ? `<div style="font-size:10px; font-weight:700; opacity:.45; margin:2px 0; letter-spacing:.08em;">RECETTES</div>${recipeHtml}` : ""}
    ${products.length ? `<div style="font-size:10px; font-weight:700; opacity:.45; margin:6px 0 2px; letter-spacing:.08em;">PRODUITS</div>${productHtml}` : ""}`;

  // Inline qty form on click
  resultsEl.querySelectorAll("[data-j-pick]").forEach((row) => {
    row.addEventListener("click", () => {
      if (row.querySelector(".j-qty-form")) return;
      const type = row.getAttribute("data-j-pick");
      const id   = row.getAttribute("data-j-id");
      const name = row.getAttribute("data-j-name");
      const unit = row.getAttribute("data-j-unit") || "g";
      const def  = row.getAttribute("data-j-default") || "100";
      const form = document.createElement("div");
      form.className = "j-qty-form";
      form.style.cssText = "display:flex; gap:6px; align-items:center; margin-top:6px; padding-top:6px; border-top:1px solid #eee;";
      form.innerHTML = `
        <input type="number" value="${def}" min="0" step="any" inputmode="decimal" style="width:80px; padding:5px 8px; border:1px solid #dde3ee; border-radius:6px; font-size:13px;" />
        <span style="font-size:11px; opacity:.6;">${type === "recipe" ? "portion(s)" : unit}</span>
        <button style="background:#1a7a3c; color:#fff; border:none; padding:5px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">✔</button>
        <button style="background:none; border:none; cursor:pointer; font-size:13px; opacity:.5; padding:4px;">✕</button>`;
      row.appendChild(form);
      form.querySelector("input").focus();
      form.querySelectorAll("button")[0].addEventListener("click", () => {
        const qty = parseFloat(form.querySelector("input").value.replace(",", "."));
        if (!Number.isFinite(qty) || qty <= 0) return;
        const item = type === "recipe"
          ? { id: crypto.randomUUID(), type: "recipe", recipeId: id, name, portions: qty }
          : { id: crypto.randomUUID(), type: "product", productId: id, name, qty, unit };
        addWeekPlanItem(weekStart, dateKey, mealKey, item);
        saveWeekPlans();
        const panel = document.getElementById(`jadd-${mealKey}`);
        if (panel) panel.style.display = "none";
        renderJournalDayDetail(weekStart, dateKey);
        _refreshDayStrip(weekStart, dateKey);
        const toast = document.createElement("div");
        toast.textContent = `✔ ${name} ajouté`;
        toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1a7a3c; color:#fff; padding:10px 18px; border-radius:20px; font-size:13px; z-index:2000; box-shadow:0 4px 12px rgba(0,0,0,.2);";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
      form.querySelectorAll("button")[1].addEventListener("click", () => form.remove());
    });
  });
}

// ─── Liste de courses ─────────────────────────────────────────────────────────

let _shopActiveId = null; // ID de la fiche en cours d'édition/consultation
let _shopRecipeSearch = "";

function computeShopIngredients(shopList) {
  // Agrège tous les ingrédients des recettes sélectionnées
  const map = new Map(); // key → { name, totalGrams, unit, baseUnit, productId, sources }
  for (const entry of shopList.recipes || []) {
    const recipe = state.recipes.find((r) => r.id === entry.recipeId);
    if (!recipe) continue;
    const recipePortions = Math.max(1, recipe.portions || 1);
    const wantedPortions = Math.max(0.5, entry.portions || 1);
    const scale = wantedPortions / recipePortions;
    for (const ing of recipe.ingredients || []) {
      const qtyBase = getIngredientQtyInBaseUnit(ing) * scale;
      if (!Number.isFinite(qtyBase) || qtyBase <= 0) continue;
      const key = ing.productId ? `pid:${ing.productId}` : `name:${(ing.name || "").toLowerCase().trim()}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.totalBase += qtyBase;
        existing.sources.push({ recipeName: recipe.name, qty: round(ing.qty * scale, 1), unit: formatIngredientUnit(ing.unit, ing.baseUnit || ing.unit || "g") });
      } else {
        map.set(key, {
          key,
          name: ing.name || "?",
          totalBase: qtyBase,
          unit: formatIngredientUnit(ing.unit, ing.baseUnit || ing.unit || "g"),
          baseUnit: ing.baseUnit || ing.unit || "g",
          productId: ing.productId || null,
          sources: [{ recipeName: recipe.name, qty: round(ing.qty * scale, 1), unit: formatIngredientUnit(ing.unit, ing.baseUnit || ing.unit || "g") }],
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

async function exportShopListPdf(sl) {
  const btn = document.getElementById("shopPdfBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Génération…"; }
  try {
    const ingredients = computeShopIngredients(sl);
    const extras = sl.extras || [];
    const checked = new Set(sl.checked || []);
    const date = sl.createdAt
      ? new Date(sl.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const recipeNames = (sl.recipes || []).map((e) => {
      const r = state.recipes.find((rec) => rec.id === e.recipeId);
      return r ? `${r.name} ×${e.portions}p` : null;
    }).filter(Boolean);

    const formatQty = (ing) => {
      if (ing.unit === "càs" || ing.unit === "càc")
        return `${formatNumberFr(ing.totalBase, 1)} ${ing.unit}`;
      if (ing.totalBase >= 1000 && (ing.baseUnit === "g" || ing.baseUnit === "ml"))
        return `${formatNumberFr(ing.totalBase / 1000, 2)} ${ing.baseUnit === "ml" ? "L" : "kg"}`;
      return `${formatNumberFr(ing.totalBase, 0)} ${ing.unit}`;
    };

    const allItems = [
      ...ingredients.map((ing) => ({
        name: ing.name,
        qty: formatQty(ing),
        isChecked: checked.has(ing.key),
        isExtra: false,
      })),
      ...extras.map((ex) => ({
        name: ex.name,
        qty: ex.qty ? `${ex.qty} ${ex.unit || ""}`.trim() : "",
        isChecked: checked.has(`ex:${ex.id}`),
        isExtra: true,
      })),
    ];

    const mid = Math.ceil(allItems.length / 2);
    const col1 = allItems.slice(0, mid);
    const col2 = allItems.slice(mid);

    const renderItem = (item) => `
      <div style="display:flex; align-items:flex-start; gap:8px; padding:6px 4px; border-bottom:1px solid #e2e8f0; min-height:28px;">
        <div style="width:14px; height:14px; flex-shrink:0; margin-top:2px; border:1.5px solid ${item.isChecked ? "#22c55e" : "#94a3b8"}; border-radius:3px; background:${item.isChecked ? "#22c55e" : "transparent"}; display:flex; align-items:center; justify-content:center;">
          ${item.isChecked ? `<span style="color:white; font-size:9px; line-height:1; font-weight:700;">✓</span>` : ""}
        </div>
        <div style="flex:1; ${item.isChecked ? "text-decoration:line-through; opacity:.4;" : ""}">
          <span style="font-size:12px; font-weight:600;">${escapeHtml(item.name)}</span>
          ${item.qty ? `<span style="font-size:11px; color:#4f46e5; margin-left:5px;">${escapeHtml(item.qty)}</span>` : ""}
          ${item.isExtra ? `<span style="font-size:10px; color:#94a3b8; margin-left:3px;">(extra)</span>` : ""}
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.style.cssText = "position:fixed; left:-9999px; top:0; width:794px; background:#fff; padding:32px; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif; color:#1e293b;";
    container.innerHTML = `
      <div style="border-bottom:3px solid #4f46e5; padding-bottom:14px; margin-bottom:18px;">
        <div style="font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:#4f46e5; margin-bottom:4px;">🛒 Liste de courses</div>
        <div style="font-size:26px; font-weight:700; margin-bottom:4px;">${escapeHtml(sl.name || "Courses")}</div>
        ${date ? `<div style="font-size:13px; color:#64748b;">${date}</div>` : ""}
        ${recipeNames.length > 0 ? `<div style="font-size:12px; color:#6366f1; margin-top:6px;">Recettes : ${escapeHtml(recipeNames.join("  •  "))}</div>` : ""}
        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">${allItems.length} article(s) · ${checked.size} coché(s)</div>
      </div>
      <div style="display:flex; gap:0; align-items:flex-start;">
        <div style="flex:1;">${col1.map(renderItem).join("")}</div>
        ${col2.length > 0 ? `<div style="flex:1; border-left:2px solid #e2e8f0; padding-left:18px; margin-left:18px;">${col2.map(renderItem).join("")}</div>` : ""}
      </div>
      <div style="margin-top:18px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; text-align:center;">
        Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · Nutrition Recettes
      </div>
    `;

    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let imgW = pageW - 10;
      let imgH = imgW / ratio;
      if (imgH > pageH - 10) { imgH = pageH - 10; imgW = imgH * ratio; }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - imgW) / 2, 5, imgW, imgH);
      const safeName = (sl.name || "courses").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      pdf.save(`courses-${safeName}.pdf`);
    } finally {
      container.remove();
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "📄 PDF"; }
  }
}

function renderShopPage() {
  const el = $("#pageShop");
  if (!el) return;
  if (_shopActiveId) {
    _renderShopDetail(el, _shopActiveId);
  } else {
    _renderShopHome(el);
  }
}

function _renderShopHome(el) {
  const lists = state.shopLists.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  el.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
      <h2 style="margin:0;">🛒 Fiches de courses</h2>
      <button id="shopNewBtn" style="background:#4f46e5; color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:14px; cursor:pointer;">➕ Nouvelle fiche</button>
    </div>
    ${lists.length === 0 ? `<p style="opacity:.6; font-size:14px;">Aucune fiche de courses. Crée-en une pour commencer !</p>` : ""}
    <div style="display:grid; gap:12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
      ${lists.map((sl) => {
        const recipeNames = (sl.recipes || []).map((e) => {
          const r = state.recipes.find((r) => r.id === e.recipeId);
          return r ? r.name : "Recette supprimée";
        });
        const ingCount = computeShopIngredients(sl).length + (sl.extras || []).length;
        const checkedCount = (sl.checked || []).length;
        const date = sl.createdAt ? new Date(sl.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
        const progress = ingCount > 0 ? Math.round((checkedCount / ingCount) * 100) : 0;
        return `
          <div style="border:1px solid #dde3ee; border-radius:12px; padding:16px; background:#fff; display:flex; flex-direction:column; gap:8px;">
            <div style="font-weight:700; font-size:15px;">${escapeHtml(sl.name || "Sans titre")}</div>
            <div style="font-size:12px; opacity:.6;">${date}</div>
            <div style="font-size:13px; opacity:.8;">${recipeNames.length === 0 ? "Aucune recette" : recipeNames.map(escapeHtml).join(", ")}</div>
            <div style="font-size:12px; color:#4f46e5;">${ingCount} article(s) · ${checkedCount} coché(s)</div>
            ${ingCount > 0 ? `<div style="background:#e8eaf6; border-radius:6px; height:6px; overflow:hidden;"><div style="background:#4f46e5; height:100%; width:${progress}%; transition:width .3s;"></div></div>` : ""}
            <div style="display:flex; gap:8px; margin-top:4px;">
              <button data-shop-open="${escapeHtml(sl.id)}" style="flex:1; background:#4f46e5; color:#fff; border:none; border-radius:7px; padding:7px 0; font-size:13px; cursor:pointer;">Ouvrir</button>
              <button data-shop-del="${escapeHtml(sl.id)}" style="background:#fee2e2; color:#dc2626; border:none; border-radius:7px; padding:7px 12px; font-size:13px; cursor:pointer;">Supprimer</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  el.querySelector("#shopNewBtn").addEventListener("click", () => {
    const newList = {
      id: crypto.randomUUID(),
      name: `Courses du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
      createdAt: Date.now(),
      recipes: [],
      extras: [],
      checked: [],
    };
    state.shopLists.push(newList);
    saveShopLists();
    _shopActiveId = newList.id;
    renderShopPage();
  });

  el.querySelectorAll("[data-shop-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      _shopActiveId = btn.getAttribute("data-shop-open");
      renderShopPage();
    });
  });

  el.querySelectorAll("[data-shop-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-shop-del");
      const sl = state.shopLists.find((s) => s.id === id);
      if (!sl) return;
      if (!confirm(`Supprimer la fiche "${sl.name}" ?`)) return;
      state.shopLists = state.shopLists.filter((s) => s.id !== id);
      saveShopLists();
      renderShopPage();
    });
  });
}

function _renderShopRecipeResults(sl, query) {
  const resultsEl = document.getElementById("shopRecipeResults");
  if (!resultsEl) return;
  const addedIds = new Set((sl.recipes || []).map((e) => e.recipeId));
  const q = (query || "").toLowerCase().trim();
  const matches = state.recipes
    .filter((r) => !addedIds.has(r.id) && (!q || r.name.toLowerCase().includes(q)))
    .slice(0, 20);
  if (matches.length === 0) {
    resultsEl.innerHTML = q ? `<p style="font-size:12px; opacity:.6; margin:6px 0 0;">Aucune recette trouvée.</p>` : "";
    return;
  }
  resultsEl.innerHTML = `
    <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">
      ${matches.map((r) => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px; background:#f8fafc; border-radius:7px; font-size:13px;">
          <span>${escapeHtml(r.name)}</span>
          <button data-shop-addrecipe="${escapeHtml(r.id)}" style="background:#4f46e5; color:#fff; border:none; border-radius:6px; padding:3px 10px; font-size:12px; cursor:pointer;">➕ Ajouter</button>
        </div>
      `).join("")}
    </div>
  `;
  resultsEl.querySelectorAll("[data-shop-addrecipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const recipeId = btn.getAttribute("data-shop-addrecipe");
      if (!sl.recipes.find((e) => e.recipeId === recipeId)) {
        sl.recipes.push({ recipeId, portions: 1 });
        saveShopLists();
      }
      _shopRecipeSearch = "";
      renderShopPage();
    });
  });
}

function _renderShopDetail(el, listId) {
  const sl = state.shopLists.find((s) => s.id === listId);
  if (!sl) { _shopActiveId = null; renderShopPage(); return; }

  const ingredients = computeShopIngredients(sl);
  const extras = sl.extras || [];
  const checked = new Set(sl.checked || []);

  const recipesInList = (sl.recipes || []).map((entry) => {
    const r = state.recipes.find((rec) => rec.id === entry.recipeId);
    return { entry, recipe: r };
  });

  el.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
      <button id="shopBack" style="background:#f1f5f9; border:none; border-radius:8px; padding:7px 14px; font-size:13px; cursor:pointer;">← Retour</button>
      <input id="shopListName" value="${escapeHtml(sl.name || "")}" style="flex:1; min-width:200px; font-size:16px; font-weight:700; border:1px solid #dde3ee; border-radius:8px; padding:6px 12px;" />
      <button id="shopPdfBtn" style="background:#e8501a; color:#fff; border:none; border-radius:8px; padding:7px 13px; font-size:13px; cursor:pointer; font-weight:600; flex-shrink:0;">📄 PDF</button>
    </div>

    <!-- Recettes sélectionnées -->
    <div style="margin-bottom:16px; border:1px solid #dde3ee; border-radius:12px; overflow:hidden;">
      <div style="background:#f0f4fb; padding:10px 14px; font-weight:700; font-size:14px;">🍽️ Recettes de la semaine</div>
      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
        ${recipesInList.length === 0 ? `<p style="font-size:13px; opacity:.6; margin:0;">Aucune recette ajoutée.</p>` : ""}
        ${recipesInList.map(({ entry, recipe }) => `
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            ${recipe
              ? `<span data-shop-open-recipe="${escapeHtml(recipe.id)}" style="flex:1; font-size:13px; font-weight:600; cursor:pointer; text-decoration:underline; text-decoration-style:dotted; color:#4f46e5;" title="Ouvrir la recette">${escapeHtml(recipe.name)}</span>`
              : `<span style="flex:1; font-size:13px; font-weight:600; opacity:.5;">Recette supprimée</span>`
            }
            <label style="font-size:12px; opacity:.7;">Portions :</label>
            <input type="number" min="0.5" step="0.5" value="${entry.portions || 1}" data-shop-portions="${escapeHtml(entry.recipeId)}" style="width:60px; padding:4px 6px; border:1px solid #d1d5db; border-radius:6px; font-size:13px;" />
            <button data-shop-rmrecipe="${escapeHtml(entry.recipeId)}" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; font-size:12px; cursor:pointer;">✕</button>
          </div>
        `).join("")}

        <!-- Ajouter une recette -->
        <div style="margin-top:8px; border-top:1px solid #eee; padding-top:10px;">
          <input id="shopRecipeSearch" placeholder="🔍 Ajouter une recette…" value="${escapeHtml(_shopRecipeSearch)}" style="width:100%; padding:6px 10px; border:1px solid #d1d5db; border-radius:8px; font-size:13px; box-sizing:border-box;" autocomplete="off" />
          <div id="shopRecipeResults"></div>
        </div>
      </div>
    </div>

    <!-- Liste de courses générée -->
    <div style="margin-bottom:16px; border:1px solid #dde3ee; border-radius:12px; overflow:hidden;">
      <div style="background:#f0f4fb; padding:10px 14px; font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:space-between;">
        <span>📋 Liste de courses</span>
        ${checked.size > 0 ? `<button id="shopUncheckAll" style="font-size:11px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:3px 8px; cursor:pointer;">Tout décocher</button>` : ""}
      </div>
      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:6px;">
        ${ingredients.length === 0 && extras.length === 0 ? `<p style="font-size:13px; opacity:.6; margin:0;">Ajoute des recettes pour générer la liste.</p>` : ""}

        ${ingredients.map((ing) => {
          const isChecked = checked.has(ing.key);
          const qty = ing.unit === "càs" || ing.unit === "càc"
            ? `${formatNumberFr(ing.totalBase, 1)} ${ing.unit}`
            : ing.totalBase >= 1000 && (ing.baseUnit === "g" || ing.baseUnit === "ml")
              ? `${formatNumberFr(ing.totalBase / 1000, 2)} ${ing.baseUnit === "ml" ? "L" : "kg"}`
              : `${formatNumberFr(ing.totalBase, 0)} ${ing.unit}`;
          const sources = ing.sources.map((s) => `${s.recipeName} (${s.qty} ${s.unit})`).join(", ");
          return `
            <label style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px; border-radius:8px; background:${isChecked ? "#f0fdf4" : "#fafafa"}; border:1px solid ${isChecked ? "#bbf7d0" : "#e2e8f0"}; cursor:pointer;">
              <input type="checkbox" data-shop-check="${escapeHtml(ing.key)}" ${isChecked ? "checked" : ""} style="margin-top:2px; accent-color:#22c55e; width:16px; height:16px; flex-shrink:0;" />
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:600; ${isChecked ? "text-decoration:line-through; opacity:.5;" : ""}">${escapeHtml(ing.name)}</div>
                <div style="font-size:12px; color:#4f46e5; font-weight:500;">${qty}</div>
                <div style="font-size:11px; opacity:.55;">${escapeHtml(sources)}</div>
              </div>
            </label>
          `;
        }).join("")}

        ${extras.map((ex) => {
          const isChecked = checked.has(`ex:${ex.id}`);
          return `
            <label style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; background:${isChecked ? "#f0fdf4" : "#fafafa"}; border:1px solid ${isChecked ? "#bbf7d0" : "#e2e8f0"}; cursor:pointer;">
              <input type="checkbox" data-shop-check="ex:${escapeHtml(ex.id)}" ${isChecked ? "checked" : ""} style="accent-color:#22c55e; width:16px; height:16px; flex-shrink:0;" />
              <div style="flex:1; font-size:13px; ${isChecked ? "text-decoration:line-through; opacity:.5;" : ""}">
                ${escapeHtml(ex.name)}${ex.qty ? ` — ${escapeHtml(String(ex.qty))} ${escapeHtml(ex.unit || "")}` : ""}
              </div>
              <button data-shop-rmextra="${escapeHtml(ex.id)}" style="background:none; border:none; color:#dc2626; font-size:14px; cursor:pointer; flex-shrink:0;">✕</button>
            </label>
          `;
        }).join("")}
      </div>
    </div>

    <!-- Ajouter un article manuellement -->
    <div style="border:1px solid #dde3ee; border-radius:12px;">
      <div style="background:#f0f4fb; padding:10px 14px; font-weight:700; font-size:14px; border-radius:12px 12px 0 0;">➕ Ajouter un article</div>
      <div style="padding:12px 14px; display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; position:relative;">
        <div style="flex:2; min-width:140px; position:relative;">
          <input id="shopExtraName" placeholder="Nom (ex: Citrons)" autocomplete="off"
            style="width:100%; padding:7px 10px; border:1px solid #d1d5db; border-radius:8px; font-size:13px; box-sizing:border-box;" />
          <div id="shopExtraSuggestions" style="display:none; position:absolute; top:calc(100% + 2px); left:0; right:0; background:#fff; border:1px solid #d1d5db; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.15); z-index:9999; max-height:200px; overflow-y:auto;"></div>
        </div>
        <input id="shopExtraQty" type="number" min="0" step="any" placeholder="Qté" style="width:70px; min-width:70px; flex-shrink:0; padding:7px 8px; border:1px solid #d1d5db; border-radius:8px; font-size:13px;" />
        <input id="shopExtraUnit" placeholder="Unité" style="width:70px; min-width:70px; flex-shrink:0; padding:7px 8px; border:1px solid #d1d5db; border-radius:8px; font-size:13px;" />
        <button id="shopExtraAdd" style="background:#4f46e5; color:#fff; border:none; border-radius:8px; padding:7px 16px; font-size:13px; cursor:pointer;">Ajouter</button>
      </div>
    </div>
  `;

  // Retour
  el.querySelector("#shopBack").addEventListener("click", () => {
    _shopActiveId = null;
    _shopRecipeSearch = "";
    renderShopPage();
  });

  // PDF
  el.querySelector("#shopPdfBtn").addEventListener("click", () => exportShopListPdf(sl));

  // Nom de la fiche
  el.querySelector("#shopListName").addEventListener("input", (e) => {
    sl.name = e.target.value;
    saveShopLists();
  });

  // Recherche recette — mise à jour des résultats sans re-rendre la page entière
  _renderShopRecipeResults(sl, _shopRecipeSearch);
  el.querySelector("#shopRecipeSearch").addEventListener("input", (e) => {
    _shopRecipeSearch = e.target.value;
    _renderShopRecipeResults(sl, _shopRecipeSearch);
  });


  // Ouvrir une recette directement
  el.querySelectorAll("[data-shop-open-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-shop-open-recipe");
      loadRecipe(id);
    });
  });

  // Portions
  el.querySelectorAll("[data-shop-portions]").forEach((input) => {
    input.addEventListener("change", (e) => {
      const recipeId = input.getAttribute("data-shop-portions");
      const entry = sl.recipes.find((en) => en.recipeId === recipeId);
      if (entry) {
        entry.portions = Math.max(0.5, parseFloat(e.target.value) || 1);
        saveShopLists();
        renderShopPage();
      }
    });
  });

  // Retirer une recette
  el.querySelectorAll("[data-shop-rmrecipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const recipeId = btn.getAttribute("data-shop-rmrecipe");
      sl.recipes = sl.recipes.filter((e) => e.recipeId !== recipeId);
      saveShopLists();
      renderShopPage();
    });
  });

  // Cocher / décocher un article
  el.querySelectorAll("[data-shop-check]").forEach((chk) => {
    chk.addEventListener("change", () => {
      const key = chk.getAttribute("data-shop-check");
      const set = new Set(sl.checked || []);
      if (chk.checked) set.add(key); else set.delete(key);
      sl.checked = [...set];
      saveShopLists();
      renderShopPage();
    });
  });

  // Tout décocher
  el.querySelector("#shopUncheckAll")?.addEventListener("click", () => {
    sl.checked = [];
    saveShopLists();
    renderShopPage();
  });

  // Supprimer un article extra
  el.querySelectorAll("[data-shop-rmextra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-shop-rmextra");
      sl.extras = (sl.extras || []).filter((e) => e.id !== id);
      sl.checked = (sl.checked || []).filter((k) => k !== `ex:${id}`);
      saveShopLists();
      renderShopPage();
    });
  });

  // Autocomplétion depuis la bibliothèque
  const nameInput = el.querySelector("#shopExtraName");
  const suggestionsBox = el.querySelector("#shopExtraSuggestions");
  const unitInput = el.querySelector("#shopExtraUnit");

  nameInput.addEventListener("input", () => {
    const q = nameInput.value.trim().toLowerCase();
    if (!q) { suggestionsBox.style.display = "none"; return; }
    const matches = state.products.filter((p) => p.name?.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) { suggestionsBox.style.display = "none"; return; }
    suggestionsBox.innerHTML = matches.map((p) => {
      const unit = p.unit || p.baseUnit || "g";
      return `<div data-pid="${p.id}" style="padding:8px 12px; cursor:pointer; font-size:13px; border-bottom:1px solid #f0f0f0;">
        <span style="font-weight:600;">${escapeHtml(p.name)}</span>
        <span style="opacity:.5; font-size:11px; margin-left:6px;">${escapeHtml(unit)}</span>
      </div>`;
    }).join("");
    suggestionsBox.style.display = "block";
    suggestionsBox.querySelectorAll("[data-pid]").forEach((row) => {
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const p = state.products.find((x) => x.id === row.getAttribute("data-pid"));
        if (!p) return;
        nameInput.value = p.name;
        unitInput.value = p.unit || p.baseUnit || "g";
        suggestionsBox.style.display = "none";
      });
    });
  });

  nameInput.addEventListener("blur", () => {
    setTimeout(() => { suggestionsBox.style.display = "none"; }, 150);
  });

  // Ajouter un article manuel
  el.querySelector("#shopExtraAdd").addEventListener("click", () => {
    const name = el.querySelector("#shopExtraName").value.trim();
    if (!name) return;
    const qty = parseFloat(el.querySelector("#shopExtraQty").value.replace(",", ".")) || null;
    const unit = el.querySelector("#shopExtraUnit").value.trim();
    if (!sl.extras) sl.extras = [];
    sl.extras.push({ id: crypto.randomUUID(), name, qty, unit });
    saveShopLists();
    renderShopPage();
  });
}

function updateNav() {
  const items = [
    { id: "#navRecipes", page: "recipes" },
    { id: "#navCreate", page: "create" },
    { id: "#navProducts", page: "products" },
    { id: "#navCompare", page: "compare" },
    { id: "#navJournal", page: "journal" },
    { id: "#navShop", page: "shop" },
    { id: "#navRappel", page: "rappel" },
    { id: "#navTrash", page: "trash" },
    { id: "#navImport", page: "import" },
  ];
  items.forEach(({ id, page }) => {
    const btn = $(id);
    if (!btn) return;
    const active = state.page === page;
    btn.disabled = active;
    btn.style.fontWeight = active ? "700" : "400";
    btn.classList.toggle("nav-active", active);
  });
}

function renderPage() {
  const pages = {
    recipes: $("#pageRecipes"),
    create: $("#pageCreate"),
    products: $("#pageProducts"),
    compare: $("#pageCompare"),
    journal: $("#pageJournal"),
    shop: $("#pageShop"),
    rappel: $("#pageRappel"),
    trash: $("#pageTrash"),
    import: $("#pageImport"),
  };
  Object.entries(pages).forEach(([key, el]) => {
    if (!el) return;
    el.style.display = state.page === key ? "" : "none";
  });
  updateNav();
  if (state.page === "products") renderProductLibrary();
  if (state.page === "compare") renderComparePage();
  if (state.page === "journal") renderJournalPage();
  if (state.page === "shop") renderShopPage();
  if (state.page === "trash") renderTrashPage();
}

function setPage(page) {
  syncStateFromInputs();
  saveDraft();
  const target = ["recipes", "create", "products", "compare", "journal", "shop", "rappel", "trash", "import"].includes(page) ? page : "recipes";
  state.page = target;
  location.hash = target;
  renderPage();
  updateStorageIndicator();
}

function applyHashRoute() {
  const hash = location.hash.replace("#", "");
  state.page = ["recipes", "create", "products", "compare", "journal", "shop", "rappel", "trash", "import"].includes(hash) ? hash : "recipes";
  renderPage();
}

function addProductToRecipe(id) {
  const prod = state.products.find((p) => p.id === id);
  if (!prod) return;
  const qty = num($("#productQty").value);
  if (qty === null || qty < 0) return alert("Mets une quantité ≥ 0.");
  const addUnit = normalizeAddIngredientQtyUnit($("#productQtyUnit")?.value || state.productQtyUnit);
  const baseUnit = normalizeIngredientBaseUnit(prod.unit);
  let ingredientUnit = baseUnit;
  if (addUnit === "tbsp" || addUnit === "tsp") {
    ingredientUnit = addUnit;
  }
  state.ingredients.push({
    id: crypto.randomUUID(),
    name: prod.name,
    unit: ingredientUnit,
    baseUnit,
    qty,
    image: prod.image || "",
    productId: prod.id,
    perQty: prod.perQty,
    per100: { ...prod.per100 },
  });
  render();
}

function buildDraftPayload() {
  const safeIngredients = compactIngredientsForSave(state.ingredients);
  const safeExtras = compactIngredientsForSave(state.extras || []);
  return {
    name: state.name,
    portions: state.portions,
    description: state.description,
    image: state.image,
    prepTime: state.prepTime,
    cookTime: state.cookTime,
    difficulty: state.difficulty,
    cost: state.cost,
    source: state.source,
    steps: state.steps,
    ingredients: safeIngredients,
    extras: safeExtras,
    selectedId: state.selectedId,
    search: state.search,
    sort: state.sort,
    productSearch: state.productSearch,
    productQty: state.productQty,
    productQtyUnit: state.productQtyUnit,
    productCategoryFilter: state.productCategoryFilter,
    compareSearch: state.compareSearch,
    compareCategory: state.compareCategory,
    compareSelected: state.compareSelected,
    ingredientsPageSearch: state.ingredientsPageSearch,
    ingredientsPageCategory: state.ingredientsPageCategory,
    trackProductSearch: state.trackProductSearch,
    trackRecipeSearch: state.trackRecipeSearch,
    trackProductQty: state.trackProductQty,
    trackRecipePortions: state.trackRecipePortions,
    trackRecipeUnit: state.trackRecipeUnit,
    pdfFormat: state.pdfFormat,
  };
}

function applyDraftData(data) {
  if (!data || typeof data !== "object") return;
  state.name = typeof data.name === "string" ? data.name : "";
  state.portions = Number.isFinite(num(data.portions)) ? Math.max(1, num(data.portions)) : 1;
  state.description = typeof data.description === "string" ? data.description : "";
  state.image = typeof data.image === "string" ? data.image : "";
  state.prepTime = data.prepTime === "" || data.prepTime === null || data.prepTime === undefined ? "" : String(data.prepTime);
  state.cookTime = data.cookTime === "" || data.cookTime === null || data.cookTime === undefined ? "" : String(data.cookTime);
  state.difficulty = typeof data.difficulty === "string" ? data.difficulty : "";
  state.cost = typeof data.cost === "string" ? data.cost : "";
  state.source = typeof data.source === "string" ? data.source : "";
  state.steps = typeof data.steps === "string" ? data.steps : "";
  state.selectedId = typeof data.selectedId === "string" ? data.selectedId : null;
  state.search = typeof data.search === "string" ? data.search : "";
  state.sort = ["name", "rating", "madeit", "notmadeit"].includes(data.sort) ? data.sort : "recent";
  state.productSearch = typeof data.productSearch === "string" ? data.productSearch : "";
  state.productQty = typeof data.productQty === "string" ? data.productQty : "100";
  state.productQtyUnit = normalizeAddIngredientQtyUnit(data.productQtyUnit);
  state.productCategoryFilter = typeof data.productCategoryFilter === "string" ? data.productCategoryFilter : "";
  state.compareSearch = typeof data.compareSearch === "string" ? data.compareSearch : "";
  state.compareCategory = typeof data.compareCategory === "string" ? data.compareCategory : "";
  state.compareSelected = Array.isArray(data.compareSelected)
    ? [...new Set(data.compareSelected.filter((id) => typeof id === "string" && id.trim()))]
    : [];
  state.ingredientsPageSearch = typeof data.ingredientsPageSearch === "string" ? data.ingredientsPageSearch : "";
  state.ingredientsPageCategory = typeof data.ingredientsPageCategory === "string" ? data.ingredientsPageCategory : "";
  state.trackProductSearch = typeof data.trackProductSearch === "string" ? data.trackProductSearch : "";
  state.trackRecipeSearch = typeof data.trackRecipeSearch === "string" ? data.trackRecipeSearch : "";
  state.trackProductQty = typeof data.trackProductQty === "string" ? data.trackProductQty : "100";
  state.trackRecipePortions = typeof data.trackRecipePortions === "string" ? data.trackRecipePortions : "1";
  state.trackRecipeUnit = data.trackRecipeUnit === "g" ? "g" : "portion";
  state.pdfFormat = data.pdfFormat === "computer" ? "computer" : "public";
  if (Array.isArray(data.ingredients)) {
    state.ingredients = data.ingredients.map(normalizeIngredient).filter((ing) => ing.qty >= 0);
  }
  if (Array.isArray(data.extras)) {
    state.extras = data.extras.map((ing) => ({ ...normalizeIngredient(ing), included: ing.included !== false })).filter((ing) => ing.qty >= 0);
  }
}

function saveDraft() {
  const data = buildDraftPayload();
  storageSet(DRAFT_KEY, data);
  saveBackup();
  markLocalUpdated();
}

async function loadDraft() {
  const data = await storageGet(DRAFT_KEY);
  if (!data) return;
  applyDraftData(data);
}

function saveRecipes() {
  pushHistory();
  const payload = state.recipes.map(compactRecipeForSave);
  const ok = storageSet(RECIPES_KEY, payload);
  if (ok) {
    saveBackup();
    markLocalUpdated();
  }
  return ok;
}

async function loadRecipes() {
  const data = await storageGet(RECIPES_KEY);
  if (!Array.isArray(data)) return;
  state.recipes = data.map(normalizeRecipe);
}

function saveTrash() {
  const ok = storageSet(TRASH_KEY, state.trash);
  if (ok) {
    saveBackup();
    markLocalUpdated();
  }
  return ok;
}

async function loadTrash() {
  const data = await storageGet(TRASH_KEY);
  if (!data || typeof data !== "object") return;
  state.trash = normalizeTrashData(data);
  pruneTrash({ persist: false });
}

function saveProducts() {
  pushHistory();
  const ok = storageSet(PRODUCTS_KEY, state.products);
  if (ok) {
    saveBackup();
    markLocalUpdated();
  }
  return ok;
}

function saveFreeDishes() {
  const ok = storageSet(FREE_DISHES_KEY, state.freeDishes);
  if (ok) {
    saveBackup();
    markLocalUpdated();
  }
  return ok;
}

function saveBackup() {
  const payload = {
    products: state.products,
    recipes: state.recipes,
    freeDishes: state.freeDishes,
    trash: state.trash,
    draft: buildDraftPayload(),
    track: buildTrackPayload(),
    trackWeekTotals: state.trackWeekTotals,
    updatedAt: Date.now(),
  };
  storageSet(BACKUP_KEY, payload);
  void saveBackupHistory(payload);
}

async function loadProducts() {
  const data = await storageGet(PRODUCTS_KEY);
  if (!Array.isArray(data)) return;
  state.products = data.map(normalizeProduct);
}

async function loadFreeDishes() {
  const data = await storageGet(FREE_DISHES_KEY);
  if (!Array.isArray(data)) return;
  state.freeDishes = data.map(normalizeFreeDish);
}

function saveTrack() {
  const payload = buildTrackPayload();
  storageSet(TRACK_KEY, payload);
  markLocalUpdated();
}

function saveTrackWeekTotals() {
  const payload = parseTrackWeekTotalsPayload(state.trackWeekTotals);
  const ok = storageSet(TRACK_WEEK_TOTALS_KEY, payload);
  if (ok) {
    state.trackWeekTotals = payload;
    saveBackup();
    markLocalUpdated();
  }
  return ok;
}

async function loadTrack() {
  const data = await storageGet(TRACK_KEY);
  const track = parseTrackPayload(data);
  state.trackHistory = track.days;
  loadTrackDay(track.selectedDate || todayKey());
}

async function loadTrackWeekTotals() {
  const data = await storageGet(TRACK_WEEK_TOTALS_KEY);
  state.trackWeekTotals = parseTrackWeekTotalsPayload(data);
}

function saveWeekPlans() {
  storageSet(WEEK_PLANS_KEY, state.weekPlans);
}

async function loadWeekPlans() {
  const data = await storageGet(WEEK_PLANS_KEY);
  state.weekPlans = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
}

function saveShopLists() {
  storageSet(SHOP_LISTS_KEY, state.shopLists);
}

async function loadShopLists() {
  const data = await storageGet(SHOP_LISTS_KEY);
  state.shopLists = Array.isArray(data) ? data : [];
}

function saveFreeDays() { storageSet(FREE_DAYS_KEY, state.freeDays); }
async function loadFreeDays() {
  const data = await storageGet(FREE_DAYS_KEY);
  state.freeDays = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
}

const GOALS_JOURNALIER = { kcal:[1700,2300], prot:[145,155], carb:[195,210], fat:[38,45], fiber:[25,35], salt:[null,5] };
const GOALS_FREE       = { kcal:[1700,2300], prot:[145,155], carb:[490,515], fat:[105,120], fiber:[25,35], salt:[null,8] };

const MEAL_TYPES = [
  { key: "breakfast",  label: "🌅 Petit-déjeuner" },
  { key: "lunch",      label: "🍽️ Repas Midi" },
  { key: "snack1",     label: "🍎 Collation" },
  { key: "post_sport", label: "💪 Après sport" },
  { key: "snack2",     label: "🍎 Collation" },
  { key: "dinner",     label: "🌙 Repas du soir" },
  { key: "snack3",     label: "🍫 Collation soir" },
];

function getWeekStartKey(dateKey) {
  const d = parseDateKey(dateKey);
  if (!d) return todayKey();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDayKeys(weekStart) {
  const days = [];
  const base = parseDateKey(weekStart);
  if (!base) return days;
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return days;
}

function getWeekPlanMealItems(weekStart, dateKey, mealKey) {
  return state.weekPlans?.[weekStart]?.[dateKey]?.[mealKey] || [];
}

function addWeekPlanItem(weekStart, dateKey, mealKey, item) {
  if (!state.weekPlans[weekStart]) state.weekPlans[weekStart] = {};
  if (!state.weekPlans[weekStart][dateKey]) state.weekPlans[weekStart][dateKey] = {};
  if (!state.weekPlans[weekStart][dateKey][mealKey]) state.weekPlans[weekStart][dateKey][mealKey] = [];
  state.weekPlans[weekStart][dateKey][mealKey].push(item);
}

function removeWeekPlanItem(weekStart, dateKey, mealKey, itemId) {
  if (!state.weekPlans?.[weekStart]?.[dateKey]?.[mealKey]) return;
  state.weekPlans[weekStart][dateKey][mealKey] = state.weekPlans[weekStart][dateKey][mealKey].filter((it) => it.id !== itemId);
}

function moveWeekPlanItem(weekStart, dateKey, mealKey, itemId, direction) {
  const arr = state.weekPlans?.[weekStart]?.[dateKey]?.[mealKey];
  if (!arr) return;
  const idx = arr.findIndex((it) => it.id === itemId);
  if (idx < 0) return;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
}

function emptyNutrients() {
  const n = {};
  for (const f of FIELDS) n[f.key] = 0;
  return n;
}

function computeWeekPlanItemMacros(item) {
  const n = emptyNutrients();
  if (item.hidden) return n;
  if (item.type === "recipe") {
    const recipe = state.recipes.find((r) => r.id === item.recipeId);
    if (!recipe) return n;
    const portions = Number.isFinite(item.portions) && item.portions > 0 ? item.portions : 1;
    const t = computeTotalsForIngredients(recipe.ingredients, recipe.portions || 1);
    for (const f of FIELDS) n[f.key] = round((t.per[f.key] || 0) * portions, f.decimals);
  } else if (item.type === "product") {
    const prod = state.products.find((p) => p.id === item.productId);
    if (!prod) return n;
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 0;
    const baseQty = normalizePerQty(prod.perQty);
    for (const f of FIELDS) n[f.key] = round((prod.per100?.[f.key] || 0) * (qty / baseQty), f.decimals);
  } else if (item.type === "ephemeral") {
    const m = item.macros || {};
    for (const f of FIELDS) n[f.key] = m[f.key] || 0;
  }
  return n;
}

function computeWeekPlanDayMacros(weekStart, dateKey) {
  const totals = emptyNutrients();
  for (const meal of MEAL_TYPES) {
    for (const item of getWeekPlanMealItems(weekStart, dateKey, meal.key)) {
      const m = computeWeekPlanItemMacros(item);
      for (const f of FIELDS) totals[f.key] += m[f.key] || 0;
    }
  }
  for (const f of FIELDS) totals[f.key] = round(totals[f.key], f.decimals);
  return totals;}

function buildWeekPlanMarkdown(weekStart, days) {
  const fmtDate = (k) => parseDateKey(k)?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) || k;
  const lines = [];

  lines.push(`# Mon planning alimentaire — semaine du ${fmtDate(days[0])} au ${fmtDate(days[6])}`);
  lines.push("");
  lines.push("## Contexte");
  lines.push("Je suis en recomposition corporelle (objectif : abdos visibles, conserver la masse musculaire).");
  lines.push("Analyse mon planning semaine : équilibre des macros, qualité nutritionnelle, ce qui manque, ce qui est en excès, et donne-moi 3 recommandations concrètes pour l'améliorer.");
  lines.push("");
  lines.push("---");
  lines.push("");

  let hasAnyMeal = false;

  for (const dateKey of days) {
    const dayLabel = fmtDate(dateKey);
    const totals = computeWeekPlanDayMacros(weekStart, dateKey);
    const hasMeals = MEAL_TYPES.some((m) => getWeekPlanMealItems(weekStart, dateKey, m.key).length > 0);
    if (!hasMeals) continue;
    hasAnyMeal = true;

    lines.push(`## ${dayLabel}`);
    lines.push("");

    for (const meal of MEAL_TYPES) {
      const items = getWeekPlanMealItems(weekStart, dateKey, meal.key);
      if (items.length === 0) continue;
      lines.push(`### ${meal.label}`);
      for (const it of items) {
        const m = computeWeekPlanItemMacros(it);
        const qty = it.type === "recipe" ? `${it.portions || 1} portion(s)` : it.type === "ephemeral" ? "éphémère" : `${it.qty || ""}${it.unit || "g"}`;
        const macros = m.kcal > 0
          ? ` — 🔥 ${m.kcal} kcal | 💪 ${m.prot}g prot | 🍞 ${m.carb}g gluc | 🧈 ${m.fat}g lip | 🌿 ${m.fiber}g fibres`
          : "";
        lines.push(`- **${it.name}** (${qty})${macros}`);
      }
      lines.push("");
    }

    lines.push(`**Total du jour :** 🔥 ${totals.kcal} kcal | 💪 ${totals.prot}g protéines | 🍞 ${totals.carb}g glucides | 🧈 ${totals.fat}g lipides | 🌿 ${totals.fiber}g fibres | 🧂 ${totals.salt}g sel`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  if (!hasAnyMeal) return null;

  const wt = emptyNutrients();
  for (const f of FIELDS) wt[f.key] = round(days.reduce((s, dk) => s + (computeWeekPlanDayMacros(weekStart, dk)[f.key] || 0), 0), f.decimals);

  lines.push("## Total de la semaine");
  lines.push(`- 🔥 **${wt.kcal} kcal** (${wt.kj} kJ)`);
  lines.push(`- 💪 **${wt.prot}g protéines**`);
  lines.push(`- 🍞 **${wt.carb}g glucides** (dont ${wt.sugar}g sucres)`);
  lines.push(`- 🧈 **${wt.fat}g lipides** (dont ${wt.sat}g saturés)`);
  lines.push(`- 🌿 **${wt.fiber}g fibres**`);
  lines.push(`- 🧂 ${wt.salt}g sel`);
  lines.push(`- 🦴 ${wt.calcium}g calcium`);

  return lines.join("\n");
}

function buildDayNotes(weekStart, dateKey) {
  const fmtDate = (k) => parseDateKey(k)?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) || k;
  const totals = computeWeekPlanDayMacros(weekStart, dateKey);
  const sep = "─".repeat(40);
  const lines = [];

  lines.push(`📅 ${fmtDate(dateKey).charAt(0).toUpperCase() + fmtDate(dateKey).slice(1)}`);
  lines.push(sep);
  lines.push("");

  for (const meal of MEAL_TYPES) {
    const items = getWeekPlanMealItems(weekStart, dateKey, meal.key);
    if (items.length === 0) continue;
    const mealKcal = round(items.reduce((s, it) => s + (computeWeekPlanItemMacros(it).kcal || 0), 0), 0);
    lines.push(`${meal.label}${mealKcal > 0 ? `  (${mealKcal} kcal)` : ""}`);
    for (const it of items) {
      const m = computeWeekPlanItemMacros(it);
      const qty = it.type === "recipe"
        ? `${it.portions || 1} portion(s)`
        : it.type === "ephemeral" ? "éphémère"
        : `${it.qty || ""}${it.unit || "g"}`;
      const macros = m.kcal > 0 ? `  →  ${m.kcal} kcal | P ${m.prot}g | G ${m.carb}g | L ${m.fat}g` : "";
      lines.push(`  • ${it.name}  [${qty}]${macros}`);
    }
    lines.push("");
  }

  lines.push(sep);
  lines.push(`TOTAL  🔥 ${totals.kcal} kcal  |  💪 ${totals.prot}g prot  |  🍞 ${totals.carb}g gluc  |  🧈 ${totals.fat}g lip`);
  if (totals.fiber > 0) lines.push(`       🌿 ${totals.fiber}g fibres  |  🧂 ${totals.salt}g sel`);

  return lines.join("\n");
}

function buildDayMarkdown(weekStart, dateKey) {
  const fmtDate = (k) => parseDateKey(k)?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) || k;
  const hasMeals = MEAL_TYPES.some((m) => getWeekPlanMealItems(weekStart, dateKey, m.key).length > 0);
  if (!hasMeals) return null;

  const totals = computeWeekPlanDayMacros(weekStart, dateKey);
  const lines = [];

  lines.push(`# Ma journée alimentaire — ${fmtDate(dateKey)}`);
  lines.push("");
  lines.push("## Contexte");
  lines.push("Je suis en recomposition corporelle (objectif : abdos visibles, conserver la masse musculaire).");
  lines.push("Analyse ma journée alimentaire : équilibre des macros, qualité nutritionnelle, ce qui manque, ce qui est en excès, et donne-moi 3 recommandations concrètes pour l'améliorer.");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const meal of MEAL_TYPES) {
    const items = getWeekPlanMealItems(weekStart, dateKey, meal.key);
    if (items.length === 0) continue;
    lines.push(`### ${meal.label}`);
    for (const it of items) {
      const m = computeWeekPlanItemMacros(it);
      const qty = it.type === "recipe" ? `${it.portions || 1} portion(s)` : it.type === "ephemeral" ? "éphémère" : `${it.qty || ""}${it.unit || "g"}`;
      const macros = m.kcal > 0
        ? ` — 🔥 ${m.kcal} kcal | 💪 ${m.prot}g prot | 🍞 ${m.carb}g gluc | 🧈 ${m.fat}g lip | 🌿 ${m.fiber}g fibres`
        : "";
      lines.push(`- **${it.name}** (${qty})${macros}`);
    }
    lines.push("");
  }

  lines.push(`**Total du jour :** 🔥 ${totals.kcal} kcal | 💪 ${totals.prot}g protéines | 🍞 ${totals.carb}g glucides | 🧈 ${totals.fat}g lipides | 🌿 ${totals.fiber}g fibres | 🧂 ${totals.salt}g sel`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Objectifs quotidiens");
  lines.push("- 🔥 Calories : 1700–1820 kcal (journalier) / 3400–3800 kcal (FREE)");
  lines.push("- 💪 Protéines : 145–155 g");
  lines.push("- 🍞 Glucides : 195–210 g (journalier) / 490–515 g (FREE)");
  lines.push("- 🧈 Lipides : 38–45 g (journalier) / 105–120 g (FREE)");

  return lines.join("\n");
}

function buildRecipeMarkdownForClaude() {
  syncStateFromInputs();
  const name = state.name?.trim() || "Recette sans nom";
  const portions = Math.max(1, num(state.portions) || 1);
  const totals = computeTotalsForIngredients(state.ingredients, portions);
  const per = totals.per;
  const total = totals.total;

  const lines = [];
  lines.push(`# Analyse de recette : ${name}`);
  lines.push("");
  lines.push("## Demande");
  lines.push("Analyse cette recette sur les points suivants :");
  lines.push("1. **Qualité nutritionnelle** : équilibre protéines / glucides / lipides, densité nutritionnelle");
  lines.push("2. **Points forts** de la recette");
  lines.push("3. **Ce qui pourrait être amélioré** (ingrédients à remplacer, ajouter ou réduire)");
  lines.push("4. **3 suggestions concrètes** pour optimiser la recette selon mes objectifs (recomposition corporelle : maintien musculaire + perte de gras)");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Informations générales");
  if (state.prepTime) lines.push(`- ⏱️ Préparation : ${state.prepTime} min`);
  if (state.cookTime) lines.push(`- 🍳 Cuisson : ${state.cookTime} min`);
  if (state.difficulty) lines.push(`- 📊 Difficulté : ${state.difficulty}`);
  lines.push(`- 🍽️ Portions : ${portions}`);
  if (state.description?.trim()) { lines.push(""); lines.push(`> ${state.description.trim()}`); }
  lines.push("");
  lines.push("## Ingrédients");
  if (state.ingredients.length === 0) {
    lines.push("_(aucun ingrédient renseigné)_");
  } else {
    for (const ing of state.ingredients) {
      const baseQty = normalizePerQty(ing?.perQty);
      const qtyInBase = getIngredientQtyInBaseUnit(ing);
      const unit = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
      const ikcal = round((ing?.per100?.kcal || 0) * qtyInBase / baseQty, 0);
      const iprot = round((ing?.per100?.prot || 0) * qtyInBase / baseQty, 1);
      const icarb = round((ing?.per100?.carb || 0) * qtyInBase / baseQty, 1);
      const ifat  = round((ing?.per100?.fat  || 0) * qtyInBase / baseQty, 1);
      lines.push(`- **${ing.name}** — ${formatNumberFr(ing.qty, 1)} ${unit} → 🔥${ikcal} kcal | 💪${iprot}g prot | 🍞${icarb}g gluc | 🧈${ifat}g lip`);
    }
  }
  lines.push("");
  lines.push("## Valeurs nutritionnelles");
  lines.push(`### Par portion (${portions} portion(s))`);
  lines.push(`| Nutriment | Pour 1 portion |`);
  lines.push(`|-----------|---------------|`);
  lines.push(`| 🔥 Énergie | ${round(per.kcal||0,0)} kcal (${round(per.kj||0,0)} kJ) |`);
  lines.push(`| 💪 Protéines | ${round(per.prot||0,1)} g |`);
  lines.push(`| 🍞 Glucides | ${round(per.carb||0,1)} g dont sucres ${round(per.sugar||0,1)} g |`);
  lines.push(`| 🧈 Lipides | ${round(per.fat||0,1)} g dont saturés ${round(per.sat||0,1)} g |`);
  lines.push(`| 🌿 Fibres | ${round(per.fiber||0,1)} g |`);
  lines.push(`| 🧂 Sel | ${round(per.salt||0,2)} g |`);
  if (round(per.calcium||0,2) > 0) lines.push(`| 🦴 Calcium | ${round(per.calcium||0,2)} g |`);
  if (portions > 1) {
    lines.push("");
    lines.push(`### Total recette entière`);
    lines.push(`🔥 ${round(total.kcal||0,0)} kcal | 💪 ${round(total.prot||0,1)}g prot | 🍞 ${round(total.carb||0,1)}g gluc | 🧈 ${round(total.fat||0,1)}g lip`);
  }
  if (state.steps?.trim()) {
    lines.push("");
    lines.push("## Étapes de préparation");
    lines.push(state.steps.trim());
  }
  lines.push("");
  lines.push("---");
  lines.push("## Mes objectifs");
  lines.push("- 🔥 Calories/jour : 1700–1820 kcal (journalier) / 3400–3800 kcal (FREE)");
  lines.push("- 💪 Protéines/jour : 145–155 g");
  lines.push("- 🍞 Glucides/jour : 195–210 g (journalier) / 490–515 g (FREE)");
  lines.push("- 🧈 Lipides/jour : 38–45 g (journalier) / 105–120 g (FREE)");

  return lines.join("\n");
}

function openAddToPlanModal({ type, id, name, defaultQty, unit }) {
  let modal = document.getElementById("addToPlanModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "addToPlanModal";
    modal.style.cssText = "display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1000; background:#fff; border:1px solid #ccc; border-radius:14px; padding:20px; width:320px; box-shadow:0 8px 32px rgba(0,0,0,.2);";
    document.body.appendChild(modal);
  }

  const weekStart = getWeekStartKey(state.weekPlanDate || todayKey());
  const days = getWeekDayKeys(weekStart);
  const dayOptions = days.map((k) => {
    const label = parseDateKey(k)?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }) || k;
    const isToday = k === todayKey();
    return `<option value="${k}" ${isToday ? "selected" : ""}>${label}${isToday ? " ★" : ""}</option>`;
  }).join("");
  const mealOptions = MEAL_TYPES.map((m) =>
    `<option value="${m.key}">${m.label}</option>`
  ).join("");
  const qtyLabel = type === "recipe" ? "Portions" : `Quantité (${unit})`;

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <strong style="font-size:15px;">📅 Ajouter au planning</strong>
      <button id="addToPlanClose" style="font-size:16px; padding:2px 8px;">✕</button>
    </div>
    <div style="font-size:13px; font-weight:600; margin-bottom:12px; padding:8px 10px; background:#f8faff; border-radius:8px; border:1px solid #dde3ee;">${escapeHtml(name)}</div>
    <div style="display:grid; gap:10px;">
      <label style="font-size:12px; font-weight:600; display:flex; flex-direction:column; gap:3px;">
        Jour
        <select id="addToPlanDay" style="font-size:13px;">${dayOptions}</select>
      </label>
      <label style="font-size:12px; font-weight:600; display:flex; flex-direction:column; gap:3px;">
        Repas
        <select id="addToPlanMeal" style="font-size:13px;">${mealOptions}</select>
      </label>
      <label style="font-size:12px; font-weight:600; display:flex; flex-direction:column; gap:3px;">
        ${escapeHtml(qtyLabel)}
        <input id="addToPlanQty" type="number" min="0.5" step="0.5" value="${defaultQty}" style="font-size:13px;" />
      </label>
      <button id="addToPlanConfirm" style="background:#1a2b4a; color:#fff; border:none; padding:10px; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer;">✔ Ajouter</button>
    </div>`;

  modal.style.display = "block";

  document.getElementById("addToPlanClose").onclick = () => { modal.style.display = "none"; };

  document.getElementById("addToPlanConfirm").onclick = () => {
    const dateKey = document.getElementById("addToPlanDay").value;
    const mealKey = document.getElementById("addToPlanMeal").value;
    const qty = Number(document.getElementById("addToPlanQty").value);
    if (!qty || qty <= 0) return alert("Quantité invalide.");
    const item = type === "recipe"
      ? { id: crypto.randomUUID(), type: "recipe", recipeId: id, name, portions: qty }
      : { id: crypto.randomUUID(), type: "product", productId: id, name, qty, unit };
    addWeekPlanItem(weekStart, dateKey, mealKey, item);
    saveWeekPlans();
    modal.style.display = "none";
    // Feedback toast
    const toast = document.createElement("div");
    toast.textContent = `✔ Ajouté au planning (${MEAL_TYPES.find((m) => m.key === mealKey)?.label || mealKey})`;
    toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1a7a3c; color:#fff; padding:10px 18px; border-radius:20px; font-size:13px; z-index:2000; box-shadow:0 4px 12px rgba(0,0,0,.2);";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  };
}

function renderWeekPlanPage() {
  renderJournalPage();
}


function renderWeekPlanAddResults(query = "") {
  const resultsEl = document.getElementById("weekPlanAddResults");
  if (!resultsEl) return;
  const q = query.toLowerCase().trim();

  const recipes = state.recipes
    .filter((r) => !q || r.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  const products = state.products
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  const recipeItems = recipes.map((r) => {
    const img = r.image
      ? `<img src="${escapeHtml(r.image)}" style="width:44px; height:44px; object-fit:cover; border-radius:8px; flex-shrink:0;" />`
      : `<div style="width:44px; height:44px; border-radius:8px; background:#f0ebe4; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">🍳</div>`;
    return `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 8px; border:1px solid #eee; border-radius:8px; background:#fafafa;">
      <div style="display:flex; gap:8px; align-items:center; min-width:0; flex:1;">
        ${img}
        <div style="min-width:0;">
          <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.name)}</div>
          <div style="font-size:11px; opacity:.6;">Recette • ${r.portions || 1} portion(s)</div>
        </div>
      </div>
      <button data-wp-pick-recipe="${r.id}" style="font-size:12px; flex-shrink:0;">+ Ajouter</button>
    </div>`;
  }).join("");

  const productItems = products.map((p) => {
    const img = p.image
      ? `<img src="${escapeHtml(p.image)}" style="width:44px; height:44px; object-fit:cover; border-radius:8px; flex-shrink:0;" />`
      : `<div style="width:44px; height:44px; border-radius:8px; background:#f0f4ff; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">🛒</div>`;
    return `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 8px; border:1px solid #eee; border-radius:8px; background:#fafafa;">
      <div style="display:flex; gap:8px; align-items:center; min-width:0; flex:1;">
        ${img}
        <div style="min-width:0;">
          <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.name)}</div>
          <div style="font-size:11px; opacity:.6;">Produit • /${formatPerQty(p.perQty)}${p.unit}</div>
        </div>
      </div>
      <button data-wp-pick-product="${p.id}" style="font-size:12px; flex-shrink:0;">+ Ajouter</button>
    </div>`;
  }).join("");

  resultsEl.innerHTML = (recipeItems || productItems)
    ? `${recipeItems ? `<div style="font-size:11px; font-weight:700; opacity:.5; margin:4px 0 2px;">RECETTES</div>${recipeItems}` : ""}
       ${productItems ? `<div style="font-size:11px; font-weight:700; opacity:.5; margin:8px 0 2px;">PRODUITS</div>${productItems}` : ""}`
    : `<div style="font-size:12px; opacity:.6;">Aucun résultat.</div>`;

  resultsEl.querySelectorAll("[data-wp-pick-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-wp-pick-recipe");
      const recipe = state.recipes.find((r) => r.id === id);
      if (!recipe) return;
      const portions = Number(prompt(`Nombre de portions pour "${recipe.name}" ?`, "1"));
      if (!portions || portions <= 0) return;
      const { _wpWeekStart, _wpDateKey, _wpMealKey } = document.getElementById("weekPlanAddPanel").dataset;
      addWeekPlanItem(_wpWeekStart, _wpDateKey, _wpMealKey, {
        id: crypto.randomUUID(),
        type: "recipe",
        recipeId: id,
        name: recipe.name,
        portions,
      });
      saveWeekPlans();
      document.getElementById("weekPlanAddPanel").style.display = "none";
      renderWeekPlanPage();
    });
  });

  resultsEl.querySelectorAll("[data-wp-pick-product]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-wp-pick-product");
      const prod = state.products.find((p) => p.id === id);
      if (!prod) return;
      const qty = Number(prompt(`Quantité pour "${prod.name}" (en ${prod.unit}) ?`, "100"));
      if (!qty || qty <= 0) return;
      const { _wpWeekStart, _wpDateKey, _wpMealKey } = document.getElementById("weekPlanAddPanel").dataset;
      addWeekPlanItem(_wpWeekStart, _wpDateKey, _wpMealKey, {
        id: crypto.randomUUID(),
        type: "product",
        productId: id,
        name: prod.name,
        qty,
        unit: prod.unit,
      });
      saveWeekPlans();
      document.getElementById("weekPlanAddPanel").style.display = "none";
      renderWeekPlanPage();
    });
  });
}

function buildRecipePdfDiv(recipe) {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;font-family:system-ui,sans-serif;color:#1a1a1a;padding:28px;box-sizing:border-box;";
  const portions = Math.max(1, recipe.portions || 1);
  const totals = computeTotalsForIngredients(recipe.ingredients || [], portions);
  const per = totals.per;

  let html = `
    <div style="background:#1a2b4a;color:#fff;border-radius:10px;padding:14px 20px;margin-bottom:14px;">
      <div style="font-size:18px;font-weight:800;">${escapeHtml(recipe.name)}</div>
      <div style="display:flex;gap:18px;font-size:11px;margin-top:6px;opacity:.85;flex-wrap:wrap;">
        ${recipe.prepTime ? `<span>⏱️ Préparation : ${escapeHtml(recipe.prepTime)}</span>` : ""}
        ${recipe.cookTime ? `<span>🍳 Cuisson : ${escapeHtml(recipe.cookTime)}</span>` : ""}
        ${recipe.difficulty ? `<span>📊 Difficulté : ${escapeHtml(recipe.difficulty)}</span>` : ""}
        <span>🍽️ ${portions} portion(s)</span>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      ${[{l:"🔥 Kcal / portion",k:"kcal",dec:0},{l:"💪 Protéines (g)",k:"prot",dec:1},{l:"🍞 Glucides (g)",k:"carb",dec:1},{l:"🧈 Lipides (g)",k:"fat",dec:1}].map(f =>
        `<div style="flex:1;background:#f0f4fb;border-radius:8px;padding:8px 10px;text-align:center;">
          <div style="font-size:10px;opacity:.6;margin-bottom:2px;">${f.l}</div>
          <div style="font-size:15px;font-weight:800;color:#1a2b4a;">${round(per[f.k]||0,f.dec)}</div>
        </div>`).join("")}
    </div>`;

  if (recipe.ingredients?.length > 0) {
    html += `<div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#1a2b4a;">📋 Ingrédients</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
      <thead><tr style="background:#f0f4fb;">
        <th style="padding:5px 8px;text-align:left;border-bottom:2px solid #dde3ee;font-weight:700;">Ingrédient</th>
        <th style="padding:5px 8px;text-align:right;border-bottom:2px solid #dde3ee;font-weight:700;">Quantité</th>
        <th style="padding:5px 8px;text-align:right;border-bottom:2px solid #dde3ee;font-weight:700;">🔥 kcal</th>
        <th style="padding:5px 8px;text-align:right;border-bottom:2px solid #dde3ee;font-weight:700;">💪 prot.</th>
        <th style="padding:5px 8px;text-align:right;border-bottom:2px solid #dde3ee;font-weight:700;">🍞 gluc.</th>
        <th style="padding:5px 8px;text-align:right;border-bottom:2px solid #dde3ee;font-weight:700;">🧈 lip.</th>
      </tr></thead>
      <tbody>${(recipe.ingredients).map((ing, i) => {
        const baseQty = normalizePerQty(ing?.perQty);
        const qtyInBase = getIngredientQtyInBaseUnit(ing);
        const unit = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
        const ikcal = round((ing?.per100?.kcal||0)*qtyInBase/baseQty,0);
        const iprot = round((ing?.per100?.prot||0)*qtyInBase/baseQty,1);
        const icarb = round((ing?.per100?.carb||0)*qtyInBase/baseQty,1);
        const ifat  = round((ing?.per100?.fat ||0)*qtyInBase/baseQty,1);
        return `<tr style="background:${i%2===0?"#fff":"#f8faff"};">
          <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(ing.name)}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #f0f0f0;">${formatNumberFr(ing.qty,1)} ${escapeHtml(unit)}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #f0f0f0;color:#e8501a;font-weight:600;">${ikcal}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #f0f0f0;">${iprot}g</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #f0f0f0;">${icarb}g</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #f0f0f0;">${ifat}g</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  }

  if (recipe.description?.trim()) {
    html += `<div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#1a2b4a;">📝 Description</div>
    <div style="font-size:11px;line-height:1.7;white-space:pre-line;background:#f8faff;border-radius:8px;padding:10px 14px;margin-bottom:14px;">${escapeHtml(recipe.description)}</div>`;
  }

  if (recipe.steps?.trim()) {
    html += `<div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#1a2b4a;">👨‍🍳 Préparation</div>
    <div style="font-size:11px;line-height:1.8;white-space:pre-line;background:#f8faff;border-radius:8px;padding:10px 14px;">${escapeHtml(recipe.steps)}</div>`;
  }

  div.innerHTML = html;
  return div;
}

async function exportWeekPlanPdf(weekStart, days) {
  const DAY_NAMES_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const fmtDate = (k) => parseDateKey(k)?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) || k;

  const btn = document.querySelector("#jExportPdf");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Génération…"; }

  const dayTotals = days.map((dateKey) => computeWeekPlanDayMacros(weekStart, dateKey));
  const weekTotals = emptyNutrients();
  for (const t of dayTotals) for (const f of FIELDS) weekTotals[f.key] = round((weekTotals[f.key] || 0) + (t[f.key] || 0), f.decimals);

  const nutFieldsPdf = [
    { key: "kcal", label: "🔥 kcal" },
    { key: "prot", label: "💪 Prot." },
    { key: "carb", label: "🍞 Gluc." },
    { key: "fat",  label: "🧈 Lip." },
    { key: "fiber",label: "🌿 Fibres" },
    { key: "salt", label: "🧂 Sel" },
  ];

  // Build an off-screen div styled for A4 landscape (297×210mm at 96dpi ≈ 1123×794px)
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:1123px;background:#fff;font-family:system-ui,sans-serif;color:#1a1a1a;padding:20px;box-sizing:border-box;";

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;";
  header.innerHTML = `
    <div style="font-size:17px;font-weight:800;color:#1a2b4a;">🗓️ Planning semaine — ${fmtDate(days[0])} au ${fmtDate(days[6])}</div>
    <div style="font-size:11px;color:#888;">Généré le ${new Date().toLocaleDateString("fr-FR")}</div>`;
  container.appendChild(header);

  // Week totals bar
  const totalsBar = document.createElement("div");
  totalsBar.style.cssText = "background:#1a2b4a;color:#fff;border-radius:8px;padding:7px 14px;margin-bottom:12px;font-size:11px;display:flex;gap:18px;flex-wrap:wrap;";
  totalsBar.innerHTML = nutFieldsPdf.map(nf => `<span><span style="opacity:.7;">${nf.label}</span> <strong>${weekTotals[nf.key] ?? 0}</strong></span>`).join("");
  container.appendChild(totalsBar);

  // Table
  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;";

  // Header row
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr style="background:#1a2b4a;color:#fff;">
    <th style="border:1px solid #1a2b4a;padding:7px 8px;font-size:11px;width:90px;text-align:left;"></th>
    ${days.map((k, i) => `<th style="border:1px solid #1a2b4a;padding:7px 8px;font-size:11px;text-align:left;">${DAY_NAMES_FULL[i]}<br><span style="font-weight:400;opacity:.8;">${fmtDate(k)}</span></th>`).join("")}
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // Meal rows
  for (const meal of MEAL_TYPES) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="border:1px solid #dde3ee;padding:6px 8px;font-weight:700;font-size:10px;background:#f4f6fb;white-space:nowrap;vertical-align:top;">${meal.label}</td>`;
    for (const dateKey of days) {
      const items = getWeekPlanMealItems(weekStart, dateKey, meal.key);
      const td = document.createElement("td");
      td.style.cssText = "border:1px solid #dde3ee;padding:5px 7px;vertical-align:top;font-size:10px;";
      if (items.length === 0) {
        td.innerHTML = `<span style="color:#ccc;">—</span>`;
      } else {
        td.innerHTML = items.map((it) => {
          const m = computeWeekPlanItemMacros(it);
          const qty = it.type === "recipe" ? `${it.portions || 1}×` : it.type === "ephemeral" ? "eph." : `${it.qty || ""}${it.unit || "g"}`;
          return `<div style="margin-bottom:3px;line-height:1.4;"><span style="font-weight:600;">${escapeHtml(it.name)}</span> <span style="color:#999;font-size:9px;">${qty}</span><br><span style="color:#e8501a;font-size:9px;">🔥${m.kcal} kcal &nbsp;💪${m.prot}g</span></div>`;
        }).join("");
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  // Totals row
  const totalTr = document.createElement("tr");
  totalTr.innerHTML = `<td style="border:1px solid #1a2b4a;background:#1a2b4a;color:#fff;padding:6px 8px;font-weight:700;font-size:10px;vertical-align:top;">TOTAL</td>`;
  for (const t of dayTotals) {
    const td = document.createElement("td");
    td.style.cssText = "border:1px solid #1a2b4a;background:#e8f0fe;padding:5px 7px;font-size:9px;vertical-align:top;";
    td.innerHTML = nutFieldsPdf.map(nf => `<div><span style="color:#555;">${nf.label}</span> <strong>${t[nf.key] ?? 0}</strong></div>`).join("");
    totalTr.appendChild(td);
  }
  tbody.appendChild(totalTr);
  table.appendChild(tbody);
  container.appendChild(table);

  // Collect unique recipes used this week
  const usedRecipeIds = new Set();
  for (const dateKey of days) {
    for (const meal of MEAL_TYPES) {
      for (const it of getWeekPlanMealItems(weekStart, dateKey, meal.key)) {
        if (it.type === "recipe" && it.recipeId) usedRecipeIds.add(it.recipeId);
      }
    }
  }
  const usedRecipes = [...usedRecipeIds].map((id) => state.recipes.find((r) => r.id === id)).filter(Boolean);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#fff" });
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    let imgW = pageW;
    let imgH = imgW / ratio;
    if (imgH > pageH) { imgH = pageH; imgW = imgH * ratio; }
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);

    // One page per recipe
    for (const recipe of usedRecipes) {
      const recDiv = buildRecipePdfDiv(recipe);
      document.body.appendChild(recDiv);
      try {
        const rc = await html2canvas(recDiv, { scale: 2, useCORS: true, backgroundColor: "#fff" });
        pdf.addPage([210, 297], "portrait");
        const pW = pdf.internal.pageSize.getWidth();
        const pH = pdf.internal.pageSize.getHeight();
        const r2 = rc.width / rc.height;
        let iW = pW - 10;
        let iH = iW / r2;
        if (iH > pH - 10) { iH = pH - 10; iW = iH * r2; }
        pdf.addImage(rc.toDataURL("image/png"), "PNG", (pW - iW) / 2, 5, iW, iH);
      } finally {
        recDiv.remove();
      }
    }

    pdf.save(`planning-semaine-${weekStart}.pdf`);
  } finally {
    container.remove();
    if (btn) { btn.disabled = false; btn.textContent = "📄 PDF semaine"; }
  }
}


function saveRecipe() {
  syncStateFromInputs();
  const name = state.name.trim();
  if (!name) return alert("Ajoute un nom de recette.");
  const hasContent = state.ingredients.length > 0 || state.steps || state.description;
  if (!hasContent) return alert("Ajoute des ingrédients ou des étapes.");

  const id = state.selectedId || crypto.randomUUID();
  const existing = state.recipes.find((r) => r.id === id);
  const recipe = normalizeRecipe({
    id,
    name,
    portions: state.portions,
    description: state.description,
    image: state.image,
    prepTime: state.prepTime,
    cookTime: state.cookTime,
    difficulty: state.difficulty,
    cost: state.cost,
    source: state.source,
    steps: state.steps,
    ingredients: compactIngredientsForSave(state.ingredients),
    extras: compactIngredientsForSave(state.extras || []),
    updatedAt: Date.now(),
    rating: existing?.rating ?? 0,
    madeIt: existing?.madeIt ?? false,
    notes: existing?.notes ?? "",
  });

  const idx = state.recipes.findIndex((r) => r.id === id);
  if (idx >= 0) state.recipes[idx] = recipe;
  else state.recipes.unshift(recipe);

  state.selectedId = id;
  saveRecipes();
  state.search = "";
  state.sort = "recent";
  $("#recipeSearch").value = "";
  $("#recipeSort").value = "recent";
  render();
}

function loadRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  applyRecipeToForm(recipe);
  setPage("create");
}

function buildDuplicateRecipeName(name) {
  const raw = typeof name === "string" ? name.trim() : "";
  const base = raw ? raw.replace(/\s\(copie(?:\s\d+)?\)$/i, "") : "Recette";
  const existing = new Set(state.recipes.map((r) => (r.name || "").trim()));
  let candidate = `${base} (copie)`;
  if (!existing.has(candidate)) return candidate;
  let idx = 2;
  while (existing.has(`${base} (copie ${idx})`)) {
    idx += 1;
  }
  return `${base} (copie ${idx})`;
}

function duplicateRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  const name = buildDuplicateRecipeName(recipe.name);
  const ingredients = Array.isArray(recipe.ingredients)
    ? compactIngredientsForSave(recipe.ingredients).map((ing) => ({ ...ing, id: crypto.randomUUID() }))
    : [];
  const copy = normalizeRecipe({
    ...recipe,
    id: crypto.randomUUID(),
    name,
    ingredients,
    updatedAt: Date.now(),
  });
  state.recipes.unshift(copy);
  state.selectedId = copy.id;
  saveRecipes();
  applyRecipeToForm(copy);
  setPage("create");
}

function deleteRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  if (!confirm(`Supprimer la recette "${recipe.name}" ?`)) return;
  const previous = state.recipes.slice();
  state.recipes = state.recipes.filter((r) => r.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  const ok = saveRecipes();
  if (ok === false) {
    state.recipes = previous;
    alert("Suppression impossible (stockage local plein).");
    return;
  }
  addToTrash("recipe", recipe);
  render();
}

function newRecipe() {
  if (state.ingredients.length > 0 || state.name) {
    if (!confirm("Créer une nouvelle recette et effacer le brouillon actuel ?")) return;
  }
  state.name = "";
  state.portions = 1;
  state.description = "";
  state.prepTime = "";
  state.cookTime = "";
  state.difficulty = "";
  state.cost = "";
  state.source = "";
  state.steps = "";
  state.ingredients = [];
  state.extras = [];
  state.selectedId = null;
  $("#mealName").value = "";
  $("#portions").value = 1;
  $("#recipeDesc").value = "";
  $("#recipeImageUrl").value = "";
  $("#recipeImageFile").value = "";
  setRecipeImagePreview("");
  $("#prepTime").value = "";
  $("#cookTime").value = "";
  $("#difficulty").value = "";
  $("#cost").value = "";
  $("#sourceLink").value = "";
  $("#recipeSteps").value = "";
  render();
}

function applyRecipeToForm(recipe) {
  state.name = recipe.name;
  state.portions = recipe.portions;
  state.description = recipe.description;
  state.image = recipe.image || "";
  state.prepTime = recipe.prepTime;
  state.cookTime = recipe.cookTime;
  state.difficulty = recipe.difficulty;
  state.cost = recipe.cost;
  state.source = recipe.source;
  state.steps = recipe.steps;
  state.ingredients = recipe.ingredients.map(normalizeIngredient).filter((ing) => ing.qty >= 0);
  state.extras = Array.isArray(recipe.extras) ? recipe.extras.map((ing) => ({ ...normalizeIngredient(ing), included: ing.included !== false })).filter((ing) => ing.qty >= 0) : [];
  state.selectedId = recipe.id;
  $("#mealName").value = state.name;
  $("#portions").value = state.portions;
  $("#recipeDesc").value = state.description;
  $("#recipeImageUrl").value = state.image || "";
  $("#recipeImageFile").value = "";
  setRecipeImagePreview(state.image || "");
  $("#prepTime").value = state.prepTime;
  $("#cookTime").value = state.cookTime;
  $("#difficulty").value = state.difficulty;
  $("#cost").value = state.cost;
  $("#sourceLink").value = state.source;
  $("#recipeSteps").value = state.steps;
  render();
}

function render() {
  syncStateFromInputs();

  const list = $("#list");
  if (state.ingredients.length === 0) {
    list.innerHTML = `<p style="opacity:.7">Aucun ingrédient.</p>`;
  } else {
    list.innerHTML = state.ingredients.map((ing, index) => {
      const normalizedUnit = normalizeIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
      const unitLabel = formatIngredientUnit(normalizedUnit, ing?.baseUnit || ing?.unit || "g");
      const baseLabel = normalizeIngredientBaseUnit(ing?.baseUnit || ing?.unit || "g");
      const baseOption = baseLabel === "ml" ? "ml" : "g";
      const spoonBase = baseLabel === "ml" ? "ml" : "g";
      const unitOptions = `
            <option value="${baseOption}" ${normalizedUnit === baseOption ? "selected" : ""}>${baseOption}</option>
            <option value="tbsp" ${normalizedUnit === "tbsp" ? "selected" : ""}>càs (15${spoonBase})</option>
            <option value="tsp" ${normalizedUnit === "tsp" ? "selected" : ""}>càc (5${spoonBase})</option>
          `;
      const importedBadge = ing.isImported ? `<span style="font-size:11px; padding:2px 6px; border-radius:999px; background:#e7f3ff; color:#0b5394; margin-left:6px;">importé</span>` : "";
      const ingImg = getIngredientImage(ing);
      const ingImage = ingImg
        ? `<img src="${ingImg}" alt="" style="width:52px; height:52px; object-fit:cover; border-radius:10px;" />`
        : `<div style="width:52px; height:52px; border-radius:10px; background:#eee; display:flex; align-items:center; justify-content:center; font-size:11px; color:#777;">No image</div>`;
      const isFirst = index === 0;
      const isLast = index === state.ingredients.length - 1;
      return `
        <div style="border:1px solid #ddd; border-radius:12px; padding:10px; margin-bottom:10px; ${ing.isImported ? "background:#f6fbff;" : ""}">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
            <div style="display:flex; gap:8px; align-items:center;">
              ${ingImage}
              <div>
                <div style="font-weight:700">${ing.name}${importedBadge}</div>
                <div style="opacity:.75; font-size:12px;">Quantité: <strong>${formatNumberFr(ing.qty, 2)} ${unitLabel}</strong> · valeurs /${formatPerQty(ing.perQty)}${baseLabel}</div>
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <button data-move="${ing.id}" data-dir="up" style="width:28px;" ${isFirst ? "disabled" : ""}>↑</button>
              <button data-move="${ing.id}" data-dir="down" style="width:28px;" ${isLast ? "disabled" : ""}>↓</button>
              <button data-dec="${ing.id}" style="width:28px;">−</button>
              <input data-qty="${ing.id}" type="text" inputmode="decimal" value="${ing.qty}" style="width:70px;" />
              <button data-inc="${ing.id}" style="width:28px;">+</button>
              <select data-unit="${ing.id}" style="width:120px; font-size:12px;">
                ${unitOptions}
              </select>
              <button data-del="${ing.id}">Supprimer</button>
            </div>
          </div>
          <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap; font-size:13px; opacity:.9;">
            ${FIELDS.map((f) => {
              const v = ing.per100[f.key];
              const label = f.short || f.label;
              return `<span>${label}: ${v === null ? 0 : v}${f.unit}</span>`;
            }).join(" | ")}
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        pushIngHistory();
        state.ingredients = state.ingredients.filter((x) => x.id !== id);
        render();
      });
    });

    list.querySelectorAll("[data-move]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-move");
        const dir = btn.getAttribute("data-dir");
        const idx = state.ingredients.findIndex((x) => x.id === id);
        if (idx < 0) return;
        const nextIdx = dir === "up" ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= state.ingredients.length) return;
        const next = state.ingredients.slice();
        const [item] = next.splice(idx, 1);
        next.splice(nextIdx, 0, item);
        state.ingredients = next;
        render();
      });
    });

    list.querySelectorAll("[data-qty]").forEach((input) => {
      const id = input.getAttribute("data-qty");
      input.addEventListener("change", () => {
        const value = num(input.value);
        if (value === null || value < 0) {
          alert("Quantité invalide.");
          const current = state.ingredients.find((x) => x.id === id);
          input.value = current ? current.qty : "";
          return;
        }
        const idx = state.ingredients.findIndex((x) => x.id === id);
        if (idx >= 0) {
          state.ingredients[idx] = { ...state.ingredients[idx], qty: value };
          render();
        }
      });
    });

    list.querySelectorAll("[data-unit]").forEach((select) => {
      select.addEventListener("change", () => {
        const id = select.getAttribute("data-unit");
        const idx = state.ingredients.findIndex((x) => x.id === id);
        if (idx < 0) return;
        const current = state.ingredients[idx];
        const baseUnit = normalizeIngredientBaseUnit(current?.baseUnit || current?.unit || "g");
        const nextUnit = normalizeIngredientUnit(select.value, baseUnit);
        const qtyInBase = getIngredientQtyInBaseUnit(current);
        const nextQty = round(convertBaseQtyToIngredientQty(qtyInBase, nextUnit, baseUnit), 2);
        state.ingredients[idx] = { ...current, baseUnit, unit: nextUnit, qty: nextQty };
        const qtyInput = list.querySelector(`[data-qty="${id}"]`);
        if (qtyInput) qtyInput.value = String(nextQty);
        render();
      });
    });

    list.querySelectorAll("[data-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-inc");
        const idx = state.ingredients.findIndex((x) => x.id === id);
        if (idx >= 0) {
          const step = getIngredientQtyStep(state.ingredients[idx]);
          const next = round((state.ingredients[idx].qty || 0) + step, 2);
          state.ingredients[idx] = { ...state.ingredients[idx], qty: next };
          const qtyInput = list.querySelector(`[data-qty="${id}"]`);
          if (qtyInput) qtyInput.value = String(next);
          render();
        }
      });
    });

    list.querySelectorAll("[data-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-dec");
        const idx = state.ingredients.findIndex((x) => x.id === id);
        if (idx >= 0) {
          const step = getIngredientQtyStep(state.ingredients[idx]);
          const next = Math.max(0, round((state.ingredients[idx].qty || 0) - step, 2));
          state.ingredients[idx] = { ...state.ingredients[idx], qty: next };
          const qtyInput = list.querySelector(`[data-qty="${id}"]`);
          if (qtyInput) qtyInput.value = String(next);
          render();
        }
      });
    });
  }

  // ─── Extras list ───────────────────────────────────────────────────────────
  const extrasList = $("#extrasList");
  if (extrasList) {
    const extras = state.extras || [];
    if (extras.length === 0) {
      extrasList.innerHTML = `<p style="opacity:.6; font-size:13px; margin:0;">Aucun extra. Clique sur "+ Extras" dans la bibliothèque.</p>`;
    } else {
      extrasList.innerHTML = extras.map((ing) => {
        const unitLabel = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
        const ingImg = getIngredientImage(ing);
        const included = ing.included !== false;
        const rawMacros = computeTotalsForIngredients([ing], 1).total;
        const macroLine = [
          rawMacros.kcal > 0 ? `${round(rawMacros.kcal, 0)} kcal` : null,
          rawMacros.prot > 0 ? `Prot ${round(rawMacros.prot, 1)}g` : null,
          rawMacros.carb > 0 ? `Gluc ${round(rawMacros.carb, 1)}g` : null,
          rawMacros.fat  > 0 ? `Lip ${round(rawMacros.fat, 1)}g`  : null,
        ].filter(Boolean).join(" · ");
        const ingImage = ingImg
          ? `<img src="${ingImg}" alt="" style="width:40px; height:40px; object-fit:cover; border-radius:8px; ${included ? "" : "opacity:.35; filter:grayscale(1);"}" />`
          : `<div style="width:40px; height:40px; border-radius:8px; background:#fde68a; display:flex; align-items:center; justify-content:center; font-size:11px; color:#92400e; ${included ? "" : "opacity:.35;"}">Ex</div>`;
        return `
          <div style="border:1px solid ${included ? "#fbbf24" : "#d1d5db"}; border-radius:10px; padding:8px 10px; margin-bottom:8px; background:${included ? "#fff" : "#f9fafb"}; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            ${ingImage}
            <div style="flex:1; min-width:120px; ${included ? "" : "opacity:.45;"}">
              <div style="font-weight:700; font-size:13px; ${included ? "" : "text-decoration:line-through;"}">${escapeHtml(ing.name)}</div>
              <div style="font-size:12px; opacity:.7;">${formatNumberFr(ing.qty, 2)} ${unitLabel}</div>
              ${included && macroLine ? `<div style="font-size:11px; color:#b45309; margin-top:2px;">/ portion : ${escapeHtml(macroLine)}</div>` : ""}
            </div>
            <input data-extra-qty="${escapeHtml(ing.id)}" type="text" inputmode="decimal" value="${ing.qty}" style="width:60px; font-size:13px;" />
            <button data-extra-toggle="${escapeHtml(ing.id)}" title="${included ? "Exclure des macros" : "Inclure dans les macros"}" style="font-size:11px; padding:3px 9px; border-radius:20px; border:1.5px solid ${included ? "#16a34a" : "#d1d5db"}; background:${included ? "#dcfce7" : "#f3f4f6"}; color:${included ? "#16a34a" : "#9ca3af"}; cursor:pointer; white-space:nowrap;">${included ? "✓ Compté" : "✗ Non compté"}</button>
            <button data-extra-del="${escapeHtml(ing.id)}" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 8px; font-size:12px; cursor:pointer;">✕</button>
          </div>
        `;
      }).join("");

      extrasList.querySelectorAll("[data-extra-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = state.extras.findIndex((x) => x.id === btn.getAttribute("data-extra-toggle"));
          if (idx >= 0) { state.extras[idx] = { ...state.extras[idx], included: state.extras[idx].included === false }; render(); }
        });
      });

      extrasList.querySelectorAll("[data-extra-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.extras = state.extras.filter((x) => x.id !== btn.getAttribute("data-extra-del"));
          render();
        });
      });

      extrasList.querySelectorAll("[data-extra-qty]").forEach((input) => {
        input.addEventListener("change", () => {
          const value = num(input.value);
          if (value === null || value < 0) { input.value = "0"; return; }
          const idx = state.extras.findIndex((x) => x.id === input.getAttribute("data-extra-qty"));
          if (idx >= 0) { state.extras[idx] = { ...state.extras[idx], qty: value }; render(); }
        });
      });
    }
  }

  // ─── Totaux ────────────────────────────────────────────────────────────────
  const { total: mergedTotal, per: mergedPer, portions } = computeTotals();
  const allExtras = state.extras || [];
  const includedExtras = allExtras.filter((e) => e.included !== false);

  const nutritionLinesTotal = FIELDS.map((f) => formatNutrientLine(f, mergedTotal[f.key]));
  const nutritionLinesPer = FIELDS.map((f) => formatNutrientLine(f, mergedPer[f.key]));
  const linesTotal = nutritionLinesTotal.join("\n");
  const linesPer = nutritionLinesPer.join("\n");
  const totalWeight = getRecipeTotalWeight({ ingredients: state.ingredients });
  const extrasWeight = getRecipeTotalWeight({ ingredients: includedExtras });
  const combinedWeight = totalWeight + extrasWeight;
  const portionWeight = portions > 0 ? combinedWeight / portions : 0;

  const fmtRaw = (t) => [
    t.kcal > 0 ? `${round(t.kcal, 0)} kcal` : null,
    t.prot > 0 ? `P ${round(t.prot, 1)}g` : null,
    t.carb > 0 ? `G ${round(t.carb, 1)}g` : null,
    t.fat  > 0 ? `L ${round(t.fat, 1)}g`  : null,
  ].filter(Boolean).join(" · ");

  const extrasLine = allExtras.length > 0
    ? `\n⭐ Extras (brut / portion) :\n${allExtras.map((ing) => {
        const included = ing.included !== false;
        const unit = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
        const raw = computeTotalsForIngredients([ing], 1).total;
        if (!included) return `  ○ ${ing.name} (${formatNumberFr(ing.qty, 1)} ${unit}) — Non compté`;
        return `  + ${ing.name} (${formatNumberFr(ing.qty, 1)} ${unit}) : ${fmtRaw(raw)}`;
      }).join("\n")}`
    : "";

  const extrasCountLabel = allExtras.length > 0
    ? ` + ${allExtras.length} extra(s)${allExtras.length > includedExtras.length ? ` (${includedExtras.length} comptés)` : ""}`
    : "";
  $("#totals").innerHTML =
`Repas: ${escapeHtml(state.name || "(sans nom)")}
Ingrédients: ${state.ingredients.length}${extrasCountLabel}

TOTAL${extrasLine}
Poids total: ${escapeHtml(formatWeightGrams(combinedWeight))}
${linesTotal}

PAR PORTION (${portions})
Poids par portion: ${escapeHtml(formatWeightGrams(portionWeight))}
${linesPer}
`;

  const stepsPreview = $("#stepsPreview");
  if (stepsPreview) {
    const steps = state.steps
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length === 0) {
      stepsPreview.innerHTML = `<div style="font-size:12px; opacity:.6;">Aucune étape.</div>`;
    } else {
      stepsPreview.innerHTML = steps.map((step, index) => `
          <div style="display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid #e5e5e5; border-radius:12px; background:#fafafa;">
            <div style="width:28px; height:28px; border-radius:50%; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; flex:0 0 28px;">
              ${index + 1}
            </div>
            <div style="line-height:1.4;">${escapeHtml(step)}</div>
          </div>
        `).join("");
    }
  }

  const printCard = $("#printCardInner");
  if (printCard) {
    const pdfFormat = state.pdfFormat === "computer" ? "computer" : "public";
    const difficultyLabel = state.difficulty
      ? (state.difficulty === "facile" ? "Facile" : state.difficulty === "moyen" ? "Moyen" : "Difficile")
      : "—";
    const formatTime = (value) => {
      const v = String(value || "").trim();
      if (!v) return "—";
      if (/^\d+([.,]\d+)?$/.test(v)) return `${v} min`;
      return v;
    };
    const formatQty = (value) => {
      if (!Number.isFinite(value)) return "";
      return String(round(value, 1)).replace(".", ",");
    };
    const coverSource = state.image || state.ingredients.map(getIngredientImage).find((src) => src);
    const cover = printCoverOverride || coverSource;
    const totalWeightLabel = formatWeightGrams(combinedWeight);
    const ingredientsLines = state.ingredients.map((ing) => {
      const qty = formatQty(ing.qty);
      const unit = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
      const name = escapeHtml(ing.name);
      return qty ? `• ${qty} ${unit} ${name}` : `• ${name}`;
    });
    const steps = state.steps
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const extrasForPdf = (state.extras || []).map((ing) => {
      const unit = formatIngredientUnit(ing?.unit, ing?.baseUnit || ing?.unit || "g");
      const perPortion = computeTotalsForIngredients([ing], 1).total;
      return {
        name: ing.name,
        qtyLabel: `${formatQty(ing.qty)} ${unit}`,
        included: ing.included !== false,
        perPortion,
      };
    });
    printCard.innerHTML = pdfFormat === "computer"
      ? buildComputerRecipePrintCardMarkup({
        name: state.name,
        portions,
        totalWeightLabel,
        ingredients: state.ingredients,
        total: mergedTotal,
        extrasForPdf,
      })
      : buildPublicRecipePrintCardMarkup({
        name: state.name,
        difficultyLabel,
        cover,
        portions,
        prepTime: formatTime(state.prepTime),
        cookTime: formatTime(state.cookTime),
        per: mergedPer,
        ingredientsLines,
        steps,
        extrasForPdf,
      });
  }

  updateProductEditUI();
  updateSaveButton();
  renderRecipeList();
  renderProductLibrary();
  renderPage();
  saveDraft();
}

function saveForNavigation() {
  try {
    syncStateFromInputs();
    saveDraft();
    saveSessionNavBackup();
  } catch {
    // ignore
  }
}

window.__nutritionSaveForNavigation = saveForNavigation;

$("#mealName").addEventListener("input", render);
$("#portions").addEventListener("change", handlePortionsChange);
$("#exportPdf").addEventListener("click", async () => {
  const exportBtn = $("#exportPdf");
  const previousLabel = exportBtn?.textContent || "Exporter PDF";

  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.textContent = "Preparation PDF...";
  }

  try {
    syncStateFromInputs();
    if (state.pdfFormat === "public") {
      const coverSource = state.image || state.ingredients.map(getIngredientImage).find((src) => src) || "";
      printCoverOverride = coverSource
        ? await buildPdfCoverImage(coverSource)
        : "";
    } else {
      printCoverOverride = "";
    }
    render();

    const mealName = state.name || $("#mealName")?.value || "Recette";
    printWithPdfName(mealName, {
      beforePrint: prepareSinglePageRecipePrint,
      afterPrint: () => {
        printCoverOverride = "";
        render();
      },
    });
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.textContent = previousLabel;
    }
  }
});
$("#saveRecipe").addEventListener("click", saveRecipe);
$("#newRecipe").addEventListener("click", newRecipe);
$("#recipeClaudeBtn").addEventListener("click", () => {
  const md = buildRecipeMarkdownForClaude();
  const panel = $("#recipeClaudePanel");
  const textarea = $("#recipeClaudeText");
  if (textarea) textarea.value = md;
  if (panel) { panel.style.display = "block"; panel.scrollIntoView({ behavior: "smooth", block: "start" }); }
});
$("#recipeClaudeCopy").addEventListener("click", () => {
  const textarea = $("#recipeClaudeText");
  if (!textarea) return;
  navigator.clipboard.writeText(textarea.value).then(() => {
    const btn = $("#recipeClaudeCopy");
    if (btn) { btn.textContent = "✔ Copié !"; setTimeout(() => { btn.textContent = "📋 Copier"; }, 1500); }
  });
});
$("#recipeClaudeDownload").addEventListener("click", () => {
  const textarea = $("#recipeClaudeText");
  if (!textarea) return;
  const name = (state.name?.trim() || "recette").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const blob = new Blob([textarea.value], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `recette-${name}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$("#recipeClaudeClose").addEventListener("click", () => {
  const panel = $("#recipeClaudePanel");
  if (panel) panel.style.display = "none";
});
$("#applyMultiplier").addEventListener("click", () => {
  applyRecipeMultiplier($("#portionMultiplier").value);
});
document.querySelectorAll("[data-mult]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const factor = btn.getAttribute("data-mult");
    applyRecipeMultiplier(factor);
  });
});
$("#recipeDesc").addEventListener("input", render);
$("#prepTime").addEventListener("input", render);
$("#cookTime").addEventListener("input", render);
$("#difficulty").addEventListener("change", render);
$("#cost").addEventListener("change", render);
$("#sourceLink").addEventListener("input", render);
$("#recipeImageUrl").addEventListener("input", (e) => {
  setRecipeImagePreview(e.target.value.trim());
  render();
});
$("#recipeImageFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const result = await resizeImageFile(file);
  if (!result) return;
  $("#recipeImageUrl").value = result;
  setRecipeImagePreview(result);
  render();
});
$("#pdfFormat").addEventListener("change", render);
$("#recipeSteps").addEventListener("input", render);
$("#recipeSearch").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderRecipeList();
  saveDraft();
});
$("#recipeSort").addEventListener("change", (e) => {
  state.sort = ["name", "rating", "madeit", "notmadeit"].includes(e.target.value) ? e.target.value : "recent";
  renderRecipeList();
  saveDraft();
});
$("#createRecipeFromList").addEventListener("click", () => {
  newRecipe();
  setPage("create");
});
$("#exportData").addEventListener("click", () => {
  const payload = buildExportPayload();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(payload, `nutrition-pwa-backup-${stamp}.json`);
});
$("#importData").addEventListener("click", () => {
  $("#importFile").click();
});
$("#autoExportToggle").addEventListener("click", () => {
  setAutoExportEnabled(!isAutoExportEnabled());
});
$("#importFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const ok = confirm("Importer va remplacer tes données actuelles. Continuer ?");
  if (!ok) {
    e.target.value = "";
    return;
  }
  try {
    await importDataFromFile(file);
  } catch (err) {
    console.error("Import error:", err);
    alert("Erreur lors de l'import : " + (err?.message || String(err)));
  }
  e.target.value = "";
});
function openCloudModal() {
  const m = $("#cloudModal");
  if (m) { m.style.display = "flex"; updateCloudUI(); }
}
function closeCloudModal() {
  const m = $("#cloudModal");
  if (m) m.style.display = "none";
}
$("#navCloud")?.addEventListener("click", openCloudModal);
$("#cloudModalClose")?.addEventListener("click", closeCloudModal);
$("#cloudModal")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeCloudModal(); });

$("#cloudSignUp")?.addEventListener("click", async () => {
  if (!supabase) return alert("Sync cloud non configurée.");
  const email = $("#cloudEmail")?.value.trim();
  const password = $("#cloudPassword")?.value;
  if (!email || !password) return alert("Entre un email et un mot de passe.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert("Création impossible. Vérifie email/mot de passe.");
    return;
  }
  alert("Compte créé. Vérifie tes emails si une confirmation est requise.");
});
$("#cloudSignIn")?.addEventListener("click", async () => {
  if (!supabase) return alert("Sync cloud non configurée.");
  const email = $("#cloudEmail")?.value.trim();
  const password = $("#cloudPassword")?.value;
  if (!email || !password) return alert("Entre un email et un mot de passe.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Connexion impossible. Vérifie tes identifiants.");
  }
});
$("#cloudSignOut")?.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  setCloudStatus("Déconnecté.");
});
$("#cloudPull")?.addEventListener("click", async () => {
  await pullFromCloud({ promptIfRemoteNewer: true });
});
$("#cloudPush")?.addEventListener("click", async () => {
  await pushToCloud();
});
$("#productSearch").addEventListener("input", (e) => {
  state.productSearch = e.target.value;
  renderProductLibrary();
  saveDraft();
});
$("#productQty").addEventListener("input", (e) => {
  state.productQty = e.target.value;
  saveDraft();
});
$("#productQtyUnit").addEventListener("change", (e) => {
  state.productQtyUnit = normalizeAddIngredientQtyUnit(e.target.value);
  saveDraft();
});
$("#productCategoryFilter").addEventListener("change", (e) => {
  state.productCategoryFilter = e.target.value;
  renderProductLibrary();
  saveDraft();
});
$("#addProduct").addEventListener("click", addProduct);
$("#cancelProductEdit").addEventListener("click", cancelProductEdit);
$("#goToProducts").addEventListener("click", () => setPage("products"));
$("#navRecipes").addEventListener("click", () => setPage("recipes"));
$("#navCreate").addEventListener("click", () => setPage("create"));
$("#navProducts").addEventListener("click", () => setPage("products"));
$("#navCompare").addEventListener("click", () => setPage("compare"));
$("#navJournal").addEventListener("click", () => setPage("journal"));
$("#navShop").addEventListener("click", () => setPage("shop"));
$("#navRappel").addEventListener("click", () => setPage("rappel"));
$("#navTrash").addEventListener("click", () => setPage("trash"));
$("#navImport").addEventListener("click", () => setPage("import"));

// ─── Import recette sans IA ───────────────────────────────────────────────────

let _importParsed = null; // { title, ingredients: [{raw, name, matched: product|null}], steps }
let _journalWeekStart = "";
let _journalDays = [];

function normalizeForMatch(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractIngredientName(line) {
  let s = line.replace(/^[\-•*\d.]+\s*/, "");
  s = s.replace(
    /^\d[\d.,/]*\s*(g|ml|kg|l|cl|cc|cs|c\.s\.|c\.c\.|tasse|cup|oz|lb|pince|sachet|boite|tranche|feuille|gousse|brin|bouquet|cuill[^\s]*\s*[àa]\s*(soupe|caf[eé])?)\s*/i,
    ""
  );
  s = s.replace(/^(de |d'|du |des )/i, "");
  s = s.split(/[,(]/)[0].trim();
  return s;
}

function extractQtyUnit(line) {
  let s = line.replace(/^[\-•*]\s*/, "");
  const m = s.match(/^([\d.,/]+)\s*(g|ml|kg|l|cl|cc|cs|c\.s\.|c\.c\.|tasse|cup|oz|lb|pince|sachet|boite|tranche|feuille|gousse|brin|bouquet|cuill[^\s]*(?:\s*[àa]\s*(?:soupe|caf[eé]))?)\b/i);
  if (!m) return { qty: 0, unit: "g" };
  const rawQty = m[1].replace(",", ".");
  let qty = rawQty.includes("/")
    ? rawQty.split("/").reduce((a, b) => parseFloat(a) / parseFloat(b))
    : parseFloat(rawQty);
  if (isNaN(qty)) qty = 0;
  return { qty, unit: m[2].toLowerCase() };
}

function matchToProduct(name) {
  const norm = normalizeForMatch(name);
  if (!norm) return null;
  const words = norm.split(" ").filter((w) => w.length > 2);
  return (
    state.products.find((p) => {
      const pNorm = normalizeForMatch(p.name);
      return pNorm.includes(norm) || norm.includes(pNorm) || words.some((w) => pNorm.includes(w));
    }) || null
  );
}

function parseRawRecipe(title, text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const ingredientLines = [];
  const stepLines = [];
  let mode = "auto";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^(ingr[eé]dients?|pour\s+\d|il\s+faut\s*:?)/i.test(lower)) { mode = "ingredients"; continue; }
    if (/^(pr[eé]paration|[eé]tapes?|instructions?|m[eé]thode|recette\s*:?)\s*:?$/i.test(lower)) { mode = "steps"; continue; }

    if (mode === "ingredients") {
      ingredientLines.push(line);
    } else if (mode === "steps") {
      stepLines.push(line);
    } else {
      const looksLikeIngredient = /^[\-•*]|^\d+[\s,./]*(g|ml|kg|l\b|cl|cc|cs|tasse|cup|oz|lb|pince|sachet|tranche|feuille|gousse|brin)/i.test(line);
      if (looksLikeIngredient) ingredientLines.push(line);
      else stepLines.push(line);
    }
  }

  const ingredients = ingredientLines.map((raw) => {
    const name = extractIngredientName(raw);
    const { qty, unit } = extractQtyUnit(raw);
    return { raw, name, qty, unit, matched: matchToProduct(name) };
  });

  return { title, ingredients, steps: stepLines.join("\n") };
}

function renderImportResult() {
  if (!_importParsed) return;
  const { ingredients, steps } = _importParsed;
  const result   = $("#importResult");
  const matchList = $("#importMatchList");
  const stepsEl  = $("#importSteps");

  const UNITS = ["g","ml","kg","l","cl","tasse","cs","cc","tranche","gousse","pince","sachet"];

  matchList.innerHTML = `
    <div style="font-size:13px; font-weight:700; margin-bottom:8px; color:#1a2b4a;">
      ${ingredients.length} ingrédient(s) —
      <span style="color:#1a7a3c;">${ingredients.filter(i=>i.matched).length} lié(s)</span> ·
      <span style="color:#e8501a;">${ingredients.filter(i=>!i.matched).length} sans lien</span>
    </div>
    ${ingredients.map((ing, idx) => `
      <div data-import-row="${idx}" style="border:1px solid ${ing.matched?"#c3e6cb":"#ffd8a8"}; border-radius:8px; padding:10px 12px; margin-bottom:6px; background:${ing.matched?"#f6fef9":"#fffaf3"};">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:15px;">${ing.matched ? "✅" : "⚠️"}</span>
          <input type="text" data-import-name="${idx}" value="${escapeHtml(ing.name)}" placeholder="Nom de l'ingrédient"
            style="font-size:13px; font-weight:700; flex:1; min-width:100px; padding:4px 7px; border:1px solid #dde3ee; border-radius:6px;" />
          <input type="number" data-import-qty="${idx}" value="${ing.qty || 0}" min="0" step="any" inputmode="decimal"
            style="width:72px; padding:4px 6px; border:1px solid #dde3ee; border-radius:6px; font-size:13px;" />
          <select data-import-unit="${idx}" style="padding:4px 6px; border:1px solid #dde3ee; border-radius:6px; font-size:13px;">
            ${UNITS.map(u => `<option value="${u}" ${ing.unit===u?"selected":""}>${u}</option>`).join("")}
          </select>
          <button data-import-search-toggle="${idx}" style="font-size:11px; padding:4px 9px; border:1px solid #a0b4d0; border-radius:6px; background:#f0f4fb; cursor:pointer;">🔍 Changer</button>
          <button data-import-del="${idx}" style="font-size:11px; padding:4px 8px; border:1px solid #f5c6cb; border-radius:6px; background:#fff5f5; color:#c0392b; cursor:pointer;">✕</button>
        </div>
        <div style="margin-top:4px; padding-left:24px; font-size:12px;">
          ${ing.matched
            ? `<span style="color:#1a7a3c; font-weight:600;">→ ${escapeHtml(ing.matched.name)}</span>`
            : `<span style="color:#b45309; font-style:italic;">Non trouvé dans ta bibliothèque — clique sur 🔍 Changer pour en sélectionner un</span>`}
        </div>
        <div id="import-search-panel-${idx}" style="display:none; margin-top:8px;">
          <input type="text" placeholder="🔍 Chercher un produit dans ta bibliothèque…" data-import-search-input="${idx}"
            style="width:100%; padding:7px 10px; border:1px solid #a0b4d0; border-radius:7px; font-size:13px; box-sizing:border-box;" />
          <div id="import-search-results-${idx}" style="max-height:180px; overflow-y:auto; margin-top:5px; display:grid; gap:3px;"></div>
          <button data-import-unlink="${idx}" style="margin-top:6px; font-size:11px; padding:3px 8px; border:1px solid #dde3ee; border-radius:5px; background:#fff; color:#777; cursor:pointer;">⊘ Supprimer le lien produit</button>
        </div>
      </div>`).join("")}
    <button id="importAddManual" style="width:100%; margin-top:4px; padding:10px; border:2px dashed #a0b4d0; border-radius:8px; background:#f8faff; color:#1a2b4a; font-size:13px; font-weight:600; cursor:pointer;">➕ Ajouter un ingrédient manuellement</button>`;

  // Name (editable)
  matchList.querySelectorAll("[data-import-name]").forEach((input) => {
    input.addEventListener("input", () => {
      _importParsed.ingredients[+input.getAttribute("data-import-name")].name = input.value;
    });
  });
  // Add manual ingredient
  document.getElementById("importAddManual")?.addEventListener("click", () => {
    _importParsed.ingredients.push({ raw: "", name: "", qty: 0, unit: "g", matched: null });
    renderImportResult();
    // Focus the new name input
    const inputs = matchList.querySelectorAll("[data-import-name]");
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
  // Qty
  matchList.querySelectorAll("[data-import-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = +input.getAttribute("data-import-qty");
      _importParsed.ingredients[idx].qty = parseFloat(input.value.replace(",", ".")) || 0;
    });
  });
  // Unit
  matchList.querySelectorAll("[data-import-unit]").forEach((sel) => {
    sel.addEventListener("change", () => {
      _importParsed.ingredients[+sel.getAttribute("data-import-unit")].unit = sel.value;
    });
  });
  // Delete row
  matchList.querySelectorAll("[data-import-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      _importParsed.ingredients.splice(+btn.getAttribute("data-import-del"), 1);
      renderImportResult();
    });
  });
  // Toggle search panel
  matchList.querySelectorAll("[data-import-search-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = +btn.getAttribute("data-import-search-toggle");
      const panel = document.getElementById(`import-search-panel-${idx}`);
      if (!panel) return;
      const open = panel.style.display !== "none";
      matchList.querySelectorAll("[id^='import-search-panel-']").forEach(p => { p.style.display = "none"; });
      if (!open) {
        panel.style.display = "block";
        const si = panel.querySelector("[data-import-search-input]");
        if (si) { si.value = ""; si.focus(); _renderImportSearchResults(idx, ""); }
      }
    });
  });
  // Search input
  matchList.querySelectorAll("[data-import-search-input]").forEach((input) => {
    input.addEventListener("input", () => {
      _renderImportSearchResults(+input.getAttribute("data-import-search-input"), input.value);
    });
  });
  // Unlink product
  matchList.querySelectorAll("[data-import-unlink]").forEach((btn) => {
    btn.addEventListener("click", () => {
      _importParsed.ingredients[+btn.getAttribute("data-import-unlink")].matched = null;
      renderImportResult();
    });
  });

  stepsEl.value = steps;
  result.style.display = "";
}

function _renderImportSearchResults(idx, query) {
  const resultsEl = document.getElementById(`import-search-results-${idx}`);
  if (!resultsEl) return;
  const q = query.toLowerCase().trim();
  const products = state.products
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
    .slice(0, 20);
  if (!products.length) {
    resultsEl.innerHTML = `<div style="font-size:12px; opacity:.5; padding:5px 8px; font-style:italic;">Aucun produit trouvé.</div>`;
    return;
  }
  resultsEl.innerHTML = products.map(p =>
    `<div data-import-pick="${escapeHtml(p.id)}"
      style="padding:6px 10px; border:1px solid #eef0f5; border-radius:6px; background:#fff; cursor:pointer; font-size:12px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
      <span>${escapeHtml(p.name)}</span>
      <span style="font-size:10px; opacity:.5;">${p.unit||"g"}</span>
    </div>`
  ).join("");
  resultsEl.querySelectorAll("[data-import-pick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = state.products.find(p => p.id === btn.getAttribute("data-import-pick"));
      if (!product) return;
      _importParsed.ingredients[idx].matched = product;
      renderImportResult();
    });
  });
}

function handleImportSave() {
  if (!_importParsed) return;
  const title = ($("#importTitle").value.trim()) || _importParsed.title || "Recette importée";
  const steps = $("#importSteps").value.trim();

  const ingredients = _importParsed.ingredients.map((i) => {
    if (i.matched) {
      return normalizeIngredient({
        name: i.matched.name,
        productId: i.matched.id,
        qty: i.qty || 0,
        unit: i.unit || i.matched.unit || "g",
        per100: i.matched.per100,
        isImported: true,
      });
    }
    return normalizeIngredient({ name: i.name || i.raw, qty: i.qty || 0, unit: i.unit || "g", isImported: true });
  });

  const recipe = normalizeRecipe({
    name: title,
    steps,
    ingredients,
    source: "Import externe",
    updatedAt: Date.now(),
  });

  state.recipes.unshift(recipe);
  saveRecipes();

  const status = $("#importSaveStatus");
  status.textContent = `Recette "${title}" sauvegardée !`;
  status.style.color = "#1a7a3c";

  setTimeout(() => {
    _importParsed = null;
    $("#importText").value = "";
    $("#importTitle").value = "";
    $("#importResult").style.display = "none";
    status.textContent = "";
    setPage("recipes");
    render();
  }, 1200);
}

$("#importParseBtn").addEventListener("click", () => {
  const text = $("#importText").value.trim();
  if (!text) return;
  const title = $("#importTitle").value.trim() || text.split("\n")[0]?.trim() || "Recette importée";
  if (!$("#importTitle").value.trim()) $("#importTitle").value = title;
  _importParsed = parseRawRecipe(title, text);
  renderImportResult();
});

$("#importSaveBtn").addEventListener("click", handleImportSave);
$("#compareSearch").addEventListener("input", (e) => {
  state.compareSearch = e.target.value;
  renderComparePage();
  saveDraft();
});
$("#compareCategory").addEventListener("change", (e) => {
  state.compareCategory = e.target.value;
  renderComparePage();
  saveDraft();
});
$("#compareClear").addEventListener("click", () => {
  clearCompareSelection();
});
function offSearchAuto() {
  const val = $("#offSearch")?.value.trim() || "";
  if (/^\d{6,14}$/.test(val)) offSearchByBarcode(val);
  else offSearchByName(val);
}
$("#offSearchBtn").addEventListener("click", offSearchAuto);
$("#offSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") offSearchAuto(); });
$("#offScanInput").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) { offDecodePhoto(file); e.target.value = ""; }
});
$("#prodImageUrl").addEventListener("input", (e) => {
  setProductImagePreview(e.target.value.trim());
});
$("#prodImageFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const result = await resizeImageFile(file);
  if (!result) return;
  $("#prodImageUrl").value = result;
  setProductImagePreview(result);
});
window.addEventListener("hashchange", applyHashRoute);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
    if (state.page === "create" && undoIngredient()) return;
    undo();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveForNavigation();
  }
});
window.addEventListener("beforeunload", () => {
  saveForNavigation();
});

async function initApp() {
  await initStorage();
  await loadProducts();
  await loadRecipes();
  await loadFreeDishes();
  await loadTrash();
  await loadDraft();
  {
    const previousRecipes = state.recipes;
    const linked = linkIngredientsToProductsByName();
    const synced = syncIngredientsFromProducts(state.products);
    const recipesChanged = linked.recipesChanged || synced.recipesChanged;
    const draftChanged = linked.draftChanged || synced.draftChanged;
    if (recipesChanged && !saveRecipes()) {
      state.recipes = previousRecipes;
      alert("Sauvegarde des recettes impossible (stockage local plein). Les recettes n'ont pas été mises à jour.");
    }
    if (draftChanged) saveDraft();
  }
  await loadTrack();
  await loadTrackWeekTotals();
  await loadWeekPlans();
  await loadShopLists();
  await loadFreeDays();
  await maybeRestoreSessionBackupOnEmpty();
  await maybeRestoreBackupOnEmpty();
  await maybeAutoImportFromUrl();
  if (!getLocalUpdatedAt() && estimateStorageBytes() > 0) {
    setLocalUpdatedAt(Date.now());
  }
  ensureAutoExportDefault();
  startPeriodicBackup();
  syncInputsFromState();
  applyHashRoute();
  render();
  await initCloud();
}

// Request persistent storage so iOS doesn't wipe data when clearing cache
if (navigator.storage?.persist) navigator.storage.persist();

initApp();
