import { isEmotionsAvailable, emotionsFaces } from "../protocol/capabilities.js";
import {
  createDrawerSectionHead,
  createDrawerSectionInner,
} from "../ui/robot-drawer-section.js";
import { bindFaceRailScroll } from "../ui/face-rail-scroll.js";

const FACE_SCROLL_CHEVRON_PREV =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FACE_SCROLL_CHEVRON_NEXT =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Controle de expressões no drawer do operador (capability emotions opt-in).
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

/** @type {string} */
let currentFace = "default";

/** @type {import("./registry.js").FeatureContext | null} */
let activeCtx = null;

/** @type {HTMLElement | null} */
let currentRailEl = null;

/** @type {HTMLElement | null} */
let currentRailWrap = null;

/** @type {(() => void) | null} */
let unbindFaceRailScroll = null;

/** @type {((key: string) => string) | null} */
let translate = null;

function faceLabel(key, fallback) {
  return translate ? translate(key) || fallback : fallback;
}

function syncRailUi() {
  if (!currentRailEl) return;
  const buttons = currentRailEl.querySelectorAll(".robot-drawer-face-tile");
  for (const btn of buttons) {
    const face = btn.getAttribute("data-face");
    const isActive = face === currentFace;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function refreshFaceTileLabels() {
  if (!currentRailEl || !translate) return;
  const prev = currentRailWrap?.querySelector(".robot-drawer-face-scroll--prev");
  const next = currentRailWrap?.querySelector(".robot-drawer-face-scroll--next");
  if (prev) prev.setAttribute("aria-label", translate("emotions.scrollPrev"));
  if (next) next.setAttribute("aria-label", translate("emotions.scrollNext"));
  currentRailEl.querySelectorAll(".robot-drawer-face-tile").forEach((btn) => {
    const id = btn.getAttribute("data-face");
    const expr = SUPPORTED_EXPRESSIONS.find((item) => item.id === id);
    if (!expr) return;
    const label = faceLabel(expr.labelKey, expr.label);
    btn.setAttribute("aria-label", label);
    btn.removeAttribute("title");
  });
}

/**
 * @param {string} face
 * @param {{ send?: boolean }} [options]
 */
function selectFace(face, { send = true } = {}) {
  currentFace = face;
  syncRailUi();
  if (send && activeCtx?.isConnected()) {
    activeCtx.syncRobotAvatarForFace?.(face);
    activeCtx.sendControl("operator.face", { name: face });
  }
}

/**
 * @param {HTMLElement} railEl
 * @param {import("./registry.js").FeatureContext} ctx
 * @param {(key: string) => string} t
 */
function buildFaceRail(railEl, ctx, t) {
  railEl.replaceChildren();
  const allowedFaces = ctx.caps ? emotionsFaces(ctx.caps) : [];
  const expressionsToShow =
    allowedFaces.length > 0
      ? SUPPORTED_EXPRESSIONS.filter((e) => allowedFaces.includes(e.id))
      : SUPPORTED_EXPRESSIONS;

  for (const expr of expressionsToShow) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "robot-drawer-face-tile";
    btn.setAttribute("data-face", expr.id);
    const translatedLabel = faceLabel(expr.labelKey, expr.label);
    btn.setAttribute("aria-label", translatedLabel);
    btn.removeAttribute("title");

    const emoji = document.createElement("span");
    emoji.className = "robot-drawer-face-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = expr.emoji;

    btn.appendChild(emoji);
    btn.addEventListener("click", () => selectFace(expr.id, { send: true }));
    railEl.appendChild(btn);
  }
  syncRailUi();
}

export const expressionsFeature = {
  id: "expressions",
  optIn: true,
  isAvailable: isEmotionsAvailable,

  /** @param {import("./registry.js").FeatureContext} ctx */
  mount(ctx) {
    activeCtx = ctx;
    translate = typeof ctx.t === "function" ? ctx.t : null;
    const host = typeof ctx.host === "function" ? ctx.host("expressions") : null;
    if (!host) return () => {};

    host.hidden = false;

    const t = translate || ((k) => k);
    const { head } = createDrawerSectionHead({
      title: t("emotions.title") || "Expressões Faciais",
    });

    const wrapEl = document.createElement("div");
    wrapEl.className = "robot-drawer-face-rail-wrap";
    wrapEl.tabIndex = 0;

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "robot-drawer-face-scroll robot-drawer-face-scroll--prev";
    prevBtn.innerHTML = FACE_SCROLL_CHEVRON_PREV;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "robot-drawer-face-scroll robot-drawer-face-scroll--next";
    nextBtn.innerHTML = FACE_SCROLL_CHEVRON_NEXT;

    const railEl = document.createElement("div");
    railEl.className = "robot-drawer-face-rail";
    railEl.setAttribute("role", "group");
    railEl.setAttribute("aria-label", t("emotions.title") || "Expressões Faciais");
    currentRailEl = railEl;
    currentRailWrap = wrapEl;

    wrapEl.append(railEl, prevBtn, nextBtn);
    buildFaceRail(railEl, ctx, t);
    unbindFaceRailScroll = bindFaceRailScroll(wrapEl, { t });

    const root = createDrawerSectionInner("expressions", head, wrapEl);
    host.appendChild(root);

    return () => {
      unbindFaceRailScroll?.();
      unbindFaceRailScroll = null;
      root?.remove();
      currentRailEl = null;
      currentRailWrap = null;
      translate = null;
      host.hidden = true;
      activeCtx = null;
    };
  },

  refreshLabels() {
    if (!translate && activeCtx?.t) translate = activeCtx.t;
    refreshFaceTileLabels();
  },

  selectFace,

  getCurrentFace() {
    return currentFace;
  },

  /** @param {string} face */
  setCurrentFace(face) {
    selectFace(face, { send: false });
  },
};
