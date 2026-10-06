import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  COMPACT_MAX_WIDTH_PX,
  COMPACT_MEDIA_QUERY,
} from "../../public/js/ui/viewport-mode.js";

test("viewport compact breakpoint matches Jitsi-style narrow toolbar threshold", () => {
  assert.equal(COMPACT_MAX_WIDTH_PX, 520);
  assert.equal(COMPACT_MEDIA_QUERY, "(max-width: 520px)");
});
