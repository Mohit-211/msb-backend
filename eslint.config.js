// ESLint flat config. Run it with `npm run lint`.
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "public/uploads/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      // Express hands every handler (req, res, next), and most use only some of them.
      "no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^(req|res|next|_)", caughtErrors: "none" },
      ],
    },
  },
];
