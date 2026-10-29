// Universal entry point for Node, Docker, and Vercel ES Module runtimes
process.env.VERCEL = process.env.VERCEL || (process.env.NOW_REGION ? "1" : "");

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let app;
try {
  app = require("./dist/server.cjs");
  if (app && app.default) {
    app = app.default;
  }
} catch (err) {
  app = (req, res) => {
    res.status(503).json({ error: "Server initializing, please retry momentarily." });
  };
}

export default app;
