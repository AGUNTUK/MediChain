// Universal entry point for Node, Docker, and Vercel ES Module runtimes
process.env.VERCEL = "1";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let app;
try {
  const mod = require("./dist/server.cjs");
  app = (mod && mod.default) ? mod.default : (mod && mod.app ? mod.app : mod);
} catch (err) {
  console.error("[MediChain Serverless Load Error]", err);
  app = (req, res) => {
    res.status(503).json({
      error: "Server initializing, please retry momentarily.",
      details: err?.message || String(err)
    });
  };
}

export default app;
