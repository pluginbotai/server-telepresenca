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
 * IDs alinhados aos drawables Android (olhos_*.gif) e TemiAvatarController / CruzrAvatarController.
 */

export const SUPPORTED_EXPRESSIONS = [
  { id: "olhos_neutro", emoji: "😐", labelKey: "emotions.olhos_neutro", label: "Neutro" },
  { id: "olhos_piscadinha", emoji: "😉", labelKey: "emotions.olhos_piscadinha", label: "Piscadinha" },
  { id: "olhos_piscar", emoji: "😑", labelKey: "emotions.olhos_piscar", label: "Piscar" },
  { id: "olhos_surpreso", emoji: "😲", labelKey: "emotions.olhos_surpreso", label: "Surpreso" },
  { id: "olhos_bravo", emoji: "😠", labelKey: "emotions.olhos_bravo", label: "Bravo" },
  { id: "olhos_coracao", emoji: "😍", labelKey: "emotions.olhos_coracao", label: "Coração" },
  { id: "olhos_triste", emoji: "😢", labelKey: "emotions.olhos_triste", label: "Triste" },
  { id: "olhos_tristes", emoji: "😭", labelKey: "emotions.olhos_tristes", label: "Muito triste" },
  { id: "olhos_pensando", emoji: "🤔", labelKey: "emotions.olhos_pensando", label: "Pensando" },
  { id: "olhos_desconfiado", emoji: "🤨", labelKey: "emotions.olhos_desconfiado", label: "Desconfiado" },
  { id: "olhos_dormindo", emoji: "😴", labelKey: "emotions.olhos_dormindo", label: "Dormindo" },
  { id: "olhos_sono", emoji: "🥱", labelKey: "emotions.olhos_sono", label: "Com sono" },
  { id: "olhos_tonto", emoji: "😵‍💫", labelKey: "emotions.olhos_tonto", label: "Tonto" },
  {
    id: "olhos_pulando_animado",
    emoji: "🤩",
    labelKey: "emotions.olhos_pulando_animado",
    label: "Animado",
  },
  { id: "olhos_olhando", emoji: "👀", labelKey: "emotions.olhos_olhando", label: "Olhando" },
  {
    id: "olhando_para_baixo",
    emoji: "👇",
    labelKey: "emotions.olhando_para_baixo",
    label: "Olhando para baixo",
  },
  { id: "olhos_sim", emoji: "👍", labelKey: "emotions.olhos_sim", label: "Sim" },
  { id: "olhos_equalizador", emoji: "🎵", labelKey: "emotions.olhos_equalizador", label: "Música" },
  { id: "olhos_carregando", emoji: "⏳", labelKey: "emotions.olhos_carregando", label: "Carregando" },
  { id: "olhos_matrix", emoji: "👾", labelKey: "emotions.olhos_matrix", label: "Matrix" },
  { id: "olhos_rastro", emoji: "💫", labelKey: "emotions.olhos_rastro", label: "Rastro" },
  { id: "olhos_bumerangue", emoji: "🔄", labelKey: "emotions.olhos_bumerangue", label: "Bumerangue" },
];

/** @type {string} */
let currentFace = "olhos_neutro";

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
function buildFaceRail(railEl, ctx, _t) {
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
