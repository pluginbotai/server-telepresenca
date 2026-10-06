import { createOperatorRuntime } from "./runtime.js";
import { attachMockHandlers } from "./mock.js";
import { attachCapabilitiesUi } from "./capabilities-ui.js";
import { attachConnectedUi } from "./connected-ui.js";
import { attachDynamicText } from "./dynamic-text.js";
import { attachCallSetup } from "./call-setup.js";
import { bindOperatorUi } from "./bind-ui.js";
import { connectOperator } from "./connect.js";
import { disconnectOperator } from "./session-end.js";

/**
 * @param {object} options
 * @param {ReturnType<import("../ui/dom.js").queryDom>} options.els
 * @param {import("../i18n/index.js").i18n} options.i18n
 * @param {typeof io} options.ioClient
 */
export function createOperator(options) {
  const runtime = createOperatorRuntime(options);
  attachMockHandlers(runtime);
  attachCapabilitiesUi(runtime);
  attachConnectedUi(runtime);
  attachDynamicText(runtime);
  attachCallSetup(runtime);

  return {
    bind: () => bindOperatorUi(runtime),
    connect: (opts) => connectOperator(runtime, opts),
    disconnect: (opts) => disconnectOperator(runtime, opts),
    roomId: runtime.roomId,
  };
}
