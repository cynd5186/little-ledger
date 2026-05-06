// Vercel Serverless Function: /api/ping
//
// Drop this file into your project at: api/ping.js  (project root, NOT inside src)
//
// Returns 200 quickly so the client can detect "is the cloud sync backend
// available?" The Little Ledger client falls back to localStorage-only mode
// if this returns 404 (e.g., running as static-only deploy with no API).

export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    serverTime: new Date().toISOString(),
  });
}
