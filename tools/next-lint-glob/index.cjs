"use strict";

/* eslint @typescript-eslint/no-require-imports: ["error", { allow: ["^tinyglobby$", "^node:path$"] }] -- Next's CJS plugin needs this synchronous CommonJS entry point. */

const { globSync } = require("tinyglobby");
const { isAbsolute } = require("node:path");

// Only the API used by the pinned Next lint plugin; reject new usage until reviewed.
exports.globSync = (pattern, options) => {
  if (typeof pattern !== "string" || options?.onlyDirectories !== true ||
      Object.keys(options).some((key) => key !== "onlyDirectories")) {
    throw new TypeError("Unsupported Next lint glob operation");
  }
  return globSync(pattern, {
    onlyDirectories: true,
    // fast-glob matches a literal directory itself instead of expanding its children.
    expandDirectories: false,
    absolute: isAbsolute(pattern),
  });
};
