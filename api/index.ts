process.env.VERCEL = process.env.VERCEL || "1";
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    return (app as any)(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Function Error]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        error: "সার্ভারে সাময়িক সমস্যা দেখা দিয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
        details: err?.message || "Internal serverless invocation error"
      }));
    }
  }
}
