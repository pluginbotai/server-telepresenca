import { isEmotionsAvailable, emotionsFaces } from "../protocol/capabilities.js";
import {
  createDrawerSectionHead,
  createDrawerSectionInner,
} from "../ui/robot-drawer-section.js";

/**
 * Controle de Expressões e Faces do Robô no console do operador.
 * Exibido no Drawer de Controles do Robô quando o robô anunciar a capability "emotions".
 */

export const SUPPORTED_EXPRESSIONS = [
  { id: "default", emoji: "😊", labelKey: "emotions.default", label: "Padrão" },
  { id: "smile", emoji: "😃", labelKey: "emotions.smile", label: "Sorriso" },
  { id: "happy", emoji: "😄", labelKey: "emotions.happy", label: "Feliz" },
  { id: "grin", emoji: "😁", labelKey: "emotions.grin", label: "Contente" },
  { id: "daze", emoji: "🤔", labelKey: "emotions.daze", label: "Pensativo" },
  { id: "love", emoji: "😍", labelKey: "emotions.love", label: "Amor" },
  { id: "music", emoji: "🎵", labelKey: "emotions.music", label: "Música" },
  { id: "proud", emoji: "😎", labelKey: "emotions.proud", label: "Confiante" },
  { id: "shy", emoji: "😳", labelKey: "emotions.shy", label: "Tímido" },
  { id: "naughty", emoji: "😜", labelKey: "emotions.naughty", label: "Travesso" },
  { id: "upset", emoji: "🙁", labelKey: "emotions.upset", label: "Chateado" },
  { id: "wronged", emoji: "🥺", labelKey: "emotions.wronged", label: "Injustiçado" },
];

/**
 * @type {string}
 */
let currentFace = "default";

/**
 * @type {import('./registry.js').FeatureContext | null}
 */
let activeCtx = null;

/**
 * @type {HTMLElement | null}
 */
let currentGridEl = null;

const FACE_ICON_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;

/**
 * Sincroniza o estado visual dos botões no grid do drawer.
 */
function syncGridUi() {
  if (!currentGridEl) return;
  const buttons = currentGridEl.querySelectorAll(".robot-drawer-preset-btn");
  for (const btn of buttons) {
    const face = btn.getAttribute("data-face");
    const isActive = face === currentFace;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

/**
 * Seleciona a expressão ativa e opcionalmente despacha via controle.
 * @param {string} face
 * @param {{ send?: boolean }} [options]
 */
function selectFace(face, { send = true } = {}) {
  currentFace = face;
  syncGridUi();
  if (send && activeCtx?.isConnected()) {
    activeCtx.sendControl("operator.face", { name: face });
  }
}

export const expressionsFeature = {
  id: "expressions",
  optIn: true,
  isAvailable: isEmotionsAvailable,

  /**
   * @param {import('./registry.js').FeatureContext} ctx
   */
  mount(ctx) {
    activeCtx = ctx;
    const host = typeof ctx.host === "function" ? ctx.host("expressions") : null;
    if (!host) return () => {};

    host.hidden = false;

    const t = typeof ctx.t === "function" ? ctx.t : (k) => k;
    const { head } = createDrawerSectionHead({
      iconHtml: FACE_ICON_SVG,
      title: t("emotions.title") || "Expressões Faciais",
      badgeText: "",
    });

    const gridEl = document.createElement("div");
    gridEl.className = "robot-drawer-presets-grid";
    gridEl.setAttribute("role", "group");
    gridEl.setAttribute("aria-label", t("emotions.title") || "Expressões Faciais");
    currentGridEl = gridEl;

    const allowedFaces = ctx.caps ? emotionsFaces(ctx.caps) : [];
    const expressionsToShow =
      allowedFaces.length > 0
        ? SUPPORTED_EXPRESSIONS.filter((e) => allowedFaces.includes(e.id))
        : SUPPORTED_EXPRESSIONS;

    for (const expr of expressionsToShow) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "robot-drawer-preset-btn";
      btn.setAttribute("data-face", expr.id);
      const translatedLabel = t(expr.labelKey) || expr.label;
      btn.textContent = `${expr.emoji} ${translatedLabel}`;
      btn.setAttribute("aria-label", translatedLabel);

      btn.addEventListener("click", () => {
        selectFace(expr.id, { send: true });
      });

      gridEl.appendChild(btn);
    }

    syncGridUi();

    const root = createDrawerSectionInner("expressions", head, gridEl);
    host.appendChild(root);

    return () => {
      root?.remove();
      currentGridEl = null;
      host.hidden = true;
      activeCtx = null;
    };
  },

  selectFace,

  getCurrentFace() {
    return currentFace;
  },

  /**
   * @param {string} face
   */
  setCurrentFace(face) {
    selectFace(face, { send: false });
  },
};
