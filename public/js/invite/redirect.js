/**
 * Gerenciador de redirecionamento seguro pós-chamada.
 */

/**
 * Extrai a URL de retorno dos parâmetros de busca ou objeto de busca.
 * @param {string | URLSearchParams | null | undefined} searchInput
 * @returns {string | null} URL de retorno limpa ou null se ausente/inválida.
 */
export function parseReturnUrl(searchInput) {
  if (!searchInput) return null;
  let params;
  if (typeof searchInput === "string") {
    const raw = searchInput.startsWith("?") ? searchInput.slice(1) : searchInput;
    try {
      params = new URLSearchParams(raw);
    } catch {
      return null;
    }
  } else if (searchInput instanceof URLSearchParams) {
    params = searchInput;
  } else {
    return null;
  }

  const rawUrl =
    params.get("return_url") ||
    params.get("returnUrl") ||
    params.get("after_url") ||
    params.get("leaveUrl");

  const trimmed = rawUrl ? rawUrl.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Valida se a URL de retorno utiliza protocolo seguro (http/https).
 * Aceita qualquer domínio conforme solicitação de flexibilidade multi-tenant.
 * @param {unknown} url
 * @returns {boolean} True se a URL for válida e usar http ou https.
 */
export function isSafeReturnUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Tenta fechar a janela (se foi aberta via script/popup) ou redireciona a aba atual.
 * @param {string} returnUrl
 * @param {Window | object} [windowObj]
 */
export function attemptCloseOrRedirect(returnUrl, windowObj = window) {
  if (!returnUrl) return;
  try {
    if (typeof windowObj.close === "function") {
      windowObj.close();
    }
  } catch {
    /* Ignora exceções de bloqueio de fechamento pelo navegador */
  }

  if (!windowObj.closed && windowObj.location) {
    if (typeof windowObj.location.assign === "function") {
      windowObj.location.assign(returnUrl);
    } else {
      windowObj.location.href = returnUrl;
    }
  }
}

/**
 * Retorna à tela da plataforma via histórico do navegador na mesma guia ou usa URL segura.
 * @param {string | null} [returnUrl]
 * @param {Window | object} [windowObj]
 */
export function returnToPreviousOrUrl(
  returnUrl = null,
  windowObj = typeof window !== "undefined" ? window : {},
) {
  const hasHistory =
    windowObj &&
    windowObj.history &&
    typeof windowObj.history.back === "function" &&
    typeof windowObj.history.length === "number" &&
    windowObj.history.length > 1;

  if (hasHistory) {
    windowObj.history.back();
    return;
  }

  if (returnUrl && isSafeReturnUrl(returnUrl)) {
    attemptCloseOrRedirect(returnUrl, windowObj);
  }
}

/**
 * Determina se o usuário pode ser redirecionado à plataforma pós-chamada.
 * Visitantes de convites externos (inviteBound) nunca são redirecionados automaticamente.
 * @param {string | null} [effectiveReturnUrl]
 * @param {boolean} [inviteBound]
 * @param {Window | object} [windowObj]
 * @returns {boolean}
 */
function hasBrowserHistory(win) {
  return Boolean(
    win &&
    win.history &&
    typeof win.history.back === "function" &&
    typeof win.history.length === "number" &&
    win.history.length > 1,
  );
}

function parsePlatformArgs(arg1, arg2, arg3) {
  if (typeof arg1 === "boolean") {
    const targetWin = typeof arg2 === "object" && arg2 !== null ? arg2 : arg3;
    return { isInvite: arg1, explicitUrl: null, targetWin };
  }
  const explicitUrl = typeof arg1 === "string" ? arg1 : null;
  return { isInvite: Boolean(arg2), explicitUrl, targetWin: arg3 };
}

export function canReturnToPlatform(
  inviteBoundOrUrl = false,
  inviteBound = false,
  windowObj = typeof window !== "undefined" ? window : {},
) {
  const { isInvite, explicitUrl, targetWin } = parsePlatformArgs(
    inviteBoundOrUrl,
    inviteBound,
    windowObj,
  );
  if (isInvite) return false;
  if (explicitUrl && isSafeReturnUrl(explicitUrl)) return true;
  return hasBrowserHistory(targetWin);
}

/**
 * Inicia contagem regressiva de 5 segundos para retorno à plataforma pós-chamada.
 * @param {object} options
 * @param {string | null} [options.returnUrl]
 * @param {number} [options.countdownSeconds]
 * @param {number} [options.tickIntervalMs]
 * @param {(remaining: number) => void} [options.onTick]
 * @param {() => void} [options.onRedirect]
 * @param {Window | object} [options.windowObj]
 * @returns {{ cancel: () => void, executeNow: () => void, isCancelled: () => boolean }}
 */
export function startRedirectCountdown({
  returnUrl = null,
  countdownSeconds = 5,
  tickIntervalMs = 1000,
  onTick,
  onRedirect,
  windowObj = typeof window !== "undefined" ? window : {},
}) {
  let remaining = countdownSeconds;
  let cancelled = false;
  let timerId = null;

  if (typeof onTick === "function") {
    onTick(remaining);
  }

  function executeRedirect() {
    if (cancelled) return;
    if (typeof onRedirect === "function") {
      onRedirect();
    }
    returnToPreviousOrUrl(returnUrl, windowObj);
  }

  function tick() {
    if (cancelled) return;
    remaining -= 1;
    if (typeof onTick === "function") {
      onTick(remaining);
    }
    if (remaining <= 0) {
      executeRedirect();
    } else {
      timerId = setTimeout(tick, tickIntervalMs);
    }
  }

  timerId = setTimeout(tick, tickIntervalMs);

  return {
    cancel() {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
    executeNow() {
      if (cancelled) return;
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      executeRedirect();
    },
    isCancelled() {
      return cancelled;
    },
  };
}
