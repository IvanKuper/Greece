const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "public/assets/**",
      "node_modules/**",
      "storage/**",
      "*.min.js",
    ],
  },
  js.configs.recommended,
  {
    // Default: Node/CommonJS scripts (backend, tests, tooling).
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      // Best-effort try/catch (e.g. audit logging, IPv4 DNS fallback) is an
      // intentional pattern throughout this codebase - a failure there must
      // never break the primary operation.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": [
        "warn",
        { args: "none", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // e2e/run.js is a Node script, but its puppeteer page.evaluate()
    // callbacks execute inside the browser, so both global sets apply.
    files: ["e2e/**/*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser },
    },
  },
  {
    // crm.js's top-level functions are invoked from inline onclick="..."
    // attributes inside generated HTML strings, which ESLint can't trace -
    // that makes every one of them a false-positive "unused" warning.
    files: ["public/crm.js"],
    rules: {
      "no-unused-vars": "off",
    },
  },
];
