// server.cjs (Ultra-compatible entry point for Hostinger)
const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "server.log");
function log(msg) {
  const line = "[" + new Date().toISOString() + "] [CJS-START] " + msg + "\n";
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {
    // Silent fail if log file is unwritable
  }
}

log("--- STARTUP INITIATED ---");
log("Node Version: " + process.version);
log("Dirname: " + __dirname);

try {
  // Use standard require without node: prefix for older versions
  const mod = require("module");
  const url = require("url");

  if (mod && typeof mod.register === "function") {
    log("Registering tsx/esm loader...");
    mod.register("tsx/esm", {
      parentURL: url.pathToFileURL(__filename).toString(),
    });
    log("Loader registered. Importing server.ts...");
    
    import("./server.ts")
      .then(() => log("server.ts import successful."))
      .catch(err => log("CRITICAL: server.ts import failed: " + err.message));
  } else {
    log("CRITICAL: module.register is not a function. Node version might be too old for tsx/esm.");
    log("Attempting to run server.ts directly with tsx if available...");
  }
} catch (err) {
  log("CRITICAL: Startup error: " + err.message);
}
