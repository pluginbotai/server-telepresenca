import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  mountAppComponents,
  mountLangMenu,
  mountQualityPanel,
  mountEndedOverlay,
  mountInviteOverlay,
} from "../../public/js/ui/components.js";

test("mountLangMenu generates localized option buttons into langMenu", () => {
  const container = { innerHTML: "", children: [] };
  mountLangMenu(container);
  assert.ok(container.innerHTML.includes('data-locale="pt-BR"'), "Must include pt-BR");
  assert.ok(container.innerHTML.includes('data-locale="en"'), "Must include en");
  assert.ok(container.innerHTML.includes('data-locale="es"'), "Must include es");
  assert.ok(container.innerHTML.includes('data-locale="fr"'), "Must include fr");
  assert.ok(
    container.innerHTML.includes("assets/flags/br.png"),
    "Must include flag image",
  );
});

test("mountQualityPanel creates header, slider track, thumb, and ticks container", () => {
  const container = { innerHTML: "" };
  mountQualityPanel(container);
  assert.ok(
    container.innerHTML.includes('id="qualitySlider"'),
    "Must create qualitySlider",
  );
  assert.ok(
    container.innerHTML.includes('id="qualityTrackFill"'),
    "Must create qualityTrackFill",
  );
  assert.ok(
    container.innerHTML.includes('id="qualityThumb"'),
    "Must create qualityThumb",
  );
  assert.ok(
    container.innerHTML.includes('id="qualityTicks"'),
    "Must create qualityTicks",
  );
  assert.ok(
    container.innerHTML.includes('id="btnCloseQuality"'),
    "Must create btnCloseQuality",
  );
});

test("mountEndedOverlay creates card with title, redirectCountdown, and btnRejoin", () => {
  const container = { innerHTML: "" };
  mountEndedOverlay(container);
  assert.ok(container.innerHTML.includes('id="endedTitle"'), "Must create endedTitle");
  assert.ok(
    container.innerHTML.includes('id="redirectCountdown"'),
    "Must create redirectCountdown",
  );
  assert.ok(container.innerHTML.includes('id="btnRejoin"'), "Must create btnRejoin");
  assert.ok(
    container.innerHTML.includes("assets/icons.svg#icon-ended-alert"),
    "Must use alert icon",
  );
});

test("mountInviteOverlay creates logo, overlay text, identify form, input, error, and enter button", () => {
  const container = { innerHTML: "" };
  mountInviteOverlay(container);
  assert.ok(container.innerHTML.includes('id="inviteLogo"'), "Must create inviteLogo");
  assert.ok(
    container.innerHTML.includes('id="inviteOverlayText"'),
    "Must create inviteOverlayText",
  );
  assert.ok(
    container.innerHTML.includes('id="identifyForm"'),
    "Must create identifyForm",
  );
  assert.ok(
    container.innerHTML.includes('id="identifyInput"'),
    "Must create identifyInput",
  );
  assert.ok(
    container.innerHTML.includes('id="identifyError"'),
    "Must create identifyError",
  );
  assert.ok(
    container.innerHTML.includes('id="inviteEnter"'),
    "Must create inviteEnter",
  );
});

test("mountAppComponents is idempotent and does not recreate if already populated", () => {
  const langMenu = { innerHTML: "" };
  const qualityPanel = { innerHTML: "" };
  const endedOverlay = { innerHTML: "" };
  const inviteOverlay = { innerHTML: "" };

  const root = {
    getElementById(id) {
      if (id === "langMenu") return langMenu;
      if (id === "qualityPanel") return qualityPanel;
      if (id === "endedOverlay") return endedOverlay;
      if (id === "inviteOverlay") return inviteOverlay;
      return null;
    },
  };

  mountAppComponents(root);
  const initialHtml = langMenu.innerHTML;
  assert.ok(initialHtml.length > 0);

  // Second run: should remain unchanged
  mountAppComponents(root);
  assert.equal(langMenu.innerHTML, initialHtml);
});
