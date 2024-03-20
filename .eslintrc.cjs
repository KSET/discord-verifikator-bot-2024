module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:@typescript-eslint/strict-type-checked",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: [
    "prettier",
    "simple-import-sort",
    "import",
    "@typescript-eslint",
    "@stylistic/js",
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        args: "after-used",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "none",
      },
    ],
    "@typescript-eslint/member-delimiter-style": ["error"],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "no-redeclare": "off",
    "@typescript-eslint/no-redeclare": ["error"],
    "@typescript-eslint/no-var-requires": "off",

    "no-lone-blocks": "off",
    camelcase: [
      "error",
      {
        ignoreDestructuring: true,
      },
    ],
    curly: ["error", "all"],
    "dot-notation": "error",
    eqeqeq: ["error", "always"],
    "guard-for-in": "error",
    "@stylistic/js/linebreak-style": ["error", "unix"],
    "no-array-constructor": "error",
    "no-bitwise": "error",
    "@stylistic/js/no-mixed-operators": "error",
    "no-multi-assign": "error",
    "no-console": ["warn"],
    "no-nested-ternary": "error",
    "no-new-func": "error",
    "@stylistic/js/no-tabs": "warn",
    "no-new-wrappers": "error",
    "no-return-assign": ["error", "always"],
    "no-script-url": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-useless-constructor": "error",
    "object-shorthand": ["error", "always"],
    "prefer-arrow-callback": "warn",
    "prefer-const": "warn",
    "prefer-destructuring": [
      "warn",
      {
        array: true,
        object: true,
      },
      {
        enforceForRenamedProperties: false,
      },
    ],
    "prefer-numeric-literals": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "warn",
    "prefer-template": "warn",
    "@stylistic/js/wrap-iife": ["error", "inside"],

    "prettier/prettier": "error",

    "sort-imports": "off",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
  },
};
