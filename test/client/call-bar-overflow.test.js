import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "../helpers/test.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = path.join(rootDir, "public");

test("index.html defines compact call bar overflow shell", () => {
  const indexHtml = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  assert.ok(indexHtml.includes('id="callBarExtra"'), "Must group secondary call controls");
  assert.ok(indexHtml.includes('id="btnCallOverflow"'), "Must expose overflow trigger");
  assert.ok(indexHtml.includes('id="callOverflowDrawer"'), "Must expose overflow drawer");
  assert.ok(indexHtml.includes("icon-overflow"), "Must reference overflow icon");
});

test("call-bar-overflow.css hides extra controls and full-width bar below 520px", () => {
  const css = fs.readFileSync(
    path.join(publicDir, "css/call-bar-overflow.css"),
    "utf8",
  );
  assert.match(css, /@media\s*\(max-width:\s*520px\)/, "Must use 520px compact breakpoint");
  assert.match(
    css,
    /@media\s*\(max-width:\s*520px\)[\s\S]*\.call-bar-extra[\s\S]*display:\s*block/,
    "Compact mode must override display:contents so extras stay off the toolbar",
  );
  assert.match(css, /\.call-bar-extra[\s\S]*clip:\s*rect/, "Must visually hide but keep extra controls");
  assert.match(css, /\.call-overflow-trigger[\s\S]*display:\s*grid/, "Must show overflow trigger");
});
