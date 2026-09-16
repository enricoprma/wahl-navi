const eslint = require("@eslint/js");
const angular = require("angular-eslint");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [".angular/**", "coverage/**", "dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...angular.configs.tsRecommended,
  {
    files: ["src/**/*.ts"],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      // Disabled pending the upstream parser issue triggered by Angular's template processor.
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  ...angular.configs.templateRecommended,
  ...angular.configs.templateAccessibility,
  prettier,
];
