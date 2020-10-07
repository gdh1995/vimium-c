"use strict";

module.exports = {
  input: ".", // e.g. "content/frontend.js"
  preserveSymlinks: true,
  treeshake: {
    moduleSideEffects: true,
    propertyReadSideEffects: false,
  },
  output: {
    file: "dist/", // e.g. "dist/content/vimium-c.js"
    freeze: false,
    format: "iife",
    esModule: false,
    exports: "none",
    extend: false,
    externalLiveBindings: false,
    strict: true,
  },
  onwarn (warning, rollupWarn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      rollupWarn(warning);
    }
  },
}
