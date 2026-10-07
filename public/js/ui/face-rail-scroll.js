const SCROLL_PAGE_RATIO = 0.88;

/**
 * @param {HTMLElement} rail
 */
function maxScrollLeft(rail) {
  return Math.max(0, rail.scrollWidth - rail.clientWidth);
}

/**
 * @param {HTMLElement} wrap
 * @param {HTMLElement} rail
 */
function syncScrollChrome(wrap, rail) {
  const max = maxScrollLeft(rail);
  const left = rail.scrollLeft;
  wrap.classList.toggle("can-scroll-left", left > 2);
  wrap.classList.toggle("can-scroll-right", left < max - 2);
  wrap.classList.toggle("is-scrollable", max > 2);

  const prev = wrap.querySelector(".robot-drawer-face-scroll--prev");
  const next = wrap.querySelector(".robot-drawer-face-scroll--next");
  if (prev) prev.disabled = left <= 2;
  if (next) next.disabled = left >= max - 2;
}

/**
 * @param {HTMLElement} rail
 * @param {number} delta
 */
function scrollRailByPage(rail, delta) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  rail.scrollBy({
    left: delta * rail.clientWidth * SCROLL_PAGE_RATIO,
    behavior: prefersReduced ? "auto" : "smooth",
  });
}

/**
 * @param {HTMLElement} wrapEl
 * @param {{ t?: (key: string) => string }} [options]
 */
export function bindFaceRailScroll(wrapEl, options = {}) {
  const rail = wrapEl.querySelector(".robot-drawer-face-rail");
  if (!rail) return () => {};

  const t = options.t || ((key) => key);
  const prev = wrapEl.querySelector(".robot-drawer-face-scroll--prev");
  const next = wrapEl.querySelector(".robot-drawer-face-scroll--next");

  if (prev) prev.setAttribute("aria-label", t("emotions.scrollPrev"));
  if (next) next.setAttribute("aria-label", t("emotions.scrollNext"));

  const onScroll = () => syncScrollChrome(wrapEl, rail);
  rail.addEventListener("scroll", onScroll, { passive: true });

  const onPrev = () => scrollRailByPage(rail, -1);
  const onNext = () => scrollRailByPage(rail, 1);
  prev?.addEventListener("click", onPrev);
  next?.addEventListener("click", onNext);

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollRailByPage(rail, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollRailByPage(rail, 1);
    }
  };
  wrapEl.addEventListener("keydown", onKeyDown);

  const observer =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
  observer?.observe(rail);
  observer?.observe(wrapEl);

  onScroll();

  return () => {
    observer?.disconnect();
    rail.removeEventListener("scroll", onScroll);
    prev?.removeEventListener("click", onPrev);
    next?.removeEventListener("click", onNext);
    wrapEl.removeEventListener("keydown", onKeyDown);
  };
}
