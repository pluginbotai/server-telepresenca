import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import jsdoc from "eslint-plugin-jsdoc";
import n from "eslint-plugin-n";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import prettier from "eslint-config-prettier";
import globals from "globals";
import requireTests from "./eslint/plugin-require-tests.js";
import testQuality from "./eslint/plugin-test-quality.js";

const publicJs = ["public/js/**/*.js"];
const nodeJs = [
  "src/**/*.js",
  "server.js",
  "scripts/**/*.mjs",
  "scripts/**/*.js",
  "test/**/*.js",
  "eslint.config.js",
  "eslint/**/*.js",
];

/** Process/DOM glue: not unit-tested. New logic modules are not exempt. */
const glueWithoutUnitTests = [
  "src/index.js",
  "src/signaling/**",
  "public/js/main.js",
  "public/js/operator.js",
  "public/js/operator/**",
  "public/js/joystick.js",
  "public/js/joystick-bind.js",
  "public/js/joystick-motion.js",
  "public/js/head-look-bind.js",
  "public/js/head-look-pointer.js",
  "public/js/features/locomotion-keyboard.js",
  "public/js/features/locomotion-speed-ui.js",
  "public/js/features/locomotion-speed-state.js",
  "public/js/ui/**",
  "public/js/media/**",
  "public/js/signaling/**",
  "public/js/webrtc/peer.js",
  "public/js/webrtc/peer-connection.js",
  "public/js/webrtc/peer-signaling.js",
  "public/js/webrtc/peer-remote-playback.js",
  "public/js/webrtc/peer-track.js",
  "public/js/webrtc/peer-cleanup.js",
  "src/signaling/handlers-room.js",
  "src/signaling/handlers-join.js",
  "public/js/ui/drawer-controller.js",
  "public/js/ui/drawer-labels.js",
  "public/js/ui/drawer-interaction.js",
  "public/js/features/locomotion-speed-sync.js",
  "public/js/features/locomotion-hints.js",
  "public/js/features/volume-icons.js",
  "public/js/features/volume-sync-ui.js",
  "public/js/features/volume-state.js",
  "public/js/features/volume-mount.js",
  "public/js/media/local-refresh.js",
  "public/js/media/local-peer.js",
  "public/js/media/local-capture.js",
  "public/js/media/local-toggles.js",
  "public/js/features/volume-state-methods.js",
  "public/js/features/head-keyboard.js",
  "public/js/features/head-pose.js",
  "public/js/features/head-preview.js",
  "public/js/features/head-status.js",
  "public/js/features/head-mount.js",
  "public/js/features/video-quality-panel.js",
  "public/js/features/video-quality-slider.js",
  "public/js/features/video-quality-panel-ui.js",
  "public/js/features/video-quality-mount.js",
  "public/js/head-edge-sliders-init.js",
  "public/js/head-edge-math.js",
  "public/js/head-edge-rail.js",
  "public/js/head-edge-pointer.js",
  "public/js/head-edge-sliders-api.js",
  "public/js/webrtc/ice.js",
];

export default [
  {
    ignores: ["node_modules/**", "reports/**", "public/assets/**"],
  },
  js.configs.recommended,
  {
    ...n.configs["flat/recommended-module"],
    files: nodeJs,
  },
  {
    files: nodeJs,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "n/prefer-node-protocol": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js", "eslint/**/*.js", "test/**/*.js"],
    rules: {
      "n/no-unpublished-import": "off",
      "n/no-process-exit": "off",
      "n/hashbang": "off",
    },
  },
  {
    files: publicJs,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        io: "readonly",
      },
    },
  },
  {
    plugins: { jsdoc, security, sonarjs },
    rules: {
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-nested-callbacks": ["error", 4],
      "max-params": ["error", 4],
      "sonarjs/cognitive-complexity": ["error", 15],
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-unsafe-regex": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: publicJs,
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "protocol", pattern: "public/js/protocol/*" },
        { type: "feature", pattern: "public/js/features/*" },
        { type: "webrtc", pattern: "public/js/webrtc/*" },
        { type: "media", pattern: "public/js/media/*" },
        { type: "ui", pattern: "public/js/ui/*" },
        { type: "signaling", pattern: "public/js/signaling/*" },
        { type: "i18n", pattern: "public/js/i18n/*" },
        { type: "joystick", pattern: "public/js/joystick.js" },
        { type: "headLook", pattern: "public/js/head-look.js" },
        { type: "headEdge", pattern: "public/js/head-edge-sliders.js" },
        { type: "operator", pattern: "public/js/operator" },
        { type: "operator", pattern: "public/js/operator.js" },
        { type: "invite", pattern: "public/js/invite/*" },
        { type: "main", pattern: "public/js/main.js" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message:
            "${file.type} must not import ${dependency.type} (capability widgets cannot touch WebRTC)",
          rules: [
            { from: "protocol", allow: [] },
            {
              from: "feature",
              allow: [
                "protocol",
                "signaling",
                "ui",
                "i18n",
                "joystick",
                "headLook",
                "headEdge",
              ],
            },
            { from: "webrtc", allow: ["protocol", "signaling"] },
            { from: "media", allow: [] },
            { from: "ui", allow: [] },
            { from: "signaling", allow: ["protocol"] },
            { from: "i18n", allow: [] },
            { from: "invite", allow: ["invite", "i18n"] },
            { from: "joystick", allow: [] },
            { from: "headLook", allow: ["protocol"] },
            {
              from: "operator",
              allow: [
                "feature",
                "protocol",
                "signaling",
                "ui",
                "webrtc",
                "media",
                "i18n",
                "invite",
              ],
            },
            { from: "main", allow: ["operator", "ui", "i18n", "invite"] },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.js", "public/js/**/*.js"],
    ignores: glueWithoutUnitTests,
    plugins: { "require-tests": requireTests },
    rules: {
      "require-tests/imported-from-test": "error",
    },
  },
  {
    files: ["test/**/*.test.js"],
    plugins: { "test-quality": testQuality },
    rules: {
      "n/prefer-import/assert-strict": "error",
      "test-quality/use-node-test": "error",
      "test-quality/use-strict-assert": "error",
      "test-quality/has-test": "error",
      "test-quality/require-assertions": "error",
      "test-quality/no-focused": "error",
      "test-quality/no-disabled": "error",
      "test-quality/unique-titles": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:test", "**/helpers/harness.js", "**/test/run.js"],
              message:
                "Import { test } from ../helpers/test.js so npm test runs on Node 16. Files are discovered automatically.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["test/**/*.js", "scripts/**/*.mjs", "eslint/**/*.js"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      complexity: "off",
      "sonarjs/cognitive-complexity": "off",
    },
  },
  prettier,
];
