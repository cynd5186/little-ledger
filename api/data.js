// Vercel Serverless Function: /api/data
//
// Drop this file into your project at: api/data.js  (project root, NOT inside src)
// Vercel auto-detects any file in a top-level /api/ folder and turns it into
// an HTTP endpoint — works alongside Vite, Next.js, or any other framework.
//
// Endpoints (single file, dispatches by HTTP method):
//   GET    /api/data?ns=ABC123&key=solene:events  → returns { value }
//   GET    /api/data?ns=ABC123                    → returns { keys, updatedAt }
//   PUT    /api/data?ns=ABC123&key=solene:events  → body = { value }
//   DELETE /api/data?ns=ABC123&key=solene:events  → removes the key
//
// Storage backend: Vercel KV (Redis). Each (ns, key) tuple becomes a single
// KV entry under the composite key `ll:{ns}:{key}`.
//
// Setup once:
//   1. Vercel dashboard → your project → Storage → Create Database → KV
//   2. Click "Connect to Project" — env vars get added automatically
//   3. Install client lib: `npm install @vercel/kv`
//   4. Redeploy

import { kv } from "@vercel/kv";

// Namespace = 6-char [A-Z0-9] family code. ~2.2 billion possibilities, fine
// for a personal-app shared-secret. Avoid 0/O/1/I in client-side generation.
const NS_REGEX = /^[A-Z0-9]{6}$/;

// Key = solene:* — prevents arbitrary key abuse
const KEY_REGEX = /^solene:[a-zA-Z0-9_:.\-]+$/;

const compositeKey = (ns, key) => `ll:${ns}:${key}`;
const indexKey = (ns) => `ll:${ns}:__index`;
const tsKey = (ns) => `ll:${ns}:__updatedAt`;

async function touchNamespace(ns) {
  await kv.set(tsKey(ns), Date.now());
}

// Single default export — Vercel Serverless Function signature.
// `req` is a Node IncomingMessage with .query parsed; `res` is the response.
export default async function handler(req, res) {
  const ns = req.query.ns;
  const key = req.query.key;

  if (!ns || !NS_REGEX.test(ns)) {
    return res.status(400).json({ error: "Invalid or missing namespace" });
  }

  try {
    if (req.method === "GET") {
      // List operation — no key
      if (!key) {
        const keys = (await kv.smembers(indexKey(ns))) || [];
        const updatedAt = (await kv.get(tsKey(ns))) || 0;
        return res.status(200).json({ keys, updatedAt });
      }
      if (!KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Invalid key" });
      }
      const value = await kv.get(compositeKey(ns, key));
      return res.status(200).json({ value: value == null ? null : value });
    }

    if (req.method === "PUT") {
      if (!key || !KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Invalid key" });
      }
      // Vercel parses JSON bodies automatically when Content-Type is set
      const body = req.body;
      if (!body || !("value" in body)) {
        return res.status(400).json({ error: "Body must include a 'value' field" });
      }
      await kv.set(compositeKey(ns, key), body.value);
      await kv.sadd(indexKey(ns), key);
      await touchNamespace(ns);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      if (!key || !KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Invalid key" });
      }
      await kv.del(compositeKey(ns, key));
      await kv.srem(indexKey(ns), key);
      await touchNamespace(ns);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[/api/data]", err);
    return res.status(500).json({ error: "Storage operation failed" });
  }
}
