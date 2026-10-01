/**
 * Estrutura única das seções do drawer “Controles do robô”.
 * Features devem usar estes helpers — não inventar card-head / títulos soltos.
 */

/**
 * @param {{ iconHtml?: string, title: string, badgeText?: string }} opts
 */
export function createDrawerSectionHead({ iconHtml, title, badgeText = "" }) {
  const head = document.createElement("div");
  head.className = "robot-drawer-section-head";

  const labelWrap = document.createElement("div");
  labelWrap.className = "robot-drawer-section-label";

  const titleEl = document.createElement("span");
  titleEl.className = "robot-drawer-section-title";
  titleEl.textContent = title;

  if (iconHtml) {
    const iconSpan = document.createElement("span");
    iconSpan.className = "robot-drawer-section-icon";
    iconSpan.innerHTML = iconHtml;
    labelWrap.append(iconSpan, titleEl);
  } else {
    labelWrap.classList.add("robot-drawer-section-label--text-only");
    labelWrap.append(titleEl);
  }
  head.appendChild(labelWrap);

  let badgeEl = null;
  if (badgeText !== undefined) {
    badgeEl = document.createElement("span");
    badgeEl.className = "robot-drawer-section-badge";
    badgeEl.textContent = badgeText;
    head.appendChild(badgeEl);
  }

  return { head, titleEl, badgeEl };
}

/**
 * Monta inner padrão: cabeçalho + área de controles.
 * @param {string} featureId
 * @param {HTMLElement} head
 * @param {HTMLElement} controls
 */
export function createDrawerSectionInner(featureId, head, controls) {
  const root = document.createElement("div");
  root.className = "robot-drawer-inner";
  root.dataset.feature = featureId;
  root.append(head, controls);
  return root;
}
