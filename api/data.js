// Vercel Serverless Function: /api/data
//
// Drop this file into your project at: api/data.js  (project root, NOT inside src)
// Vercel auto-detects any file in a top-level /api/ folder and turns it into
// an HTTP endpoint.
//
// Endpoints (single file, dispatches by HTTP method):
//   GET    /api/data?ns=ABC123&key=solene:events  → returns { value }
//   GET    /api/data?ns=ABC123                    → returns { keys, updatedAt }
//   PUT    /api/data?ns=ABC123&key=solene:events  → body = { value }
//   DELETE /api/data?ns=ABC123&key=solene:events  → removes the key
//
// Storage backend: Upstash Redis (via Vercel marketplace).
//
// Setup once:
//   1. Vercel dashboard → Storage → Create Database → Upstash → Redis
//   2. After creation, the database page → Projects tab → Connect to little-ledger
//   3. Locally: `npm install @upstash/redis`
//   4. Redeploy

import { Redis } from "@upstash/redis";

// Reads env vars that Vercel injects when the database is connected to the
// project (KV_REST_API_URL, KV_REST_API_TOKEN, or UPSTASH_-prefixed versions).
const redis = Redis.fromEnv();

// 6-char [A-Z0-9] family code. ~2.2B possibilities — fine for a personal app.
const NS_REGEX = /^[A-Z0-9]{6}$/;

// Keys must be solene:* — prevents arbitrary key abuse
const KEY_REGEX = /^solene:[a-zA-Z0-9_:.\-]+$/;

const compositeKey = (ns, key) => `ll:${ns}:${key}`;
const indexKey = (ns) => `ll:${ns}:__index`;
const tsKey = (ns) => `ll:${ns}:__updatedAt`;

async function touchNamespace(ns) {
  await redis.set(tsKey(ns), Date.now());
}

export default async function handler(req, res) {
  const ns = req.query.ns;
  const key = req.query.key;

  if (!ns || !NS_REGEX.test(ns)) {
    return res.status(400).json({ error: "Invalid or missing namespace" });
  }

  try {
    if (req.method === "GET") {
      if (!key) {
        const keys = (await redis.smembers(indexKey(ns))) || [];
        const updatedAt = (await redis.get(tsKey(ns))) || 0;
        return res.status(200).json({ keys, updatedAt });
      }
      if (!KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Invalid key" });
      }
      const value = await redis.get(compositeKey(ns, key));
      return res.status(200).json({ value: value == null ? null : value });
    }

    if (req.method === "PUT") {
      if (!key || !KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Invalid key" });
      }
      const body = req.body;
      if (!body || !("value" in body)) {
        return res.status(400).json({ error: "Body must include a 'value' field" });
      }
      await redis.set(compositeKey(ns, key), body.value);
      await redis.sadd(indexKey(ns), key);
      await touchNamespace(ns);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      if (!key || !KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Invalid key" });
      }
      await redis.del(compositeKey(ns, key));
      await redis.srem(indexKey(ns), key);
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
