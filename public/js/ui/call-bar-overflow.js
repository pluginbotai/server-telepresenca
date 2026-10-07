import { attachDrawerInteraction } from "./drawer-interaction.js";

/**
 * @param {HTMLElement | null | undefined} root
 * @returns {HTMLElement[]}
 */
function listOverflowSources(root) {
  if (!root) return [];
  /** @type {HTMLElement[]} */
  const nodes = [];
  for (const child of root.children) {
    if (child.matches?.(".popover-host")) {
      const btn = child.querySelector(".ctrl");
      if (btn) nodes.push(btn);
      continue;
    }
    if (child.matches?.(".feature-host")) {
      for (const btn of child.querySelectorAll(".ctrl")) {
        nodes.push(btn);
      }
      continue;
    }
    if (child.matches?.(".ctrl")) {
      nodes.push(child);
    }
  }
  return nodes;
}

/**
 * @param {HTMLElement} source
 * @param {(key: string) => string} t
 */
function labelForSource(source, t) {
  const aria = source.getAttribute("aria-label");
  if (aria) return aria;
  const key = source.dataset.i18nAria;
  if (key) return t(key);
  return source.id || "";
}

/**
 * @param {object} options
 * @param {ReturnType<import("./dom.js").queryDom>} options.els
 * @param {(key: string) => string} options.t
 */
export function initCallBarOverflow({ els, t }) {
  const extra = els.callBarExtra;
  const list = els.callOverflowList;
  const drawer = els.callOverflowDrawer;
  const toggleBtn = els.btnCallOverflow;
  if (!extra || !list || !drawer || !toggleBtn) {
    return { sync: () => {}, destroy: () => {} };
  }

  /** @type {Map<string, { source: HTMLElement, row: HTMLButtonElement }>} */
  const rows = new Map();

  function rebuildRows() {
    list.replaceChildren();
    rows.clear();
    for (const source of listOverflowSources(extra)) {
      if (source.hidden) continue;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "call-overflow-item";
      row.setAttribute("role", "menuitem");
      row.dataset.sourceId = source.id;

      const iconWrap = document.createElement("span");
      iconWrap.className = "call-overflow-icon";
      const svg = source.querySelector("svg");
      if (svg) iconWrap.appendChild(svg.cloneNode(true));

      const label = document.createElement("span");
      label.className = "call-overflow-label";

      row.append(iconWrap, label);
      row.addEventListener("click", (event) => {
        event.preventDefault();
        if (source.disabled) return;
        setOpen(false);
        source.click();
      });

      list.appendChild(row);
      rows.set(source.id, { source, row });
    }
  }

  let open = false;

  function setOpen(next) {
    open = Boolean(next);
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    els.callOverflowBackdrop?.classList.toggle("is-active", open);
    if (open) sync();
  }

  function sync() {
    rebuildRows();
    for (const { source, row } of rows.values()) {
      const label = row.querySelector(".call-overflow-label");
      if (label) label.textContent = labelForSource(source, t);
      row.disabled = source.disabled;
      row.classList.toggle("is-off", source.classList.contains("is-off"));
      row.classList.toggle("is-sharing", source.classList.contains("is-sharing"));
      row.classList.toggle("is-ringing", source.classList.contains("is-ringing"));
      row.hidden = source.hidden;
    }
  }

  toggleBtn.setAttribute("aria-label", t("call.overflow"));

  const detachDrawer = attachDrawerInteraction({
    toggleBtn,
    closeBtn: null,
    backdropEl: els.callOverflowBackdrop,
    getOpen: () => open,
    getEnabled: () => true,
    setOpen,
  });

  return {
    sync,
    destroy: detachDrawer,
  };
}
