// server.cjs (CommonJS entry point for Hostinger)
const { register } = require("node:module");
const path = require("path");

// Register tsx to handle .ts files on the fly
register("tsx/esm", {
  parentURL: `file://${__filename}`,
});

// Import the main server (ESM)
import("./server.ts").catch(err => {
  console.error("[SERVER.CJS] Error importing server.ts:", err);
});
