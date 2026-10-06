import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "../helpers/test.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const spritePath = path.join(rootDir, "public", "assets", "icons.svg");
const indexPath = path.join(rootDir, "public", "index.html");

test("icons.svg sprite exists and contains valid svg symbols", () => {
  assert.ok(fs.existsSync(spritePath), "public/assets/icons.svg must exist");
  const content = fs.readFileSync(spritePath, "utf8");
  assert.ok(content.includes("<svg"), "Sprite must contain <svg tag");
  assert.ok(content.includes("</svg>"), "Sprite must contain </svg> closing tag");

  const symbolIds = [...content.matchAll(/<symbol\s+[^>]*id="([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.ok(symbolIds.length >= 10, "Sprite must define at least 10 icon symbols");
  assert.ok(symbolIds.includes("icon-mic"), "Must define icon-mic");
  assert.ok(symbolIds.includes("icon-cam"), "Must define icon-cam");
  assert.ok(symbolIds.includes("icon-hangup"), "Must define icon-hangup");
  assert.ok(symbolIds.includes("icon-ring"), "Must define icon-ring");
  assert.ok(symbolIds.includes("icon-quality"), "Must define icon-quality");
  assert.ok(symbolIds.includes("icon-screen-share"), "Must define icon-screen-share");
  assert.ok(symbolIds.includes("icon-quick-volume"), "Must define icon-quick-volume");
  assert.ok(
    symbolIds.includes("icon-quick-flashlight"),
    "Must define icon-quick-flashlight",
  );
  assert.ok(
    symbolIds.includes("icon-quick-emotions"),
    "Must define icon-quick-emotions",
  );
});

test("index.html references defined symbols from icons.svg without broken links", () => {
  assert.ok(fs.existsSync(indexPath), "public/index.html must exist");
  assert.ok(fs.existsSync(spritePath), "public/assets/icons.svg must exist");

  const indexContent = fs.readFileSync(indexPath, "utf8");
  const spriteContent = fs.readFileSync(spritePath, "utf8");
  const symbolIds = new Set(
    [...spriteContent.matchAll(/<symbol\s+[^>]*id="([^"]+)"/g)].map((m) => m[1]),
  );

  const referencedIcons = [
    ...indexContent.matchAll(/(?:href|xlink:href)="assets\/icons\.svg#([^"]+)"/g),
  ].map((m) => m[1]);

  assert.ok(
    referencedIcons.length > 0,
    "index.html must reference icons from icons.svg",
  );
  for (const iconId of referencedIcons) {
    assert.ok(
      symbolIds.has(iconId),
      `Referenced icon '${iconId}' must be defined in icons.svg`,
    );
  }
});
