// server.cjs (CommonJS entry point for Hostinger)
const { register } = require("node:module");
const fs = require("fs");
const path = require("path");

// Set production environment by default for Hostinger
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = process.env.PORT || "3000";

console.log(`[SERVER.CJS] Starting in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`);

// Register tsx to handle .ts files on the fly
try {
  register("tsx/esm", {
    parentURL: `file://${__filename}`,
  });
  console.log("[SERVER.CJS] tsx/esm registered successfully.");
} catch (err) {
  console.error("[SERVER.CJS] Failed to register tsx/esm:", err);
}

// Import the main server (ESM)
import("./server.ts").then(() => {
  console.log("[SERVER.CJS] server.ts imported successfully.");
}).catch(err => {
  console.error("[SERVER.CJS] Error importing server.ts:", err);
});
