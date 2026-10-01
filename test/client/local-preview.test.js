import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "../helpers/test.js";
import { shouldShowLocalPreview } from "../../public/js/media/local-preview.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = path.join(root, "public");

test("shouldShowLocalPreview requires live call, camera on, and no dismiss", () => {
  assert.equal(
    shouldShowLocalPreview({
      connected: true,
      dismissed: false,
      camEnabled: true,
      hasLocalVideo: true,
    }),
    true,
  );
  assert.equal(
    shouldShowLocalPreview({
      connected: false,
      dismissed: false,
      camEnabled: true,
      hasLocalVideo: true,
    }),
    false,
  );
  assert.equal(
    shouldShowLocalPreview({
      connected: true,
      dismissed: true,
      camEnabled: true,
      hasLocalVideo: true,
    }),
    false,
  );
  assert.equal(
    shouldShowLocalPreview({
      connected: true,
      dismissed: false,
      camEnabled: false,
      hasLocalVideo: true,
    }),
    false,
  );
  assert.equal(
    shouldShowLocalPreview({
      connected: true,
      dismissed: false,
      camEnabled: true,
      hasLocalVideo: false,
    }),
    false,
  );
});

test("operator index exposes local preview shell for PiP", () => {
  const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  assert.ok(html.includes('id="localPreview"'));
  assert.ok(html.includes('id="localPreviewVideo"'));
  assert.ok(html.includes('id="btnLocalPreviewClose"'));
  const style = fs.readFileSync(path.join(publicDir, "style.css"), "utf8");
  assert.ok(style.includes("local-preview.css"));
});
