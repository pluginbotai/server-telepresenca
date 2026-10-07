import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { blocksGameKeyboardShortcuts } from "../../public/js/ui/game-keyboard.js";

function mockInput(type) {
  return {
    tagName: "INPUT",
    getAttribute(name) {
      return name === "type" ? type : null;
    },
    isContentEditable: false,
  };
}

test("range sliders do not block game keyboard shortcuts", () => {
  assert.equal(blocksGameKeyboardShortcuts(mockInput("range")), false);
});

test("text fields block game keyboard shortcuts", () => {
  assert.equal(blocksGameKeyboardShortcuts(mockInput("text")), true);
  assert.equal(blocksGameKeyboardShortcuts({ tagName: "TEXTAREA" }), true);
});
