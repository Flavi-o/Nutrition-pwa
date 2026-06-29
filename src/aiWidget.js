import "./aiWidget.css";

const STORAGE_KEY = "nutrition-pwa-ai-chat";
const API_PATH = "/api/chat";
const MAX_MESSAGES = 50;

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
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

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = safeParse(raw);
    if (!data || !Array.isArray(data.messages)) return [];
    return data.messages
      .map((m) => {
        if (!m || typeof m !== "object") return null;
        const role = m.role === "user" ? "user" : "assistant";
        const text = typeof m.text === "string" ? m.text.trim() : "";
        if (!text) return null;
        const ts = Number.isFinite(m.ts) ? m.ts : Date.now();
        return { role, text, ts };
      })
      .filter(Boolean)
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
  } catch {
    // ignore
  }
}

export function initAIWidget({ getTrackingData } = {}) {
  if (document.getElementById("ai-widget")) return;

  const root = document.createElement("div");
  root.id = "ai-widget";
  root.innerHTML = `
    <button id="ai-widget-toggle">Coach IA</button>
    <div id="ai-widget-panel">
      <div id="ai-widget-header">
        <div style="font-weight:700;">Coach IA</div>
        <button id="ai-widget-close" aria-label="Fermer">×</button>
      </div>
      <div id="ai-messages"></div>
      <div id="ai-input-row">
        <input id="ai-input" placeholder="Ex: Donne-moi un avis sur ma journée." />
        <button id="ai-send">Envoyer</button>
      </div>
      <div id="ai-status-row">
        <div id="ai-typing">En train de répondre…</div>
        <button id="ai-clear">Vider</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const toggle = root.querySelector("#ai-widget-toggle");
  const panel = root.querySelector("#ai-widget-panel");
  const closeBtn = root.querySelector("#ai-widget-close");
  const messagesEl = root.querySelector("#ai-messages");
  const input = root.querySelector("#ai-input");
  const sendBtn = root.querySelector("#ai-send");
  const typingEl = root.querySelector("#ai-typing");
  const clearBtn = root.querySelector("#ai-clear");

  let open = false;
  let pending = false;
  let messages = loadMessages();

  const setOpen = (next) => {
    open = Boolean(next);
    panel.style.display = open ? "block" : "none";
    toggle.style.display = open ? "none" : "inline-flex";
  };

  const setPending = (next) => {
    pending = Boolean(next);
    typingEl.style.display = pending ? "block" : "none";
    input.disabled = pending;
    sendBtn.disabled = pending;
    clearBtn.disabled = pending || messages.length === 0;
  };

  const render = () => {
    if (messages.length === 0) {
      messagesEl.innerHTML = `
        <div style="font-size:12px; opacity:.7; line-height:1.4;">
          Pose une question sur ta journée.<br/>
          Ex: "Avis global", "Que corriger ?", "Plan 24h".
        </div>
      `;
    } else {
      messagesEl.innerHTML = messages.map((msg) => {
        const isUser = msg.role === "user";
        const roleClass = isUser ? "ai-message--user" : "ai-message--bot";
        const bubbleClass = isUser ? "ai-bubble--user" : "ai-bubble--bot";
        return `
          <div class="ai-message ${roleClass}">
            <div class="ai-bubble ${bubbleClass}">${escapeHtml(msg.text)}</div>
          </div>
        `;
      }).join("");
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
    clearBtn.disabled = pending || messages.length === 0;
  };

  const addMessage = (role, text) => {
    const clean = typeof text === "string" ? text.trim() : "";
    if (!clean) return;
    messages = [...messages, { role: role === "user" ? "user" : "assistant", text: clean, ts: Date.now() }]
      .slice(-MAX_MESSAGES);
    saveMessages(messages);
    render();
  };

  const getData = () => {
    if (typeof getTrackingData !== "function") return {};
    try {
      const data = getTrackingData();
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  };

  const sendMessage = async (text) => {
    if (pending) return;
    const trimmed = String(text || "").trim();
    if (!trimmed) return;
    input.value = "";
    addMessage("user", trimmed);
    setPending(true);
    try {
      const res = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, data: getData() }),
      });
      const raw = await res.text();
      const payload = safeParse(raw);
      if (!res.ok) {
        const err = payload?.error || `Erreur serveur (${res.status})`;
        addMessage("assistant", err);
        return;
      }
      const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
      addMessage("assistant", reply || "Réponse vide du serveur IA.");
    } catch (err) {
      const message = err?.message ? String(err.message) : "Erreur réseau.";
      addMessage("assistant", message);
    } finally {
      setPending(false);
    }
  };

  toggle.addEventListener("click", () => {
    setOpen(true);
    render();
  });
  closeBtn.addEventListener("click", () => setOpen(false));
  sendBtn.addEventListener("click", () => sendMessage(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  clearBtn.addEventListener("click", () => {
    if (!confirm("Vider la conversation ?")) return;
    messages = [];
    saveMessages(messages);
    render();
  });

  setOpen(false);
  setPending(false);
  render();
}
