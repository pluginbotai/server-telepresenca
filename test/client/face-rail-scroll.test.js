import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "../helpers/test.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("drawer-expressions.css enables native horizontal pan on touch devices", () => {
  const css = fs.readFileSync(
    path.join(rootDir, "public/css/drawer-expressions.css"),
    "utf8",
  );
  assert.match(css, /\.robot-drawer-face-rail[\s\S]*touch-action:\s*pan-x/);
  assert.match(
    css,
    /\.robot-drawer-face-tile[\s\S]*touch-action:\s*manipulation/,
    "Tiles use manipulation so taps are not swallowed by horizontal pan",
  );
  assert.match(
    css,
    /@media\s*\(pointer:\s*coarse\)[\s\S]*\.robot-drawer-face-scroll[\s\S]*display:\s*none/,
    "Mobile relies on swipe, not overlay arrows",
  );
  assert.match(
    css,
    /\.robot-drawer-face-rail-wrap\.can-scroll-left[\s\S]*\.robot-drawer-face-scroll--prev/,
    "Prev chevron only appears when there is content to the left",
  );
  assert.doesNotMatch(
    css,
    /\.robot-drawer-face-rail-wrap[\s\S{0,120}]*display:\s*flex[\s\S{0,80}]*gap:/,
    "Rail wrap avoids flex gap that reserves space for hidden prev button",
  );
});

test("face rail scroll module exports bindFaceRailScroll", async () => {
  const mod = await import("../../public/js/ui/face-rail-scroll.js");
  assert.equal(typeof mod.bindFaceRailScroll, "function");
  const wrap = {
    classList: { toggle() {} },
    querySelector() {
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const cleanup = mod.bindFaceRailScroll(wrap);
  assert.equal(typeof cleanup, "function");
  cleanup();
});
