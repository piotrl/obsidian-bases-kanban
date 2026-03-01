export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "main.js",
      "esbuild.config.mjs",
      "version-bump.mjs",
      "versions.json"
    ]
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-unused-vars": "off"
    }
  }
];
