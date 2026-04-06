// server.cjs (CommonJS entry point for Hostinger)
const { register } = require("node:module");
const fs = require("fs");
const path = require("path");

// Set production environment by default for Hostinger
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = process.env.PORT || "3000";

const logFile = path.join(__dirname, "server.log");
const log = (msg) => {
  const line = `[${new Date().toISOString()}] [CJS] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
};

log(`Starting in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`);
log(`Node version: ${process.version}`);
log(`Directory: ${__dirname}`);

// Register tsx to handle .ts files on the fly
try {
  register("tsx/esm", {
    parentURL: `file://${__filename}`,
  });
  log("tsx/esm registered successfully.");
} catch (err) {
  log(`Failed to register tsx/esm: ${err.message}`);
}

// Import the main server (ESM)
import("./server.ts").then(() => {
  log("server.ts imported successfully.");
}).catch(err => {
  log(`Error importing server.ts: ${err.message}`);
});
