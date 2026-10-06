/**
 * Componentes DOM modulares para interfaces secundárias/ocultas.
 * Permite manter o App Shell em index.html limpo e enxuto.
 */

const LOCALES = [
  { code: "pt-BR", label: "Português", flag: "assets/flags/br.png" },
  { code: "en", label: "English", flag: "assets/flags/us.png" },
  { code: "es", label: "Español", flag: "assets/flags/es.png" },
  { code: "fr", label: "Français", flag: "assets/flags/fr.png" },
];

/**
 * @param {HTMLElement|object|null} container
 */
export function mountLangMenu(container) {
  if (!container || (container.innerHTML && container.innerHTML.trim().length > 0)) {
    return;
  }
  container.innerHTML = LOCALES.map(
    (loc) => `
    <li role="none">
      <button
        type="button"
        role="option"
        data-locale="${loc.code}"
        data-i18n-aria="lang.${loc.code}"
        data-i18n-title="lang.${loc.code}"
        title="${loc.label}"
      >
        <img src="${loc.flag}" alt="" width="22" height="16" />
        <span data-i18n="lang.${loc.code}">${loc.label}</span>
      </button>
    </li>`,
  ).join("");
}

/**
 * @param {HTMLElement|object|null} container
 */
export function mountQualityPanel(container) {
  if (!container || (container.innerHTML && container.innerHTML.trim().length > 0)) {
    return;
  }
  container.innerHTML = `
    <div class="hud-popover-head">
      <h2 class="hud-popover-title quality-title">
        <span data-i18n="video.panelTitle">Qualidade</span>
        <span class="quality-sep" aria-hidden="true">·</span>
        <span id="qualityValueLabel">Alta</span>
      </h2>
      <button
        type="button"
        id="btnCloseQuality"
        class="hud-popover-close"
        data-i18n-aria="dialog.close"
        aria-label="Fechar"
      >
        ×
      </button>
    </div>

    <div class="hud-popover-body">
      <div
        id="qualitySlider"
        class="quality-slider"
        tabindex="0"
        role="slider"
        aria-valuemin="0"
        aria-valuemax="4"
        aria-valuenow="3"
        data-i18n-aria="video.panelTitle"
        aria-label="Qualidade do vídeo"
      >
        <div class="quality-track" aria-hidden="true">
          <div class="quality-track-fill" id="qualityTrackFill"></div>
        </div>
        <div class="quality-thumb" id="qualityThumb" aria-hidden="true"></div>
      </div>

      <div class="quality-ticks" id="qualityTicks" role="listbox"></div>
    </div>`;
}

/**
 * @param {HTMLElement|object|null} container
 */
export function mountEndedOverlay(container) {
  if (!container || (container.innerHTML && container.innerHTML.trim().length > 0)) {
    return;
  }
  container.innerHTML = `
    <div class="ended-card">
      <div class="ended-card-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" class="ended-icon">
          <use href="assets/icons.svg#icon-ended-alert"></use>
        </svg>
      </div>
      <p id="endedTitle" class="ended-title" data-i18n="call.ended">
        Chamada encerrada
      </p>
      <p
        id="redirectCountdown"
        class="redirect-countdown hidden"
        data-i18n="call.redirecting"
      ></p>
      <div class="ended-actions">
        <button
          id="btnRejoin"
          class="btn-ended-secondary rejoin hidden"
          type="button"
          data-i18n="call.rejoin"
        >
          Entrar novamente
        </button>
      </div>
    </div>`;
}

/**
 * @param {HTMLElement|object|null} container
 */
export function mountInviteOverlay(container) {
  if (!container || (container.innerHTML && container.innerHTML.trim().length > 0)) {
    return;
  }
  container.innerHTML = `
    <img id="inviteLogo" class="invite-logo hidden" alt="" />
    <p id="inviteOverlayText" data-i18n="invite.expired">Convite expirado</p>
    <p id="inviteWindow" class="invite-window hidden"></p>
    <form id="identifyForm" class="identify-form hidden">
      <p id="identifyDescription" class="identify-description hidden"></p>
      <input
        id="identifyInput"
        class="identify-input"
        type="text"
        autocomplete="off"
        data-i18n-aria="invite.identifyTitle"
      />
      <p
        id="identifyError"
        class="identify-error hidden"
        data-i18n="invite.identifyError"
      >
        Identificação inválida
      </p>
      <button
        type="submit"
        class="rejoin hidden"
        data-i18n="invite.identifySubmit"
      >
        Continuar
      </button>
    </form>
    <button
      id="inviteEnter"
      class="rejoin hidden"
      type="button"
      data-i18n="invite.enter"
    >
      Entrar
    </button>`;
}

/**
 * Monta todos os componentes estáticos dinâmicos na árvore DOM.
 * @param {Document|{ getElementById: (id: string) => any }} [root]
 */
export function mountAppComponents(root = document) {
  if (!root || typeof root.getElementById !== "function") return;
  mountLangMenu(root.getElementById("langMenu"));
  mountQualityPanel(root.getElementById("qualityPanel"));
  mountEndedOverlay(root.getElementById("endedOverlay"));
  mountInviteOverlay(root.getElementById("inviteOverlay"));
}
