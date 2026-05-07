import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Moon, Sun, Droplet, Milk, Baby, Clock, AlertCircle,
  ChevronRight, Plus, X, Check, Wind, Edit3, Calendar,
  Bell, Trash2, Cloud, Heart, Sparkles, Bath, ShoppingBag,
  Play, Pause, RotateCcw, Flame, Package, Coffee, Timer, MapPin,
  BookOpen, Stethoscope, FileText, Copy, Printer, MessageSquare, Star,
  ArrowRightLeft, Gift, Volume2, AlarmClock,
} from "lucide-react";

// ---- App identity ------------------------------------------------------
// Little Ledger — a journal of care, rhythm & handoff for Solène.
// Versions are date-stamped (YYYY.MM.DD). When multiple builds ship in one
// day, append a letter: 2026.05.05a, 2026.05.05b, etc.
const APP_NAME = "Little Ledger";
const APP_SUBTITLE = "for Solène";
const APP_VERSION = "2026.05.05aw";
// Notes for THIS build, shown in the About panel of the Profile Switcher modal.
// Keep to a couple of lines per item — these are personal release notes, not
// a full changelog. The full changelog lives in CHANGELOG below.
const APP_BUILD_NOTES = [
  "Bank: Edit any transaction (debt/gift/payback) — pencil icon next to remove",
  "Redeem gift: clearer preview explaining what auto-adjusts and when",
  "Today/tomorrow gift redemptions auto-swap shifts immediately · day 3+ surface a note",
];
// CHANGELOG — newest first. Each entry is { version, date, summary }.
const APP_CHANGELOG = [
  { version: "2026.05.05aw", summary: "Edit Bank transactions · clearer redeem preview · far-future caveat" },
  { version: "2026.05.05av", summary: "Tappable peek strip · sleep time picker · Wellness trim · Journal collapse · less landing page noise" },
  { version: "2026.05.05au", summary: "Future peek strip · Today day plan collapsed by default" },
  { version: "2026.05.05at", summary: "Bank tab · on-site moves to Now · diaper labels restored · auto-adjustments collapsed" },
  { version: "2026.05.05as", summary: "Schedule tab redesign · Day plan · Upcoming filters" },
  { version: "2026.05.05ar", summary: "Wellness chart: daily intake 14-day trend with stats" },
  { version: "2026.05.05aq", summary: "Sleep tile rename · top-level tomorrow pip · mot du jour cleanup" },
  { version: "2026.05.05ap", summary: "Declutter quadrants and pump-overdue button" },
];


// ---- Age-based normative ranges ----------------------------------------
// Conservative ranges from common pediatric guidance for term, healthy infants.
// Used in the Visit prep snapshot to flag things as "in range" / "above" /
// "below" so the user can read them quickly while talking to the pediatrician.
// These are general references, not medical advice — flagging is informational.
//
// Each range returns { feedsPerDay, ozPerDay, sleepStretchH (typical longest at night),
// totalSleepH, diapersPerDay, formula: { feedsPerDay, ozPerDay } }.
// We pick the band by age in months (using whole-month buckets).
function getAgeNorms(ageMonths) {
  // Diaper bands recalibrated 2026.05.05ac to match AAP/Mayo Clinic/CDC
  // consensus: 0–2mo every 2–3h (~8–12/day), 2–6mo every 3–4h (~8–10/day),
  // 6–12mo every 3–4h (~6–8/day). Daytime cadence band tells the user "time
  // to check" — used by the Now view nudge and the Wellness change-cadence
  // card. Night gap can be longer for sleeping babies.
  // 0–1 mo (newborn)
  if (ageMonths < 1) return {
    label: "newborn (0–1 mo)",
    feedsPerDay: [8, 12],
    ozPerDay: [16, 24],
    sleepStretchH: [2, 4],
    totalSleepH: [14, 17],
    diapersPerDay: [8, 12],
    changeIntervalH: [2, 3],
  };
  // 1–2 mo
  if (ageMonths < 2) return {
    label: "1–2 mo",
    feedsPerDay: [7, 10],
    ozPerDay: [20, 30],
    sleepStretchH: [3, 5],
    totalSleepH: [14, 17],
    diapersPerDay: [8, 12],
    changeIntervalH: [2, 3],
  };
  // 2–4 mo
  if (ageMonths < 4) return {
    label: "2–4 mo",
    feedsPerDay: [6, 8],
    ozPerDay: [24, 32],
    sleepStretchH: [4, 8],
    totalSleepH: [12, 16],
    diapersPerDay: [8, 10],
    changeIntervalH: [3, 4],
  };
  // 4–6 mo
  if (ageMonths < 6) return {
    label: "4–6 mo",
    feedsPerDay: [5, 7],
    ozPerDay: [27, 36],
    sleepStretchH: [6, 10],
    totalSleepH: [12, 15],
    diapersPerDay: [8, 10],
    changeIntervalH: [3, 4],
  };
  // 6–9 mo (solids starting; milk volumes drop slightly)
  if (ageMonths < 9) return {
    label: "6–9 mo",
    feedsPerDay: [4, 6],
    ozPerDay: [24, 32],
    sleepStretchH: [8, 11],
    totalSleepH: [12, 14],
    diapersPerDay: [6, 8],
    changeIntervalH: [3, 4],
  };
  // 9–12 mo
  if (ageMonths < 12) return {
    label: "9–12 mo",
    feedsPerDay: [3, 5],
    ozPerDay: [20, 30],
    sleepStretchH: [9, 12],
    totalSleepH: [11, 14],
    diapersPerDay: [6, 8],
    changeIntervalH: [3, 4],
  };
  // 12+ mo (toddler)
  return {
    label: "12+ mo",
    feedsPerDay: [2, 4],
    ozPerDay: [16, 24],
    sleepStretchH: [10, 12],
    totalSleepH: [11, 14],
    diapersPerDay: [4, 7],
    changeIntervalH: [3, 5],
  };
}

// Status helper: given a value and a [low, high] range, return one of:
//   "below" | "in" | "above"
// Used to color-code each snapshot bullet.
function rangeStatus(value, range) {
  if (!range || value == null) return "in";
  const [lo, hi] = range;
  if (value < lo) return "below";
  if (value > hi) return "above";
  return "in";
}


// Compute the time bank balance purely from the transaction log. The stored
// balance is just a cached denormalization that gets updated on each write;
// if any write goes wrong (or stale data hangs around between builds), the
// stored balance drifts. This pure function is the source of truth — derive
// from ledger, compare against stored, self-heal on hydrate.
//
// Convention: balance > 0 means Mommy owes Daddy. balance < 0 → Daddy owes Mommy.
//   "owed":  Daddy→Mommy  → +mins   |  Mommy→Daddy  → -mins
//   "paid":  Mommy→Daddy  → -mins   |  Daddy→Mommy  → +mins
//   "gift":  no balance impact — gifts live on a separate "pending gifts"
//           track, where the recipient gets to choose WHEN to redeem. At
//           redemption the gift transforms into a real shift swap (the
//           giver covers a chosen time block for the recipient). Gifts
//           that haven't been redeemed yet show as a small callout on the
//           recipient's Now landing.
function computeTimeBankBalance(transactions) {
  let balance = 0;
  for (const tx of (transactions || [])) {
    if (tx.kind === "owed") {
      if (tx.from === "Daddy" && tx.to === "Mommy") balance += tx.mins;
      else if (tx.from === "Mommy" && tx.to === "Daddy") balance -= tx.mins;
    } else if (tx.kind === "paid") {
      if (tx.from === "Mommy" && tx.to === "Daddy") balance -= tx.mins;
      else if (tx.from === "Daddy" && tx.to === "Mommy") balance += tx.mins;
    }
  }
  return balance;
}

// Pending gifts: kind === "gift" AND not yet redeemed. The recipient sees a
// landing-page callout with the total amount; they choose when to redeem.
// At redemption time, the gift is marked with .redeemed = { at, blockStart,
// blockEnd, meetingId } and a real Meeting is created so the shift schedule
// reflects the swap.
function getPendingGifts(transactions, recipientName) {
  return (transactions || []).filter(tx =>
    tx.kind === "gift" && tx.to === recipientName && !tx.redeemed
  );
}

// ---- Bulk import parser ------------------------------------------------
// Parses free-form text logs into structured events. Handles the messy
// real-world format the user actually types/dictates — mixed separators,
// inconsistent spacing, time ranges (`6:00a-6:45a`), source qualifiers
// (BM/Formula), and the "Yes" diaper-changed-at-same-time column.
//
// Returns an array of { ok, event, raw, warnings, error } objects, one per
// non-empty input line. The preview UI uses these to show what got parsed
// and flag anything ambiguous.
//
// Design notes:
//   - Date headers anchor subsequent rows. Lines like "Sun May 3" or "Mon
//     5/4" or any line that's mostly a date set the active date. Dashes,
//     em-dashes, and other decoration are stripped.
//   - When a row contains "Yes" in the diaper-flag position, we emit TWO
//     events: the feed/pump as the primary, and a diaper event at the
//     same timestamp.
//   - Pump ranges like "1:15a-2:00a" become pump events with both timestamp
//     (start) and durationMin computed from the range.
//   - Parser is permissive — it accepts variations gracefully and only
//     flags warnings/errors when something's truly ambiguous.
function parseBulkImport(text, opts = {}) {
  const refYear = (opts.referenceDate || new Date()).getFullYear();
  const lines = text.split(/\r?\n/);
  const out = [];
  let activeDate = null; // a Date set by date headers
  let activeDateLabel = null;

  const monthMap = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  // Try parsing a date header. Returns Date or null.
  const tryParseDateHeader = (line) => {
    // Strip dashes, em dashes, decorative chars
    const cleaned = line.replace(/[-—–_]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return null;
    // Match patterns like "Sun May 3", "Monday May 4", "Tue 5/5", "May 3"
    // Day-of-week is optional and ignored. Use word boundaries and put
    // longer forms FIRST so "Monday" doesn't match as "mon" + leftover "day".
    const dowPattern = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|tues|thurs|sun|mon|tue|wed|thu|fri|sat)\b/gi;
    const woDow = cleaned.replace(dowPattern, "").replace(/\s+/g, " ").trim();

    // Try "May 3" style
    const monthDayMatch = woDow.match(/^([a-z]+)\s+(\d{1,2})\b/i);
    if (monthDayMatch) {
      const m = monthMap[monthDayMatch[1].toLowerCase()];
      const d = parseInt(monthDayMatch[2], 10);
      if (m != null && d >= 1 && d <= 31) {
        return new Date(refYear, m, d);
      }
    }

    // Try "5/3" or "5/3/26"
    const slashMatch = woDow.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (slashMatch) {
      const m = parseInt(slashMatch[1], 10) - 1;
      const d = parseInt(slashMatch[2], 10);
      let y = refYear;
      if (slashMatch[3]) {
        const ry = parseInt(slashMatch[3], 10);
        y = ry < 100 ? 2000 + ry : ry;
      }
      if (m >= 0 && m <= 11 && d >= 1 && d <= 31) return new Date(y, m, d);
    }

    return null;
  };

  // Parse a time string like "6:44a", "11:12pm", "9:00", "0930" into
  // {hour, minute} (24h). Returns null if not parseable.
  const parseTime = (raw) => {
    if (!raw) return null;
    const t = raw.trim().toLowerCase();
    // hh:mm with optional am/pm marker
    let m = t.match(/^(\d{1,2}):(\d{2})\s*(a|am|p|pm)?$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const mer = m[3];
      if (mer && (mer === "p" || mer === "pm") && h < 12) h += 12;
      if (mer && (mer === "a" || mer === "am") && h === 12) h = 0;
      return { hour: h, minute: min };
    }
    // hhmm 4-digit military
    m = t.match(/^(\d{4})$/);
    if (m) {
      const h = parseInt(m[1].slice(0, 2), 10);
      const min = parseInt(m[1].slice(2), 10);
      return { hour: h, minute: min };
    }
    // h with am/pm only
    m = t.match(/^(\d{1,2})\s*(a|am|p|pm)$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const mer = m[2];
      if ((mer === "p" || mer === "pm") && h < 12) h += 12;
      if ((mer === "a" || mer === "am") && h === 12) h = 0;
      return { hour: h, minute: 0 };
    }
    return null;
  };

  // Build a Date from active date + parsed time
  const buildTs = (date, hm) => {
    if (!date || !hm) return null;
    const d = new Date(date);
    d.setHours(hm.hour, hm.minute, 0, 0);
    return d;
  };

  // === Per-line loop ===
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Try as date header first
    const dateHeader = tryParseDateHeader(trimmed);
    if (dateHeader && /[a-z]/i.test(trimmed) && !/\bpump\b|\bfeed\b|\bdiaper\b|\bbreastfeed\b|\boz\b/i.test(trimmed)) {
      // It's a date header (no event keywords found)
      activeDate = dateHeader;
      activeDateLabel = trimmed;
      continue;
    }

    // Try as event line
    // Normalize: tabs/multiple spaces → single space, strip decoration
    const norm = trimmed.replace(/\s+/g, " ").replace(/^[-—–]+|[-—–]+$/g, "").trim();

    // Detect type — first occurrence of pump/feed/diaper/breastfeed
    const lower = norm.toLowerCase();
    let type = null;
    let pumpMode = null;
    if (/\bbreastfeed\b/.test(lower)) type = "breastfeed";
    else if (/\bpump\b/.test(lower)) {
      type = "pump";
      if (/\bpower\b/.test(lower)) pumpMode = "power";
    }
    else if (/\bfeed\b/.test(lower)) type = "feed";
    else if (/\bdiaper\b/.test(lower)) type = "diaper";

    if (!type) {
      out.push({
        ok: false,
        raw: rawLine,
        error: "couldn't detect event type (need 'feed', 'pump', 'diaper', or 'breastfeed')",
        warnings: [],
      });
      continue;
    }

    // Detect time(s). A range like "1:15a-2:00a" or "6:00a-6:45a"
    const rangeMatch = norm.match(/(\d{1,2}:\d{2}\s*[ap]?m?)\s*[-–—]\s*(\d{1,2}:\d{2}\s*[ap]?m?)/i);
    let startTime = null, endTime = null;
    if (rangeMatch) {
      startTime = parseTime(rangeMatch[1]);
      endTime = parseTime(rangeMatch[2]);
    } else {
      // Single time anywhere in the line
      const singleMatch = norm.match(/(\d{1,2}:\d{2}\s*[ap]?m?|\d{1,2}\s*[ap]m)/i);
      if (singleMatch) startTime = parseTime(singleMatch[1]);
    }

    if (!startTime) {
      out.push({
        ok: false,
        raw: rawLine,
        error: "couldn't detect a time",
        warnings: [],
      });
      continue;
    }

    if (!activeDate) {
      out.push({
        ok: false,
        raw: rawLine,
        error: "no date header seen yet — add a line like 'Sun May 3' before the entries",
        warnings: [],
      });
      continue;
    }

    const ts = buildTs(activeDate, startTime);

    // Detect oz — number (with optional decimal) followed by "oz"
    let oz = null;
    const ozMatch = norm.match(/(\d+(?:\.\d+)?)\s*oz/i);
    if (ozMatch) oz = parseFloat(ozMatch[1]);

    // Detect source — BM / Breast milk / Formula / Mixed
    let source = null;
    if (/\bformula\b/i.test(norm) && /\bbm\b|\bbreast\s*milk\b/i.test(norm)) source = "Mixed";
    else if (/\bformula\b/i.test(norm)) source = "Formula";
    else if (/\bbm\b|\bbreast\s*milk\b/i.test(norm)) source = "BM";

    // Detect "Yes" → diaper changed at same time
    // Look for standalone "Yes" as a token (not "yesterday" etc.)
    const hasYes = /\byes\b/i.test(norm);

    // Build the primary event
    const warnings = [];
    let primary = null;

    if (type === "pump") {
      const event = {
        type: "pump",
        ts,
        mode: pumpMode || "standard",
      };
      if (oz != null) event.oz = oz;
      if (rangeMatch && endTime) {
        const endTs = buildTs(activeDate, endTime);
        const durMin = Math.max(0, Math.round((endTs - ts) / 60000));
        if (durMin > 0 && durMin < 24 * 60) event.durationMin = durMin;
      }
      // Source for pump → location (rt vs fridge); default rt unless stated
      // "BM" on a pump line is informational and redundant (pump output is BM by definition)
      primary = event;
    } else if (type === "feed") {
      const event = { type: "feed", ts };
      if (oz != null) event.oz = oz;
      // Default source if not stated (most common case is BM)
      event.source = source || "BM";
      if (!source) warnings.push("source not stated, assumed BM");
      primary = event;
    } else if (type === "breastfeed") {
      const event = { type: "breastfeed", ts };
      if (oz != null) event.oz = oz;
      primary = event;
    } else if (type === "diaper") {
      const event = { type: "diaper", ts };
      // Try to detect kind from line
      if (/\bdirty\b|\bsoiled\b|\bbm\b.*\bdiaper\b/i.test(norm)) event.notes = "dirty";
      else if (/\bboth\b/i.test(norm)) event.notes = "both";
      else event.notes = "wet";
      primary = event;
    }

    if (!primary) {
      out.push({ ok: false, raw: rawLine, error: "could not build event", warnings: [] });
      continue;
    }

    out.push({
      ok: true,
      event: primary,
      raw: rawLine,
      warnings,
      dateLabel: activeDateLabel,
    });

    // If "Yes" diaper flag and primary isn't already a diaper, emit a second event
    if (hasYes && type !== "diaper") {
      out.push({
        ok: true,
        event: { type: "diaper", ts, notes: "wet", _fromYesFlag: true },
        raw: rawLine,
        warnings: ["auto-added: 'Yes' column = diaper at same time"],
        dateLabel: activeDateLabel,
      });
    }
  }

  return out;
}

const DEFAULT_SHIFTS = {
  Mommy: [
    { start: "08:30", end: "10:30" },
    { start: "12:30", end: "14:30" },
    { start: "16:30", end: "18:30" },
    { start: "20:30", end: "22:30" },
    { start: "00:30", end: "02:30" },
    { start: "04:30", end: "06:30" },
  ],
  Daddy: [
    { start: "10:30", end: "12:30" },
    { start: "14:30", end: "16:30" },
    { start: "18:30", end: "20:30" },
    { start: "22:30", end: "00:30" },
    { start: "02:30", end: "04:30" },
    { start: "06:30", end: "08:30" },
  ],
};

const BM_RT_HOURS = 4;          // safe limit — preferred max at typical room temp
const BM_RT_HOURS_HARD = 6;     // hard limit — discard after this regardless
const BM_FRIDGE_HOURS = 96;
const BM_FREEZER_HOURS = 6 * 30 * 24; // ~6 months in hours
const TYPICAL_FEED_OZ = 5;
const TYPICAL_FEED_INTERVAL_HRS = 3;
const PUMP_INTERVAL_HRS = 3; // start-to-start

// Solène's birthday: January 23, 2026
const BIRTHDAY = new Date(2026, 0, 23);

// Diaper warning thresholds (hours since last diaper)
const DIAPER_WARN_HOURS = 3;
const DIAPER_URGENT_HOURS = 4;

// Calorie estimates (research-based ranges)
const KCAL_PER_OZ_BM = 22;          // ~20 kcal/oz milk + ~10% production overhead
const KCAL_PER_BF_MINUTE = 4.5;     // average per minute of active nursing

// Format minutes as a human-readable duration. Below 60min returns "45m"
// (no hours block), at-or-above 60 returns "1h" / "1h 15m" / "8h 30m" —
// never fractional hours like "1.5h" because those read as math, not time.
// Negative or zero values return "0m" rather than weird negative strings.
function fmtDuration(mins) {
  if (mins == null || isNaN(mins)) return "—";
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

// Convenience wrapper for inputs already expressed in hours (decimal). Just
// converts to minutes and delegates to fmtDuration so the formatting rules
// stay in one place.
function fmtHours(hours) {
  if (hours == null || isNaN(hours)) return "—";
  return fmtDuration(hours * 60);
}

// Note categories for observations
const NOTE_CATEGORIES = [
  { v: "sleep", l: "Sleep", emoji: "😴", color: "#6B7CA8" },
  { v: "feeding", l: "Feeding", emoji: "🍼", color: "#C77B8E" },
  { v: "skin", l: "Skin", emoji: "🌿", color: "#7B9479" },
  { v: "development", l: "Development", emoji: "✨", color: "#C44545" },
  { v: "mood", l: "Mood", emoji: "💛", color: "#D4A03A" },
  // Illness — fevers, vomiting, congestion, anything pediatrician should hear about
  { v: "illness", l: "Illness", emoji: "🤒", color: "#B85C2E" },
  { v: "other", l: "Other", emoji: "📝", color: "#7C6F5E" },
];

// Activity types
const ACTIVITIES = [
  { v: "tummy", l: "Tummy time", emoji: "🤸", color: "#C44545" },
  { v: "reading", l: "Book reading", emoji: "📖", color: "#6B7CA8" },
  { v: "french", l: "French time", emoji: "🇫🇷", color: "#C77B8E" },
  { v: "music", l: "Music time", emoji: "🎵", color: "#7B9479" },
  { v: "play", l: "Free play", emoji: "🧸", color: "#D4A03A" },
  { v: "outdoor", l: "Outdoor", emoji: "🌳", color: "#5C8E5C" },
  { v: "sensory", l: "Sensory", emoji: "👋", color: "#9C6BB0" },
  { v: "other_act", l: "Other", emoji: "⭐", color: "#7C6F5E" },
];

// Default diaper bag checklist
const DEFAULT_DIAPER_BAG = [
  { id: "d1", name: "Diapers", target: 6, current: 6 },
  { id: "d2", name: "Wipes (travel pack)", target: 1, current: 1 },
  { id: "d3", name: "Changing pad", target: 1, current: 1 },
  { id: "d4", name: "Diaper rash cream", target: 1, current: 1 },
  { id: "d5", name: "Bottle (pre-made)", target: 2, current: 2 },
  { id: "d6", name: "Formula scoops (sealed)", target: 1, current: 1 },
  { id: "d7", name: "Burp cloth", target: 2, current: 2 },
  { id: "d8", name: "Outfit change", target: 1, current: 1 },
  { id: "d9", name: "Pacifier", target: 2, current: 2 },
  { id: "d10", name: "Wet/dry bag", target: 1, current: 1 },
  { id: "d11", name: "Sun hat", target: 1, current: 1 },
  { id: "d12", name: "Aveeno SPF", target: 1, current: 1 },
];

// Skincare routines
const SKINCARE = {
  AM: [
    { step: "Wipe face with warm cloth", note: "" },
    { step: "Wipe body with warm cloth", note: "if needed" },
    { step: "Apply argan oil", note: "small amount, all over" },
    { step: "Wait for oil to soak in", note: "~3 min" },
    { step: "If sun exposure expected → Aveeno SPF", note: "physical sunscreen, generous layer" },
  ],
  PM: [
    { step: "Face wash or wipe", note: "warm cloth, gentle" },
    { step: "Body wipe-down", note: "if no bath" },
    { step: "Apply grapeseed oil", note: "all over" },
    { step: "Wait for oil to soak in", note: "~3 min" },
    { step: "Apply Aveeno balm", note: "seals moisture" },
  ],
};

const BATH_TYPES = {
  full: { label: "Full bath", desc: "Head-to-toe scrub + hair wash", icon: "🛁", duration: "20–25 min" },
  partial: { label: "Partial bath", desc: "Diaper area + face wash, free play in water", icon: "💦", duration: "15 min" },
  quickie: { label: "Quickie", desc: "Feet in water + face wash", icon: "🦶", duration: "5 min" },
  wipe: { label: "Wipe-down", desc: "No tub, just a warm cloth", icon: "🧻", duration: "3 min" },
};

// ---- Helpers -----------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

// 12-hour formatters everywhere — tolerate Date or ISO string
const fmtTime12 = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
};
const fmtTimeShort = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return `${h}:${pad(m)}${ap}`;
};
const fmtShiftRange = (s) => {
  const [a, b] = s.start.split(":").map(Number);
  const [c, d] = s.end.split(":").map(Number);
  const fmt = (h, m) => {
    const ap = h >= 12 ? "p" : "a";
    const hr = h % 12 || 12;
    return `${hr}:${pad(m)}${ap}`;
  };
  return `${fmt(a, b)}–${fmt(c, d)}`;
};

const minutesAgo = (date) => Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
const fmtElapsed = (mins) => {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Age in months + days, e.g. "3 months 11 days"
function fmtAge(birthday, now = new Date()) {
  let months = (now.getFullYear() - birthday.getFullYear()) * 12 + (now.getMonth() - birthday.getMonth());
  let days = now.getDate() - birthday.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months <= 0 && days >= 0) {
    return days === 1 ? "1 day old" : `${days} days old`;
  }
  if (months < 1) return `${days}d`;
  if (months < 12) {
    if (days === 0) return `${months} mo`;
    return `${months} mo · ${days}d`;
  }
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths === 0 ? `${years}y` : `${years}y · ${remMonths} mo`;
}

// Group consecutive feed events (bottle + breastfeed) that are within `gapMin` of
// each other into a single "feeding session". Used by both the timeline display
// (so clustered feeds render as one row) and analytics (so the count/avg reflect
// real sessions rather than every paused-and-resumed event).
//
// Input: array of events (any types). Non-feed events pass through untouched.
// Output: array where contiguous feed-events become a single object with shape:
//   { _isCluster: true, ts: <earliestTs>, endTs: <latestTs>, events: [...], totalOz, totalBfMin, sources: [], firstId }
// Single feed events not clustered with anything pass through as-is (no _isCluster).
function clusterFeeds(events, gapMin = 10) {
  if (!events || events.length === 0) return [];
  const isFeed = (e) => e && (e.type === "feed" || e.type === "breastfeed");
  const gapMs = gapMin * 60000;

  // Split into feed-runs while preserving non-feed events in place
  const result = [];
  // We need to walk in chronological order to cluster, but we want to preserve
  // the input ordering for display. Easiest: assume caller can pass in either
  // chrono-asc or chrono-desc and we cluster accordingly. We detect by comparing
  // the first two timestamps if available.
  let chronoDesc = false;
  if (events.length >= 2) {
    const t0 = new Date(events[0].ts).getTime();
    const t1 = new Date(events[1].ts).getTime();
    if (t1 < t0) chronoDesc = true;
  }
  // Walk in chronological-ascending order for the clustering math, then reverse
  // back to original direction at the end if needed.
  const ordered = chronoDesc ? [...events].reverse() : events;

  let buffer = []; // list of feed events being accumulated
  const flush = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1) {
      result.push(buffer[0]);
    } else {
      // Build a cluster
      let totalOz = 0;
      let totalBfMin = 0;
      const sources = new Set();
      for (const e of buffer) {
        if (e.type === "feed" && typeof e.oz === "number") {
          totalOz += e.oz;
          if (e.source) sources.add(e.source);
        }
        if (e.type === "breastfeed") {
          totalBfMin += e.totalDurationMin || 0;
          sources.add("Breastfeed");
        }
      }
      const earliest = buffer[0]; // ordered asc
      const latest = buffer[buffer.length - 1];
      result.push({
        _isCluster: true,
        ts: earliest.ts,
        endTs: latest.ts,
        events: [...buffer],
        totalOz,
        totalBfMin,
        sources: [...sources],
        firstId: earliest.id,
        // Surface a "type" so the timeline renderer keeps the feed icon
        type: "feed",
      });
    }
    buffer = [];
  };

  for (const e of ordered) {
    if (isFeed(e)) {
      if (buffer.length === 0) {
        buffer.push(e);
        continue;
      }
      // Compare to the last feed in the buffer
      const last = buffer[buffer.length - 1];
      // For breastfeed, "end" of last is start + totalDurationMin (approx)
      const lastEndMs = (() => {
        const t = new Date(last.ts).getTime();
        if (last.type === "breastfeed" && last.totalDurationMin) {
          return t + last.totalDurationMin * 60000;
        }
        return t;
      })();
      const thisStartMs = new Date(e.ts).getTime();
      if (thisStartMs - lastEndMs <= gapMs) {
        buffer.push(e);
      } else {
        flush();
        buffer.push(e);
      }
    } else {
      flush();
      result.push(e);
    }
  }
  flush();

  // If input was chrono-desc, return in chrono-desc order (un-reverse)
  if (chronoDesc) result.reverse();
  return result;
}

function whoIsOn(shifts, now = new Date()) {
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const parent of ["Mommy", "Daddy"]) {
    for (const s of shifts[parent]) {
      const a = toMin(s.start);
      const b = toMin(s.end);
      const inShift = a < b ? cur >= a && cur < b : cur >= a || cur < b;
      if (inShift) return { parent, shift: s };
    }
  }
  return { parent: "Mommy", shift: shifts.Mommy[0] };
}

function nextHandoff(shifts, now = new Date()) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const all = [];
  for (const p of ["Mommy", "Daddy"]) {
    for (const s of shifts[p]) all.push({ ...s, parent: p, startMin: toMin(s.start) });
  }
  all.sort((a, b) => a.startMin - b.startMin);
  const upcoming = all.find((s) => s.startMin > cur) || all[0];
  return upcoming;
}

// ---- Atmosphere --------------------------------------------------------
function getTimeMode(d = new Date()) {
  const h = d.getHours();
  if (h >= 22 || h < 5) return "night";
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 18) return "day";
  return "dusk";
}

// Palette — warm cream backdrop with deepened dusk-derived parents for readability.
// Same values across all four time-of-day modes (no day/dawn/dusk/night theming).
//   bg     warm cream          base canvas
//   paper  off-white            card surface
//   ink    near-black           body text
//   accent terracotta          primary action / "late"
//   gold   soft gold           "soon" warnings / gentle accents
//   mommy  deepened rose       Mommy / Solène personalization
//   daddy  deepened blue       Daddy / on-duty accents
//   muted  warm brown          secondary text
//   soft   warm sand           dividers, soft fills
//   line   near-black          hairlines (used at low alpha)
// Theme palettes. Day (and time-of-day variants that share day's tokens)
// versus the dusk palette which is a true warm-dark theme.
//
// The user can pick "day" or "dusk" via a toggle in the Profile Switcher;
// the picked theme overrides time-of-day inference. The dawn/night entries
// are kept as aliases so any code that references mode === "night" / "dawn"
// (e.g. the TimeOrb) still resolves to a valid palette.
//
// Color philosophy for dusk:
//   - bg: deep plum-brown (NOT black). Purple undertone makes it read as
//     "twilight sky" rather than "office at midnight."
//   - paper: card surface, slightly lifted.
//   - ink: warm cream — the day theme's BACKGROUND becomes the night
//     theme's FOREGROUND. The two themes feel like the same app in
//     different moods rather than two unrelated designs.
//   - accents: each day color pulled toward a softer dusk equivalent.
//     Mommy rose → softer dusty pink. Terracotta → warm lamp amber.
//     Gold → candlelight. Slate-blue Daddy → moonlit slate.
const PALETTES = {
  day:   { bg: "#F5EEE3", ink: "#1F1B16", paper: "#FCF8F1", accent: "#B85C2E", soft: "#E8D7BC", muted: "#7C6F5E", line: "#1F1B16",
           mommy: "#C77893", daddy: "#6286B0", gold: "#D4A03A" },
  dawn:  { bg: "#F5EEE3", ink: "#1F1B16", paper: "#FCF8F1", accent: "#B85C2E", soft: "#E8D7BC", muted: "#7C6F5E", line: "#1F1B16",
           mommy: "#C77893", daddy: "#6286B0", gold: "#D4A03A" },
  dusk:  { bg: "#1F1A22", ink: "#EFE5D5", paper: "#2A2329", accent: "#D88A5C", soft: "#322932", muted: "#A89A87", line: "#D9CDB5",
           mommy: "#D89BAE", daddy: "#8FA8C4", gold: "#E5B860" },
  night: { bg: "#1F1A22", ink: "#EFE5D5", paper: "#2A2329", accent: "#D88A5C", soft: "#322932", muted: "#A89A87", line: "#D9CDB5",
           mommy: "#D89BAE", daddy: "#8FA8C4", gold: "#E5B860" },
};

// Little Ledger app mark — the artwork now fills the full viewBox so it reads
// at any size. Open journal base + swaddled-baby motif + small star + heart.
function LittleLedgerLogo({ C, size = 40 }) {
  // viewBox extends to 54 to accommodate the heart that hangs slightly
  // below the baby (was previously clipped by 48-tall viewBox). Display
  // is block to prevent the inline-baseline whitespace that can give a
  // floating image the appearance of sitting in a faint container.
  return (
    <svg width={size} height={size} viewBox="0 0 48 54" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-label="Little Ledger"
         style={{ display: "block" }}>
      {/* small star upper-right — soft gold */}
      <path d="M37 6 L38.4 9.6 L42 11 L38.4 12.4 L37 16 L35.6 12.4 L32 11 L35.6 9.6 Z" fill={C.gold} />
      {/* swaddled baby — large rose teardrop centered */}
      <path d="M24 9 Q14 17 14 28 Q14 36 24 38 Q34 36 34 28 Q34 17 24 9 Z" fill={C.mommy} opacity="0.92" />
      {/* baby head — outline only, no fill (the rose teardrop shows through).
          A solid C.bg fill here read as a faint "patch" against any subtle
          page tint, which is what made the logo look boxed-in. */}
      <circle cx="24" cy="14" r="3.2" fill="none" stroke={C.bg} strokeWidth="1.6" />
      {/* open journal — two stroked curves form the open book */}
      <path d="M4 40 Q14 35 24 39 Q34 35 44 40" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
      <path d="M6 44 Q14 40 24 42 Q34 40 42 44" stroke={C.ink} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* small heart bottom-right */}
      <path d="M37 47 C35.5 45.5 33.5 46 33.5 47.5 C33.5 49 35.5 50.5 37 51.8 C38.5 50.5 40.5 49 40.5 47.5 C40.5 46 38.5 45.5 37 47 Z" fill={C.mommy} opacity="0.75" />
    </svg>
  );
}

// ---- Storage layer -----------------------------------------------------
const storage = {
  // === Cloud sync runtime state ===
  // Set by App via setCloudContext(). Storage uses these to decide whether
  // to push writes to the cloud and whether to skip cloud-writes that would
  // bounce back as polling updates. Holding them as fields here (not module-
  // level globals) keeps everything tied to the storage object so a future
  // Reset can clear them cleanly.
  _familyCode: null,
  _syncingFromCloud: false,
  _onCloudWriteError: null, // callback for offline-pip UI

  setCloudContext({ familyCode, syncingFromCloud, onCloudWriteError }) {
    if (familyCode !== undefined) this._familyCode = familyCode;
    if (syncingFromCloud !== undefined) this._syncingFromCloud = syncingFromCloud;
    if (onCloudWriteError !== undefined) this._onCloudWriteError = onCloudWriteError;
  },

  // Wipe marker sentinel: if this localStorage key exists, the user just
  // performed a Reset and the artifact-storage backend may still hold stale
  // data. While the marker exists, get() will NOT self-heal from artifact
  // storage (which would otherwise resurrect the data we just wiped). The
  // marker is cleared once the seed install completes successfully on next
  // boot. Surviving the reload is exactly why we use localStorage for it.
  WIPE_MARKER_KEY: "solene:meta:wipeMarker",
  async get(key) {
    // localStorage is the source of truth — it's synchronous, reliable, and
    // doesn't have the silent-failure modes of the artifact storage API.
    try {
      const v = localStorage.getItem(key);
      if (v != null) return JSON.parse(v);
    } catch {}
    // If a wipe marker is present, do NOT fall back to artifact storage. The
    // artifact backend may still hold pre-reset data; reading from it would
    // resurrect what the user just wiped.
    let wipeMarkerPresent = false;
    try { wipeMarkerPresent = !!localStorage.getItem(this.WIPE_MARKER_KEY); } catch {}
    if (wipeMarkerPresent) {
      // Belt-and-suspenders: try (again) to delete from artifact storage so
      // the dirt clears over time even if the original wipe missed it.
      try {
        if (typeof window !== "undefined" && window.storage?.delete) {
          await window.storage.delete(key);
        }
      } catch {}
      return null;
    }
    try {
      if (typeof window !== "undefined" && window.storage?.get) {
        const r = await window.storage.get(key);
        if (r) {
          const parsed = JSON.parse(r.value);
          // Self-heal: copy artifact-storage data into localStorage so future
          // reads are fast and don't depend on the artifact API being available.
          try { localStorage.setItem(key, r.value); } catch {}
          return parsed;
        }
      }
    } catch {}
    return null;
  },
  async set(key, value) {
    const json = JSON.stringify(value);
    // ALWAYS write to localStorage first — synchronous, can't fail silently.
    // This is our authoritative store, and it stays correct even if cloud
    // sync is unavailable, the network is down, or we're in artifact-only mode.
    let localOk = false;
    try { localStorage.setItem(key, json); localOk = true; } catch (e) {
      console.warn("[storage] localStorage write failed for", key, e);
    }
    // Best-effort mirror to artifact storage so the data is portable across
    // devices/sessions if the API is healthy. Never block on this.
    try {
      if (typeof window !== "undefined" && window.storage?.set) {
        await window.storage.set(key, json);
      }
    } catch (e) {
      // Don't surface — localStorage already has it.
      if (!localOk) console.warn("[storage] both backends failed for", key, e);
    }

    // === Cloud sync write ===
    // If a family code is set AND this write didn't originate from a cloud
    // pull (which would create a write→bump-timestamp→re-pull loop), push
    // to the API too. We don't await — the cloud write is fire-and-forget so
    // the UI never blocks on network. On failure we ping the offline-indicator
    // callback so the header can show a "sync paused" pip.
    //
    // Why we exclude solene:meta:* keys: those are local-only infrastructure
    // (wipe marker, daily-content cache, etc.) that don't belong on the
    // cloud. Pushing them would pollute the namespace and could even loop
    // (the wipe marker push on Device A would propagate to Device B and
    // confuse its hydrate).
    if (this._familyCode && !this._syncingFromCloud && !key.startsWith("solene:meta:")) {
      // Pushing the parsed value (not the JSON string) so the server stores
      // it as a structured object, matching what cloudGet returns.
      this.cloudSet(this._familyCode, key, value).then(ok => {
        if (!ok && this._onCloudWriteError) {
          try { this._onCloudWriteError(); } catch {}
        }
      });
    }
  },
  async delete(key) {
    try { localStorage.removeItem(key); } catch {}
    try {
      if (typeof window !== "undefined" && window.storage?.delete) {
        await window.storage.delete(key);
      }
    } catch {}
    // Mirror the delete to the cloud so other devices stop seeing this key.
    if (this._familyCode && !this._syncingFromCloud && !key.startsWith("solene:meta:")) {
      this.cloudDel(this._familyCode, key).catch(() => {});
    }
  },
  async wipeAll() {
    // Set the wipe marker FIRST so even if anything below fails, the next
    // boot will see the marker and refuse to self-heal artifact storage.
    try {
      localStorage.setItem(this.WIPE_MARKER_KEY, String(Date.now()));
    } catch {}

    // List ALL solene:* keys we know about. If the artifact storage API doesn't expose
    // a list operation we can't enumerate dynamically, so this list must stay current.
    const keys = [
      "solene:events", "solene:inventory", "solene:meetings", "solene:shifts:v3",
      "solene:diaperbag", "solene:onsite", "solene:notes", "solene:appointments",
      "solene:activeActivity", "solene:activePump", "solene:takeover", "solene:handoffNote", "solene:noteArchive",
      "solene:timeBank", "solene:dailyContent", "solene:currentUser",
      "solene:seeded:real:v3", "solene:seeded:real:v2", "solene:seeded:real:v1",
      "solene:seeded:v3", "solene:seeded:v2",
      // legacy keys from earlier versions, in case they still linger
      "solene:shifts", "solene:shifts:v2", "solene:seeded", "solene:seeded:v1",
      // event/meetings backup keys created by sync-write paths
      "solene:events:backup", "solene:meetings:backup", "solene:inventory:backup",
    ];
    for (const k of keys) {
      try { await this.delete(k); } catch {}
    }
    // Also wipe ALL solene:* keys from localStorage — catches anything we
    // may have missed (e.g. day-seen markers, content cache keys, etc.).
    // Excludes the wipe marker itself, which clears on next boot.
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("solene:") && k !== this.WIPE_MARKER_KEY) toRemove.push(k);
      }
      for (const k of toRemove) localStorage.removeItem(k);
    } catch {}
  },
  // Called by hydrate after a successful boot to clear the wipe marker.
  // After this call, normal get() behavior (with self-heal) resumes.
  clearWipeMarker() {
    try { localStorage.removeItem(this.WIPE_MARKER_KEY); } catch {}
  },

  // === Cloud sync methods ===
  // These talk to /api/data?ns={code}&key={key} and serialize values as JSON
  // bodies. They're called BY the autosave effects (in addition to local
  // writes), and BY the polling loop / initial sync routines.
  //
  // All four are pure HTTP — no fallback logic, no caching. The caller is
  // responsible for deciding whether cloud is available and whether to fall
  // back to local storage on failure. This separation keeps the methods
  // simple and testable.
  //
  // Returns:
  //   cloudGet  → the parsed value, or null if missing
  //   cloudSet  → true on success, false on failure (logs)
  //   cloudDel  → true on success, false on failure
  //   cloudList → { keys, updatedAt } or null on failure

  async cloudGet(familyCode, key) {
    if (!familyCode) return null;
    try {
      const url = `/api/data?ns=${encodeURIComponent(familyCode)}&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return null;
      const json = await res.json();
      // The server stores the value as-is (a JSON-serialized object). If we
      // ever stored {value: <obj>} the server returned it under .value.
      return json.value ?? null;
    } catch (e) {
      console.warn("[storage.cloudGet] failed for", key, e);
      return null;
    }
  },

  async cloudSet(familyCode, key, value) {
    if (!familyCode) return false;
    try {
      const url = `/api/data?ns=${encodeURIComponent(familyCode)}&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      return res.ok;
    } catch (e) {
      console.warn("[storage.cloudSet] failed for", key, e);
      return false;
    }
  },

  async cloudDel(familyCode, key) {
    if (!familyCode) return false;
    try {
      const url = `/api/data?ns=${encodeURIComponent(familyCode)}&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { method: "DELETE" });
      return res.ok;
    } catch (e) {
      console.warn("[storage.cloudDel] failed for", key, e);
      return false;
    }
  },

  // Returns { keys: string[], updatedAt: number }. The polling loop uses
  // updatedAt to detect "is there anything new?" without fetching every key.
  async cloudList(familyCode) {
    if (!familyCode) return null;
    try {
      const url = `/api/data?ns=${encodeURIComponent(familyCode)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("[storage.cloudList] failed", e);
      return null;
    }
  },
};

// ---- One-time seed -----------------------------------------------------
// REAL_SEED_DATA is loaded EXACTLY ONCE on first launch (or after an in-app
// Reset). After that, every log the user enters persists forever through
// reloads, version bumps, code updates, etc. The seed is not a recurring
// checkpoint — it's a one-shot starter set. Don't add seed-version logic
// here unless the user asks for it.
//
// To wipe and start fresh, the user uses the in-app Reset (Profile Switcher
// → Danger Zone). That's the only way to re-seed.
//
// DATA SPANS Sun May 3 → Tue May 5 2026. Anchored to literal dates rather
// than relative offsets because these are real events that happened on real
// dates — they shouldn't drift if the user opens the app on May 7th.
function buildRealSeedData() {
  // Helper: build a Date for a given literal calendar date + time.
  // Year/month/day are fixed; time is local.
  const at = (year, month, day, h, m) => new Date(year, month - 1, day, h, m, 0, 0);

  // Pump duration helper — when a range like "10:30–11:15a" is given, durationMin
  // is end - start. The seed records mode: "end" so the event represents the
  // completion of the pump session (matches how the app logs pumps natively).
  const events = [
    // ============ SUN MAY 3 2026 ============
    { type: "pump",   ts: at(2026, 5, 3,  3,  30), oz: 2,   durationMin: 60, mode: "end" }, // 2:30–3:30a
    { type: "feed",   ts: at(2026, 5, 3,  4,  52), oz: 3,   source: "BM" },                  // 4:52a
    { type: "pump",   ts: at(2026, 5, 3,  6,   0), oz: 2,   durationMin: 30, mode: "end" }, // 5:30–6:00a
    { type: "pump",   ts: at(2026, 5, 3,  8,  10), oz: 3.5, durationMin: 40, mode: "end" }, // 7:30–8:10a
    { type: "feed",   ts: at(2026, 5, 3,  9,  45), oz: 5,   source: "BM" },                  // 9:45a
    { type: "pump",   ts: at(2026, 5, 3, 11,  15), oz: 3.5, durationMin: 45, mode: "end" }, // 10:30–11:15a
    { type: "feed",   ts: at(2026, 5, 3, 13,  15), oz: 4,   source: "BM" },                  // 1:15p (BM assumed)
    { type: "pump",   ts: at(2026, 5, 3, 14,   0), oz: 3,   durationMin: 20, mode: "end" }, // 1:40–2:00p
    { type: "diaper", ts: at(2026, 5, 3, 20,  20), notes: "wet" },                            // 8:20p
    { type: "feed",   ts: at(2026, 5, 3, 20,  27), oz: 4,   source: "Formula" },             // 8:27p · No diaper after
    { type: "pump",   ts: at(2026, 5, 4,  0,   0), oz: 2.5, durationMin: 30, mode: "end" }, // 11:30p–12:00a (rolls into Mon)

    // ============ MON MAY 4 2026 ============
    { type: "pump",   ts: at(2026, 5, 4,  4,  30), oz: 3,    durationMin: 30, mode: "end" }, // 4:00–4:30a
    { type: "feed",   ts: at(2026, 5, 4,  7,  30), oz: 6,    source: "BM" },                  // 7:30a
    { type: "pump",   ts: at(2026, 5, 4,  8,  30), oz: 2.75, durationMin: 30, mode: "end" }, // 8:00–8:30a
    { type: "feed",   ts: at(2026, 5, 4, 12,  55), oz: 6,    source: "BM" },                  // 12:55p
    { type: "pump",   ts: at(2026, 5, 4, 16,   0), oz: 7.5,  durationMin: 30, mode: "end" }, // 4:00p (out-of-order but anchored to time)
    // 6:13p combo feed: 1oz BM + 4oz Formula — same minute, two events.
    // Yes diaper after the BM portion (using the BM line's column).
    { type: "feed",   ts: at(2026, 5, 4, 18,  13), oz: 1,    source: "BM" },                  // 6:13p · BM 1oz
    { type: "feed",   ts: at(2026, 5, 4, 18,  13), oz: 4,    source: "Formula" },             // 6:13p · Formula 4oz · No diaper
    { type: "diaper", ts: at(2026, 5, 4, 18,  14), notes: "wet" },                            // diaper after BM portion
    { type: "feed",   ts: at(2026, 5, 4, 18,  15), oz: 1,    source: "Formula" },             // 6:15p
    { type: "pump",   ts: at(2026, 5, 4, 20,   0), oz: 3.25, durationMin: 30, mode: "end" }, // 8:00p
    { type: "feed",   ts: at(2026, 5, 4, 22,   8), oz: 4,    source: "BM" },                  // 10:08p · Yes diaper
    { type: "diaper", ts: at(2026, 5, 4, 22,   9), notes: "wet" },                            // diaper after 10:08p
    { type: "feed",   ts: at(2026, 5, 4, 23,  27), oz: 4,    source: "Formula" },             // 11:27p
    { type: "feed",   ts: at(2026, 5, 4, 23,  30), oz: 6.5,  source: "BM" },                  // 11:30p · Yes diaper
    { type: "diaper", ts: at(2026, 5, 4, 23,  31), notes: "wet" },                            // diaper after 11:30p

    // ============ TUE MAY 5 2026 ============
    { type: "feed",   ts: at(2026, 5, 5,  2,  11), oz: 5,    source: "BM" },                  // 2:11a · Yes diaper
    { type: "diaper", ts: at(2026, 5, 5,  2,  12), notes: "wet" },                            // diaper after 2:11a
    { type: "pump",   ts: at(2026, 5, 5,  4,  44), oz: 4.75, durationMin: 51, mode: "end" }, // 3:44–4:44a (51m noted)
    { type: "pump",   ts: at(2026, 5, 5,  8,  30), oz: 4,    durationMin: 30, mode: "end" }, // 8:30a (assumed 30m)
    { type: "feed",   ts: at(2026, 5, 5, 10,  15), oz: 4,    source: "BM" },                  // 10:15a
    { type: "feed",   ts: at(2026, 5, 5, 10,  20), oz: 1,    source: "BM" },                  // 10:20a · Yes diaper
    { type: "diaper", ts: at(2026, 5, 5, 10,  21), notes: "wet" },                            // diaper after 10:20a
    { type: "pump",   ts: at(2026, 5, 5, 14,   0), oz: 3.5,  durationMin: 30, mode: "end" }, // 2:00p (assumed 30m)
    { type: "feed",   ts: at(2026, 5, 5, 15,  40), oz: 3.5,  source: "BM" },                  // 3:40p
    // 10:15p combo — 2oz bottle + 10min on left breast, logged as separate events
    { type: "feed",       ts: at(2026, 5, 5, 22,  15), oz: 2,           source: "BM" },                  // 10:15p bottle
    { type: "breastfeed", ts: at(2026, 5, 5, 22,  15), durationMin: 10, side: "left" },                  // 10:15p direct
  ];

  // Inventory: pumps that haven't been demonstrably used. Older pumps from Sun
  // and early Mon are presumed consumed by subsequent feeds. The unaccounted
  // recent pumps below are seeded as fridge/RT bottles based on age vs RT
  // safety window (4h hard cutoff to fridge).
  // Anchor all "ages" to Tue May 5 ~3:40p, the latest data point.
  const inventory = [
    // Mon 4:00p pump (7.5oz) → ~24h old → fridge
    { oz: 7.5,  location: "fridge", pumpedAt: at(2026, 5, 4, 16,  0) },
    // Mon 8:00p pump (3.25oz) → ~20h old → fridge
    { oz: 3.25, location: "fridge", pumpedAt: at(2026, 5, 4, 20,  0) },
    // Tue 3:44a pump (4.75oz) → ~12h old → fridge
    { oz: 4.75, location: "fridge", pumpedAt: at(2026, 5, 5,  4, 44) },
    // Tue 8:30a pump (4oz) → ~7h old → fridge (past 4h RT cutoff)
    { oz: 4,    location: "fridge", pumpedAt: at(2026, 5, 5,  8, 30) },
    // Tue 2:00p pump (3.5oz) → ~1.5h old → still RT-safe
    { oz: 3.5,  location: "rt",     pumpedAt: at(2026, 5, 5, 14,  0) },
  ];

  return { events, inventory };
}
const REAL_SEED_DATA = buildRealSeedData();

// ---- Seeders -----------------------------------------------------------
// These read from REAL_SEED_DATA at the top of the file. To update the seed,
// edit REAL_SEED_DATA and bump SEED_VERSION — don't touch these functions.
//
// NOTE (2026.05.05z): Temporarily returning empty arrays so the user can
// test the app from a clean slate. The reset flow had stubborn data
// resurrection issues; instead of relying on reset, we just install nothing
// on first boot. This means: every user (including post-reset reboots) gets
// an empty journal, empty inventory, no notes, no commitments. The user
// adds entries via LOG (single events) or Bulk import (paste-and-confirm).
// To restore the seed data, replace these bodies with the originals:
//   return (REAL_SEED_DATA.events || []).map(...)
//   return (REAL_SEED_DATA.inventory || []).map(...)
function seedHistoricalEvents() {
  return [];
}

function seedHistoricalInventory() {
  return [];
}


// ---- Main App ----------------------------------------------------------
export default function SoleneHandoff() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState("now");
  const [events, setEvents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [weather, setWeather] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  // === Theme override ===
  // User-picked theme: "day" or "dusk". Defaults to "day" so existing users
  // aren't surprised by sudden dark mode after sunset (the default would
  // otherwise come from getTimeMode and could go to "dusk" or "night" based
  // on time of day). Persisted to localStorage as ll:theme — lives outside
  // the solene:* keyspace so a Reset doesn't clear it. Per-device, NOT
  // synced via cloud — you might want dusk on phone in bed but day on
  // laptop at the desk.
  const [themeOverride, setThemeOverride] = useState(() => {
    if (typeof window === "undefined") return "day";
    try {
      const v = localStorage.getItem("ll:theme");
      return (v === "day" || v === "dusk") ? v : "day";
    } catch { return "day"; }
  });
  useEffect(() => {
    try { localStorage.setItem("ll:theme", themeOverride); } catch {}
  }, [themeOverride]);
  // Cloud sync state. familyCode is the 6-char shared secret that namespaces
  // data on the backend. cloudSyncAvailable is set after a /api/ping check
  // succeeds. cloudSyncSetupNeeded is true when we have backend access but
  // no code yet — triggers the setup modal on first run after deployment.
  // All three live OUTSIDE the solene:* keyspace so wipeAll() doesn't clear
  // them (we want the family code to survive a data reset — resetting data
  // is different from resetting your sync setup).
  const [familyCode, setFamilyCode] = useState(null);
  const [cloudSyncAvailable, setCloudSyncAvailable] = useState(false);
  const [showFamilyCodeSetup, setShowFamilyCodeSetup] = useState(false);
  // === Cloud sync runtime indicators ===
  // cloudSyncStatus tracks the health of the cloud connection at runtime.
  //   "ok"      → last write/poll succeeded recently
  //   "offline" → last write failed; localStorage is keeping local copy safe
  //   "syncing" → an initial sync (upload-on-Generate or download-on-Enter) is in progress
  // The header shows a small pip in the LIVE area whose color reflects this.
  const [cloudSyncStatus, setCloudSyncStatus] = useState("ok"); // "ok" | "offline" | "syncing"
  // syncingFromCloudRef is set to true while we're applying a poll result to
  // React state. The autosave effects (and storage.set internally) check this
  // to skip re-pushing to cloud, which would otherwise create a feedback loop.
  // Using a ref (not state) so the autosave effects see the current value
  // synchronously without waiting for a re-render.
  const syncingFromCloudRef = useRef(false);
  // Last server-known timestamp from cloudList. Polling compares this to the
  // current value to decide whether to re-pull.
  const lastCloudTimestampRef = useRef(0);
  // Has the initial sync (upload-on-Generate / download-on-Enter) completed
  // for the current code? Until this is true, polling stays paused so it
  // can't race with the migration.
  const initialSyncDoneRef = useRef(false);
  const [showLogger, setShowLogger] = useState(false);
  // Deep-link flag: when set, ShiftsView auto-opens the TimeBank modal on
  // mount/tab-switch and clears the flag. Used by the LOG sheet pills so
  // gift/payback is reachable from anywhere without hoisting the modal.
  const [pendingTimeBankAction, setPendingTimeBankAction] = useState(null); // null | "gift" | "payback"
  // Gift being redeemed — when set, the RedeemGiftModal mounts. Set by
  // tapping the "you have a gift" pip on the Now view. The recipient picks
  // when to use it; submission converts the gift into a meeting + marks
  // the gift transaction as redeemed.
  const [redeemingGift, setRedeemingGift] = useState(null);
  // Bulk import modal — opened from LOG sheet's "Catch up" section. Lives at
  // top level so the LOG sheet can close before the import modal opens (avoids
  // overlapping modals).
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [loggerType, setLoggerType] = useState(null);
  const [diaperBag, setDiaperBag] = useState(DEFAULT_DIAPER_BAG);
  const [activeBfTimer, setActiveBfTimer] = useState(null);
  // On-site mode: { parent, departedAt, earliestReturn, latestReturn, etaUpdate?: ISOString }
  const [onsite, setOnsite] = useState(null);
  // Modal triggers for on-site flow — hoisted to App so the trigger button
  // can live in NowView while the modals stay portable to any caller.
  const [showOnsiteModal, setShowOnsiteModal] = useState(false);
  const [showEtaModal, setShowEtaModal] = useState(false);
  // Sleep-down time picker — when the user confirms baby fell asleep, this
  // opens with a pre-filled estimate they can adjust.
  const [showSleepDownPicker, setShowSleepDownPicker] = useState(false);
  const [sleepDownPrefill, setSleepDownPrefill] = useState(null);
  // Doctor notes & appointments
  const [notes, setNotes] = useState([]);            // { id, ts, category, text }
  const [appointments, setAppointments] = useState([]); // { id, dateTime, title, doctor?, location?, prepNotes? }
  const [activeActivity, setActiveActivity] = useState(null); // { type, startedAt }
  const [activePump, setActivePump] = useState(null); // { startedAt }
  // Impromptu takeover: { coveringParent, originalParent, startedAt }
  const [takeover, setTakeover] = useState(null);
  const [docSummary, setDocSummary] = useState(null); // { generated, html, copyText }
  // Handoff note: { from, to, text, ts, acknowledged }
  const [handoffNote, setHandoffNote] = useState(null);
  const [noteArchive, setNoteArchive] = useState([]);
  const [showHandoffNoteEditor, setShowHandoffNoteEditor] = useState(false);
  const [showNoteArchive, setShowNoteArchive] = useState(false);
  const [showFinishPump, setShowFinishPump] = useState(false);
  const [bottlePickerLoc, setBottlePickerLoc] = useState(null); // 'rt' | 'fridge' | null
  const [editingBottleId, setEditingBottleId] = useState(null);
  // Track previous on-duty parent so we can prompt at handoff
  const prevOnDutyRef = useRef(null);
  const [showHandoffPrompt, setShowHandoffPrompt] = useState(false);
  // Time Bank: { balance: number (minutes; positive = Mommy owes Daddy), transactions: [{id, ts, from, to, mins, reason, kind: 'owed'|'gift'|'paid'}] }
  const [timeBank, setTimeBank] = useState({ balance: 0, transactions: [] });
  // Daily content cache: { date: 'YYYY-MM-DD', french: {...}, verse: {...} }
  const [dailyContent, setDailyContent] = useState({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  // Which parent is currently using the app — affects what's primary, what's "your" data
  const [currentUser, setCurrentUser] = useState("Mommy");
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  // Load state — one-time seed on very first launch.
  // We use a dedicated seed key (solene:seeded:real:v2) so users with prior
  // data (demo or empty-seed) get this seed run exactly once. After that,
  // every log persists forever through reloads, version bumps, anything
  // else. The only way to re-seed is the in-app Reset (Profile Switcher →
  // Danger Zone).
  useEffect(() => {
    (async () => {
      // Bumped to v3 in 2026.05.05z to force a clean slate for every user
      // (testing flow). When v3 is missing, the seed path runs and wipes
      // everything before installing the new — currently empty — seed.
      const seedKey = "solene:seeded:real:v3";
      const seeded = await storage.get(seedKey);
      let e = await storage.get("solene:events");
      let initInv = null;
      if (!seeded) {
        // FIRST-EVER LAUNCH (or forced re-seed via key bump): wipe ALL
        // user-data keys so old data from previous seed versions doesn't
        // bleed through. We don't trust artifact-storage delete to land
        // synchronously, so we also stamp the wipe marker so subsequent
        // get() calls refuse to self-heal from artifact storage.
        try {
          localStorage.setItem(storage.WIPE_MARKER_KEY, String(Date.now()));
        } catch {}
        const dataKeys = [
          "solene:events", "solene:inventory", "solene:meetings",
          "solene:shifts:v3", "solene:diaperbag", "solene:onsite",
          "solene:notes", "solene:appointments", "solene:activeActivity",
          "solene:activePump", "solene:takeover", "solene:handoffNote",
          "solene:noteArchive", "solene:timeBank", "solene:dailyContent",
          "solene:events:backup", "solene:meetings:backup", "solene:inventory:backup",
          // Old seed flags — clear so they can't confuse anything.
          "solene:seeded:real:v2", "solene:seeded:real:v1",
          "solene:seeded:v3", "solene:seeded:v2", "solene:seeded:v1", "solene:seeded",
        ];
        for (const k of dataKeys) {
          try { await storage.delete(k); } catch {}
        }
        // Belt-and-suspenders: walk localStorage and remove any solene:*
        // keys that aren't the seed flag or wipe marker.
        try {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("solene:") && k !== seedKey && k !== storage.WIPE_MARKER_KEY) {
              toRemove.push(k);
            }
          }
          for (const k of toRemove) localStorage.removeItem(k);
        } catch {}

        e = seedHistoricalEvents();
        initInv = seedHistoricalInventory();
        // Stamp the seed flag so the seed path doesn't run again next boot.
        await storage.set(seedKey, true);
        await storage.set("solene:events", e);
        await storage.set("solene:inventory", initInv);
      }
      const inv = initInv || await storage.get("solene:inventory");
      const m = await storage.get("solene:meetings");
      const s = await storage.get("solene:shifts:v3");
      const db = await storage.get("solene:diaperbag");
      const os = await storage.get("solene:onsite");
      const nt = await storage.get("solene:notes");
      const ap = await storage.get("solene:appointments");
      const aa = await storage.get("solene:activeActivity");
      const ap_pump = await storage.get("solene:activePump");
      const tk = await storage.get("solene:takeover");
      const hn = await storage.get("solene:handoffNote");
      const na = await storage.get("solene:noteArchive");
      const tb = await storage.get("solene:timeBank");
      const dc = await storage.get("solene:dailyContent");
      const cu = await storage.get("solene:currentUser");
      if (e) setEvents(e.map(x => ({ ...x, ts: new Date(x.ts) })));
      if (inv) setInventory(inv.map(x => ({ ...x, pumpedAt: new Date(x.pumpedAt) })));
      // DATA LOSS DETECTION: if meetings loaded as empty but a backup snapshot
      // has data, surface this in the console + auto-restore from backup.
      // This catches cases where the storage layer wrote zero-state but the
      // user had real meetings (race condition, eviction, etc.).
      if (m && m.length > 0) {
        setMeetings(m);
      } else {
        try {
          const backupRaw = localStorage.getItem("solene:meetings:backup");
          const backup = backupRaw ? JSON.parse(backupRaw) : null;
          if (Array.isArray(backup) && backup.length > 0) {
            console.warn("[hydrate] meetings empty but backup has", backup.length, "entries — restoring from backup");
            setMeetings(backup);
            // Re-write the primary key so future loads don't have to fall back
            localStorage.setItem("solene:meetings", JSON.stringify(backup));
          } else {
            setMeetings(m || []);
          }
        } catch (err) {
          console.warn("[hydrate] backup recovery failed", err);
          setMeetings(m || []);
        }
      }
      if (s) setShifts(s);
      if (db) setDiaperBag(db);
      if (os) setOnsite(os);
      if (nt) setNotes(nt);
      if (ap) setAppointments(ap);
      if (aa) setActiveActivity(aa);
      if (ap_pump) setActivePump(ap_pump);
      // Takeovers do NOT persist across app loads.
      // The takeover state represents an actively-in-progress hand-off; if the
      // app was closed/refreshed, that flow is over. Either it ended (logged
      // already) or it was abandoned. Restoring it on load creates the
      // "daddy is covering mommy" stuck state. Clear unconditionally.
      storage.set("solene:takeover", null);
      if (hn) setHandoffNote(hn);
      if (na) setNoteArchive(na);
      if (tb) {
        // Self-heal: recompute balance from transaction log and use that as
        // source of truth. If the stored balance differs, the cache drifted
        // (likely from a previous code version with different conventions, a
        // partial write, or a removed transaction that didn't reverse cleanly).
        const recomputed = computeTimeBankBalance(tb.transactions);
        const stored = tb.balance || 0;
        if (recomputed !== stored) {
          console.warn(
            "[hydrate] time bank balance drift detected:",
            "stored =", stored, "recomputed =", recomputed,
            "→ using recomputed value"
          );
        }
        setTimeBank({
          balance: recomputed,
          transactions: tb.transactions || [],
        });
      }
      if (dc) setDailyContent(dc);
      if (cu) setCurrentUser(cu);
      // Clear the wipe marker now that hydrate has completed cleanly. While
      // the marker was present, get() refused to self-heal artifact storage,
      // so the boot installed fresh seed data without resurrection. We can
      // resume normal storage behavior on the next read.
      storage.clearWipeMarker();
      setHydrated(true);
    })();
  }, []);

  // === Cloud sync init ===
  // Fires once after mount. Steps:
  //   1. Read any stored family code from localStorage (lives outside the
  //      solene:* keyspace so a data wipe doesn't clear it)
  //   2. Probe /api/ping to detect whether the backend is available
  //   3. If backend available AND no code yet, flag setup modal to open
  //   4. If backend unavailable, app stays in local-only mode (current
  //      behavior — works fine in Claude artifact view, etc.)
  useEffect(() => {
    (async () => {
      // Read stored code
      let storedCode = null;
      try {
        storedCode = localStorage.getItem("ll:familyCode");
      } catch {}
      if (storedCode) {
        setFamilyCode(code => code || storedCode);
        // Code already exists — this is a reload, not first-time setup.
        // Mark initial sync as done so the polling loop can engage as soon
        // as cloudSyncAvailable comes back true. The polling loop will then
        // catch up on anything the partner wrote while this device was
        // offline (it'll see a server timestamp newer than 0 and pull).
        initialSyncDoneRef.current = true;
      }

      // Probe backend
      try {
        const res = await fetch("/api/ping", { method: "GET" });
        if (res.ok) {
          setCloudSyncAvailable(true);
          // No stored code AND user hasn't previously dismissed setup?
          // Show the setup modal so they can decide whether to enable cloud sync.
          let dismissed = false;
          try { dismissed = !!localStorage.getItem("ll:familyCodeSetupDismissed"); } catch {}
          if (!storedCode && !dismissed) {
            setShowFamilyCodeSetup(true);
          }
        }
      } catch {
        // Network failure or no /api routes — local-only mode.
        // No need to surface this; the app just works locally.
      }
    })();
  }, []);

  // === Wire family code into storage layer ===
  // Whenever familyCode changes (e.g. user generated/entered/reset), update
  // the storage layer's internal context so subsequent set() calls know
  // whether to push to cloud. Also wires the offline-indicator callback so
  // the storage layer can flip the cloudSyncStatus state when a cloud write
  // fails. This is the only place the connection between React state and
  // the storage object is made; everything else just calls storage.set().
  useEffect(() => {
    storage.setCloudContext({
      familyCode: familyCode,
      onCloudWriteError: () => {
        // Don't overwrite "syncing" status with "offline" — initial sync errors
        // are handled separately. We only flip to offline during steady-state.
        setCloudSyncStatus(prev => prev === "syncing" ? prev : "offline");
      },
    });
  }, [familyCode]);

  // === State applier ===
  // Maps each cloud key to its corresponding React setter, with date-rehydration
  // for fields whose values include Date objects. Used by both the polling
  // refresh and the initial download-from-cloud routine. Keeping this map in
  // one place means the polling logic doesn't need to know about per-field
  // hydration rules.
  //
  // We MUST set syncingFromCloudRef = true before applying these so the
  // autosave effects don't bounce the same data right back to the cloud.
  // The ref is cleared after a microtask (queueMicrotask) so the state update
  // has time to fire its effect first.
  const cloudKeySetters = useMemo(() => ({
    "solene:events":          (v) => setEvents(Array.isArray(v) ? v.map(x => ({ ...x, ts: new Date(x.ts) })) : []),
    "solene:inventory":       (v) => setInventory(Array.isArray(v) ? v.map(x => ({ ...x, pumpedAt: new Date(x.pumpedAt) })) : []),
    "solene:meetings":        (v) => setMeetings(Array.isArray(v) ? v : []),
    "solene:shifts:v3":       (v) => v && typeof v === "object" && setShifts(v),
    "solene:diaperbag":       (v) => v && setDiaperBag(v),
    "solene:onsite":          (v) => setOnsite(v),
    "solene:notes":           (v) => setNotes(Array.isArray(v) ? v : []),
    "solene:appointments":    (v) => setAppointments(Array.isArray(v) ? v : []),
    "solene:activeActivity":  (v) => setActiveActivity(v),
    "solene:activePump":      (v) => setActivePump(v),
    "solene:takeover":        (v) => setTakeover(v),
    "solene:handoffNote":     (v) => setHandoffNote(v),
    "solene:noteArchive":     (v) => setNoteArchive(Array.isArray(v) ? v : []),
    "solene:timeBank":        (v) => v && setTimeBank(v),
    "solene:dailyContent":    (v) => v && setDailyContent(v),
    "solene:currentUser":     (v) => v && setCurrentUser(v),
  }), []);

  // === Polling loop ===
  // Every 5 seconds while in foreground:
  //   1. Call cloudList to get { keys, updatedAt }
  //   2. If updatedAt > our last-known, pull each key and apply via setters
  //   3. Update last-known timestamp
  //   4. Set cloudSyncStatus = "ok" (clears any prior offline pip)
  //
  // Paused when: no family code, cloud unavailable, initial sync not done,
  // tab hidden, or wipe in progress.
  //
  // Why 5 seconds: balance between "feels real-time" (under 10s) and not
  // hammering the API. 5s × ~3000s/day in active foreground use = 600 reqs/
  // day per device. Two devices → 1200 reqs/day. Free tier = 30k/day. Plenty.
  useEffect(() => {
    if (!familyCode || !cloudSyncAvailable) return;
    let cancelled = false;

    const pollOnce = async () => {
      if (cancelled) return;
      if (!initialSyncDoneRef.current) return; // wait for initial sync
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (isWiping()) return;

      try {
        const list = await storage.cloudList(familyCode);
        if (!list) {
          // Network failure / API error. Set offline pip but don't crash.
          setCloudSyncStatus(prev => prev === "syncing" ? prev : "offline");
          return;
        }
        const serverTs = list.updatedAt || 0;
        if (serverTs <= lastCloudTimestampRef.current) {
          // Nothing new. Just confirm we're online.
          setCloudSyncStatus(prev => prev === "syncing" ? prev : "ok");
          return;
        }

        // Server has newer data. Fetch each known key and apply.
        // Set the syncing flag BEFORE any setX so autosaves skip cloud-push.
        syncingFromCloudRef.current = true;
        storage.setCloudContext({ syncingFromCloud: true });

        for (const key of (list.keys || [])) {
          const setter = cloudKeySetters[key];
          if (!setter) continue;
          const value = await storage.cloudGet(familyCode, key);
          if (value !== null) {
            try { setter(value); } catch (e) { console.warn("[poll] setter failed for", key, e); }
          }
        }

        lastCloudTimestampRef.current = serverTs;
        setCloudSyncStatus("ok");

        // Clear the syncing flag after a small delay so React has time to
        // batch and process all the state updates above (and their autosave
        // effects). Using 200ms as a generous safety margin — the autosaves
        // typically run within one render cycle (<16ms), but cloud writes
        // happen async so we need to make sure none are in flight.
        setTimeout(() => {
          syncingFromCloudRef.current = false;
          storage.setCloudContext({ syncingFromCloud: false });
        }, 200);
      } catch (e) {
        console.warn("[poll] error:", e);
        setCloudSyncStatus(prev => prev === "syncing" ? prev : "offline");
      }
    };

    // Poll immediately, then every 5 seconds.
    pollOnce();
    const interval = setInterval(pollOnce, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [familyCode, cloudSyncAvailable, cloudKeySetters]);

  // Autosave: persist each piece of state when it changes, after hydration.
  // Each effect is guarded by the global `__soleneWiping` flag so that during
  // a Reset All Data flow, no in-flight setState can rewrite freshly-wiped
  // storage. This is critical: without the guard, clicking Reset triggers
  // setEvents([]) which fires this effect, which writes [] to storage —
  // which seems harmless until you realize it can race with the seed-flag
  // delete and effectively re-stamp the seed flag's absence with empty data,
  // skipping the seed install on next load. Worse, in some browsers the
  // localStorage write succeeds AFTER wipeAll's deletes finish.
  const isWiping = () => typeof window !== "undefined" && window.__soleneWiping === true;
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:events", events); }, [events, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:inventory", inventory); }, [inventory, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:meetings", meetings); }, [meetings, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:shifts:v3", shifts); }, [shifts, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:diaperbag", diaperBag); }, [diaperBag, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:onsite", onsite); }, [onsite, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:notes", notes); }, [notes, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:appointments", appointments); }, [appointments, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:activeActivity", activeActivity); }, [activeActivity, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:activePump", activePump); }, [activePump, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:takeover", takeover); }, [takeover, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:handoffNote", handoffNote); }, [handoffNote, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:noteArchive", noteArchive); }, [noteArchive, hydrated]);

  // Helper: replace current handoff note, archiving any existing one
  const setNoteWithArchive = (newNote) => {
    if (handoffNote) {
      setNoteArchive(prev => [
        { ...handoffNote, replaced: true, replacedAt: new Date().toISOString() },
        ...prev,
      ].slice(0, 50));
    }
    setHandoffNote(newNote);
  };
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:timeBank", timeBank); }, [timeBank, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:dailyContent", dailyContent); }, [dailyContent, hydrated]);
  useEffect(() => { if (hydrated && !isWiping()) storage.set("solene:currentUser", currentUser); }, [currentUser, hydrated]);

  // Weather + UV
  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,uv_index,weather_code,relative_humidity_2m&hourly=uv_index,temperature_2m,precipitation_probability&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
        const r = await fetch(url);
        const data = await r.json();
        setWeather(data);
      } catch {}
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(40.7128, -74.0060)
      );
    } else {
      fetchWeather(40.7128, -74.0060);
    }
  }, []);

  // Fetch daily French phrases + verse — once per day, cached in storage
  useEffect(() => {
    if (!hydrated) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    if (dailyContent[todayKey]) return; // already have today's content
    if (loadingDaily) return;

    setLoadingDaily(true);
    (async () => {
      try {
        const ageStr = fmtAge(BIRTHDAY, new Date());
        const dayOfWeek = new Date().toLocaleDateString(undefined, { weekday: "long" });
        const prompt = `Generate daily content for new parents of a baby named Solène (currently ${ageStr}, born Jan 23 2026). Today is ${dayOfWeek}.

Return a JSON object with these keys:

1. "frenchBeginner" - For a Daddy who is a beginner French learner. Provide:
   - "phrase": a useful baby-directed French phrase or word (something he can actually say to Solène today, e.g. "Bonjour ma chérie", "Tu es magnifique", body parts, simple commands, or affectionate terms)
   - "translation": English meaning
   - "phonetic": pronunciation guide using English approximation (e.g. "boh-ZHOOR mah shay-REE")
   - "context": 1-sentence note on when to use it
   - "example": one full short example sentence using it, with English translation

2. "frenchIntermediate" - For Mommy, an intermediate speaker recapturing fluency. Provide:
   - "phrase": a richer expression, idiom, or grammatically interesting structure (could be baby-related or general parenting/life vocabulary)
   - "translation": English meaning
   - "phonetic": pronunciation guide
   - "context": brief note on usage, register, or cultural nuance
   - "example": one full sentence using it, with English translation

3. "verse" - An encouraging Bible verse for first-time parents potentially navigating exhaustion, postpartum challenges, or self-doubt. Choose verses that are:
   - Genuinely encouraging and gentle (not preachy or guilt-inducing)
   - Topically relevant to: rest, patience, exhaustion, gentleness, hope, or new parenthood
   - From varied books (Psalms, Isaiah, Lamentations, Philippians, etc.) — don't always pick the obvious ones

   Provide:
   - "reference": e.g. "Psalm 23:1-3"
   - "text": the verse text (NIV or ESV-style modern translation)
   - "encouragement": a 1-2 sentence warm reflection on how this might speak to a tired new parent today (no preaching, just empathy)

Vary content based on the day so it doesn't feel repetitive. Return ONLY the JSON object, no preamble, no markdown fences.`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const data = await response.json();
        const text = (data.content || []).map(c => c.text || "").join("");
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        setDailyContent(prev => ({
          ...prev,
          [todayKey]: {
            frenchBeginner: parsed.frenchBeginner,
            frenchIntermediate: parsed.frenchIntermediate,
            verse: parsed.verse,
            generatedAt: new Date().toISOString(),
          },
        }));
      } catch (err) {
        console.error("Daily content fetch failed:", err);
      } finally {
        setLoadingDaily(false);
      }
    })();
  }, [hydrated, dailyContent, loadingDaily]);

  const mode = getTimeMode(now);
  // Theme palette key. Derived from the user's chosen theme override
  // (day/dusk). Decoupled from `mode` so TimeOrb can still show sun/moon
  // based on real time of day, while the COLORS follow the user's pick.
  const themeMode = themeOverride === "dusk" ? "dusk" : "day";
  const C = PALETTES[themeMode];

  // Compute effective shifts: base shifts → auto-projected for commitments → onsite override
  // Since projection happens later in the file, we declare the layered logic to use it
  // But projectedShifts is defined later; activeShifts is recomputed below after we have it

  // Last events
  const lastFeed = events.filter(e => e.type === "feed" || e.type === "breastfeed").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastDiaper = events.filter(e => e.type === "diaper").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastSleep = events.filter(e => e.type === "sleep_down").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastWake = events.filter(e => e.type === "sleep_up").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastWakeConfirmed = events.filter(e => e.type === "wake_confirmed").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastPump = events.filter(e => e.type === "pump").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastBath = events.filter(e => e.type === "bath").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastSkincare = events.filter(e => e.type === "skincare").sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];

  // Age-aware diaper thresholds. Uses age-band changeIntervalH from norms:
  //   warn = upper end of normal band (start prompting at the edge)
  //   urgent = upper + 1h (definitively over)
  // For 0–2mo this is warn=3h / urgent=4h, for 2–12mo it's warn=4h / urgent=5h.
  // Falls back to the original DIAPER_WARN_HOURS / DIAPER_URGENT_HOURS constants
  // if norms are unavailable (defensive).
  const { diaperWarnH, diaperUrgentH } = useMemo(() => {
    const ageMonthsForDiaper = (now - BIRTHDAY) / (1000 * 60 * 60 * 24 * 30.4375);
    const norms = getAgeNorms(ageMonthsForDiaper);
    if (norms?.changeIntervalH) {
      return {
        diaperWarnH: norms.changeIntervalH[1],
        diaperUrgentH: norms.changeIntervalH[1] + 1,
      };
    }
    return { diaperWarnH: DIAPER_WARN_HOURS, diaperUrgentH: DIAPER_URGENT_HOURS };
  }, [now]);

  // Calculate next pump time (start-to-start from last pump start)
  const nextPumpAt = useMemo(() => {
    if (!lastPump) return null;
    const startTime = lastPump.mode === "start"
      ? new Date(lastPump.ts)
      : new Date(new Date(lastPump.ts).getTime() - (lastPump.durationMin || 30) * 60000);
    return new Date(startTime.getTime() + PUMP_INTERVAL_HRS * 3600000);
  }, [lastPump]);

  // Inventory math
  const liveInventory = useMemo(() => {
    return inventory.map(item => {
      const ageHrs = (now - new Date(item.pumpedAt)) / 3600000;
      let limit, expired, risky;
      if (item.location === "rt") {
        limit = BM_RT_HOURS;
        expired = ageHrs >= BM_RT_HOURS_HARD;
        risky = ageHrs >= BM_RT_HOURS && ageHrs < BM_RT_HOURS_HARD;
      } else if (item.location === "freezer") {
        limit = BM_FREEZER_HOURS;
        expired = ageHrs >= BM_FREEZER_HOURS;
        risky = false;
      } else {
        // fridge
        limit = BM_FRIDGE_HOURS;
        expired = ageHrs >= BM_FRIDGE_HOURS;
        risky = false;
      }
      const remaining = limit - ageHrs;
      return { ...item, ageHrs, limit, remaining, expired, risky };
    });
  }, [inventory, now]);

  const totalSafeOz = liveInventory.filter(i => !i.expired).reduce((s, i) => s + i.oz, 0);
  const rtSafeOz = liveInventory.filter(i => !i.expired && i.location === "rt").reduce((s, i) => s + i.oz, 0);
  const fridgeOz = liveInventory.filter(i => !i.expired && i.location === "fridge").reduce((s, i) => s + i.oz, 0);
  const freezerOz = liveInventory.filter(i => !i.expired && i.location === "freezer").reduce((s, i) => s + i.oz, 0);
  const feedsRunway = Math.floor(totalSafeOz / TYPICAL_FEED_OZ);
  const hoursRunway = feedsRunway * TYPICAL_FEED_INTERVAL_HRS;

  // Today's calorie burn (mom)
  const todayCalories = useMemo(() => {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    let kcal = 0;
    for (const e of events) {
      if (e.ts < startOfDay) continue;
      if (e.type === "pump" && e.oz) kcal += e.oz * KCAL_PER_OZ_BM;
      if (e.type === "breastfeed" && e.totalDurationMin) kcal += e.totalDurationMin * KCAL_PER_BF_MINUTE;
    }
    return Math.round(kcal);
  }, [events, now]);

  // Logging
  const addEvent = (ev) => {
    // Always store ts as ISO string for consistent comparison/serialization.
    // Defensive: if a form passes an invalid Date (e.g. empty datetime-local),
    // toISOString throws. Fall back to current time and log a warning rather
    // than silently dropping the entry.
    const tsValue = ev.ts || new Date();
    let dateObj = tsValue instanceof Date ? tsValue : new Date(tsValue);
    if (isNaN(dateObj.getTime())) {
      console.warn("[addEvent] invalid ts received, falling back to now:", ev.ts);
      dateObj = new Date();
    }
    const tsISO = dateObj.toISOString();
    const newEv = { ...ev, id: crypto.randomUUID(), ts: tsISO };

    // Auto-wake inference: if baby is currently down (last sleep event is sleep_down,
    // no sleep_up after) and the user is now logging an event that implies baby is awake,
    // insert a synthetic sleep_up event 1 min before the new event.
    // Skip for: pump (mom-only, baby unaffected), wake_confirmed (already a wake signal),
    // sleep_down/sleep_up (sleep events themselves), takeover (parent admin), and any
    // event explicitly marked dreamFeed:true (night feed without waking baby).
    const skipsAutoWake = new Set(["pump", "wake_confirmed", "sleep_down", "sleep_up", "takeover", "bath", "skincare"]);
    let autoWakeEvent = null;
    if (!skipsAutoWake.has(ev.type) && !ev.dreamFeed) {
      // Find last sleep_down and last sleep_up (use coerced Date comparisons)
      const sleepDowns = events.filter(e => e.type === "sleep_down").sort((a, b) => new Date(b.ts) - new Date(a.ts));
      const sleepUps = events.filter(e => e.type === "sleep_up").sort((a, b) => new Date(b.ts) - new Date(a.ts));
      const lastDown = sleepDowns[0];
      const lastUp = sleepUps[0];
      const downAfterUp = lastDown && (!lastUp || new Date(lastDown.ts) > new Date(lastUp.ts));
      if (downAfterUp) {
        // Baby is currently down → infer a wake 1 min before this new event
        const wakeTs = new Date(new Date(tsISO).getTime() - 60000).toISOString();
        // Only insert if wake would be after the sleep_down (defensive)
        if (new Date(wakeTs) > new Date(lastDown.ts)) {
          autoWakeEvent = {
            id: crypto.randomUUID(),
            type: "sleep_up",
            ts: wakeTs,
            estimated: true,
            inferredFrom: ev.type,
          };
        }
      }
    }

    setEvents(prev => {
      const next = [...prev];
      if (autoWakeEvent) next.push(autoWakeEvent);
      next.push(newEv);
      // SYNC PERSIST: write straight to localStorage so data is durable
      // even if the runtime tears down before the React effect runs.
      try {
        localStorage.setItem("solene:events", JSON.stringify(next));
        localStorage.setItem("solene:events:backup", JSON.stringify(prev));
      } catch (e) { console.warn("[addEvent] sync persist failed", e); }
      return next;
    });

    if (ev.type === "feed" && ev.source && ev.source.includes("BM") && ev.oz) {
      drainInventory(ev.oz);
    }
    // Only add to inventory when the pump session has ENDED (mode==="end" OR no mode set).
    // The "start" mode doesn't have oz to record yet.
    if (ev.type === "pump" && ev.oz && ev.mode !== "start") {
      setInventory(prev => [...prev, {
        id: crypto.randomUUID(),
        oz: ev.oz,
        pumpedAt: tsISO,
        location: ev.location || "rt",
      }]);
    }
    setShowLogger(false);
    setLoggerType(null);
  };

  const addNote = (note) => {
    // When the dedup flow marks a recurrence, it calls onSubmit(null) to
    // signal "I already updated an existing note via updateNote, just close
    // the modal." Skip the push in that case.
    if (note) {
      setNotes(prev => [...prev, { ...note, id: crypto.randomUUID(), ts: note.ts || new Date().toISOString() }]);
    }
    setShowLogger(false);
    setLoggerType(null);
  };
  const removeNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));
  const updateNote = (id, patch) => setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));

  const addAppointment = (appt) => setAppointments(prev => [...prev, { ...appt, id: crypto.randomUUID() }]);
  const removeAppointment = (id) => setAppointments(prev => prev.filter(a => a.id !== id));

  const drainInventory = (oz) => {
    setInventory(prev => {
      const sorted = [...prev]
        .filter(i => (now - new Date(i.pumpedAt)) / 3600000 < (i.location === "rt" ? BM_RT_HOURS : BM_FRIDGE_HOURS))
        .sort((a, b) => {
          if (a.location !== b.location) return a.location === "rt" ? -1 : 1;
          return new Date(a.pumpedAt) - new Date(b.pumpedAt);
        });
      let remaining = oz;
      const out = [...prev];
      for (const item of sorted) {
        if (remaining <= 0) break;
        const idx = out.findIndex(x => x.id === item.id);
        if (idx === -1) continue;
        if (item.oz <= remaining) {
          remaining -= item.oz;
          out.splice(idx, 1);
        } else {
          out[idx] = { ...item, oz: item.oz - remaining };
          remaining = 0;
        }
      }
      return out;
    });
  };

  const moveToFridge = (id) => setInventory(prev => prev.map(i => i.id === id ? { ...i, location: "fridge" } : i));
  const removeInventory = (id) => setInventory(prev => prev.filter(i => i.id !== id));

  // Bulk import: atomically add many events at once, plus generate inventory
  // entries for any pump events that have oz. This is the bulk-paste handler;
  // the parser runs first (in BulkImportModal), the user previews, then this
  // commits the whole batch. Sync-persist on the way out so a refresh after
  // bulk add doesn't lose anything.
  const bulkAddEvents = (parsedEvents) => {
    // Each parsedEvent is a clean event object {type, ts, oz, source, ...}.
    // Normalize ts to ISO string for storage.
    const newEvents = parsedEvents.map(ev => {
      const tsValue = ev.ts || new Date();
      const dateObj = tsValue instanceof Date ? tsValue : new Date(tsValue);
      const tsISO = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
      return { ...ev, id: crypto.randomUUID(), ts: tsISO };
    });

    // Pump events with oz also create inventory bottles, mirroring the
    // single-event addEvent flow. Mode "start" is excluded (no oz to bank).
    const newInventoryItems = [];
    for (const ev of newEvents) {
      if (ev.type === "pump" && ev.oz && ev.mode !== "start") {
        newInventoryItems.push({
          id: crypto.randomUUID(),
          oz: ev.oz,
          pumpedAt: ev.ts,
          location: ev.location || "rt",
        });
      }
    }

    setEvents(prev => {
      const next = [...prev, ...newEvents];
      try {
        localStorage.setItem("solene:events", JSON.stringify(next));
        localStorage.setItem("solene:events:backup", JSON.stringify(prev));
      } catch (e) { console.warn("[bulkAddEvents] events persist failed", e); }
      return next;
    });
    if (newInventoryItems.length > 0) {
      setInventory(prev => {
        const next = [...prev, ...newInventoryItems];
        try {
          localStorage.setItem("solene:inventory", JSON.stringify(next));
        } catch (e) { console.warn("[bulkAddEvents] inventory persist failed", e); }
        return next;
      });
    }
    return { eventCount: newEvents.length, inventoryCount: newInventoryItems.length };
  };

  const removeEvent = (id) => {
    const ev = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));

    // Reverse the time bank entry if a takeover is being removed.
    // Strategy: filter out the matching transaction, then re-derive balance
    // from the remaining ledger. Avoids hand-rolled balance arithmetic which
    // is error-prone.
    if (ev && ev.type === "takeover") {
      const mins = ev.durationMin || 0;
      const newTransactions = timeBank.transactions.filter(t => !(
        t.kind === "owed" &&
        t.from === ev.coveringParent &&
        t.to === ev.originalParent &&
        t.reason === "Impromptu takeover" &&
        t.mins === mins
      ));
      setTimeBank({
        balance: computeTimeBankBalance(newTransactions),
        transactions: newTransactions,
      });
    }
  };
  const updateEvent = (id, updated) => {
    const oldEvent = events.find(e => e.id === id);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));

    // If a takeover's duration changed, update the matching ledger entry's
    // mins field, then re-derive balance from the full ledger.
    if (oldEvent && oldEvent.type === "takeover" && updated.type === "takeover") {
      const oldMins = oldEvent.durationMin || 0;
      const newMins = updated.durationMin || 0;
      if (oldMins !== newMins) {
        const newTransactions = timeBank.transactions.map(t => {
          if (
            t.kind === "owed" &&
            t.from === oldEvent.coveringParent &&
            t.to === oldEvent.originalParent &&
            t.reason === "Impromptu takeover" &&
            t.mins === oldMins
          ) {
            return { ...t, mins: newMins };
          }
          return t;
        });
        setTimeBank({
          balance: computeTimeBankBalance(newTransactions),
          transactions: newTransactions,
        });
      }
    }
  };

  // Meeting conflicts (purely informational now - the projection auto-handles them)
  const meetingsToday = useMemo(() => {
    const real = meetings.filter(m => new Date(m.start).toDateString() === now.toDateString());

    // ACTIVE takeover (in-progress) is still injected as a synthetic block on the
    // original parent so the projection picks it up while the takeover is happening.
    // Completed takeovers are handled by shiftsWithSplits below — no synthetic meeting needed.
    const takeoverMeetings = [];
    if (takeover) {
      const start = new Date(takeover.startedAt);
      takeoverMeetings.push({
        id: `takeover-active`,
        parent: takeover.originalParent,
        start: start.toISOString(),
        end: now.toISOString(),
        level: "red",
        label: `Active takeover · ${takeover.coveringParent} covering`,
        synthetic: true,
        active: true,
      });
    }

    return [...real, ...takeoverMeetings];
  }, [meetings, takeover, now]);

  // SHIFTS WITH SPLITS: apply two carve operations per takeover:
  //   1. Carve the takeover-window itself out of the debtor's then-current shift,
  //      assigning that exact slice to the creditor (who actually covered it).
  //   2. Carve the same number of minutes off the front of the creditor's NEXT shift,
  //      assigning that mini-slice to the debtor as repayment.
  const shiftsWithSplits = useMemo(() => {
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

    const result = {
      Mommy: [...shifts.Mommy],
      Daddy: [...shifts.Daddy],
    };

    // Helper: carve a [carveStart, carveEnd] window (HH:MM strings) out of `parent`'s shifts,
    // reassigning that slice to `targetParent` with optional annotations.
    // Handles the case where the carve falls fully inside one shift (creating up to 3 pieces).
    const carveWindow = (parent, targetParent, carveStartHHMM, carveEndHHMM, annotations = {}) => {
      const carveStartMin = toMin(carveStartHHMM);
      const carveEndMin = toMin(carveEndHHMM);
      // For each of `parent`'s shifts, see if it overlaps the carve window
      const next = [];
      for (const s of result[parent]) {
        const sStartMin = toMin(s.start);
        const sEndMin = toMin(s.end);
        // Handle overnight shifts where end < start: fold to >24h for comparison
        const sEndAdj = sEndMin <= sStartMin ? sEndMin + 24 * 60 : sEndMin;
        const cStartAdj = carveStartMin < sStartMin && (carveStartMin + 24 * 60) <= sEndAdj
          ? carveStartMin + 24 * 60 : carveStartMin;
        const cEndAdj = carveEndMin < sStartMin && (carveEndMin + 24 * 60) <= sEndAdj
          ? carveEndMin + 24 * 60 : carveEndMin;

        const overlapStart = Math.max(sStartMin, cStartAdj);
        const overlapEnd = Math.min(sEndAdj, cEndAdj);
        if (overlapStart >= overlapEnd) {
          // No overlap → keep shift unchanged
          next.push(s);
          continue;
        }

        // Compute up to 3 pieces:
        // a) [s.start, overlapStart) → still parent
        // b) [overlapStart, overlapEnd) → targetParent (carved)
        // c) [overlapEnd, s.end) → still parent
        const fmt = (mins) => {
          const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
          return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        };
        if (overlapStart > sStartMin) {
          next.push({ start: s.start, end: fmt(overlapStart) });
        }
        // The carved piece goes to targetParent (push later, outside this loop)
        result[targetParent].push({
          start: fmt(overlapStart),
          end: fmt(overlapEnd),
          ...annotations,
        });
        if (overlapEnd < sEndAdj) {
          next.push({ start: fmt(overlapEnd), end: s.end });
        }
      }
      result[parent] = next;
    };

    // Process completed takeover events for today
    const todayTakeovers = events
      .filter(e => e.type === "takeover" && new Date(e.ts).toDateString() === now.toDateString())
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));

    for (const e of todayTakeovers) {
      const oweMin = e.durationMin || 0;
      if (oweMin <= 0) continue;
      const debtor = e.originalParent;       // shift was originally theirs
      const creditor = e.coveringParent;     // covered the slice

      // Compute takeover-window HH:MM strings
      const takeoverStart = new Date(e.ts);
      const takeoverEnd = new Date(takeoverStart.getTime() + oweMin * 60000);
      const tStartHHMM = `${String(takeoverStart.getHours()).padStart(2, "0")}:${String(takeoverStart.getMinutes()).padStart(2, "0")}`;
      const tEndHHMM = `${String(takeoverEnd.getHours()).padStart(2, "0")}:${String(takeoverEnd.getMinutes()).padStart(2, "0")}`;

      // 1. Carve the takeover window itself out of debtor's shift, give to creditor
      carveWindow(debtor, creditor, tStartHHMM, tEndHHMM, {
        _isTakeoverSlice: true,
        _takeoverEventId: e.id,
        _takeoverDurationMin: oweMin,
      });

      // 2. Find creditor's NEXT shift starting AFTER takeover end (in absolute time),
      //    using the post-step-1 result (don't carve into the takeover slice itself).
      const takeoverEndMs = takeoverEnd.getTime();
      const creditorShifts = result[creditor].map(s => {
        // Skip the takeover slice itself (it's a creditor-piece but represents the past)
        if (s._isTakeoverSlice) return null;
        const sStart = new Date(now);
        const [sh, sm] = s.start.split(":").map(Number);
        sStart.setHours(sh, sm, 0, 0);
        if (sStart.getTime() < takeoverEndMs) sStart.setDate(sStart.getDate() + 1);
        return { s, absStart: sStart };
      }).filter(Boolean).sort((a, b) => a.absStart - b.absStart);

      const target = creditorShifts[0]?.s;
      if (!target) continue;

      // Carve first oweMin minutes off the FRONT of target shift, give to debtor
      const targetStartMin = toMin(target.start);
      const targetEndMin = toMin(target.end);
      const carveEndMin = (targetStartMin + oweMin) % (24 * 60);
      const carveEndHHMM = `${String(Math.floor(carveEndMin / 60)).padStart(2, "0")}:${String(carveEndMin % 60).padStart(2, "0")}`;

      // Compute total available duration of target (handle overnight)
      const targetDur = targetEndMin <= targetStartMin
        ? (24 * 60 - targetStartMin) + targetEndMin
        : targetEndMin - targetStartMin;

      if (oweMin >= targetDur) {
        // Owe ≥ target duration: flip whole target shift to debtor
        const idx = result[creditor].findIndex(s => s.start === target.start && s.end === target.end);
        if (idx === -1) continue;
        result[creditor].splice(idx, 1);
        result[debtor].push({
          ...target,
          _isRepayment: true,
          _takeoverEventId: e.id,
          _takeoverDurationMin: oweMin,
        });
      } else {
        // Partial carve: front slice → debtor, remainder → creditor
        const idx = result[creditor].findIndex(s => s.start === target.start && s.end === target.end);
        if (idx === -1) continue;
        result[creditor].splice(idx, 1);
        result[debtor].push({
          start: target.start,
          end: carveEndHHMM,
          _isRepayment: true,
          _takeoverEventId: e.id,
          _takeoverDurationMin: oweMin,
        });
        result[creditor].push({
          start: carveEndHHMM,
          end: target.end,
        });
      }
    }

    // Sort both by start time
    result.Mommy.sort((a, b) => toMin(a.start) - toMin(b.start));
    result.Daddy.sort((a, b) => toMin(a.start) - toMin(b.start));

    return result;
  }, [shifts, events, now]);

  // PROJECTION: auto-apply commitments to base shifts to get the "actual" plan for today.
  // For each red/yellow commitment that overlaps a parent's shift, the OTHER parent covers
  // the conflicting block — IF they aren't also blocked at that time.
  const projectedShifts = useMemo(() => {
    // Start from base shifts; we'll annotate each shift block with who's covering and why
    const projected = { Mommy: [], Daddy: [] };
    const swaps = []; // { originalParent, coveringParent, shift, reason, blocked? }

    // Helper: is a parent blocked (red or yellow) at the given absolute time window?
    const isParentBlocked = (parent, windowStart, windowEnd) => {
      return meetingsToday.some(m => {
        if (m.parent !== parent) return false;
        if (m.level === "green") return false;
        const ms = new Date(m.start);
        const me = new Date(m.end);
        return ms < windowEnd && me > windowStart;
      });
    };

    for (const parent of ["Mommy", "Daddy"]) {
      const otherParent = parent === "Mommy" ? "Daddy" : "Mommy";
      for (const s of shiftsWithSplits[parent]) {
        // Compute today's absolute window for this shift
        const sStart = new Date(now);
        const [sh, sm] = s.start.split(":").map(Number);
        sStart.setHours(sh, sm, 0, 0);
        const sEnd = new Date(now);
        const [eh, em] = s.end.split(":").map(Number);
        sEnd.setHours(eh, em, 0, 0);
        if (sEnd <= sStart) sEnd.setDate(sEnd.getDate() + 1);

        // Does this parent have a red/yellow commitment overlapping this shift?
        const blocking = meetingsToday.find(m => {
          if (m.parent !== parent || m.level === "green") return false;
          const ms = new Date(m.start);
          const me = new Date(m.end);
          return ms < sEnd && me > sStart;
        });

        if (blocking) {
          const isRedemption = (blocking.label || "").startsWith("Time bank:");
          const isTakeover = blocking.synthetic === true && !blocking.isRepayment;
          const isRepayment = blocking.isRepayment === true;
          const otherBlocked = isParentBlocked(otherParent, sStart, sEnd);
          // CARVING for ordinary commitments: when a commitment overlaps PART
          // of a shift (not the whole thing), split the shift into "free →
          // covered → free" slices instead of swapping the whole shift. This
          // keeps each parent on duty during the time they're actually free.
          //
          // Carving is skipped for takeovers/repayments/redemptions (those
          // come pre-carved from shiftsWithSplits upstream) and skipped when
          // the other parent is also blocked (no point carving — both stuck).
          const commitStart = new Date(blocking.start);
          const commitEnd = new Date(blocking.end);
          const isOrdinary = !isTakeover && !isRepayment && !isRedemption;
          const canCarve = isOrdinary && !otherBlocked
            && (commitStart > sStart || commitEnd < sEnd); // not fully covering the shift
          const MIN_SLICE_MIN = 15;

          // Helper: format a Date back to "HH:MM" for the shift block format
          const fmtHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          const minBetween = (a, b) => Math.round((b - a) / 60000);

          if (canCarve) {
            // Compute up to three slices: free-pre, covered, free-post.
            // Clamp commitment edges to within the shift so we work with the
            // overlap region only.
            const overlapStart = commitStart > sStart ? commitStart : sStart;
            const overlapEnd = commitEnd < sEnd ? commitEnd : sEnd;
            const preDur = minBetween(sStart, overlapStart);
            const coveredDur = minBetween(overlapStart, overlapEnd);
            const postDur = minBetween(overlapEnd, sEnd);

            // Build slice list, absorbing micro-fragments into neighbors.
            // If pre is too small, fold it into covered (parent gives up the
            // tiny pre-window since it's not worth a hand-off). Same for post.
            let slices = [];
            const pushSlice = (startD, endD, owner, isCovered) => {
              if (minBetween(startD, endD) < MIN_SLICE_MIN) {
                // Merge into previous slice if any
                if (slices.length > 0) {
                  slices[slices.length - 1].end = endD;
                } else {
                  // No prev — just start with this one (will be merged forward)
                  slices.push({ start: startD, end: endD, owner, isCovered });
                }
              } else {
                slices.push({ start: startD, end: endD, owner, isCovered });
              }
            };
            if (preDur > 0) pushSlice(sStart, overlapStart, parent, false);
            if (coveredDur > 0) pushSlice(overlapStart, overlapEnd, otherParent, true);
            if (postDur > 0) pushSlice(overlapEnd, sEnd, parent, false);

            // Re-resolve owners after merges: if a merged slice now spans the
            // commitment window, ownership defaults to the parent UNLESS the
            // commitment is the dominant portion (in which case other parent).
            // Simpler approach: just push slices as built. Ownership of each
            // surviving slice is whoever was assigned at push time; merging
            // forward just extends the time window, owner is preserved.

            // Push slices to projection
            for (const sl of slices) {
              const sliceShift = {
                start: fmtHM(sl.start),
                end: fmtHM(sl.end),
                _carvedFrom: { start: s.start, end: s.end },
              };
              if (sl.isCovered) {
                projected[sl.owner].push({ ...sliceShift, _coveringFor: parent, _reason: blocking.label || "commitment", _isCarvedSlice: true });
                swaps.push({
                  originalParent: parent,
                  coveringParent: sl.owner,
                  shift: sliceShift,
                  reason: blocking.label || "commitment",
                  level: blocking.level,
                  blocked: false,
                  kind: "commitment",
                  meetingId: blocking.id,
                  carved: true,
                  carvedFrom: { start: s.start, end: s.end },
                });
              } else {
                // Free slice — original parent keeps it. Mark it as a carved
                // residual so balance/anti-cluster passes don't relocate it
                // (it's intrinsically tied to its parent — it's the leftover
                // of their own shift after the commitment ended).
                projected[sl.owner].push({ ...sliceShift, _isCarvedFree: true });
              }
            }
          } else if (!otherBlocked) {
            // Whole-shift swap (commitment fully covers shift, OR special-kind blocking)
            projected[otherParent].push({ ...s, _coveringFor: parent, _reason: blocking.label || "commitment" });
            swaps.push({
              originalParent: parent,
              coveringParent: otherParent,
              shift: s,
              reason: blocking.label || "commitment",
              level: blocking.level,
              blocked: false,
              kind: isRepayment ? "repayment" : isTakeover ? "takeover" : isRedemption ? "redemption" : "commitment",
              meetingId: blocking.id,
              active: blocking.active,
              takeoverEventId: blocking.takeoverEventId,
              takeoverDurationMin: blocking.takeoverDurationMin,
            });
          } else {
            // Both blocked — keep on original parent, flag for manual resolution
            projected[parent].push({ ...s, _conflict: true, _reason: blocking.label || "commitment" });
            swaps.push({
              originalParent: parent,
              coveringParent: null,
              shift: s,
              reason: blocking.label || "commitment",
              level: blocking.level,
              blocked: true,
              kind: isRepayment ? "repayment" : isTakeover ? "takeover" : isRedemption ? "redemption" : "commitment",
              meetingId: blocking.id,
            });
          }
        } else {
          projected[parent].push(s);
        }
      }
    }

    projected.Mommy.sort((a, b) => toMin(a.start) - toMin(b.start));
    projected.Daddy.sort((a, b) => toMin(a.start) - toMin(b.start));

    // Synthesize swap entries for repayment AND takeover-slice shifts so they appear
    // in the explainer. These came pre-baked from shiftsWithSplits, not from blocking.
    for (const parent of ["Mommy", "Daddy"]) {
      for (const s of projected[parent]) {
        const otherParent = parent === "Mommy" ? "Daddy" : "Mommy";
        if (s._isRepayment) {
          swaps.push({
            originalParent: otherParent,
            coveringParent: parent,
            shift: { start: s.start, end: s.end },
            reason: `Repay ${s._takeoverDurationMin}m takeover`,
            level: null,
            blocked: false,
            kind: "repayment",
            meetingId: null,
            takeoverEventId: s._takeoverEventId,
            takeoverDurationMin: s._takeoverDurationMin,
          });
        } else if (s._isTakeoverSlice) {
          swaps.push({
            originalParent: otherParent,
            coveringParent: parent,
            shift: { start: s.start, end: s.end },
            reason: `Impromptu takeover (${s._takeoverDurationMin}m)`,
            level: null,
            blocked: false,
            kind: "takeover",
            meetingId: null,
            takeoverEventId: s._takeoverEventId,
            takeoverDurationMin: s._takeoverDurationMin,
          });
        }
      }
    }

    // === Auto-settle pass ===
    // For each commitment carve where one parent covered for the other,
    // automatically schedule repayment by carving the owed minutes off the
    // FRONT of the creditor's next shift (i.e., the debtor takes on the
    // start of the creditor's next shift to give them a break).
    //
    // This means commitment debts settle as the day plays out instead of
    // accumulating in the time bank ledger. The user can still bank a debt
    // manually by recording a takeover separately and redeeming it later;
    // this auto-pass just handles the routine "you covered for me, I'll
    // cover for you" rhythm.
    //
    // Mirrors the existing takeover repayment logic but triggered from
    // commitment-carve swaps rather than takeover events.
    const autoSettleCarveSwaps = swaps.filter(
      sw => sw.kind === "commitment" && sw.carved === true && !sw.blocked
    );
    for (const carveSwap of autoSettleCarveSwaps) {
      const debtor = carveSwap.originalParent;     // their commitment got covered
      const creditor = carveSwap.coveringParent;   // covered the slice
      const carveSliceStart = toMin(carveSwap.shift.start);
      const carveSliceEnd = toMin(carveSwap.shift.end);
      const oweMin = carveSliceEnd > carveSliceStart
        ? carveSliceEnd - carveSliceStart
        : (24 * 60 - carveSliceStart) + carveSliceEnd;
      if (oweMin <= 0) continue;

      // Find creditor's NEXT shift in projected[] that:
      //  - starts at or after the commitment end (in absolute time)
      //  - is not itself a carved slice / takeover slice / repayment
      //  - has at least 1 min of duration
      const creditorShifts = projected[creditor]
        .map(s => {
          if (s._isCarvedSlice || s._isCarvedFree) return null;
          if (s._isTakeoverSlice || s._isRepayment || s._isAutoRepayment) return null;
          const sStart = new Date(now);
          const [sh, sm] = s.start.split(":").map(Number);
          sStart.setHours(sh, sm, 0, 0);
          return { s, absStartMin: sh * 60 + sm };
        })
        .filter(Boolean)
        .filter(({ absStartMin }) => absStartMin >= carveSliceEnd)
        .sort((a, b) => a.absStartMin - b.absStartMin);

      const target = creditorShifts[0]?.s;
      if (!target) {
        // No future shift to carve from today. Debt remains in the day's
        // computed imbalance; balance pass below or time-bank ledger will
        // handle it. (Future: spill to tomorrow.)
        continue;
      }

      const targetStartMin = toMin(target.start);
      const targetEndMin = toMin(target.end);
      const targetDur = targetEndMin > targetStartMin
        ? targetEndMin - targetStartMin
        : (24 * 60 - targetStartMin) + targetEndMin;
      const carveOweEnd = (targetStartMin + oweMin) % (24 * 60);
      const carveOweEndHHMM = `${String(Math.floor(carveOweEnd / 60)).padStart(2, "0")}:${String(carveOweEnd % 60).padStart(2, "0")}`;

      if (oweMin >= targetDur) {
        // Owe ≥ entire target shift: flip whole shift to debtor as repayment
        const idx = projected[creditor].findIndex(p => p.start === target.start && p.end === target.end);
        if (idx === -1) continue;
        projected[creditor].splice(idx, 1);
        projected[debtor].push({
          ...target,
          _isAutoRepayment: true,
          _autoRepayMeetingId: carveSwap.meetingId,
          _autoRepayDurationMin: oweMin,
        });
        swaps.push({
          originalParent: creditor,    // creditor's shift, now repaid by debtor
          coveringParent: debtor,
          shift: { start: target.start, end: target.end },
          reason: `Auto-repay ${oweMin}m coverage`,
          level: null,
          blocked: false,
          kind: "auto-repayment",
          meetingId: carveSwap.meetingId,
          autoRepayDurationMin: oweMin,
        });
      } else {
        // Partial repayment: front slice (oweMin minutes) → debtor, remainder → creditor
        const idx = projected[creditor].findIndex(p => p.start === target.start && p.end === target.end);
        if (idx === -1) continue;
        projected[creditor].splice(idx, 1);
        projected[debtor].push({
          start: target.start,
          end: carveOweEndHHMM,
          _isAutoRepayment: true,
          _autoRepayMeetingId: carveSwap.meetingId,
          _autoRepayDurationMin: oweMin,
        });
        projected[creditor].push({
          start: carveOweEndHHMM,
          end: target.end,
        });
        swaps.push({
          originalParent: creditor,
          coveringParent: debtor,
          shift: { start: target.start, end: carveOweEndHHMM },
          reason: `Auto-repay ${oweMin}m coverage`,
          level: null,
          blocked: false,
          kind: "auto-repayment",
          meetingId: carveSwap.meetingId,
          autoRepayDurationMin: oweMin,
        });
      }
    }
    projected.Mommy.sort((a, b) => toMin(a.start) - toMin(b.start));
    projected.Daddy.sort((a, b) => toMin(a.start) - toMin(b.start));

    // === Balancing pass ===
    // Goal: keep total covering-for-partner minutes roughly equal across the day.
    // We exclude redemption swaps (those are explicitly settled via time bank) and
    // only balance swaps that were caused by ordinary commitments.
    //
    // Algorithm:
    //  1. Count "imbalance" = (mins Daddy covered for Mommy) - (mins Mommy covered for Daddy)
    //     among non-redemption swaps so far.
    //  2. While imbalance > 0 (Daddy is over-covering): find a FUTURE base shift
    //     originally on Mommy's calendar, that hasn't already been swapped, where Daddy
    //     isn't blocked, with duration ≤ imbalance. Flip it to Daddy → Mommy as a
    //     "fair-play" balance swap, reducing imbalance.
    //  3. Same direction reversed if Mommy is over-covering.
    //  4. Stop when imbalance is within ±15 mins or no eligible shifts remain.

    const shiftDurationMin = (s) => {
      const a = toMin(s.start);
      const b = toMin(s.end);
      return a < b ? b - a : (24 * 60 - a) + b;
    };
    const shiftStartToday = (s) => {
      const sStart = new Date(now);
      const [sh, sm] = s.start.split(":").map(Number);
      sStart.setHours(sh, sm, 0, 0);
      // If shift start is in the past, also try tomorrow (overnight shifts)
      return sStart;
    };

    const computeImbalance = () => {
      let daddyCoveredForMommy = 0;
      let mommyCoveredForDaddy = 0;
      for (const sw of swaps) {
        if (sw.kind === "redemption" || sw.kind === "takeover" || sw.kind === "repayment" || sw.blocked) continue;
        const dur = shiftDurationMin(sw.shift);
        if (sw.kind === "auto-repayment") {
          // Auto-repayments offset commitment coverage from the same day:
          // if Daddy covered 60m for Mommy and Mommy auto-repaid 60m, net = 0.
          // The originalParent on an auto-repayment is the creditor whose
          // shift was carved; the coveringParent is the debtor doing the
          // repayment. Subtract from the appropriate direction.
          if (sw.originalParent === "Daddy" && sw.coveringParent === "Mommy") {
            // Daddy was creditor (got covered earlier), Mommy is now repaying
            daddyCoveredForMommy -= dur;
          } else if (sw.originalParent === "Mommy" && sw.coveringParent === "Daddy") {
            mommyCoveredForDaddy -= dur;
          }
          continue;
        }
        if (sw.coveringParent === "Daddy" && sw.originalParent === "Mommy") daddyCoveredForMommy += dur;
        else if (sw.coveringParent === "Mommy" && sw.originalParent === "Daddy") mommyCoveredForDaddy += dur;
      }
      return daddyCoveredForMommy - mommyCoveredForDaddy; // positive = Daddy over-covering
    };

    const isShiftBlockedByCommitment = (parent, s) => {
      const sStart = shiftStartToday(s);
      const sEnd = new Date(sStart);
      const dur = shiftDurationMin(s);
      sEnd.setMinutes(sEnd.getMinutes() + dur);
      return meetingsToday.some(m => {
        if (m.parent !== parent || m.level === "green") return false;
        return new Date(m.start) < sEnd && new Date(m.end) > sStart;
      });
    };

    const isShiftAlreadySwapped = (s) => {
      return swaps.some(sw => sw.shift.start === s.start && sw.shift.end === s.end);
    };

    const isShiftFuture = (s) => {
      const sStart = shiftStartToday(s);
      // Treat shifts within the next 18 hours that haven't started as "future"
      // This includes overnight shifts on the same calendar day
      return sStart > now;
    };

    // Apply balance: move a shift from `fromParent` (over-covered) to `toParent` (gets a break)
    // by transferring one of `toParent`'s base shifts to `fromParent`.
    // Wait — actually: if Daddy is over-covering, Daddy needs a *break*, so Mommy takes one of
    // Daddy's future shifts. So we hand a Daddy-base shift to Mommy.
    //
    // CARVED SLICE GUARD: when looking up the candidate in projected[], we
    // require the matching shift NOT be a carved slice (free or covered) —
    // those are residuals of a partially-conflicted shift and shouldn't be
    // relocated by balance/anti-cluster passes. They belong to their
    // original parent intrinsically.
    const applyBalance = (overCoveringParent) => {
      // overCoveringParent gets a break by handing one of THEIR future shifts to the other
      const otherParent = overCoveringParent === "Mommy" ? "Daddy" : "Mommy";
      // Helper: would moving this shift to otherParent create a 4h+ stretch?
      const wouldCreateLongStretch = (s) => {
        const sStart = toMin(s.start);
        const sEnd = toMin(s.end);
        const sDur = sEnd > sStart ? sEnd - sStart : (24 * 60 - sStart) + sEnd;
        // Look at otherParent's existing projected shifts. Any run that this
        // shift would join (touches sStart or sEnd) contributes to the new run.
        const otherSorted = [...projected[otherParent]].sort(
          (a, b) => toMin(a.start) - toMin(b.start)
        );
        // Find runs in otherParent's current projection
        const otherRuns = [];
        let cur = null;
        for (const o of otherSorted) {
          const oStart = toMin(o.start);
          const oEnd = toMin(o.end);
          const oDur = oEnd > oStart ? oEnd - oStart : (24 * 60 - oStart) + oEnd;
          if (cur && Math.abs(toMin(cur.shifts[cur.shifts.length - 1].end) - oStart) <= 1) {
            cur.shifts.push(o);
            cur.endMin = oEnd;
            cur.totalMin += oDur;
          } else {
            if (cur) otherRuns.push(cur);
            cur = { shifts: [o], startMin: oStart, endMin: oEnd, totalMin: oDur };
          }
        }
        if (cur) otherRuns.push(cur);
        let joiningRunDur = 0;
        for (const r of otherRuns) {
          if (Math.abs(r.endMin - sStart) <= 1 || Math.abs(r.startMin - sEnd) <= 1) {
            joiningRunDur += r.totalMin;
          }
        }
        return (joiningRunDur + sDur) >= 240; // 4h threshold
      };
      const candidates = (shifts[overCoveringParent] || [])
        .filter(s => isShiftFuture(s))
        .filter(s => !isShiftAlreadySwapped(s))
        .filter(s => !isShiftBlockedByCommitment(otherParent, s))
        // Don't relocate carved slices (they're tied to their parent)
        .filter(s => {
          const match = projected[overCoveringParent].find(
            p => p.start === s.start && p.end === s.end
          );
          return match && !match._isCarvedSlice && !match._isCarvedFree && !match._isAutoRepayment;
        })
        // Don't create a 4h+ stretch on the receiving side
        .filter(s => !wouldCreateLongStretch(s));
      candidates.sort((a, b) => shiftDurationMin(b) - shiftDurationMin(a));
      return candidates[0] || null;
    };

    // Run up to N iterations
    const MAX_BALANCE_ITER = 6;
    const TOLERANCE_MIN = 15;
    for (let iter = 0; iter < MAX_BALANCE_ITER; iter++) {
      const imbalance = computeImbalance();
      if (Math.abs(imbalance) <= TOLERANCE_MIN) break;
      const overCovering = imbalance > 0 ? "Daddy" : "Mommy";
      const otherParent = overCovering === "Mommy" ? "Daddy" : "Mommy";
      const candidate = applyBalance(overCovering);
      if (!candidate) break;

      const candidateDur = shiftDurationMin(candidate);
      // Move candidate from overCovering to otherParent in projection
      const idx = projected[overCovering].findIndex(s => s.start === candidate.start && s.end === candidate.end);
      if (idx === -1) break;
      const moved = projected[overCovering].splice(idx, 1)[0];
      projected[otherParent].push(moved);
      projected[otherParent].sort((a, b) => toMin(a.start) - toMin(b.start));

      // Record the balance swap
      swaps.push({
        originalParent: overCovering,
        coveringParent: otherParent,
        shift: candidate,
        reason: "fair-play balance",
        level: null,
        blocked: false,
        kind: "balance",
        meetingId: null,
        balanceMinutes: candidateDur,
      });
    }

    // === Anti-clustering pass ===
    // After conflict resolution + balance, scan each parent for contiguous
    // blocks ≥ 4 hours. A "contiguous block" is two or more adjacent shifts
    // assigned to the same parent (shift A's end == shift B's start, or
    // within 1 minute). Long contiguous blocks burn out the on-duty parent —
    // we prefer to break them by swapping the LAST shift of a long block to
    // the other parent, provided:
    //   (a) the other parent isn't blocked at that time
    //   (b) the other parent doesn't already have a 4h+ block touching it
    //   (c) the swap doesn't create a NEW 4h+ block elsewhere
    //
    // CONTIGUITY_THRESHOLD_MIN sets the maximum acceptable run. Below it,
    // no action. Above it, we attempt up to CLUSTER_MAX_ITER swaps to break
    // the run. If no feasible swap exists, the block stays — this is the
    // "absolutely unavoidable" case.

    const CONTIGUITY_THRESHOLD_MIN = 240; // 4 hours
    const CLUSTER_MAX_ITER = 4;

    // Compute contiguous "runs" for a parent. Returns array of runs, each is
    // { shifts: [s1, s2, ...], totalMin, startMin, endMin }.
    const computeRuns = (parent) => {
      const sorted = [...projected[parent]].sort((a, b) => toMin(a.start) - toMin(b.start));
      const runs = [];
      let current = null;
      for (const s of sorted) {
        const sStart = toMin(s.start);
        const sEnd = toMin(s.end);
        const dur = sEnd > sStart ? sEnd - sStart : (24 * 60 - sStart) + sEnd;
        if (current && Math.abs(toMin(current.shifts[current.shifts.length - 1].end) - sStart) <= 1) {
          // Adjacent — extend current run
          current.shifts.push(s);
          current.endMin = sEnd;
          current.totalMin += dur;
        } else {
          // New run
          if (current) runs.push(current);
          current = { shifts: [s], startMin: sStart, endMin: sEnd, totalMin: dur };
        }
      }
      if (current) runs.push(current);
      return runs;
    };

    // For a candidate shift `s` currently assigned to `fromParent`, check if
    // moving it to `toParent` is feasible: toParent isn't blocked by a
    // commitment, AND moving it doesn't create a 4h+ run for toParent.
    const isSwapFeasible = (s, fromParent, toParent) => {
      if (isShiftBlockedByCommitment(toParent, s)) return false;
      // Simulate: what would toParent's runs look like if we added this shift?
      const sStart = toMin(s.start);
      const sEnd = toMin(s.end);
      const sDur = sEnd > sStart ? sEnd - sStart : (24 * 60 - sStart) + sEnd;
      const toRuns = computeRuns(toParent);
      // Find any run that this shift would join (touches s.start or s.end)
      let joiningRunDur = 0;
      for (const r of toRuns) {
        if (Math.abs(r.endMin - sStart) <= 1 || Math.abs(r.startMin - sEnd) <= 1) {
          joiningRunDur += r.totalMin;
        }
      }
      // After the swap, the new run on toParent's side would be sDur + joiningRunDur
      // (worst case — actually two adjacent runs could merge). Allow up to threshold.
      return (joiningRunDur + sDur) < CONTIGUITY_THRESHOLD_MIN;
    };

    // Run anti-clustering iterations
    for (let iter = 0; iter < CLUSTER_MAX_ITER; iter++) {
      let didSwap = false;
      for (const parent of ["Mommy", "Daddy"]) {
        const otherParent = parent === "Mommy" ? "Daddy" : "Mommy";
        const runs = computeRuns(parent);
        // Find longest run for this parent
        const longRun = runs
          .filter(r => r.totalMin >= CONTIGUITY_THRESHOLD_MIN)
          .sort((a, b) => b.totalMin - a.totalMin)[0];
        if (!longRun) continue;
        // Try to peel off a shift from the run — start with the LAST shift
        // (less disruptive than mid-run reshuffles), then try the FIRST.
        // CARVED SLICE GUARD: don't peel off carved slices — they're tied to
        // their original parent. Only peel real base shifts.
        const peelCandidates = [
          longRun.shifts[longRun.shifts.length - 1],
          longRun.shifts[0],
        ]
          .filter((s, i, arr) => arr.indexOf(s) === i) // de-dupe single-shift run
          .filter(s => !s._isCarvedSlice && !s._isCarvedFree)
          .filter(s => !s._isAutoRepayment); // auto-repayments are settled debts, don't move them
        let swapped = false;
        for (const cand of peelCandidates) {
          if (!isSwapFeasible(cand, parent, otherParent)) continue;
          // Move cand from parent → otherParent
          const idx = projected[parent].findIndex(s => s.start === cand.start && s.end === cand.end);
          if (idx === -1) continue;
          const moved = projected[parent].splice(idx, 1)[0];
          projected[otherParent].push(moved);
          projected[otherParent].sort((a, b) => toMin(a.start) - toMin(b.start));
          swaps.push({
            originalParent: parent,
            coveringParent: otherParent,
            shift: cand,
            reason: "break long stretch",
            level: null,
            blocked: false,
            kind: "anti-cluster",
            meetingId: null,
            stretchMinutes: longRun.totalMin,
          });
          swapped = true;
          didSwap = true;
          break;
        }
        if (swapped) break; // restart outer iter
      }
      if (!didSwap) break;
    }

    return { projected, swaps };
  }, [shifts, meetingsToday, now]);

  // TOMORROW PROJECTION: same conflict→coverage logic as today, but for the next
  // calendar day. We don't run the full balance pass (that's for equalizing
  // remaining time today); just resolve commitments → coverage so you can see
  // a meeting tomorrow morning being absorbed by the other parent.
  const tomorrowProjection = useMemo(() => {
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const meetingsTomorrow = (meetings || []).filter(m => {
      const t = new Date(m.start);
      return t >= tomorrow && t < dayAfter;
    });

    const isParentBlocked = (parent, windowStart, windowEnd) => {
      return meetingsTomorrow.some(m => {
        if (m.parent !== parent) return false;
        if (m.level === "green") return false;
        const ms = new Date(m.start);
        const me = new Date(m.end);
        return ms < windowEnd && me > windowStart;
      });
    };

    const projected = { Mommy: [], Daddy: [] };
    const swaps = [];

    for (const parent of ["Mommy", "Daddy"]) {
      const otherParent = parent === "Mommy" ? "Daddy" : "Mommy";
      for (const s of (shifts[parent] || [])) {
        const sStart = new Date(tomorrow);
        const [sh, sm] = s.start.split(":").map(Number);
        sStart.setHours(sh, sm, 0, 0);
        const sEnd = new Date(tomorrow);
        const [eh, em] = s.end.split(":").map(Number);
        sEnd.setHours(eh, em, 0, 0);
        if (sEnd <= sStart) sEnd.setDate(sEnd.getDate() + 1);

        const blocking = meetingsTomorrow.find(m => {
          if (m.parent !== parent || m.level === "green") return false;
          const ms = new Date(m.start);
          const me = new Date(m.end);
          return ms < sEnd && me > sStart;
        });

        if (blocking) {
          const otherBlocked = isParentBlocked(otherParent, sStart, sEnd);
          // CARVING (mirrors today's projection): split shift into free →
          // covered → free slices when commitment overlaps only part of it.
          const commitStart = new Date(blocking.start);
          const commitEnd = new Date(blocking.end);
          const canCarve = !otherBlocked
            && (commitStart > sStart || commitEnd < sEnd);
          const MIN_SLICE_MIN = 15;
          const fmtHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          const minBetween = (a, b) => Math.round((b - a) / 60000);

          if (canCarve) {
            const overlapStart = commitStart > sStart ? commitStart : sStart;
            const overlapEnd = commitEnd < sEnd ? commitEnd : sEnd;
            const preDur = minBetween(sStart, overlapStart);
            const coveredDur = minBetween(overlapStart, overlapEnd);
            const postDur = minBetween(overlapEnd, sEnd);
            let slices = [];
            const pushSlice = (startD, endD, owner, isCovered) => {
              if (minBetween(startD, endD) < MIN_SLICE_MIN) {
                if (slices.length > 0) {
                  slices[slices.length - 1].end = endD;
                } else {
                  slices.push({ start: startD, end: endD, owner, isCovered });
                }
              } else {
                slices.push({ start: startD, end: endD, owner, isCovered });
              }
            };
            if (preDur > 0) pushSlice(sStart, overlapStart, parent, false);
            if (coveredDur > 0) pushSlice(overlapStart, overlapEnd, otherParent, true);
            if (postDur > 0) pushSlice(overlapEnd, sEnd, parent, false);
            for (const sl of slices) {
              const sliceShift = {
                start: fmtHM(sl.start),
                end: fmtHM(sl.end),
                _carvedFrom: { start: s.start, end: s.end },
              };
              if (sl.isCovered) {
                projected[sl.owner].push({ ...sliceShift, _coveringFor: parent, _reason: blocking.label || "commitment", _isCarvedSlice: true });
                swaps.push({
                  originalParent: parent,
                  coveringParent: sl.owner,
                  shift: sliceShift,
                  reason: blocking.label || "commitment",
                  level: blocking.level,
                  blocked: false,
                  kind: "commitment",
                  meetingId: blocking.id,
                  carved: true,
                  carvedFrom: { start: s.start, end: s.end },
                });
              } else {
                projected[sl.owner].push({ ...sliceShift, _isCarvedFree: true });
              }
            }
          } else if (!otherBlocked) {
            projected[otherParent].push({ ...s, _coveringFor: parent, _reason: blocking.label || "commitment" });
            swaps.push({
              originalParent: parent,
              coveringParent: otherParent,
              shift: s,
              reason: blocking.label || "commitment",
              level: blocking.level,
              blocked: false,
              kind: "commitment",
              meetingId: blocking.id,
            });
          } else {
            projected[parent].push({ ...s, _conflict: true, _reason: blocking.label || "commitment" });
            swaps.push({
              originalParent: parent,
              coveringParent: null,
              shift: s,
              reason: blocking.label || "commitment",
              level: blocking.level,
              blocked: true,
              kind: "commitment",
              meetingId: blocking.id,
            });
          }
        } else {
          projected[parent].push(s);
        }
      }
    }

    projected.Mommy.sort((a, b) => toMin(a.start) - toMin(b.start));
    projected.Daddy.sort((a, b) => toMin(a.start) - toMin(b.start));

    // === Anti-clustering pass for tomorrow ===
    // Same logic as today's projection: avoid contiguous blocks ≥ 4 hours
    // when feasible. Tomorrow has no "in-progress" state so we don't need to
    // restrict to future shifts — every shift is a candidate.
    const CONTIGUITY_THRESHOLD_MIN_T = 240;
    const CLUSTER_MAX_ITER_T = 4;

    const isBlockedByTomorrowCommitment = (parent, s) => {
      const sStart = new Date(tomorrow);
      const [sh, sm] = s.start.split(":").map(Number);
      sStart.setHours(sh, sm, 0, 0);
      const sEnd = new Date(tomorrow);
      const [eh, em] = s.end.split(":").map(Number);
      sEnd.setHours(eh, em, 0, 0);
      if (sEnd <= sStart) sEnd.setDate(sEnd.getDate() + 1);
      return meetingsTomorrow.some(m => {
        if (m.parent !== parent || m.level === "green") return false;
        return new Date(m.start) < sEnd && new Date(m.end) > sStart;
      });
    };

    const computeRunsT = (parent) => {
      const sorted = [...projected[parent]].sort((a, b) => toMin(a.start) - toMin(b.start));
      const runs = [];
      let current = null;
      for (const s of sorted) {
        const sStart = toMin(s.start);
        const sEnd = toMin(s.end);
        const dur = sEnd > sStart ? sEnd - sStart : (24 * 60 - sStart) + sEnd;
        if (current && Math.abs(toMin(current.shifts[current.shifts.length - 1].end) - sStart) <= 1) {
          current.shifts.push(s);
          current.endMin = sEnd;
          current.totalMin += dur;
        } else {
          if (current) runs.push(current);
          current = { shifts: [s], startMin: sStart, endMin: sEnd, totalMin: dur };
        }
      }
      if (current) runs.push(current);
      return runs;
    };

    const isSwapFeasibleT = (s, fromParent, toParent) => {
      if (isBlockedByTomorrowCommitment(toParent, s)) return false;
      const sStart = toMin(s.start);
      const sEnd = toMin(s.end);
      const sDur = sEnd > sStart ? sEnd - sStart : (24 * 60 - sStart) + sEnd;
      const toRuns = computeRunsT(toParent);
      let joiningRunDur = 0;
      for (const r of toRuns) {
        if (Math.abs(r.endMin - sStart) <= 1 || Math.abs(r.startMin - sEnd) <= 1) {
          joiningRunDur += r.totalMin;
        }
      }
      return (joiningRunDur + sDur) < CONTIGUITY_THRESHOLD_MIN_T;
    };

    for (let iter = 0; iter < CLUSTER_MAX_ITER_T; iter++) {
      let didSwap = false;
      for (const parent of ["Mommy", "Daddy"]) {
        const otherParent = parent === "Mommy" ? "Daddy" : "Mommy";
        const runs = computeRunsT(parent);
        const longRun = runs
          .filter(r => r.totalMin >= CONTIGUITY_THRESHOLD_MIN_T)
          .sort((a, b) => b.totalMin - a.totalMin)[0];
        if (!longRun) continue;
        const candidates = [
          longRun.shifts[longRun.shifts.length - 1],
          longRun.shifts[0],
        ]
          .filter((s, i, arr) => arr.indexOf(s) === i)
          .filter(s => !s._isCarvedSlice && !s._isCarvedFree);
        let swapped = false;
        for (const cand of candidates) {
          if (!isSwapFeasibleT(cand, parent, otherParent)) continue;
          const idx = projected[parent].findIndex(s => s.start === cand.start && s.end === cand.end);
          if (idx === -1) continue;
          const moved = projected[parent].splice(idx, 1)[0];
          projected[otherParent].push(moved);
          projected[otherParent].sort((a, b) => toMin(a.start) - toMin(b.start));
          swaps.push({
            originalParent: parent,
            coveringParent: otherParent,
            shift: cand,
            reason: "break long stretch",
            level: null,
            blocked: false,
            kind: "anti-cluster",
            meetingId: null,
            stretchMinutes: longRun.totalMin,
          });
          swapped = true;
          didSwap = true;
          break;
        }
        if (swapped) break;
      }
      if (!didSwap) break;
    }

    return { projected, swaps, hasAdjustments: swaps.length > 0 };
  }, [shifts, meetings, now]);

  // activeShifts: projected (commitment-aware) → with onsite override layered on top.
  // Strip out the _coveringFor / _conflict / _reason annotations for the helpers that
  // don't need them; the Shifts tab uses projectedShifts.swaps directly for the diff.
  const activeShifts = useMemo(() => {
    const stripAnnotations = (obj) => ({
      Mommy: obj.Mommy.map(s => ({ start: s.start, end: s.end, _isRepayment: s._isRepayment, _isTakeoverSlice: s._isTakeoverSlice, _takeoverEventId: s._takeoverEventId, _takeoverDurationMin: s._takeoverDurationMin })),
      Daddy: obj.Daddy.map(s => ({ start: s.start, end: s.end, _isRepayment: s._isRepayment, _isTakeoverSlice: s._isTakeoverSlice, _takeoverEventId: s._takeoverEventId, _takeoverDurationMin: s._takeoverDurationMin })),
    });
    const baseLive = stripAnnotations(projectedShifts.projected);

    if (!onsite) return baseLive;

    // Layer onsite on top of the projection
    const awayParent = onsite.parent;
    const homeParent = awayParent === "Mommy" ? "Daddy" : "Mommy";
    const departure = new Date(onsite.departedAt);
    const awayUntil = new Date(onsite.etaUpdate || onsite.latestReturn);
    const shiftFallsInWindow = (s) => {
      const [h, m] = s.start.split(":").map(Number);
      const candidate = new Date(now);
      candidate.setHours(h, m, 0, 0);
      const candidates = [candidate, new Date(candidate.getTime() - 86400000), new Date(candidate.getTime() + 86400000)];
      return candidates.some(c => c >= departure && c < awayUntil);
    };

    const result = { Mommy: [], Daddy: [] };
    for (const p of ["Mommy", "Daddy"]) {
      for (const s of baseLive[p]) {
        if (p === awayParent && shiftFallsInWindow(s)) {
          result[homeParent].push(s);
        } else {
          result[p].push(s);
        }
      }
    }
    result.Mommy.sort((a, b) => toMin(a.start) - toMin(b.start));
    result.Daddy.sort((a, b) => toMin(a.start) - toMin(b.start));
    return result;
  }, [projectedShifts, onsite, now]);

  const baseOnDuty = whoIsOn(activeShifts, now);
  // If takeover is active, the covering parent is on duty regardless of base schedule
  const onDuty = takeover
    ? { parent: takeover.coveringParent, shift: { start: takeover.startedAt.slice(11, 16), end: "??:??" } }
    : baseOnDuty;
  const next = nextHandoff(activeShifts, now);

  // ACTIVE COVERING COMMITMENT: is the on-duty parent currently covering for
  // their partner because of a real commitment that's still in progress?
  // If yes, we offer an "ended early" button so either parent can truncate
  // the meeting and reclaim the partner's shift the moment the meeting ends.
  // We look for a real (non-synthetic) commitment owned by the OTHER parent
  // that overlaps `now` and was the cause of the on-duty parent covering.
  const activeCoveringCommitment = useMemo(() => {
    if (takeover) return null; // takeover has its own end-flow
    const otherParent = onDuty.parent === "Mommy" ? "Daddy" : "Mommy";
    return meetings.find(m => {
      if (m.parent !== otherParent) return false;
      if (m.level === "green") return false; // green doesn't trigger coverage
      if (m.synthetic) return false; // skip takeover-derived synthetics
      const ms = new Date(m.start);
      const me = new Date(m.end);
      return ms <= now && me > now;
    }) || null;
  }, [meetings, onDuty.parent, now, takeover]);

  // PARENT-IN-MEETING: is the CURRENT USER (whoever is viewing the app) in
  // an active commitment right now? Lets that user "I'm back early" from
  // their view too — useful when the meeting ended faster than expected.
  const myActiveCommitment = useMemo(() => {
    return meetings.find(m => {
      if (m.parent !== currentUser) return false;
      if (m.level === "green") return false;
      if (m.synthetic) return false;
      const ms = new Date(m.start);
      const me = new Date(m.end);
      return ms <= now && me > now;
    }) || null;
  }, [meetings, currentUser, now]);

  // Truncate a commitment to end at `now`. Both surfaces (on-duty card
  // "Mommy is back" and in-meeting banner "I'm back") call this. After the
  // truncate, the projection automatically recomputes — carved coverage
  // shrinks, auto-repayment slice shrinks proportionally, time bank stays
  // accurate to actual minutes covered.
  const endCommitmentEarly = (meetingId) => {
    setMeetings(prev => {
      const next = prev.map(m => {
        if (m.id !== meetingId) return m;
        const newEnd = new Date(now);
        if (newEnd <= new Date(m.start)) return m;
        return { ...m, end: newEnd.toISOString(), endedEarly: true };
      });
      try {
        localStorage.setItem("solene:meetings", JSON.stringify(next));
        localStorage.setItem("solene:meetings:backup", JSON.stringify(prev));
      } catch (e) { console.warn("[endCommitmentEarly] sync persist failed", e); }
      return next;
    });
  };

  // Detect handoff: when on-duty parent changes from previous tick, prompt off-going parent for a note
  // Only fires if the current device's user is the off-going parent
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevOnDutyRef.current;
    if (prev && prev !== onDuty.parent) {
      const hasFreshNote = handoffNote &&
        !handoffNote.acknowledged &&
        (now - new Date(handoffNote.ts)) / 60000 < 5;
      // Only prompt if the current user is the one who just went OFF duty
      if (!hasFreshNote && prev === currentUser) {
        setShowHandoffPrompt(true);
      }
    }
    prevOnDutyRef.current = onDuty.parent;
  }, [onDuty.parent, hydrated, currentUser]);

  const uvNow = weather?.current?.uv_index ?? null;
  const tempNow = weather?.current?.temperature_2m ?? null;
  const walkRecommendation = useMemo(() => {
    if (!weather?.hourly) return null;
    const hours = weather.hourly.time || [];
    const uvs = weather.hourly.uv_index || [];
    const temps = weather.hourly.temperature_2m || [];
    const rains = weather.hourly.precipitation_probability || [];
    const windows = [];
    for (let i = 0; i < hours.length; i++) {
      const t = new Date(hours[i]);
      if (t < now) continue;
      const uv = uvs[i];
      const temp = temps[i];
      const rain = rains[i] ?? 0;
      const good = uv <= 5 && temp >= 50 && temp <= 85 && rain < 40;
      if (good) windows.push({ time: t, uv, temp, rain });
    }
    return windows.slice(0, 4);
  }, [weather, now]);

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: PALETTES.day.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cormorant Garamond, serif" }}>
        <div style={{ color: PALETTES.day.muted, fontSize: 18, letterSpacing: "0.1em", fontStyle: "italic" }}>preparing the nursery…</div>
      </div>
    );
  }

  const userTint = currentUser === "Mommy" ? C.mommy : C.daddy;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.ink,
      fontFamily: "'Inter', -apple-system, sans-serif",
      transition: "background 1.5s ease, color 1.5s ease",
      paddingBottom: 110,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Per-user view tint — extremely subtle wash; main differentiation is via accents/borders */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(180deg, ${userTint}08 0%, transparent 30%)`,
        pointerEvents: "none", zIndex: 0,
        transition: "background 0.4s ease",
      }} />
      <FontImports />
      <PaperGrain mode={mode} />

      <header style={{ padding: "20px 18px 8px", maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
            {/* Little Ledger mark — full-presence brand glyph */}
            <div style={{
              display: "flex", alignItems: "center", gap: 11,
              marginBottom: 10,
            }}>
              <LittleLedgerLogo C={C} size={44} />
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 17, fontStyle: "italic",
                color: C.muted, fontWeight: 500,
                letterSpacing: "0.04em",
              }}>Little Ledger</span>
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 42, fontWeight: 500,
              margin: "0",
              letterSpacing: "-0.02em",
              fontStyle: "italic",
              lineHeight: 1.05,
              color: C.mommy,
            }}>
              Solène<span style={{ color: C.gold }}>.</span>
            </h1>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 13, fontStyle: "italic",
              color: C.muted, marginTop: 3, lineHeight: 1.3,
            }}>
              A journal of care, rhythm &amp; handoff
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ color: C.mommy, fontWeight: 600 }}>{fmtAge(BIRTHDAY, now)}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{fmtTime12(now)}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {/* Sync-status pip: green=ok, gold=syncing, coral=offline.
                    Reflects whether cloud sync is healthy. When no family
                    code is set, this is just a "live" indicator (always green). */}
                <span style={{
                  display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                  background: !familyCode ? "#5C8E5C"
                            : cloudSyncStatus === "ok" ? "#5C8E5C"
                            : cloudSyncStatus === "syncing" ? C.gold
                            : C.accent,
                }} className="pulse-soft" />
                <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted }}>
                  {!familyCode ? "live"
                   : cloudSyncStatus === "syncing" ? "syncing…"
                   : cloudSyncStatus === "offline" ? "offline"
                   : "synced"}
                </span>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TimeOrb mode={mode} now={now} C={C} />
            <button onClick={() => setShowProfileSwitcher(true)} style={{
              background: currentUser === "Mommy" ? C.mommy : C.daddy,
              color: "#fff",
              border: "none",
              borderRadius: 24, padding: "6px 14px 6px 6px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
              boxShadow: `0 2px 8px ${currentUser === "Mommy" ? C.mommy : C.daddy}55`,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "#fff", color: currentUser === "Mommy" ? C.mommy : C.daddy,
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{currentUser[0]}</span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.05 }}>
                <span style={{ fontSize: 9, opacity: 0.85, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>viewing as</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, fontStyle: "italic" }}>{currentUser}</span>
              </span>
              <ChevronRight size={14} style={{ transform: "rotate(90deg)", opacity: 0.85 }} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 18px", position: "relative", zIndex: 2 }}>
        {tab === "now" && (
        <>
        {/* Pending gifts pip — only renders when current user has gifts
            waiting to be redeemed. Sits above the OnDutyCard as a small
            but visible nudge. Tapping opens the RedeemGiftModal for the
            most recent pending gift; if multiple gifts are pending, the
            user can redeem each in turn. */}
        {(() => {
          const pendingGifts = getPendingGifts(timeBank.transactions, currentUser);
          if (pendingGifts.length === 0) return null;
          const totalMins = pendingGifts.reduce((sum, g) => sum + g.mins, 0);
          // Tap behavior: open the most recent pending gift. The modal will
          // close on submit; if more remain, the pip stays visible so the
          // user can tap again.
          const mostRecent = pendingGifts.slice().sort(
            (a, b) => new Date(b.ts) - new Date(a.ts)
          )[0];
          const giverColor = mostRecent.from === "Mommy" ? C.mommy : C.daddy;
          return (
            <button
              onClick={() => setRedeemingGift(mostRecent)}
              style={{
                width: "100%",
                background: `linear-gradient(135deg, ${giverColor}18 0%, ${C.gold}12 100%)`,
                border: `1px solid ${giverColor}40`,
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 12,
                marginTop: 8,
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                textAlign: "left",
              }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🎁</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, lineHeight: 1.3 }}>
                  {pendingGifts.length === 1
                    ? <>You have a <strong>{fmtBalance(totalMins)}</strong> gift from <span style={{ color: giverColor }}>{mostRecent.from}</span></>
                    : <><strong>{pendingGifts.length}</strong> gifts waiting · <strong>{fmtBalance(totalMins)}</strong> total</>}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Tap to choose when to redeem
                </div>
              </div>
              <ChevronRight size={14} color={C.muted} style={{ flexShrink: 0 }} />
            </button>
          );
        })()}

        {/* Tomorrow's commitments reminder pip — sits in the same prominent
            slot as the gift pip. Triggers when:
            (a) it's after 4pm (gives time to log before bedtime)
            (b) currentUser has no commitments logged for tomorrow yet
            Visual urgency escalates by hour:
              4–6pm: subtle nudge (pale accent fill, small)
              6–8pm: more present (coral accent border, slightly larger)
              8pm+:  pulsing prominence (coral fill, animated, can't miss)
            Goes away once user logs ANY commitment for tomorrow OR taps
            "nothing tomorrow" (which logs a sentinel that satisfies the
            check until midnight). */}
        {(() => {
          const hour = now.getHours();
          if (hour < 16) return null; // before 4pm — don't nag yet
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const dayAfter = new Date(tomorrow);
          dayAfter.setDate(dayAfter.getDate() + 1);
          const tomorrowMine = (meetings || []).filter(m => {
            const t = new Date(m.start);
            return t >= tomorrow && t < dayAfter && m.parent === currentUser;
          });
          // User has explicitly marked tomorrow as quiet? Skip.
          let dismissedToday = false;
          try {
            const key = `ll:tomorrowDismissed:${currentUser}:${now.toDateString()}`;
            dismissedToday = !!localStorage.getItem(key);
          } catch {}
          if (tomorrowMine.length > 0 || dismissedToday) return null;

          // Tier the visual urgency
          const tier = hour >= 20 ? "urgent" : hour >= 18 ? "elevated" : "subtle";

          if (tier === "urgent") {
            return (
              <button onClick={() => { setLoggerType("commitment"); setShowLogger(true); }} style={{
                width: "100%", marginBottom: 12, marginTop: 8,
                background: C.accent, color: "#fff",
                border: `2px solid ${C.accent}`,
                borderRadius: 14, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                boxShadow: `0 4px 16px ${C.accent}55, 0 0 0 4px ${C.accent}22`,
                animation: "pulse-glow 2.4s ease-in-out infinite",
              }}>
                <style>{`@keyframes pulse-glow {
                  0%, 100% { box-shadow: 0 4px 16px ${C.accent}55, 0 0 0 4px ${C.accent}22; }
                  50%      { box-shadow: 0 6px 22px ${C.accent}88, 0 0 0 8px ${C.accent}33; }
                }`}</style>
                <AlarmClock size={22} style={{ flexShrink: 0 }} className="pulse-soft" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, opacity: 0.95 }}>
                    Before you wind down
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, marginTop: 2 }}>
                    Log tomorrow's commitments
                  </div>
                </div>
                <ChevronRight size={18} style={{ flexShrink: 0 }} />
              </button>
            );
          }

          if (tier === "elevated") {
            return (
              <button onClick={() => { setLoggerType("commitment"); setShowLogger(true); }} style={{
                width: "100%", marginBottom: 12, marginTop: 8,
                background: `${C.accent}15`,
                border: `1.5px solid ${C.accent}80`,
                borderRadius: 12, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}>
                <AlarmClock size={18} color={C.accent} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>
                    Tomorrow's calendar?
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    Log meetings or commitments so coverage balances before morning
                  </div>
                </div>
                <ChevronRight size={14} color={C.accent} style={{ flexShrink: 0 }} />
              </button>
            );
          }

          // subtle tier (4-6pm)
          return (
            <button onClick={() => { setLoggerType("commitment"); setShowLogger(true); }} style={{
              width: "100%", marginBottom: 12, marginTop: 8,
              background: `${C.accent}10`,
              border: `1px solid ${C.accent}40`,
              borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            }}>
              <AlarmClock size={14} color={C.accent} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                  Anything on your calendar tomorrow?
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                  Tap to log — or this nudge gets bigger as the night goes on
                </div>
              </div>
              <ChevronRight size={14} color={C.muted} style={{ flexShrink: 0 }} />
            </button>
          );
        })()}
        <OnDutyCard
          C={C} mode={mode}
          onDuty={onDuty}
          next={next}
          lastFeed={lastFeed}
          lastDiaper={lastDiaper}
          diaperWarnH={diaperWarnH}
          diaperUrgentH={diaperUrgentH}
          lastSleep={lastSleep}
          lastWake={lastWake}
          lastWakeConfirmed={lastWakeConfirmed}
          now={now}
          totalSafeOz={totalSafeOz}
          rtSafeOz={rtSafeOz}
          fridgeOz={fridgeOz}
          feedsRunway={feedsRunway}
          rtItems={liveInventory.filter(i => !i.expired && i.location === "rt")}
          fridgeItems={liveInventory.filter(i => !i.expired && i.location === "fridge")}
          nextPumpAt={nextPumpAt}
          lastPumpedItem={(() => {
            const valid = liveInventory.filter(i => !i.expired);
            if (valid.length === 0) return null;
            const latest = valid.slice().sort((a, b) => new Date(b.pumpedAt) - new Date(a.pumpedAt))[0];
            const useByTime = new Date(new Date(latest.pumpedAt).getTime() + (latest.location === "rt" ? BM_RT_HOURS : BM_FRIDGE_HOURS) * 3600000);
            return {
              oz: latest.oz,
              location: latest.location,
              pumpedAt: new Date(latest.pumpedAt),
              useByTime,
              expiryUrgent: latest.location === "rt" && latest.remaining < 1,
            };
          })()}
          todayCalories={todayCalories}
          currentUser={currentUser}
          onsite={onsite}
          activeCoveringCommitment={activeCoveringCommitment}
          myActiveCommitment={myActiveCommitment}
          onEndCommitmentEarly={endCommitmentEarly}
          handoffNote={handoffNote}
          onAckNote={() => {
            setNoteArchive(prev => [
              { ...handoffNote, acknowledged: true, ackedAt: new Date().toISOString() },
              ...prev,
            ].slice(0, 50)); // keep last 50
            setHandoffNote(null);
          }}
          onOpenNoteEditor={() => setShowHandoffNoteEditor(true)}
          onOpenArchive={() => setShowNoteArchive(true)}
          archiveCount={noteArchive.length}
          onLogSleepDown={() => {
            // Estimate when she fell asleep: midpoint between last feed and now,
            // bounded so it doesn't go too far back. Open the time-picker
            // modal pre-filled with this estimate so the parent can accept
            // it or override with the actual time if they remember.
            const estTs = (() => {
              if (!lastFeed) return new Date();
              const feedTime = new Date(lastFeed.ts);
              const midpoint = new Date((feedTime.getTime() + now.getTime()) / 2);
              return midpoint;
            })();
            setSleepDownPrefill(estTs);
            setShowSleepDownPicker(true);
          }}
          onConfirmAwake={() => addEvent({ type: "wake_confirmed", silent: true })}
          activePump={activePump}
          onStartPump={() => setActivePump({ startedAt: new Date().toISOString() })}
          onEndActivePump={() => setShowFinishPump(true)}
          takeover={takeover}
          onStartTakeover={() => {
            const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
            setTakeover({
              coveringParent: partner,
              originalParent: currentUser,
              startedAt: new Date().toISOString(),
            });
          }}
          onEndTakeover={() => {
            // takeover is set; record the time, then clear
            if (!takeover) return;
            const startMs = new Date(takeover.startedAt).getTime();
            const mins = Math.max(1, Math.floor((Date.now() - startMs) / 60000));
            // Append the transaction; balance derives from the ledger.
            const newTransactions = [
              ...timeBank.transactions,
              {
                id: crypto.randomUUID(),
                ts: new Date().toISOString(),
                kind: "owed",
                from: takeover.coveringParent,
                to: takeover.originalParent,
                mins,
                reason: "Impromptu takeover",
              },
            ];
            setTimeBank({
              balance: computeTimeBankBalance(newTransactions),
              transactions: newTransactions,
            });
            // Log a journal event so the takeover shows in history
            addEvent({
              type: "takeover",
              ts: new Date(takeover.startedAt),
              durationMin: mins,
              coveringParent: takeover.coveringParent,
              originalParent: takeover.originalParent,
            });
            setTakeover(null);
          }}
          onPickBottle={(loc) => setBottlePickerLoc(loc)}
          /* Quick-log from quadrants: tile tap opens the LOG sheet
             pre-set to the given event type. Lets the user one-tap
             from the at-a-glance view straight into a focused logger. */
          onQuickLog={(eventType) => { setLoggerType(eventType); setShowLogger(true); }}
        />
        </>
        )}

        {tab === "now" && (
          <NowView
            C={C} mode={mode} now={now}
            events={events}
            removeEvent={removeEvent}
            lastFeed={lastFeed}
            lastPump={lastPump}
            nextPumpAt={nextPumpAt}
            inventory={liveInventory}
            totalSafeOz={totalSafeOz}
            rtSafeOz={rtSafeOz}
            fridgeOz={fridgeOz}
            feedsRunway={feedsRunway}
            shifts={activeShifts}
            baseShifts={shifts}
            swaps={projectedShifts.swaps}
            meetings={meetings}
            todayCalories={todayCalories}
            lastBath={lastBath}
            lastSkincare={lastSkincare}
            todayDailyContent={dailyContent[new Date().toISOString().slice(0, 10)]}
            loadingDaily={loadingDaily}
            currentUser={currentUser}
            myActiveCommitment={myActiveCommitment}
            onEndCommitmentEarly={endCommitmentEarly}
            onOpenCommitmentLog={() => { setLoggerType("commitment"); setShowLogger(true); }}
            onsite={onsite}
            onStartOnsite={() => setShowOnsiteModal(true)}
            onUpdateEta={() => setShowEtaModal(true)}
            onArrivedHome={() => setOnsite(null)}
            onDispute={(swap) => {
              const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
              setNoteWithArchive({
                from: currentUser,
                to: partner,
                text: `Hey — can we talk about the ${fmtShiftRange(swap.shift)} swap? You're putting "${swap.reason}" on my plate and I want to discuss before it sticks.`,
                ts: new Date().toISOString(),
                acknowledged: false,
                kind: "dispute",
              });
            }}
          />
        )}
        {tab === "log" && (
          <LogView C={C} events={events} removeEvent={removeEvent} updateEvent={updateEvent} now={now} />
        )}
        {tab === "shifts" && (
          <ShiftsView
            C={C} shifts={shifts} setShifts={setShifts}
            meetings={meetings} setMeetings={setMeetings}
            now={now}
            onsite={onsite} setOnsite={setOnsite}
            activeShifts={activeShifts}
            swaps={projectedShifts.swaps}
            tomorrowProjection={tomorrowProjection}
            timeBank={timeBank} setTimeBank={setTimeBank}
            currentUser={currentUser}
            pendingTimeBankAction={pendingTimeBankAction}
            clearPendingTimeBankAction={() => setPendingTimeBankAction(null)}
          />
        )}
        {tab === "bank" && (
          <BankView
            C={C}
            timeBank={timeBank} setTimeBank={setTimeBank}
            setMeetings={setMeetings}
            now={now}
            currentUser={currentUser}
            pendingTimeBankAction={pendingTimeBankAction}
            clearPendingTimeBankAction={() => setPendingTimeBankAction(null)}
          />
        )}
        {tab === "inventory" && (
          <InventoryView
            C={C} inventory={liveInventory}
            moveToFridge={moveToFridge}
            removeInventory={removeInventory}
            emptyLocation={(loc) => setInventory(prev => prev.filter(i => i.location !== loc))}
            editBottle={(bottleId) => setEditingBottleId(bottleId)}
            totalSafeOz={totalSafeOz} rtSafeOz={rtSafeOz} fridgeOz={fridgeOz}
            feedsRunway={feedsRunway} hoursRunway={hoursRunway}
            lastPump={lastPump} nextPumpAt={nextPumpAt} now={now}
            todayCalories={todayCalories}
          />
        )}
        {tab === "doctor" && (
          <DoctorView C={C} now={now} events={events} notes={notes} appointments={appointments}
            removeNote={removeNote} updateNote={updateNote}
            addAppointment={addAppointment} removeAppointment={removeAppointment}
            docSummary={docSummary} setDocSummary={setDocSummary} />
        )}
      </main>

      {/* Central LOG button */}
      <CentralLogButton C={C} mode={mode} onClick={() => setShowLogger(true)} />

      <TabBar C={C} tab={tab} setTab={setTab} />

      {showLogger && (
        <LogPickerSheet
          C={C}
          onClose={() => { setShowLogger(false); setLoggerType(null); }}
          onPick={(t) => setLoggerType(t)}
          loggerType={loggerType}
          onSubmit={(payload) => {
            // Special handling for feeds with a usedBottleId — deduct from inventory
            if (payload.type === "feed" && payload.usedBottleId) {
              const bottleId = payload.usedBottleId;
              const oz = payload.oz;
              setInventory(prev => prev.map(b => {
                if (b.id !== bottleId) return b;
                const newOz = b.oz - oz;
                if (newOz <= 0) return null; // mark for filter
                return { ...b, oz: newOz };
              }).filter(Boolean));
              // Strip usedBottleId from event before adding (it's a UI hint, not event data)
              const { usedBottleId, ...event } = payload;
              addEvent(event);
            } else {
              addEvent(payload);
            }
          }}
          lastFeed={lastFeed}
          lastPump={lastPump}
          activeBfTimer={activeBfTimer}
          setActiveBfTimer={setActiveBfTimer}
          activeActivity={activeActivity}
          setActiveActivity={setActiveActivity}
          addNote={addNote}
          addMeeting={(m) => {
            const newMeeting = { ...m, id: crypto.randomUUID() };
            setMeetings(prev => {
              const next = [...prev, newMeeting];
              // SYNCHRONOUS PERSIST: don't wait for the React effect. Write
              // straight to localStorage now so the data is durable even if
              // the runtime tears down before the effect runs.
              try {
                localStorage.setItem("solene:meetings", JSON.stringify(next));
                // Backup snapshot of the previous state — if the latest read
                // ever returns empty/stale, we can recover the user's data.
                localStorage.setItem("solene:meetings:backup", JSON.stringify(prev));
              } catch (e) {
                console.warn("[addMeeting] sync persist failed", e);
              }
              return next;
            });
          }}
          liveInventory={liveInventory}
          currentUser={currentUser}
          flaggedNotes={notes.filter(n => n.flagged)}
          updateNote={updateNote}
          onOpenTimeBank={(action) => {
            setShowLogger(false);
            setLoggerType(null);
            setTab("shifts");
            setPendingTimeBankAction(action);
          }}
          onOpenBulkImport={() => {
            setShowLogger(false);
            setLoggerType(null);
            setShowBulkImport(true);
          }}
        />
      )}

      {/* Bulk import modal — opens from the LOG sheet's "Catch up" pill.
          Commits via bulkAddEvents which atomically pushes events + creates
          inventory bottles for any pumps with oz. */}
      {showBulkImport && (
        <BulkImportModal
          C={C}
          now={now}
          onClose={() => setShowBulkImport(false)}
          onCommit={(events) => {
            bulkAddEvents(events);
            setShowBulkImport(false);
          }}
        />
      )}

      {/* Soft prompt at handoff */}
      {showHandoffPrompt && (
        <HandoffPromptModal
          C={C}
          fromParent={currentUser}
          toParent={currentUser === "Mommy" ? "Daddy" : "Mommy"}
          existingText={handoffNote && handoffNote.from === currentUser ? handoffNote.text : ""}
          onClose={() => setShowHandoffPrompt(false)}
          onSubmit={(text) => {
            const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
            setNoteWithArchive({
              from: currentUser,
              to: partner,
              text,
              ts: new Date().toISOString(),
              acknowledged: false,
            });
            setShowHandoffPrompt(false);
          }}
          onSkip={() => setShowHandoffPrompt(false)}
        />
      )}

      {/* Always-available note editor (from the on-duty card button) */}
      {showHandoffNoteEditor && (
        <HandoffNoteEditor
          C={C}
          fromParent={currentUser}
          toParent={currentUser === "Mommy" ? "Daddy" : "Mommy"}
          existingText={handoffNote && handoffNote.from === currentUser && !handoffNote.acknowledged ? handoffNote.text : ""}
          onClose={() => setShowHandoffNoteEditor(false)}
          onSubmit={(text) => {
            const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
            setNoteWithArchive({
              from: currentUser,
              to: partner,
              text,
              ts: new Date().toISOString(),
              acknowledged: false,
            });
            setShowHandoffNoteEditor(false);
          }}
          onClear={() => {
            setHandoffNote(null);
            setShowHandoffNoteEditor(false);
          }}
        />
      )}

      {/* Redeem gift modal — opened from the Now-view pip when the current
          user has pending gifts. Picking a time creates a meeting and marks
          the gift as redeemed; the pip vanishes once all gifts are claimed. */}
      {redeemingGift && (
        <RedeemGiftModal
          C={C}
          gift={redeemingGift}
          timeBank={timeBank}
          setTimeBank={setTimeBank}
          setMeetings={setMeetings}
          now={now}
          onClose={() => setRedeemingGift(null)}
        />
      )}

      {/* On-site / ETA modals at App level — triggered from NowView's
          on-site control or from anywhere else that needs to start/update
          an on-site session. */}
      {showOnsiteModal && <OnsiteModal C={C} onClose={() => setShowOnsiteModal(false)} onSubmit={(o) => { setOnsite(o); setShowOnsiteModal(false); }} />}
      {showEtaModal && onsite && <EtaUpdateModal C={C} onsite={onsite} onClose={() => setShowEtaModal(false)} onSubmit={(eta) => { setOnsite({ ...onsite, etaUpdate: eta }); setShowEtaModal(false); }} />}
      {showSleepDownPicker && sleepDownPrefill && (
        <SleepDownPickerModal
          C={C}
          prefill={sleepDownPrefill}
          now={now}
          onClose={() => { setShowSleepDownPicker(false); setSleepDownPrefill(null); }}
          onSubmit={(ts, estimated) => {
            addEvent({ type: "sleep_down", ts, estimated });
            setShowSleepDownPicker(false);
            setSleepDownPrefill(null);
          }}
        />
      )}

      {/* Family code setup — first-launch flow when cloud sync backend is
          detected. Stores the code in localStorage outside the solene:*
          namespace so it survives data wipes. Build 1: just captures the
          code. Build 2: storage layer will use it for reads/writes. */}
      {showFamilyCodeSetup && (
        <FamilyCodeSetupModal
          C={C}
          onSet={async (code, mode) => {
            // mode is "generate" (we're starting a new family) or "enter"
            // (joining one our partner created). The two modes do different
            // things to existing local data:
            //   generate → upload all local state to cloud (we're seeding it)
            //   enter    → confirm-and-replace local state with cloud state
            //              (the partner's data wins; ours gets discarded)
            //
            // The "enter" path is destructive, so confirm first. If user
            // declines, we don't set the code at all — they stay local-only.
            if (mode === "enter") {
              // Check if there's existing data that would be lost
              const hasLocalData = events.length > 0 || notes.length > 0 || meetings.length > 0;
              if (hasLocalData) {
                const ok = window.confirm(
                  "Joining a family will REPLACE the data on this device with " +
                  "your partner's data. Anything you've logged here that isn't " +
                  "in their snapshot will be lost.\n\n" +
                  "If you have data here that you want to keep, cancel and use " +
                  "Backup → Export first.\n\n" +
                  "Continue and join the family?"
                );
                if (!ok) return;
              }
            }

            try { localStorage.setItem("ll:familyCode", code); } catch {}
            setFamilyCode(code);
            setShowFamilyCodeSetup(false);
            setCloudSyncStatus("syncing");

            // Block polling until initial sync completes — initialSyncDoneRef
            // gates the polling loop. We'll set it to true after the migration.
            initialSyncDoneRef.current = false;

            // Update storage context immediately (don't wait for the useEffect
            // that watches familyCode — we want to push/pull NOW).
            storage.setCloudContext({ familyCode: code, syncingFromCloud: false });

            try {
              if (mode === "generate") {
                // Upload all current state to cloud. We push each key with the
                // CURRENT React state value. The cloud writes happen in
                // parallel for speed. If any fail we log but don't abort —
                // partial sync is better than no sync.
                const stateToUpload = {
                  "solene:events": events,
                  "solene:inventory": inventory,
                  "solene:meetings": meetings,
                  "solene:shifts:v3": shifts,
                  "solene:diaperbag": diaperBag,
                  "solene:onsite": onsite,
                  "solene:notes": notes,
                  "solene:appointments": appointments,
                  "solene:activeActivity": activeActivity,
                  "solene:activePump": activePump,
                  "solene:takeover": takeover,
                  "solene:handoffNote": handoffNote,
                  "solene:noteArchive": noteArchive,
                  "solene:timeBank": timeBank,
                  "solene:dailyContent": dailyContent,
                  "solene:currentUser": currentUser,
                };
                const writes = Object.entries(stateToUpload).map(([k, v]) =>
                  storage.cloudSet(code, k, v).then(ok => ({ k, ok }))
                );
                const results = await Promise.all(writes);
                const failed = results.filter(r => !r.ok).map(r => r.k);
                if (failed.length > 0) {
                  console.warn("[initial sync upload] failed keys:", failed);
                }
                // Get the new server timestamp so polling won't immediately
                // think it has new data and re-pull what we just pushed.
                const list = await storage.cloudList(code);
                lastCloudTimestampRef.current = list?.updatedAt || Date.now();
              } else {
                // mode === "enter" — download cloud state and apply locally.
                // Set syncingFromCloud BEFORE applying so autosaves don't
                // bounce these writes back.
                syncingFromCloudRef.current = true;
                storage.setCloudContext({ familyCode: code, syncingFromCloud: true });

                const list = await storage.cloudList(code);
                if (!list) throw new Error("Couldn't reach the server. Try again in a moment.");

                for (const k of (list.keys || [])) {
                  const setter = cloudKeySetters[k];
                  if (!setter) continue;
                  const value = await storage.cloudGet(code, k);
                  if (value !== null) {
                    try { setter(value); } catch (e) { console.warn("[initial sync download] setter failed for", k, e); }
                  }
                }
                lastCloudTimestampRef.current = list.updatedAt || 0;

                // Wait one event loop turn for autosaves to flush, then
                // re-enable cloud writes.
                await new Promise(resolve => setTimeout(resolve, 100));
                syncingFromCloudRef.current = false;
                storage.setCloudContext({ familyCode: code, syncingFromCloud: false });
              }

              initialSyncDoneRef.current = true;
              setCloudSyncStatus("ok");
            } catch (e) {
              console.warn("[initial sync] failed:", e);
              alert("Cloud sync setup hit an error: " + (e.message || e) + "\n\nYour local data is safe. Try resetting the family code from Profile Switcher.");
              initialSyncDoneRef.current = true; // unblock polling so user can retry
              setCloudSyncStatus("offline");
            }
          }}
          onSkip={() => {
            // Mark that the user has seen + dismissed the setup so we
            // don't show it again on next launch. They can always re-open
            // it later from Profile Switcher → Cloud sync.
            try { localStorage.setItem("ll:familyCodeSetupDismissed", "1"); } catch {}
            setShowFamilyCodeSetup(false);
          }}
        />
      )}

      {showProfileSwitcher && (
        <ProfileSwitcherModal
          C={C}
          currentUser={currentUser}
          onSelect={(p) => { setCurrentUser(p); setShowProfileSwitcher(false); }}
          onClose={() => setShowProfileSwitcher(false)}
          takeover={takeover}
          onClearTakeover={() => setTakeover(null)}
          familyCode={familyCode}
          cloudSyncAvailable={cloudSyncAvailable}
          themeOverride={themeOverride}
          setThemeOverride={setThemeOverride}
          onOpenFamilyCodeSetup={() => {
            setShowProfileSwitcher(false);
            // Clear the dismiss flag so the modal can show even if previously
            // skipped — user is explicitly opening it from settings.
            try { localStorage.removeItem("ll:familyCodeSetupDismissed"); } catch {}
            setShowFamilyCodeSetup(true);
          }}
          onClearFamilyCode={() => {
            try { localStorage.removeItem("ll:familyCode"); } catch {}
            try { localStorage.removeItem("ll:familyCodeSetupDismissed"); } catch {}
            setFamilyCode(null);
            // Reset all cloud sync runtime state so the app cleanly returns
            // to local-only mode. The actual cloud data stays intact in KV
            // (the partner can still access it with the same code).
            initialSyncDoneRef.current = false;
            lastCloudTimestampRef.current = 0;
            syncingFromCloudRef.current = false;
            setCloudSyncStatus("ok");
            storage.setCloudContext({ familyCode: null, syncingFromCloud: false });
            setShowProfileSwitcher(false);
            setShowFamilyCodeSetup(true);
          }}
          onExportData={() => {
            // Build a JSON snapshot of all user data. Includes a schema
            // version + export timestamp so future imports can detect/
            // migrate older formats. Excludes the seed flag and wipe marker
            // (those are infrastructure, not user data).
            const snapshot = {
              schemaVersion: 1,
              appVersion: APP_VERSION,
              exportedAt: new Date().toISOString(),
              data: {
                events,
                inventory,
                meetings,
                shifts,
                diaperBag,
                onsite,
                notes,
                appointments,
                activeActivity,
                activePump,
                takeover,
                handoffNote,
                noteArchive,
                timeBank,
                dailyContent,
                currentUser,
              },
            };
            return JSON.stringify(snapshot, null, 2);
          }}
          onImportData={(jsonText) => {
            // Parse + validate. We trust the schema only as far as the field
            // names; missing fields fall back to current state to avoid
            // wiping things the user might not have meant to wipe.
            // First: detect whether the user pasted a free-form log (e.g. for
            // bulk import) into the wrong box. The tell: text doesn't start
            // with '{' (a JSON object) or '['  (a JSON array). If so, give a
            // friendly redirect to Bulk Import instead of a confusing JSON
            // parser error like 'Unexpected token "S", "SUN May 3"...'.
            const trimmed = (jsonText || "").trim();
            if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
              return {
                ok: false,
                error: "This looks like free-form log text, not a JSON backup. " +
                       "If you're trying to import historical events, close this modal " +
                       "and use LOG → Catch up → Bulk import instead. This box only " +
                       "accepts JSON snapshots created by the Export button.",
              };
            }
            try {
              const parsed = JSON.parse(jsonText);
              if (!parsed || typeof parsed !== "object" || !parsed.data) {
                throw new Error("Invalid format — no data section found");
              }
              if (parsed.schemaVersion !== 1) {
                throw new Error(`Unknown schema version ${parsed.schemaVersion} (expected 1)`);
              }
              const d = parsed.data;
              // Apply each field if present. For events/inventory we re-hydrate
              // the Date objects since JSON serialization loses those.
              if (Array.isArray(d.events)) setEvents(d.events.map(x => ({ ...x, ts: new Date(x.ts) })));
              if (Array.isArray(d.inventory)) setInventory(d.inventory.map(x => ({ ...x, pumpedAt: new Date(x.pumpedAt) })));
              if (Array.isArray(d.meetings)) setMeetings(d.meetings);
              if (d.shifts && typeof d.shifts === "object") setShifts(d.shifts);
              if (d.diaperBag) setDiaperBag(d.diaperBag);
              if ("onsite" in d) setOnsite(d.onsite);
              if (Array.isArray(d.notes)) setNotes(d.notes);
              if (Array.isArray(d.appointments)) setAppointments(d.appointments);
              if ("activeActivity" in d) setActiveActivity(d.activeActivity);
              if ("activePump" in d) setActivePump(d.activePump);
              if ("takeover" in d) setTakeover(d.takeover);
              if ("handoffNote" in d) setHandoffNote(d.handoffNote);
              if (Array.isArray(d.noteArchive)) setNoteArchive(d.noteArchive);
              if (d.timeBank) setTimeBank(d.timeBank);
              if (d.dailyContent) setDailyContent(d.dailyContent);
              if (d.currentUser) setCurrentUser(d.currentUser);
              return { ok: true, count: (d.events?.length || 0) + (d.notes?.length || 0) };
            } catch (err) {
              return { ok: false, error: err.message || String(err) };
            }
          }}
          onResetData={async () => {
            // Step 1: Mark the app as wiping. This sets a window flag that the
            // autosave effects check; while wiping, no autosave will fire and
            // rewrite the state back into storage we're trying to clear.
            if (typeof window !== "undefined") {
              window.__soleneWiping = true;
            }
            // Step 2: Pre-emptively clear all in-memory React state. This
            // ensures that if any autosave effect somehow does fire before
            // reload, it fires with empty arrays — which is fine, since the
            // wipe wants those keys empty/missing on the next boot anyway.
            // We also clear the seed flag so REAL_SEED_DATA loads on reload.
            try {
              setEvents([]); setInventory([]); setMeetings([]);
              setNotes([]); setAppointments([]); setNoteArchive([]);
              setHandoffNote(null); setTakeover(null);
              setActiveActivity(null); setActivePump(null);
              setOnsite(null); setDiaperBag(DEFAULT_DIAPER_BAG);
              // Note: 'swaps' is not React state — it's computed locally
              // inside projectedShifts. No setSwaps to call. Fixed 05.05ag.
            } catch (e) { console.warn("[reset] state clear partial failure", e); }

            // Step 3: Wipe both storage backends. Awaits the full sweep so
            // artifact-storage deletes complete before we navigate.
            try {
              await storage.wipeAll();
            } catch (e) {
              console.warn("[reset] wipeAll error (continuing anyway):", e);
            }

            // Step 4: Belt-and-suspenders — directly nuke ALL solene:* keys
            // from localStorage one more time, in case anything snuck in
            // during the await above (e.g. a setEvents([]) effect firing).
            try {
              const toRemove = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith("solene:")) toRemove.push(k);
              }
              for (const k of toRemove) localStorage.removeItem(k);
            } catch {}

            // Step 5: Hard reload. The wiping flag stays true until the
            // reload navigates, so any flush-on-unmount effects are
            // suppressed. After reload it's a fresh window.
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        />
      )}

      {showNoteArchive && (
        <NoteArchiveModal
          C={C}
          archive={noteArchive}
          currentUser={currentUser}
          onClose={() => setShowNoteArchive(false)}
          onClear={() => { setNoteArchive([]); setShowNoteArchive(false); }}
        />
      )}

      {showFinishPump && activePump && (
        <FinishPumpModal
          C={C}
          activePump={activePump}
          now={now}
          onCancel={() => setShowFinishPump(false)}
          onSubmit={({ oz, location }) => {
            const start = new Date(activePump.startedAt);
            const durationMin = Math.max(1, Math.round((now - start) / 60000));
            // Log pump event using the start time so it sits at the right moment in the timeline
            addEvent({
              type: "pump",
              ts: start,
              oz,
              durationMin,
              mode: "end",
            });
            // Add to inventory
            setInventory(prev => [...prev, {
              id: crypto.randomUUID(),
              pumpedAt: start.toISOString(),
              oz,
              location,
            }]);
            setActivePump(null);
            setShowFinishPump(false);
          }}
          onDiscard={() => {
            setActivePump(null);
            setShowFinishPump(false);
          }}
        />
      )}

      {bottlePickerLoc && (
        <UseBottleModal
          C={C}
          location={bottlePickerLoc}
          inventory={liveInventory.filter(i => !i.expired && i.location === bottlePickerLoc)}
          now={now}
          onClose={() => setBottlePickerLoc(null)}
          onUse={({ bottleId, oz, isFullBottle }) => {
            // Log a feed event: source BM (bottle picker is for BM only)
            addEvent({ type: "feed", oz: Number(oz), source: "BM", ts: new Date() });
            // Deduct from chosen bottle
            setInventory(prev => prev.map(b => {
              if (b.id !== bottleId) return b;
              if (isFullBottle) return null;
              const newOz = b.oz - Number(oz);
              if (newOz <= 0) return null;
              return { ...b, oz: newOz };
            }).filter(Boolean));
            setBottlePickerLoc(null);
          }}
          onMoveToFridge={(bottleId) => {
            setInventory(prev => prev.map(b => b.id === bottleId ? { ...b, location: "fridge" } : b));
          }}
          onDiscardBottle={(bottleId) => {
            setInventory(prev => prev.filter(b => b.id !== bottleId));
            setBottlePickerLoc(null);
          }}
          onEditBottle={(bottleId) => {
            setEditingBottleId(bottleId);
            setBottlePickerLoc(null);
          }}
        />
      )}

      {editingBottleId && (() => {
        const bottle = liveInventory.find(b => b.id === editingBottleId);
        if (!bottle) { setEditingBottleId(null); return null; }
        return (
          <EditBottleModal
            C={C}
            bottle={bottle}
            onClose={() => setEditingBottleId(null)}
            onSave={(updates) => {
              setInventory(prev => prev.map(b => b.id === editingBottleId ? { ...b, ...updates } : b));
              setEditingBottleId(null);
            }}
          />
        );
      })()}
    </div>
  );
}

function UseBottleModal({ C, location, inventory, now, onClose, onUse, onMoveToFridge, onDiscardBottle, onEditBottle }) {
  // Sort: oldest first within location (use-up order)
  const sorted = [...inventory].sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));
  // Single-bottle mode (default) is for feeding — pick one bottle, log a feed.
  // Multi-bottle mode is for cleanup — select several, then bulk discard or
  // bulk move to fridge. Switching modes resets selection.
  const [mode, setMode] = useState("use"); // "use" | "manage"
  const [selectedId, setSelectedId] = useState(sorted[0]?.id || null);
  const [multiSelected, setMultiSelected] = useState(new Set()); // for "manage"
  const [oz, setOz] = useState(sorted[0]?.oz || 4);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null); // "discard" | "move" | null
  // Auto-cancel bulk confirm after 4s like other 2-step actions
  useEffect(() => {
    if (!bulkConfirm) return;
    const t = setTimeout(() => setBulkConfirm(null), 4000);
    return () => clearTimeout(t);
  }, [bulkConfirm]);
  const selected = sorted.find(b => b.id === selectedId);
  const locColor = location === "rt" ? "#D4A03A" : C.daddy;
  const locLabel = location === "rt" ? "Room temp" : "Fridge";

  const switchMode = (newMode) => {
    setMode(newMode);
    setMultiSelected(new Set());
    setBulkConfirm(null);
    setConfirmDiscard(false);
  };

  const toggleMulti = (id) => {
    setMultiSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setBulkConfirm(null); // any toggle resets confirm state
  };

  const selectAll = () => setMultiSelected(new Set(sorted.map(b => b.id)));
  const selectNone = () => setMultiSelected(new Set());

  // Compute totals for the bulk action bar
  const multiOz = sorted
    .filter(b => multiSelected.has(b.id))
    .reduce((sum, b) => sum + b.oz, 0);
  const multiCount = multiSelected.size;

  return (
    <ModalShell C={C} onClose={onClose} title={`${mode === "use" ? "Use a bottle from" : "Manage bottles in"} ${locLabel.toLowerCase()}`}>
      {sorted.length === 0 ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 24, border: `1px solid ${C.line}15`, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic" }}>
            No bottles in {locLabel.toLowerCase()} right now.
          </div>
        </div>
      ) : (
        <>
          {/* Mode toggle — Use vs Manage. Use is single-select for feeding;
              Manage is multi-select for cleanup actions. */}
          <SegControl C={C} value={mode} onChange={switchMode} options={[
            { v: "use", l: "Use a bottle" },
            { v: "manage", l: `Manage (${sorted.length})` },
          ]} />
          <div style={{ height: 14 }} />

          {mode === "use" ? (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                Pick which bottle Solène is using. Logs a feed event and deducts from inventory.
              </div>
              <Field C={C} label="Which bottle?">
                <div style={{ display: "grid", gap: 6 }}>
                  {sorted.map(b => {
                    const pumpedAt = new Date(b.pumpedAt);
                    const isSelected = selectedId === b.id;
                    const isRisky = b.risky;
                    return (
                      <button key={b.id}
                        onClick={() => { setSelectedId(b.id); setOz(b.oz); }}
                        style={{
                          background: isSelected ? `${locColor}22` : C.bg,
                          border: `1.5px solid ${isSelected ? locColor : C.line + "22"}`,
                          borderRadius: 10, padding: "10px 12px",
                          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
                        <span style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: isRisky ? C.accent : locColor, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                          flexShrink: 0,
                        }}>{location === "rt" ? "RT" : "Fr"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                            {b.oz.toFixed(1)} oz
                            {isRisky && <span style={{ fontSize: 10, color: C.accent, marginLeft: 6, fontWeight: 600 }}>RISKY</span>}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            pumped {pumpedAt.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
              {selected && (
                <Field C={C} label="How much oz did Solène drink?">
                  <input type="number" value={oz} step="0.5" min="0.5" max={selected.oz} onChange={e => setOz(e.target.value)}
                    style={{ width: "100%", padding: 10, fontSize: 16, background: C.bg, border: `1px solid ${C.line}33`, borderRadius: 8, color: C.ink, outline: "none" }} />
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    bottle has {selected.oz.toFixed(1)} oz · entering more uses the whole thing
                  </div>
                </Field>
              )}

              {selected && (
                <SubmitButton C={C} onClick={() => onUse({
                  bottleId: selectedId,
                  oz: Math.min(Number(oz), selected.oz),
                  isFullBottle: Number(oz) >= selected.oz,
                })}>
                  Log feed · {Math.min(Number(oz), selected.oz).toFixed(1)} oz
                </SubmitButton>
              )}

              {selected && (
                <div style={{ display: "grid", gridTemplateColumns: location === "rt" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <button onClick={() => onEditBottle(selectedId)} style={{
                    background: "transparent", color: C.muted,
                    border: `1px dashed ${C.line}33`, borderRadius: 8,
                    padding: "8px 12px", fontSize: 11, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <Edit3 size={11} /> Edit (no log)
                  </button>
                  {location === "rt" && (
                    <button onClick={() => { onMoveToFridge(selectedId); onClose(); }} style={{
                      background: "transparent", color: C.muted,
                      border: `1px dashed ${C.line}33`, borderRadius: 8,
                      padding: "8px 12px", fontSize: 11, cursor: "pointer",
                    }}>
                      Move to fridge
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirmDiscard) {
                        onDiscardBottle(selectedId);
                        setConfirmDiscard(false);
                      } else {
                        setConfirmDiscard(true);
                      }
                    }}
                    style={{
                      background: confirmDiscard ? C.accent : "transparent",
                      color: confirmDiscard ? "#fff" : C.muted,
                      border: confirmDiscard ? "none" : `1px dashed ${C.line}33`,
                      borderRadius: 8,
                      padding: "8px 12px", fontSize: 11, cursor: "pointer", fontWeight: confirmDiscard ? 600 : 400,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}>
                    <Trash2 size={11} /> {confirmDiscard ? "Sure? Tap again" : "Discard"}
                  </button>
                </div>
              )}
            </>
          ) : (
            // === MANAGE MODE: multi-select for bulk discard / move ===
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Tap bottles to select. Then choose an action below.
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 11 }}>
                <span style={{ color: C.muted }}>
                  {multiCount === 0 ? "none selected" : `${multiCount} selected · ${multiOz.toFixed(1)} oz`}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={selectAll} style={{
                    background: "transparent", border: "none", color: C.accent,
                    fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "inherit",
                  }}>select all</button>
                  <span style={{ color: C.muted }}>·</span>
                  <button onClick={selectNone} disabled={multiCount === 0} style={{
                    background: "transparent", border: "none",
                    color: multiCount === 0 ? C.muted : C.accent,
                    fontSize: 11, cursor: multiCount === 0 ? "default" : "pointer",
                    padding: 0, fontFamily: "inherit", opacity: multiCount === 0 ? 0.5 : 1,
                  }}>clear</button>
                </div>
              </div>
              <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                {sorted.map(b => {
                  const pumpedAt = new Date(b.pumpedAt);
                  const isSelected = multiSelected.has(b.id);
                  const isRisky = b.risky;
                  return (
                    <button key={b.id}
                      onClick={() => toggleMulti(b.id)}
                      style={{
                        background: isSelected ? `${locColor}22` : C.bg,
                        border: `1.5px solid ${isSelected ? locColor : C.line + "22"}`,
                        borderRadius: 10, padding: "10px 12px",
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                      {/* Checkbox indicator */}
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `1.5px solid ${isSelected ? locColor : C.line + "44"}`,
                        background: isSelected ? locColor : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {isSelected && <Check size={14} color="#fff" />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                          {b.oz.toFixed(1)} oz
                          {isRisky && <span style={{ fontSize: 10, color: C.accent, marginLeft: 6, fontWeight: 600 }}>RISKY</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          pumped {pumpedAt.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bulk action bar — only enabled when something is selected */}
              <div style={{ display: "grid", gridTemplateColumns: location === "rt" ? "1fr 1fr" : "1fr", gap: 8 }}>
                {location === "rt" && (
                  <button
                    disabled={multiCount === 0}
                    onClick={() => {
                      if (multiCount === 0) return;
                      if (bulkConfirm === "move") {
                        Array.from(multiSelected).forEach(id => onMoveToFridge(id));
                        setMultiSelected(new Set());
                        setBulkConfirm(null);
                        onClose();
                      } else {
                        setBulkConfirm("move");
                      }
                    }}
                    style={{
                      background: bulkConfirm === "move" ? C.daddy : (multiCount === 0 ? C.bg : "transparent"),
                      color: bulkConfirm === "move" ? "#fff" : (multiCount === 0 ? C.muted : C.daddy),
                      border: bulkConfirm === "move" ? "none" : `1.5px solid ${multiCount === 0 ? C.line + "22" : C.daddy + "55"}`,
                      borderRadius: 10, padding: "10px 12px",
                      fontSize: 12, fontWeight: 600,
                      cursor: multiCount === 0 ? "default" : "pointer",
                      fontFamily: "inherit",
                      opacity: multiCount === 0 ? 0.5 : 1,
                    }}>
                    {bulkConfirm === "move" ? `Sure? Move ${multiCount}` : `Move ${multiCount > 0 ? multiCount : ""} to fridge`.trim()}
                  </button>
                )}
                <button
                  disabled={multiCount === 0}
                  onClick={() => {
                    if (multiCount === 0) return;
                    if (bulkConfirm === "discard") {
                      Array.from(multiSelected).forEach(id => onDiscardBottle(id));
                      setMultiSelected(new Set());
                      setBulkConfirm(null);
                      // Don't close — user might want to do more cleanup
                    } else {
                      setBulkConfirm("discard");
                    }
                  }}
                  style={{
                    background: bulkConfirm === "discard" ? C.accent : (multiCount === 0 ? C.bg : "transparent"),
                    color: bulkConfirm === "discard" ? "#fff" : (multiCount === 0 ? C.muted : C.accent),
                    border: bulkConfirm === "discard" ? "none" : `1.5px solid ${multiCount === 0 ? C.line + "22" : C.accent + "55"}`,
                    borderRadius: 10, padding: "10px 12px",
                    fontSize: 12, fontWeight: 600,
                    cursor: multiCount === 0 ? "default" : "pointer",
                    fontFamily: "inherit",
                    opacity: multiCount === 0 ? 0.5 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  <Trash2 size={12} /> {bulkConfirm === "discard" ? `Sure? Discard ${multiCount}` : `Discard ${multiCount > 0 ? multiCount : ""}`.trim()}
                </button>
              </div>
              {multiCount > 0 && bulkConfirm && (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", textAlign: "center", marginTop: 8 }}>
                  {multiOz.toFixed(1)} oz total · tap to confirm
                </div>
              )}
            </>
          )}
        </>
      )}
    </ModalShell>
  );
}

function EditBottleModal({ C, bottle, onClose, onSave }) {
  const [oz, setOz] = useState(bottle.oz);
  const [loc, setLoc] = useState(bottle.location);
  const [pumpedAtLocal, setPumpedAtLocal] = useState(() => {
    const d = new Date(bottle.pumpedAt);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  return (
    <ModalShell C={C} onClose={onClose} title="Edit bottle (no feed logged)">
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Use this when the app's tracking is wrong. Adjusting these values won't log a feed event — it just updates inventory directly.
      </div>

      <Field C={C} label="Volume (oz)">
        <BigOzPicker C={C} value={oz} onChange={setOz} />
      </Field>

      <Field C={C} label="Where is it?">
        <SegControl C={C} value={loc} onChange={setLoc} options={[
          { v: "rt", l: "Room temp" },
          { v: "fridge", l: "Fridge" },
          { v: "freezer", l: "Freezer" },
        ]} />
      </Field>

      <Field C={C} label="When was it pumped?">
        <input
          type="datetime-local"
          value={pumpedAtLocal}
          onChange={e => setPumpedAtLocal(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
            borderRadius: 8, fontSize: 14, background: C.bg, color: C.ink,
            fontFamily: "inherit",
          }}
        />
        <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>
          Affects how long the bottle is considered safe.
        </div>
      </Field>

      <SubmitButton C={C} onClick={() => onSave({
        oz: Number(oz),
        location: loc,
        pumpedAt: new Date(pumpedAtLocal).toISOString(),
      })}>
        Save changes
      </SubmitButton>
    </ModalShell>
  );
}

function FinishPumpModal({ C, activePump, now, onCancel, onSubmit, onDiscard }) {
  const start = new Date(activePump.startedAt);
  const durationMin = Math.max(1, Math.round((now - start) / 60000));
  const [oz, setOz] = useState(4);
  const [location, setLocation] = useState("rt");

  return (
    <ModalShell C={C} onClose={onCancel} title="Finish pump session">
      <div style={{
        background: `${C.mommy}15`, borderRadius: 10, padding: 12, marginBottom: 14,
        border: `1px solid ${C.mommy}33`,
      }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.mommy, fontWeight: 700, marginBottom: 4 }}>
          Pump session
        </div>
        <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5 }}>
          Started <strong>{fmtTimeShort(start)}</strong> · ran for <strong>{durationMin} min</strong>
        </div>
      </div>

      <Field C={C} label="How many ounces?">
        <BigOzPicker C={C} value={oz} onChange={setOz} />
      </Field>

      <Field C={C} label="Where does it go?">
        <SegControl C={C} value={location} onChange={setLocation} options={[
          { v: "rt", l: "Room temp" },
          { v: "fridge", l: "Fridge" },
          { v: "freezer", l: "Freezer" },
        ]} />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
          {location === "rt"
            ? "Use within 4 hours · Daddy can grab it without asking"
            : location === "fridge"
            ? "Use within 96 hours · keep cold until needed"
            : "Long-term storage · 6 months · for back-to-work stash"}
        </div>
      </Field>

      <SubmitButton C={C} onClick={() => onSubmit({ oz, location })}>
        Save · {oz} oz to {location === "rt" ? "room temp" : location === "fridge" ? "fridge" : "freezer"}
      </SubmitButton>

      <button onClick={onDiscard} style={{
        marginTop: 8, width: "100%",
        background: "transparent", color: C.muted,
        border: `1px dashed ${C.line}33`, borderRadius: 8,
        padding: "8px 12px", fontSize: 12, cursor: "pointer",
      }}>
        Discard pump (didn't actually pump)
      </button>
    </ModalShell>
  );
}

function NoteArchiveModal({ C, archive, currentUser, onClose, onClear }) {
  const sorted = [...archive].sort((a, b) => {
    const aTs = a.ackedAt || a.replacedAt || a.ts;
    const bTs = b.ackedAt || b.replacedAt || b.ts;
    return new Date(bTs) - new Date(aTs);
  });

  // Group by day
  const groups = {};
  for (const note of sorted) {
    const ts = note.ackedAt || note.replacedAt || note.ts;
    const dayKey = new Date(ts).toDateString();
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(note);
  }

  return (
    <ModalShell C={C} onClose={onClose} title="Past notes">
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Acknowledged and replaced handoff notes are kept here for reference (last 50). Notes you've sent are tagged from <strong style={{ color: currentUser === "Mommy" ? C.mommy : C.daddy }}>you</strong>; notes you received are tagged from your partner.
      </div>

      {sorted.length === 0 ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 24, border: `1px solid ${C.line}15`, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic" }}>No past notes yet.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, maxHeight: 480, overflowY: "auto" }}>
          {Object.keys(groups).map(dayKey => (
            <div key={dayKey}>
              <div style={{
                fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
                color: C.muted, fontWeight: 600, marginBottom: 6,
              }}>
                {(() => {
                  const d = new Date(dayKey);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const yesterday = new Date(today);
                  yesterday.setDate(today.getDate() - 1);
                  if (d.getTime() === today.getTime()) return "Today";
                  if (d.getTime() === yesterday.getTime()) return "Yesterday";
                  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
                })()}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {groups[dayKey].map((note, i) => {
                  const fromColor = note.from === "Mommy" ? C.mommy : C.daddy;
                  const isFromMe = note.from === currentUser;
                  const ackTs = note.ackedAt || note.replacedAt;
                  return (
                    <div key={i} style={{
                      background: C.paper,
                      border: `1px solid ${C.line}15`,
                      borderLeft: `3px solid ${fromColor}`,
                      borderRadius: 10, padding: "10px 12px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                          color: fromColor,
                        }}>
                          {isFromMe ? `you → ${note.to}` : `from ${note.from}`}
                        </span>
                        {note.kind === "dispute" && (
                          <span style={{ fontSize: 9, color: C.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            · dispute
                          </span>
                        )}
                        <span style={{
                          marginLeft: "auto", fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          sent {fmtTimeShort(new Date(note.ts))}
                          {ackTs && (note.acknowledged
                            ? ` · ack'd ${fmtTimeShort(new Date(ackTs))}`
                            : ` · replaced ${fmtTimeShort(new Date(ackTs))}`)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {note.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <button onClick={onClear} style={{
          marginTop: 14, width: "100%",
          background: "transparent", color: C.muted, border: `1px dashed ${C.line}33`, borderRadius: 10,
          padding: 10, fontSize: 12, cursor: "pointer",
        }}>
          Clear all past notes
        </button>
      )}
    </ModalShell>
  );
}

// ---- Family Code Setup Modal -------------------------------------------
// Shown on first launch when cloud sync backend is detected. Lets the user
// either (a) generate a fresh 6-character family code, or (b) enter a code
// their partner already created. The code becomes the namespace for all
// shared data on the backend.
//
// Important: we don't migrate ANY data on code-set. Build 1 just captures
// the code into localStorage. Build 2 will wire the storage layer to use
// it for reads/writes. So tapping "Generate" in build 1 creates a code but
// doesn't move local data anywhere — that comes later.
function FamilyCodeSetupModal({ C, onSet, onSkip }) {
  const [mode, setMode] = useState("choose"); // 'choose' | 'generate' | 'enter'
  const [enteredCode, setEnteredCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Generate a random 6-char code from the [A-Z0-9] alphabet. Avoids
  // visually ambiguous chars (0/O, 1/I) so verbal sharing is foolproof.
  const generate = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0,1,I,O
    let code = "";
    const arr = new Uint32Array(6);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 6; i++) {
      code += alphabet[arr[i] % alphabet.length];
    }
    setGeneratedCode(code);
    setMode("generate");
  };

  const submitEntered = () => {
    const cleaned = enteredCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleaned)) {
      setError("Code must be exactly 6 characters (letters + numbers).");
      return;
    }
    onSet(cleaned, "enter");
  };

  const acceptGenerated = () => {
    onSet(generatedCode, "generate");
  };

  return (
    <ModalShell C={C} onClose={onSkip} title="Family code setup">
      {mode === "choose" && (
        <>
          <div style={{
            fontSize: 13, color: C.ink, lineHeight: 1.55, marginBottom: 14,
          }}>
            <p style={{ margin: "0 0 10px" }}>
              Cloud sync is available on this deployment. Set up a <strong>family code</strong> so
              your data syncs between your devices and your partner's.
            </p>
            <p style={{ margin: "0", color: C.muted, fontSize: 12 }}>
              The 6-character code is your shared secret. Anyone with the code can
              read &amp; write your family's data. Don't share it publicly.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <button onClick={generate} style={{
              background: C.mommy, color: "#fff", border: "none",
              padding: "12px 14px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Sparkles size={16} />
              <div style={{ flex: 1 }}>
                <div>Generate a new code</div>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                  Start a new family — share with your partner
                </div>
              </div>
            </button>
            <button onClick={() => setMode("enter")} style={{
              background: C.daddy, color: "#fff", border: "none",
              padding: "12px 14px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Edit3 size={16} />
              <div style={{ flex: 1 }}>
                <div>Enter an existing code</div>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                  Join your partner's family
                </div>
              </div>
            </button>
          </div>

          <button onClick={onSkip} style={{
            width: "100%",
            background: "transparent", color: C.muted,
            border: `1px dashed ${C.line}33`, borderRadius: 10,
            padding: "10px 12px", fontSize: 12, cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Skip — keep using local-only storage
          </button>
        </>
      )}

      {mode === "generate" && (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            Your new family code:
          </div>
          <div style={{
            background: `${C.mommy}10`,
            border: `2px solid ${C.mommy}`,
            borderRadius: 12,
            padding: "20px 16px", marginBottom: 12,
            textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 32, fontWeight: 700, letterSpacing: "0.15em",
            color: C.ink,
            userSelect: "all",
          }}>
            {generatedCode}
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
            <strong style={{ color: C.ink }}>Share this with your partner.</strong> They'll
            enter it on their device to join the same family. Write it down somewhere safe — if
            you lose it and your data is gone, there's no recovery.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <button onClick={async () => {
              try {
                await navigator.clipboard.writeText(generatedCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                alert("Couldn't auto-copy. Manually copy the code shown above.");
              }
            }} style={{
              background: copied ? "#5C8E5C" : "transparent", color: copied ? "#fff" : C.ink,
              border: `1px solid ${copied ? "#5C8E5C" : C.line}55`, borderRadius: 8,
              padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              {copied ? "✓ Copied" : "Copy code"}
            </button>
            <button onClick={acceptGenerated} style={{
              background: C.mommy, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              Use this code
            </button>
          </div>
          <button onClick={() => setMode("choose")} style={{
            width: "100%",
            background: "transparent", color: C.muted, border: "none",
            padding: "8px 12px", fontSize: 11, cursor: "pointer",
            fontFamily: "inherit",
          }}>
            ← back
          </button>
        </>
      )}

      {mode === "enter" && (
        <>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.55, marginBottom: 12 }}>
            Enter the 6-character code your partner shared with you:
          </div>
          <input
            type="text"
            value={enteredCode}
            onChange={e => { setEnteredCode(e.target.value); setError(null); }}
            placeholder="ABC123"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              background: `${C.line}08`,
              border: `2px solid ${error ? C.accent : C.line + "33"}`,
              borderRadius: 10, padding: "16px 18px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24, letterSpacing: "0.12em",
              textTransform: "uppercase", textAlign: "center",
              color: C.ink, outline: "none",
              marginBottom: 8,
            }}
            onKeyDown={e => { if (e.key === "Enter") submitEntered(); }}
          />
          {error && (
            <div style={{
              fontSize: 11, color: C.accent, marginBottom: 8,
              padding: "6px 10px", background: `${C.accent}08`,
              border: `1px solid ${C.accent}33`, borderRadius: 6,
            }}>
              {error}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setMode("choose")} style={{
              background: "transparent", color: C.ink,
              border: `1px solid ${C.line}33`, borderRadius: 8,
              padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              ← Back
            </button>
            <button
              onClick={submitEntered}
              disabled={!enteredCode.trim()}
              style={{
                background: enteredCode.trim() ? C.daddy : `${C.line}33`,
                color: enteredCode.trim() ? "#fff" : C.muted,
                border: "none", borderRadius: 8,
                padding: "10px", fontSize: 13, fontWeight: 600,
                cursor: enteredCode.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}>
              Join family
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}


function ProfileSwitcherModal({ C, currentUser, onSelect, onClose, onResetData, onExportData, onImportData, takeover, onClearTakeover, familyCode, cloudSyncAvailable, onOpenFamilyCodeSetup, onClearFamilyCode, themeOverride, setThemeOverride }) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Backup section state
  // mode: null = collapsed, 'export' = showing exported text, 'import' = showing import textarea
  const [backupMode, setBackupMode] = useState(null);
  const [exportedText, setExportedText] = useState("");
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [copied, setCopied] = useState(false);

  return (
    <ModalShell C={C} onClose={onClose} title="Who's looking?">
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Switching only affects what's tagged as <strong style={{ color: C.ink }}>"yours"</strong> — handoff notes you receive, your duty timer, and which calendar gets new commitments by default. The shared data (Solène's logs, shifts, time bank) stays the same.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {["Mommy", "Daddy"].map(p => {
          const color = p === "Mommy" ? C.mommy : C.daddy;
          const isCurrent = p === currentUser;
          return (
            <button key={p} onClick={() => onSelect(p)} style={{
              background: isCurrent ? color : C.bg,
              color: isCurrent ? "#fff" : C.ink,
              border: `2px solid ${color}`,
              borderRadius: 14, padding: "16px 18px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 14, textAlign: "left",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: isCurrent ? "#fff" : color, color: isCurrent ? color : "#fff",
                fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{p[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, lineHeight: 1.1 }}>
                  {p}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  {isCurrent ? "Current view" : `Switch to ${p}'s view`}
                </div>
              </div>
              {isCurrent && <Check size={18} />}
            </button>
          );
        })}
      </div>

      {/* Theme toggle — Day vs Dusk. Per-device preference (not synced).
          Sits right after profile selection because it's a personal/visual
          setting that changes immediately and locally. */}
      {setThemeOverride && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
            color: C.muted, fontWeight: 600, marginBottom: 8,
          }}>
            Appearance
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          }}>
            {[
              { v: "day", l: "Day", icon: "☀", desc: "warm cream" },
              { v: "dusk", l: "Dusk", icon: "🌙", desc: "warm dark" },
            ].map(opt => {
              const active = themeOverride === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => setThemeOverride(opt.v)}
                  style={{
                    background: active ? C.accent : C.paper,
                    color: active ? "#fff" : C.ink,
                    border: `1.5px solid ${active ? C.accent : C.line + "40"}`,
                    borderRadius: 12, padding: "12px 14px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    textAlign: "left", fontFamily: "inherit",
                    transition: "background 0.15s, border-color 0.15s",
                  }}>
                  <div style={{
                    fontSize: 20, lineHeight: 1, flexShrink: 0,
                  }}>{opt.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 18, fontWeight: 500, lineHeight: 1.1,
                    }}>{opt.l}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>
                      {opt.desc}
                    </div>
                  </div>
                  {active && <Check size={14} />}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 6, textAlign: "center" }}>
            saved on this device only — your partner's device keeps its own preference
          </div>
        </div>
      )}

      {/* Clear stuck takeover — only when one is active */}
      {takeover && (
        <div style={{
          marginTop: 16, padding: 12,
          background: `${C.accent}10`, border: `1px solid ${C.accent}33`,
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5, marginBottom: 8 }}>
            <strong>Active takeover:</strong> {takeover.coveringParent} is covering {takeover.originalParent} (started {Math.floor((Date.now() - new Date(takeover.startedAt)) / 60000)} min ago).
            {" "}If this is stuck or wasn't intentional, clear it without logging time.
          </div>
          <button onClick={() => { onClearTakeover(); onClose(); }} style={{
            width: "100%",
            background: "transparent", color: C.accent,
            border: `1px solid ${C.accent}55`, borderRadius: 8,
            padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <X size={12} /> Clear takeover (no time logged)
          </button>
        </div>
      )}

      {/* About — version + recent build notes + changelog */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}15` }}>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 10 }}>
          About this build
        </div>
        <div style={{
          background: C.paper, border: `1px solid ${C.line}12`,
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: "italic", color: C.mommy, fontWeight: 500 }}>
              {APP_NAME}
            </span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: "italic", color: C.muted }}>
              {APP_SUBTITLE}
            </span>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: C.accent, fontWeight: 600,
            letterSpacing: "0.06em", marginBottom: 10,
          }}>
            v{APP_VERSION}
          </div>
          {APP_BUILD_NOTES.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 6 }}>
                What's new
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.ink, lineHeight: 1.55 }}>
                {APP_BUILD_NOTES.map((note, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          <details style={{ marginTop: 8 }}>
            <summary style={{
              fontSize: 11, color: C.muted, cursor: "pointer",
              fontStyle: "italic", listStyle: "none",
            }}>
              ▾ See changelog
            </summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {APP_CHANGELOG.map((entry, i) => (
                <div key={i} style={{
                  fontSize: 11, lineHeight: 1.5,
                  paddingLeft: 10, borderLeft: `2px solid ${i === 0 ? C.accent : C.line + "22"}`,
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", color: i === 0 ? C.accent : C.muted, fontWeight: 600 }}>
                    v{entry.version}
                  </div>
                  <div style={{ color: C.ink, marginTop: 1 }}>{entry.summary}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Cloud sync — surfaces the family code and lets the user reset it.
          Only renders when the backend is available (real Vercel deploy);
          on Claude artifact view or local-only deploys, this section is
          hidden because there's nothing to configure. */}
      {cloudSyncAvailable && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}15` }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            Cloud sync
          </div>
          {familyCode ? (
            <div style={{
              background: `${C.mommy}08`,
              border: `1px solid ${C.mommy}33`,
              borderRadius: 10,
              padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Family code (share with partner)
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22, fontWeight: 700, letterSpacing: "0.15em",
                color: C.ink, marginBottom: 10, userSelect: "all",
              }}>
                {familyCode}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={async () => {
                  try { await navigator.clipboard.writeText(familyCode); } catch {}
                }} style={{
                  background: "transparent", color: C.ink,
                  border: `1px solid ${C.line}33`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  Copy code
                </button>
                <button onClick={onClearFamilyCode} style={{
                  background: "transparent", color: C.accent,
                  border: `1px solid ${C.accent}55`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  Reset code
                </button>
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 8, lineHeight: 1.4 }}>
                Resetting unlinks this device from the current family. Your partner's data stays intact.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>
                Set up a family code to sync data between your devices and your partner's.
              </div>
              <button onClick={onOpenFamilyCodeSetup} style={{
                width: "100%",
                background: C.mommy, color: "#fff", border: "none",
                borderRadius: 8, padding: "10px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}>
                Set up cloud sync
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backup — manual export/import for cross-device data integrity.
          Use this to copy your data from one device to another. Until we
          ship the cloud sync (planned), this is how to keep your phone
          and your husband's phone in sync. Workflow:
            Mac → Export → Copy → switch device → Profile Switcher →
            Backup → Import → Paste → Apply. */}
      {(onExportData || onImportData) && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}15` }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            Backup &amp; restore
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginBottom: 10, lineHeight: 1.4 }}>
            Copy your data between devices manually. Paste the exported text on another device to restore.
          </div>

          {backupMode === null && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => {
                if (!onExportData) return;
                const text = onExportData();
                setExportedText(text);
                setBackupMode("export");
                setCopied(false);
              }} style={{
                background: C.paper,
                border: `1px solid ${C.line}33`, borderRadius: 10,
                padding: "10px 12px", fontSize: 12, cursor: "pointer",
                color: C.ink, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <FileText size={14} /> Export
              </button>
              <button onClick={() => {
                setBackupMode("import");
                setImportText("");
                setImportResult(null);
              }} style={{
                background: C.paper,
                border: `1px solid ${C.line}33`, borderRadius: 10,
                padding: "10px 12px", fontSize: 12, cursor: "pointer",
                color: C.ink, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Edit3 size={14} /> Import
              </button>
            </div>
          )}

          {backupMode === "export" && (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Tap "Copy", then paste this on another device's Import screen.
              </div>
              <textarea
                value={exportedText}
                readOnly
                rows={6}
                onClick={e => e.target.select()}
                style={{
                  width: "100%", background: `${C.line}08`,
                  border: `1px solid ${C.line}22`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 10, color: C.ink,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none", resize: "vertical",
                  lineHeight: 1.4,
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <button onClick={async () => {
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(exportedText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } else {
                      // Fallback: select the textarea and let the user cmd+c
                      alert("Select the text and press Cmd+C / Ctrl+C to copy.");
                    }
                  } catch (e) {
                    alert("Couldn't auto-copy. Select the text and press Cmd+C / Ctrl+C.");
                  }
                }} style={{
                  background: copied ? "#5C8E5C" : C.accent, color: "#fff",
                  border: "none", borderRadius: 8,
                  padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <button onClick={() => setBackupMode(null)} style={{
                  background: "transparent", color: C.ink,
                  border: `1px solid ${C.line}33`, borderRadius: 8,
                  padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  Done
                </button>
              </div>
            </div>
          )}

          {backupMode === "import" && (
            <div>
              <div style={{
                background: `${C.accent}10`, border: `1px solid ${C.accent}33`,
                borderRadius: 8, padding: "8px 10px", marginBottom: 8,
                fontSize: 11, color: C.ink, lineHeight: 1.5,
              }}>
                <strong>Heads-up:</strong> Importing replaces your current data on this device with the imported snapshot.
                If you have new entries here that aren't in the snapshot, they'll be lost.
              </div>
              <textarea
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportResult(null); }}
                placeholder="Paste exported JSON here…"
                rows={6}
                style={{
                  width: "100%", background: `${C.line}08`,
                  border: `1px solid ${C.line}22`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 10, color: C.ink,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none", resize: "vertical",
                  lineHeight: 1.4,
                }}
              />
              {importResult && (
                <div style={{
                  marginTop: 8,
                  padding: "8px 10px", borderRadius: 6,
                  fontSize: 11, lineHeight: 1.4,
                  background: importResult.ok ? "#5C8E5C15" : `${C.accent}15`,
                  color: importResult.ok ? "#3D6B3D" : C.accent,
                  border: `1px solid ${importResult.ok ? "#5C8E5C" : C.accent}33`,
                }}>
                  {importResult.ok
                    ? `✓ Imported ${importResult.count} entries. Modal will close to apply.`
                    : `✗ ${importResult.error}`}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    if (!importText.trim() || !onImportData) return;
                    const result = onImportData(importText);
                    setImportResult(result);
                    if (result.ok) {
                      // Auto-close after a moment so the user sees the success message
                      setTimeout(() => onClose(), 800);
                    }
                  }}
                  disabled={!importText.trim()}
                  style={{
                    background: importText.trim() ? C.accent : `${C.line}33`,
                    color: importText.trim() ? "#fff" : C.muted,
                    border: "none", borderRadius: 8,
                    padding: "10px", fontSize: 13, fontWeight: 600,
                    cursor: importText.trim() ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}>
                  Apply
                </button>
                <button onClick={() => setBackupMode(null)} style={{
                  background: "transparent", color: C.ink,
                  border: `1px solid ${C.line}33`, borderRadius: 8,
                  padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger zone — full reset */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}15` }}>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
          Danger zone
        </div>
        {!confirmingReset ? (
          <button onClick={() => setConfirmingReset(true)} style={{
            width: "100%",
            background: "transparent", color: C.muted,
            border: `1px dashed ${C.line}33`, borderRadius: 10,
            padding: "10px 14px", fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Trash2 size={12} /> Reset all data
          </button>
        ) : (
          <div style={{
            background: `${C.accent}10`, border: `1px solid ${C.accent}55`,
            borderRadius: 10, padding: 12,
          }}>
            <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, marginBottom: 10 }}>
              <strong style={{ color: C.accent }}>This wipes everything:</strong> events, breast milk inventory, meetings, shifts, time bank, notes, archive, doctor visits, daily content. The page will reload with a clean slate.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setConfirmingReset(false)} style={{
                background: "transparent", color: C.ink,
                border: `1px solid ${C.line}33`, borderRadius: 8,
                padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={onResetData} style={{
                background: C.accent, color: "#fff", border: "none",
                borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Yes, wipe everything
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ---- Subcomponents -----------------------------------------------------

function FontImports() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      button { font-family: inherit; }
      button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
      input { font-family: inherit; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse-soft { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .fade-up { animation: fadeUp 0.5s ease-out both; }
      .pulse-soft { animation: pulse-soft 2.4s ease-in-out infinite; }
      .slide-up { animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
    `}</style>
  );
}

function PaperGrain({ mode }) {
  // Earlier versions had an SVG feTurbulence noise filter overlaying the
  // entire page. At 6% opacity it was barely visible as texture, but it
  // created a perceptual artifact: text-dense regions (the header column
  // on the left) rendered slightly lighter than empty regions (the right
  // half of the page), because the rendered text covered the noise dots.
  // The result was a faint "box" appearance around the header content.
  // We've removed the noise entirely — modern OS-level subpixel rendering
  // already gives the cream a subtle warmth, and the radial glow below
  // adds enough atmosphere on its own.
  return (
    <>
      {/* Warm corner glow — large and very diffuse so it adds atmosphere
          without creating a perceptible boundary line. */}
      <div style={{
        position: "fixed",
        top: -700, right: -700,
        width: 1400, height: 1400,
        borderRadius: "50%",
        background: mode === "night"
          ? "radial-gradient(circle, rgba(232, 168, 124, 0.05), transparent 95%)"
          : "radial-gradient(circle, rgba(184, 92, 46, 0.06), transparent 95%)",
        pointerEvents: "none", zIndex: 1,
      }} />
    </>
  );
}

function TimeOrb({ mode, now, C }) {
  const hours = now.getHours();
  const mins = now.getMinutes();
  const secs = now.getSeconds();
  const hourAngle = ((hours % 12) + mins / 60) * 30 - 90;   // 30deg per hour
  const minAngle = (mins + secs / 60) * 6 - 90;             // 6deg per min
  const isNight = mode === "night" || mode === "dusk";
  const SIZE = 48;
  const cx = SIZE / 2, cy = SIZE / 2;
  const R = SIZE / 2 - 1;

  // 4 cardinal hash marks (12/3/6/9)
  const cardinals = [0, 90, 180, 270].map(deg => {
    const a = (deg - 90) * Math.PI / 180;
    const inner = R - 4;
    const outer = R - 1.5;
    return {
      x1: cx + Math.cos(a) * inner,
      y1: cy + Math.sin(a) * inner,
      x2: cx + Math.cos(a) * outer,
      y2: cy + Math.sin(a) * outer,
      key: deg,
    };
  });

  // Tick marks for the other 8 hours
  const ticks = Array.from({ length: 12 }, (_, i) => i)
    .filter(i => i % 3 !== 0)
    .map(i => {
      const a = (i * 30 - 90) * Math.PI / 180;
      const inner = R - 2.5;
      const outer = R - 1.5;
      return {
        x1: cx + Math.cos(a) * inner,
        y1: cy + Math.sin(a) * inner,
        x2: cx + Math.cos(a) * outer,
        y2: cy + Math.sin(a) * outer,
        key: i,
      };
    });

  const handX = (deg, len) => cx + Math.cos(deg * Math.PI / 180) * len;
  const handY = (deg, len) => cy + Math.sin(deg * Math.PI / 180) * len;

  return (
    <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <defs>
        <radialGradient id="orbFace" cx="35%" cy="30%" r="80%">
          {isNight ? (
            <>
              <stop offset="0%" stopColor="#3D4F6B" />
              <stop offset="60%" stopColor="#2A3850" />
              <stop offset="100%" stopColor="#1A2435" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#FFFAF0" />
              <stop offset="60%" stopColor="#FAEFD8" />
              <stop offset="100%" stopColor="#E8D5A8" />
            </>
          )}
        </radialGradient>
        <linearGradient id="orbBezel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isNight ? "#5A6E8A" : "#D4B989"} />
          <stop offset="100%" stopColor={isNight ? "#1A2435" : "#9A7E4D"} />
        </linearGradient>
      </defs>

      {/* Bezel ring */}
      <circle cx={cx} cy={cy} r={R} fill="url(#orbBezel)" />
      {/* Face */}
      <circle cx={cx} cy={cy} r={R - 1.5} fill="url(#orbFace)" />

      {/* Cardinal hash marks */}
      {cardinals.map(c => (
        <line key={c.key} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
          stroke={isNight ? "#E0D4A0" : "#5A4A2D"} strokeWidth="1.2" strokeLinecap="round" />
      ))}
      {/* Tick marks */}
      {ticks.map(t => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={isNight ? "#E0D4A0" : "#5A4A2D"} strokeWidth="0.5" strokeLinecap="round" opacity="0.6" />
      ))}

      {/* Minute hand */}
      <line
        x1={cx} y1={cy}
        x2={handX(minAngle, R - 5)} y2={handY(minAngle, R - 5)}
        stroke={isNight ? "#FFFAF0" : "#3D2E15"}
        strokeWidth="1.2" strokeLinecap="round" opacity="0.85"
      />
      {/* Hour hand (thicker, shorter) */}
      <line
        x1={cx} y1={cy}
        x2={handX(hourAngle, R - 10)} y2={handY(hourAngle, R - 10)}
        stroke={isNight ? "#FFFAF0" : "#3D2E15"}
        strokeWidth="2" strokeLinecap="round"
      />
      {/* Center pin */}
      <circle cx={cx} cy={cy} r="1.8" fill={isNight ? "#E0D4A0" : "#3D2E15"} />
      <circle cx={cx} cy={cy} r="0.7" fill={isNight ? "#1A2435" : "#FAEFD8"} />
    </svg>
  );
}

// ActiveCoverageBanner — shown ON the on-duty card when this parent is
// currently covering a partner's commitment. Lets them tap "[Partner] is back"
// to end the coverage immediately; the meeting record is truncated to now.
function ActiveCoverageBanner({ C, commitment, onDuty, now, onEndEarly }) {
  const partnerName = commitment.parent;
  const partnerColor = partnerName === "Mommy" ? C.mommy : C.daddy;
  const onDutyColor = onDuty.parent === "Mommy" ? C.mommy : C.daddy;
  const meetingEnd = new Date(commitment.end);
  const minsLeft = Math.max(0, Math.round((meetingEnd - now) / 60000));
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);
  const handleClick = () => {
    if (confirming) {
      onEndEarly();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };
  return (
    <div style={{
      background: `${partnerColor}10`,
      border: `1px solid ${partnerColor}25`,
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 12,
      display: "flex", alignItems: "center", gap: 10,
      flexWrap: "wrap",
    }}>
      <Calendar size={14} style={{ color: partnerColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.4 }}>
        <div style={{ color: C.ink }}>
          <span style={{ color: onDutyColor, fontWeight: 600 }}>{onDuty.parent}</span>
          {" covering for "}
          <span style={{ color: partnerColor, fontWeight: 600 }}>{partnerName}</span>
          {commitment.label ? ` · ${commitment.label}` : ""}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
          scheduled until {meetingEnd.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {minsLeft > 0 ? ` · ${minsLeft}m left` : " · ending now"}
        </div>
      </div>
      <button
        onClick={handleClick}
        style={{
          background: confirming ? C.accent : "transparent",
          border: confirming ? "none" : `1px solid ${partnerColor}55`,
          color: confirming ? "#fff" : partnerColor,
          padding: "5px 10px", borderRadius: 12,
          fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
          whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: 4,
          transition: "all 0.15s",
        }}>
        {confirming ? "Sure?" : `${partnerName} is back`}
      </button>
    </div>
  );
}

// InMeetingBanner — shown at the top of NowView when the current viewer is
// in an active commitment. Symmetrical to ActiveCoverageBanner: tap to end
// the meeting now, which gives them their shift back and shrinks the
// partner's coverage / auto-repayment proportionally.
function InMeetingBanner({ C, commitment, now, onEndEarly }) {
  const meetingEnd = new Date(commitment.end);
  const meetingStart = new Date(commitment.start);
  const minsLeft = Math.max(0, Math.round((meetingEnd - now) / 60000));
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);
  const handleClick = () => {
    if (confirming) {
      onEndEarly();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };
  return (
    <div style={{
      background: `${C.accent}10`,
      border: `1px solid ${C.accent}30`,
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 14,
      display: "flex", alignItems: "center", gap: 10,
      flexWrap: "wrap",
    }}>
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        background: C.accent, flexShrink: 0,
      }} className="pulse-soft" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>
          You're in {commitment.label || "a commitment"}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {meetingStart.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          –{meetingEnd.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {minsLeft > 0 ? ` · ${minsLeft}m left` : " · ending now"}
        </div>
      </div>
      <button
        onClick={handleClick}
        style={{
          background: confirming ? C.accent : "transparent",
          border: confirming ? "none" : `1px solid ${C.accent}55`,
          color: confirming ? "#fff" : C.accent,
          padding: "6px 12px", borderRadius: 14,
          fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}>
        {confirming ? "Sure?" : "I'm back"}
      </button>
    </div>
  );
}

function OnDutyCard({ C, mode, onDuty, next, lastFeed, lastDiaper, diaperWarnH, diaperUrgentH, lastSleep, lastWake, lastWakeConfirmed, now, totalSafeOz, rtSafeOz, fridgeOz, feedsRunway, onsite, handoffNote, onAckNote, onOpenNoteEditor, onOpenArchive, archiveCount, onLogSleepDown, onConfirmAwake, currentUser, rtItems, fridgeItems, nextPumpAt, lastPumpedItem, todayCalories, activePump, onStartPump, onEndActivePump, takeover, onStartTakeover, onEndTakeover, onPickBottle, activeCoveringCommitment, myActiveCommitment, onEndCommitmentEarly, onQuickLog }) {
  // Use threaded thresholds if provided; fall back to legacy constants
  // (defensive — keeps the card usable if any caller forgets to pass them).
  const WARN_H = diaperWarnH != null ? diaperWarnH : DIAPER_WARN_HOURS;
  const URGENT_H = diaperUrgentH != null ? diaperUrgentH : DIAPER_URGENT_HOURS;
  const isAsleep = lastSleep && (!lastWake || new Date(lastSleep.ts) > new Date(lastWake.ts));
  const [tagInConfirm, setTagInConfirm] = useState(false);
  // Auto-cancel the confirm after 4 seconds if not pressed again
  useEffect(() => {
    if (!tagInConfirm) return;
    const t = setTimeout(() => setTagInConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [tagInConfirm]);
  const minutesToHandoff = (() => {
    const cur = now.getHours() * 60 + now.getMinutes();
    let target = toMin(next.start);
    let diff = target - cur;
    if (diff <= 0) diff += 24 * 60;
    return diff;
  })();
  const handoffH = Math.floor(minutesToHandoff / 60);
  const handoffM = minutesToHandoff % 60;

  // Countdown timer to next handoff (this is what shows in the pill now)
  const countdownText = handoffH > 0 ? `${handoffH}h ${pad(handoffM)}m` : `${handoffM}m`;
  const isUrgent = minutesToHandoff < 15;

  const parentColor = onDuty.parent === "Mommy" ? C.mommy : C.daddy;
  const viewerColor = currentUser === "Mommy" ? C.mommy : C.daddy;
  const nextColor = next.parent === "Mommy" ? C.mommy : C.daddy;
  const awayParent = onsite?.parent;

  // Show handoff note to whoever it's addressed to (regardless of who's on duty).
  // This way Daddy (when viewing as Daddy) sees notes from Mommy, and vice versa.
  const showInlineNote = handoffNote &&
    !handoffNote.acknowledged &&
    handoffNote.to === currentUser;

  // Sleep inference: if last feed was 1.5h+ ago AND no sleep_down has been logged since,
  // baby is probably still awake and we should prompt the parent to confirm.
  // We suppress if: a sleep_down OR wake_confirmed event exists after lastFeed.
  // Active takeover duration in minutes (for display)
  const takeoverWithMins = takeover ? {
    ...takeover,
    takeoverMins: Math.max(0, Math.floor((now - new Date(takeover.startedAt)) / 60000)),
  } : null;

  const sleepInfo = (() => {
    if (!lastFeed) return null;
    const minsSinceFeed = (now - new Date(lastFeed.ts)) / 60000;
    if (minsSinceFeed < 90) return null;
    if (minsSinceFeed > 240) return null; // >4hr is a different story (forgot to log a feed)
    if (lastSleep && new Date(lastSleep.ts) > new Date(lastFeed.ts)) return null;
    // Check if a wake_confirmed exists since last feed (the user already said "still awake")
    if (lastWakeConfirmed && new Date(lastWakeConfirmed.ts) > new Date(lastFeed.ts)) {
      // Re-prompt only if it's been another 60+ min since they confirmed awake
      const minsSinceConfirm = (now - new Date(lastWakeConfirmed.ts)) / 60000;
      if (minsSinceConfirm < 60) return null;
    }
    return {
      minsSinceFeed: Math.round(minsSinceFeed),
      urgent: minsSinceFeed >= 120,
    };
  })();

  return (
    <div className="fade-up" style={{
      background: C.paper,
      border: `1px solid ${C.line}22`,
      borderLeft: `5px solid ${viewerColor}`,
      borderRadius: 16,
      padding: 22,
      marginTop: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      <svg style={{ position: "absolute", top: 14, right: 14, opacity: 0.12 }} width="38" height="38" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" stroke={C.ink} strokeWidth="0.5" />
        <circle cx="20" cy="20" r="12" fill="none" stroke={C.ink} strokeWidth="0.5" />
        <line x1="20" y1="2" x2="20" y2="38" stroke={C.ink} strokeWidth="0.5" />
        <line x1="2" y1="20" x2="38" y2="20" stroke={C.ink} strokeWidth="0.5" />
      </svg>

      {/* Prominent handoff-active banner: if I handed off, show big indicator */}
      {takeoverWithMins && takeoverWithMins.originalParent === currentUser && (
        <div style={{
          background: `${takeoverWithMins.coveringParent === "Mommy" ? C.mommy : C.daddy}15`,
          border: `1.5px solid ${takeoverWithMins.coveringParent === "Mommy" ? C.mommy : C.daddy}55`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: takeoverWithMins.coveringParent === "Mommy" ? C.mommy : C.daddy,
            color: "#fff", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600,
          }}>{takeoverWithMins.coveringParent[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
              Your shift was handed off
            </div>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 500, marginTop: 1 }}>
              <strong style={{ color: takeoverWithMins.coveringParent === "Mommy" ? C.mommy : C.daddy }}>
                {takeoverWithMins.coveringParent}
              </strong> is covering · {takeoverWithMins.takeoverMins} min in
            </div>
          </div>
        </div>
      )}

      {/* Active commitment coverage banner — when this parent is covering
          for partner's commitment, show an "ended early?" button so the
          coverage can be cut short the moment the meeting actually ends. */}
      {activeCoveringCommitment && !takeover && (
        <ActiveCoverageBanner
          C={C}
          commitment={activeCoveringCommitment}
          onDuty={onDuty}
          now={now}
          onEndEarly={() => onEndCommitmentEarly(activeCoveringCommitment.id)}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: C.muted, fontWeight: 500, marginBottom: 6 }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: parentColor }} />
        On duty now
        {awayParent && awayParent !== onDuty.parent && (
          <span style={{ color: C.accent, fontWeight: 600, marginLeft: 4 }}>
            · covering ({awayParent} on-site)
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em", color: parentColor }}>
          {onDuty.parent}
        </div>
        <div style={{
          background: isUrgent ? C.accent : `${parentColor}22`,
          color: isUrgent ? "#fff" : parentColor,
          padding: "6px 12px", borderRadius: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6, marginBottom: 2,
          maxWidth: "100%",
        }}>
          <Timer size={13} style={{ flexShrink: 0 }} />
          <span>{countdownText} until handoff to <span style={{ color: isUrgent ? "#fff" : nextColor, fontWeight: 700 }}>{next.parent}</span></span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: C.muted, fontFamily: "'JetBrains Mono', monospace", flexWrap: "wrap" }}>
        <Clock size={11} />
        <span>{fmtShiftRange(onDuty.shift)}</span>
      </div>

      {/* Sleep check-in prompt */}
      {sleepInfo && (
        <div style={{
          marginTop: 14, padding: 12,
          background: sleepInfo.urgent ? `${C.accent}15` : `${C.line}08`,
          border: `1.5px solid ${sleepInfo.urgent ? C.accent : C.line + "33"}`,
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Moon size={12} color={sleepInfo.urgent ? C.accent : C.muted} />
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
              color: sleepInfo.urgent ? C.accent : C.muted,
            }}>
              wake check
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, marginBottom: 10 }}>
            It's been {sleepInfo.minsSinceFeed} min since the last feed. Is Solène still awake, or did she fall asleep?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={onLogSleepDown} style={{
              background: C.ink, color: C.paper, border: "none",
              padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <Moon size={12} /> She fell asleep
            </button>
            <button onClick={onConfirmAwake} style={{
              background: "transparent", color: C.ink,
              border: `1px solid ${C.line}33`, borderRadius: 8,
              padding: "8px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <Sun size={12} /> Still awake
            </button>
          </div>
        </div>
      )}

      {/* Inline handoff note from previous parent */}
      {showInlineNote && (
        <div style={{
          marginTop: 14, padding: 12,
          background: `${C[handoffNote.from === "Mommy" ? "mommy" : "daddy"]}15`,
          border: `1.5px solid ${C[handoffNote.from === "Mommy" ? "mommy" : "daddy"]}55`,
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <MessageSquare size={12} color={C[handoffNote.from === "Mommy" ? "mommy" : "daddy"]} />
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
              color: C[handoffNote.from === "Mommy" ? "mommy" : "daddy"],
            }}>
              note from {handoffNote.from} · {fmtElapsed(minutesAgo(handoffNote.ts))}
            </span>
          </div>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5, marginBottom: 10, whiteSpace: "pre-wrap" }}>
            {handoffNote.text}
          </div>
          <button onClick={onAckNote} style={{
            background: C[handoffNote.from === "Mommy" ? "mommy" : "daddy"], color: "#fff",
            border: "none", borderRadius: 6,
            padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <Check size={12} /> Acknowledged
          </button>
        </div>
      )}

      {/* Takeover button — different states */}
      {takeoverWithMins && takeoverWithMins.coveringParent === currentUser ? (
        // I'm the one covering right now → show "I'm done covering"
        <div style={{ marginTop: 12, padding: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}55`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Clock size={12} color={C.accent} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent }}>
              You're covering — {takeoverWithMins.takeoverMins} min in
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5, marginBottom: 8 }}>
            You stepped in for <strong>{takeoverWithMins.originalParent}</strong>. When you're done, tap below to log the time owed.
          </div>
          <button onClick={onEndTakeover} style={{
            width: "100%", background: C.accent, color: "#fff", border: "none",
            padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Check size={14} /> I'm done covering · log time
          </button>
        </div>
      ) : takeoverWithMins ? (
        // Partner is covering for me — top banner already handles this. No button row needed.
        null
      ) : null}

      {/* Bottom action row: leave-note (flex), tag-in (chip), past notes (chip) */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button onClick={onOpenNoteEditor} style={{
          flex: 1,
          background: "transparent", color: C.muted,
          border: `1px dashed ${C.line}33`, borderRadius: 8,
          padding: "8px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          minWidth: 0,
        }}>
          <Edit3 size={11} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {handoffNote && handoffNote.from === currentUser && !handoffNote.acknowledged
              ? `Edit note for ${currentUser === "Mommy" ? "Daddy" : "Mommy"}`
              : `Leave a note for ${currentUser === "Mommy" ? "Daddy" : "Mommy"}`}
          </span>
        </button>

        {/* Small tag-in chip — only visible when it's actually my shift and no takeover */}
        {!takeoverWithMins && onDuty.parent === currentUser && (
          <button
            onClick={() => {
              if (tagInConfirm) {
                onStartTakeover();
                setTagInConfirm(false);
              } else {
                setTagInConfirm(true);
              }
            }}
            title={`Tag in ${currentUser === "Mommy" ? "Daddy" : "Mommy"}`}
            style={{
              background: tagInConfirm ? (currentUser === "Mommy" ? C.daddy : C.mommy) : "transparent",
              color: tagInConfirm ? "#fff" : (currentUser === "Mommy" ? C.daddy : C.mommy),
              border: tagInConfirm ? "none" : `1px solid ${currentUser === "Mommy" ? C.daddy : C.mommy}55`,
              borderRadius: 8,
              padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}>
            <ArrowRightLeft size={11} />
            {tagInConfirm ? "Sure?" : "tag in"}
          </button>
        )}

        {archiveCount > 0 && onOpenArchive && (
          <button onClick={onOpenArchive} style={{
            background: "transparent", color: C.muted,
            border: `1px solid ${C.line}33`, borderRadius: 8,
            padding: "8px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          }}>
            <BookOpen size={11} /> {archiveCount}
          </button>
        )}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1,
        marginTop: 18, background: `${C.line}15`, borderRadius: 10, overflow: "hidden",
      }}>
        <StatTile C={C} label="last fed"
          icon={<Milk size={12} />}
          iconColor="#A8745C"
          value={lastFeed ? fmtElapsed(minutesAgo(lastFeed.ts)) : "—"}
          sub={lastFeed ? (lastFeed.type === "breastfeed" ? `${lastFeed.totalDurationMin}m breastfeeding` : `${lastFeed.oz || "?"}oz · ${lastFeed.source || ""}`) : "no feeds yet"}
          onTap={onQuickLog ? () => onQuickLog("feed") : undefined} />
        <StatTile C={C} label={
          lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= URGENT_H
            ? "diaper change overdue"
            : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
            ? "diaper change soon"
            : "last diaper change"
        }
          icon={<Baby size={12} />}
          iconColor={
            lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= URGENT_H
              ? "#C44545"
              : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
              ? "#D4A03A"
              : "#7B9B6E"
          }
          value={lastDiaper ? fmtElapsed(minutesAgo(lastDiaper.ts)) : "—"}
          sub={
            lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= URGENT_H
              ? `${URGENT_H}h+ — change now even if asleep`
              : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
              ? `${WARN_H}h+ — peek at next feed`
              : (lastDiaper?.notes || "")
          }
          subColor={
            lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= URGENT_H
              ? "#C44545"
              : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
              ? "#D4A03A"
              : null
          }
          onTap={onQuickLog ? () => onQuickLog("diaper") : undefined} />
        <StatTile C={C}
          /* Label flips between asleep/awake states. The label IS the
             status — no separate sub needed. The big number reads as a
             duration ("5h 59m") so paired with "Awake for" or "Asleep
             for" it's a clean phrase: "Awake for · 5h 59m". */
          label={isAsleep ? "asleep for" : "awake for"}
          icon={isAsleep ? <Moon size={12} /> : <Sun size={12} />}
          iconColor={isAsleep ? "#5A6E8A" : "#D4A03A"}
          value={isAsleep ? fmtElapsed(minutesAgo(lastSleep.ts)) : (lastWake ? fmtElapsed(minutesAgo(lastWake.ts)) : "—")}
          onTap={onQuickLog ? () => onQuickLog("sleep") : undefined} />
        <StatTile C={C} label="next feed est."
          icon={<Clock size={12} />}
          iconColor={C.accent}
          value={lastFeed ? fmtPredictedNextFeed(lastFeed, now) : "—"} />
      </div>

      {/* Milk panel — RT inventory + next pump, visible to both parents always */}
      <MilkPanel
        C={C}
        currentUser={currentUser}
        onDutyParent={onDuty.parent}
        rtSafeOz={rtSafeOz}
        fridgeOz={fridgeOz}
        totalSafeOz={totalSafeOz}
        feedsRunway={feedsRunway}
        rtItems={rtItems}
        fridgeItems={fridgeItems}
        nextPumpAt={nextPumpAt}
        lastPumpedItem={lastPumpedItem}
        todayCalories={todayCalories}
        activePump={activePump}
        onStartPump={onStartPump}
        onEndActivePump={onEndActivePump}
        onPickBottle={onPickBottle}
        now={now}
      />
    </div>
  );
}

// Predict next feed time based on typical 3hr interval (or could use median later)
function fmtPredictedNextFeed(lastFeed, now) {
  const lastFeedTime = new Date(lastFeed.ts);
  const predicted = new Date(lastFeedTime.getTime() + TYPICAL_FEED_INTERVAL_HRS * 3600000);
  const minsUntil = Math.round((predicted - now) / 60000);
  if (minsUntil < -60) return "overdue";
  if (minsUntil < 0) return "due now";
  if (minsUntil < 60) return `in ${minsUntil}m`;
  const h = Math.floor(minsUntil / 60);
  const m = minsUntil % 60;
  return `${fmtTimeShort(predicted)}`;
}

// Milk panel: shown on both parents' on-duty card
function MilkPanel({ C, currentUser, onDutyParent, rtSafeOz, fridgeOz, totalSafeOz, feedsRunway, rtItems, fridgeItems, nextPumpAt, now, todayCalories, lastPumpedItem, activePump, onStartPump, onEndActivePump, onPickBottle }) {
  const isMom = currentUser === "Mommy";
  const lowSupply = feedsRunway < 2;
  const activePumpMins = activePump ? Math.floor((now - new Date(activePump.startedAt)) / 60000) : 0;
  const [timeFormat, setTimeFormat] = useState("absolute"); // 'duration' | 'absolute'

  // Find soonest-expiring RT item.
  // expiresAt is the 6h HARD limit (the actual discard time, what "exp"
  // means colloquially) per CDC/ABM guidance ("use within 4h, discard after
  // 6h"). The 4h preferred-use limit still drives `remaining` and the
  // color escalation, but the displayed timestamp is the real expiration.
  const sortedRT = (rtItems || []).slice()
    .map(item => ({
      ...item,
      expiresAt: new Date(new Date(item.pumpedAt).getTime() + BM_RT_HOURS_HARD * 3600000),
      preferredByAt: new Date(new Date(item.pumpedAt).getTime() + BM_RT_HOURS * 3600000),
    }))
    .sort((a, b) => a.remaining - b.remaining);
  const soonestExpiry = sortedRT[0];
  // remaining is hours until safe-limit (4h). Risky = past safe but within hard 6h limit
  const expiryUrgent = soonestExpiry && soonestExpiry.remaining < 1 && soonestExpiry.remaining >= 0;
  const expiryWarn = soonestExpiry && soonestExpiry.remaining < 2 && soonestExpiry.remaining >= 1;
  const expiryRisky = soonestExpiry && soonestExpiry.risky;
  const fridgeBottleCount = (fridgeItems || []).length;
  // Fridge bottles sorted oldest-first (use-up order)
  const sortedFridge = (fridgeItems || []).slice()
    .map(item => ({
      ...item,
      expiresAt: new Date(new Date(item.pumpedAt).getTime() + 96 * 3600000),
    }))
    .sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));

  // Pump countdown
  const minsToNextPump = nextPumpAt ? Math.round((nextPumpAt - now) / 60000) : null;
  const pumpOverdue = minsToNextPump != null && minsToNextPump < 0;
  const pumpSoon = minsToNextPump != null && minsToNextPump < 30 && minsToNextPump >= 0;

  return (
    <div style={{
      marginTop: 14,
      background: lowSupply || expiryUrgent ? `${C.accent}15` : C.bg,
      border: `1px solid ${lowSupply || expiryUrgent ? C.accent : C.line + "22"}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Milk size={13} color={C.mommy} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>
          Breast milk · live
        </span>
        {isMom && todayCalories > 0 && (
          <span style={{ fontSize: 10, color: C.mommy, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            🔥 {Math.round(todayCalories)} kcal today
          </span>
        )}
        <button
          onClick={() => setTimeFormat(f => f === "duration" ? "absolute" : "duration")}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: `1px solid ${C.line}33`, borderRadius: 6,
            padding: "3px 8px", fontSize: 9, fontWeight: 600, cursor: "pointer",
            color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "inherit",
          }}>
          {timeFormat === "duration" ? "in 2h" : "4:30p"}
        </button>
      </div>

      {/* Prominent pump countdown — Mommy only, top of panel.
          State pip on the left clearly signals: green dot = comfortably ahead,
          amber dot = pump coming up soon, coral dot = past due. */}
      {isMom && (activePump || nextPumpAt) && (() => {
        const stateColor = activePump
          ? C.mommy
          : pumpOverdue ? "#C44545"
          : pumpSoon ? "#D4A03A"
          : "#5C8E5C";
        // Eyebrow now omits the redundant "tap to start" since the whole
        // tile is a button — the action is implied. State word + condition.
        const stateLabel = activePump
          ? "Pumping now"
          : pumpOverdue ? "Pump overdue"
          : pumpSoon ? "Pump soon"
          : "On schedule";
        return (
        <button
          onClick={activePump ? onEndActivePump : onStartPump}
          style={{
            width: "100%",
            background: activePump
              ? `linear-gradient(135deg, ${C.mommy}, ${C.mommy}DD)`
              : stateColor,
            color: "#fff", border: "none",
            borderRadius: 10, padding: "14px 16px",
            marginBottom: 12,
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: `0 2px 10px ${stateColor}55`,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
          }}>
          <Timer size={28} className={activePump ? "pulse-soft" : ""} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, opacity: 0.9 }}>
              {stateLabel}
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600,
              lineHeight: 1.05, marginTop: 2,
            }}>
              {activePump
                ? `${activePumpMins} min in`
                : pumpOverdue
                ? (() => {
                    // Math.floor on negatives rounds toward -infinity, so
                    // Math.floor(-6/60) === -1 (not 0). Take abs first, then split.
                    // Drop the "late" suffix here — eyebrow already says overdue.
                    const lateMin = Math.abs(minsToNextPump);
                    const h = Math.floor(lateMin / 60);
                    const m = lateMin % 60;
                    return h > 0 ? `${h}h ${m}m` : `${m} min`;
                  })()
                : minsToNextPump < 60
                ? `${minsToNextPump} min`
                : `${Math.floor(minsToNextPump / 60)}h ${minsToNextPump % 60}m`}
            </div>
            {/* Bottom reference line — only shown for active pump (where
                it shows when the timer started) or on-schedule (where the
                target time is useful context). Dropped for overdue/soon
                because the duration in the big number is what matters. */}
            {(activePump || (!pumpOverdue && !pumpSoon)) && (
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", opacity: 0.85, marginTop: 2 }}>
                {activePump
                  ? `started ${fmtTimeShort(activePump.startedAt)}`
                  : `target ${fmtTimeShort(nextPumpAt)}`}
              </div>
            )}
          </div>
        </button>
        );
      })()}

      {/* RT and Fridge side by side — tap to use a bottle.
          Each tile shows: oz total, then a row of bottle emojis (one per bottle, up to 3,
          then "+N" overflow), with each bottle's individual expiry time underneath. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <button
          onClick={() => onPickBottle && onPickBottle("rt")}
          disabled={rtSafeOz <= 0}
          style={{
            background: C.paper, borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${expiryUrgent || expiryRisky ? C.accent : expiryWarn ? "#D4A03A" : C.line + "22"}`,
            cursor: rtSafeOz > 0 ? "pointer" : "not-allowed",
            textAlign: "left", fontFamily: "inherit",
            opacity: rtSafeOz > 0 ? 1 : 0.5,
          }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Room temp
            {rtSafeOz > 0 && <span style={{ opacity: 0.6 }}> · tap to use</span>}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500,
            color: expiryUrgent || expiryRisky ? C.accent : C.ink, marginTop: 2, lineHeight: 1.1,
          }}>
            {rtSafeOz.toFixed(1)} oz
          </div>
          {sortedRT.length > 0 ? (() => {
            // Show up to 3 bottle emojis with their individual expiry times
            const SHOW_LIMIT = 3;
            const visible = sortedRT.slice(0, SHOW_LIMIT);
            const overflow = sortedRT.length - SHOW_LIMIT;
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  {visible.map(b => {
                    // Color the bottle by its individual urgency
                    const bRem = b.remaining;
                    const bColor = b.risky ? C.accent : bRem < 1 ? C.accent : bRem < 2 ? "#D4A03A" : "#5C8E5C";
                    return (
                      <div key={b.id} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                        <div style={{ fontSize: 18, lineHeight: 1, color: bColor, filter: bRem < 1 || b.risky ? "none" : "saturate(0.7)" }}>🍼</div>
                        <div style={{
                          fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                          color: bColor, marginTop: 3,
                          fontWeight: (b.risky || bRem < 1) ? 700 : 500,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {timeFormat === "duration"
                            ? (b.risky ? `⚠${fmtHours(6 - b.ageHrs)}` : fmtHours(bRem))
                            : `exp ${fmtTimeShort(b.expiresAt)}`}
                        </div>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, lineHeight: 1, color: C.muted,
                        fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                        paddingTop: 3,
                      }}>+{overflow}</div>
                      <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: C.muted, marginTop: 3 }}>more</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              none
            </div>
          )}
        </button>

        <button
          onClick={() => onPickBottle && onPickBottle("fridge")}
          disabled={fridgeOz <= 0}
          style={{
            background: C.paper, borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${C.line}22`,
            cursor: fridgeOz > 0 ? "pointer" : "not-allowed",
            textAlign: "left", fontFamily: "inherit",
            opacity: fridgeOz > 0 ? 1 : 0.5,
          }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Fridge
            {fridgeOz > 0 && <span style={{ opacity: 0.6 }}> · tap to use</span>}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500,
            marginTop: 2, lineHeight: 1.1, color: C.ink,
          }}>
            {fridgeOz.toFixed(1)} oz
          </div>
          {sortedFridge.length > 0 ? (() => {
            const SHOW_LIMIT = 3;
            const visible = sortedFridge.slice(0, SHOW_LIMIT);
            const overflow = sortedFridge.length - SHOW_LIMIT;
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  {visible.map(b => {
                    // Fridge bottles age in days; flag last day as warn
                    const ageHrs = (now - new Date(b.pumpedAt)) / 3600000;
                    const remHrs = 96 - ageHrs;
                    const bColor = remHrs < 0 ? C.accent : remHrs < 24 ? "#D4A03A" : C.daddy;
                    return (
                      <div key={b.id} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                        <div style={{ fontSize: 18, lineHeight: 1, color: bColor }}>🍼</div>
                        <div style={{
                          fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                          color: bColor, marginTop: 3, fontWeight: 500,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {timeFormat === "duration"
                            ? (remHrs < 24 ? `${remHrs.toFixed(0)}h` : `${(remHrs / 24).toFixed(0)}d`)
                            : (() => {
                                const exp = new Date(new Date(b.pumpedAt).getTime() + 96 * 3600000);
                                const isToday = exp.toDateString() === now.toDateString();
                                const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === exp.toDateString();
                                if (isToday) return fmtTimeShort(exp);
                                if (isTomorrow) return "tmrw";
                                return exp.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
                              })()}
                        </div>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, lineHeight: 1, color: C.muted,
                        fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                        paddingTop: 3,
                      }}>+{overflow}</div>
                      <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: C.muted, marginTop: 3 }}>more</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              ≈ {feedsRunway} feed{feedsRunway === 1 ? "" : "s"} runway
            </div>
          )}
        </button>
      </div>

      {/* Last bottle pumped — info display, more readable */}
      {lastPumpedItem && (
        <div style={{
          background: C.paper, borderRadius: 8, padding: "12px 14px",
          border: `1px solid ${C.line}22`,
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 8,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: `${C.mommy}22`, color: C.mommy,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>🍼</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 2 }}>
              Last bottle pumped
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, color: C.ink, lineHeight: 1.1 }}>
              {lastPumpedItem.oz.toFixed(1)} oz <span style={{ color: C.muted, fontSize: 14, fontStyle: "italic" }}>· {lastPumpedItem.location === "rt" ? "room temp" : "fridge"}</span>
            </div>
            <div style={{
              fontSize: 12, color: lastPumpedItem.expiryUrgent ? C.accent : C.muted,
              marginTop: 3,
              fontWeight: lastPumpedItem.expiryUrgent ? 600 : 400,
            }}>
              {(() => {
                const pumpedAt = new Date(lastPumpedItem.pumpedAt);
                const useByTime = new Date(lastPumpedItem.useByTime);
                if (timeFormat === "duration") {
                  const minsAgo = Math.round((now - pumpedAt) / 60000);
                  const minsTillExpire = Math.round((useByTime - now) / 60000);
                  const ago = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ${minsAgo % 60}m ago`;
                  if (lastPumpedItem.location === "rt") {
                    if (minsTillExpire < 0) return `pumped ${ago} · ⚠ expired`;
                    const ex = minsTillExpire < 60 ? `${minsTillExpire}m` : `${Math.floor(minsTillExpire / 60)}h ${minsTillExpire % 60}m`;
                    return `pumped ${ago} · ${lastPumpedItem.expiryUrgent ? "⚠ " : ""}use within ${ex}`;
                  }
                  return `pumped ${ago} · in fridge`;
                }
                // absolute mode
                if (lastPumpedItem.location === "rt") {
                  return `pumped ${fmtTimeShort(pumpedAt)} · ${lastPumpedItem.expiryUrgent ? "⚠ " : ""}use by ${fmtTimeShort(useByTime)}`;
                }
                return `pumped ${fmtTimeShort(pumpedAt)} · keeps until ${useByTime.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* If currentUser is Daddy, helpful note about asking nothing */}
      {!isMom && rtSafeOz > 0 && (
        <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>
          You don't need to ask Mommy — RT and fridge inventory shown above is live.
        </div>
      )}
    </div>
  );
}

function StatTile({ C, label, value, sub, subColor, icon, iconColor, onTap }) {
  const Wrapper = onTap ? "button" : "div";
  const tapProps = onTap ? {
    onClick: onTap,
    style: {
      background: C.paper, padding: "14px 14px 12px", position: "relative",
      border: "none", textAlign: "left", width: "100%",
      cursor: "pointer", fontFamily: "inherit",
      transition: "background 0.15s",
    },
    onMouseEnter: (e) => { e.currentTarget.style.background = `${C.accent}08`; },
    onMouseLeave: (e) => { e.currentTarget.style.background = C.paper; },
    "aria-label": `${label}: ${value}. Tap to log.`,
  } : {
    style: { background: C.paper, padding: "14px 14px 12px", position: "relative" },
  };
  return (
    <Wrapper {...tapProps}>
      {icon && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          width: 22, height: 22, borderRadius: "50%",
          background: `${iconColor || C.muted}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: iconColor || C.muted,
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 600, paddingRight: icon ? 28 : 0 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 26, fontWeight: 600,
        marginTop: 4, lineHeight: 1.05,
        color: subColor || C.ink,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: subColor || C.muted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>}
    </Wrapper>
  );
}

function AutoSwapBanner({ C, swaps, currentUser, onDispute }) {
  // Filter: show swaps relevant to currentUser. They care if they're covering (picked up new shift)
  // OR if their commitment is forcing partner to cover (informational/courtesy).
  // Daddy doesn't need to see Mommy's redemption swaps that don't affect him — but he IS the
  // covering parent in those, so he'll always see them via that filter.
  const covered = swaps.filter(s => !s.blocked);
  const blocked = swaps.filter(s => s.blocked);

  // Sort swaps by relevance: ones where currentUser is the covering parent (impacts them) first
  const sortedCovered = [...covered].sort((a, b) => {
    const aImpactsMe = a.coveringParent === currentUser;
    const bImpactsMe = b.coveringParent === currentUser;
    if (aImpactsMe && !bImpactsMe) return -1;
    if (!aImpactsMe && bImpactsMe) return 1;
    return 0;
  });

  return (
    <div className="fade-up" style={{
      background: C.paper,
      border: `1px solid ${C.line}22`,
      borderLeft: `4px solid ${blocked.length > 0 ? "#C44545" : C.accent}`,
      borderRadius: 12, padding: 14, marginTop: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: blocked.length > 0 ? "#C44545" : C.accent, fontWeight: 600, marginBottom: 8 }}>
        <Edit3 size={12} />
        {blocked.length > 0 ? "Today's plan needs a manual fix" : "Today's plan adjusted"}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {sortedCovered.map((s, i) => {
          const coverColor = s.coveringParent === "Mommy" ? C.mommy : C.daddy;
          const origColor = s.originalParent === "Mommy" ? C.mommy : C.daddy;
          const impactsMe = s.coveringParent === currentUser;
          const isRedemption = s.kind === "redemption";
          const isBalance = s.kind === "balance";

          return (
            <div key={i} style={{
              padding: "8px 10px",
              background: impactsMe ? `${coverColor}10` : "transparent",
              borderRadius: 8,
              border: impactsMe ? `1px solid ${coverColor}33` : "none",
            }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: C.ink }}>
                {isBalance && <span style={{ fontSize: 11, marginRight: 4 }}>⚖</span>}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.muted, fontWeight: 600 }}>
                  {fmtShiftRange(s.shift)}
                </span>
                {" — "}
                {isBalance ? (
                  <>
                    <span style={{ color: coverColor, fontWeight: 600 }}>{s.coveringParent}</span>
                    {" takes back "}
                    <span style={{ color: origColor, fontWeight: 500 }}>{s.originalParent}</span>
                    <span style={{ color: C.muted }}>'s shift </span>
                    <em style={{ color: C.muted, fontSize: 12 }}>(fair-play balance)</em>
                  </>
                ) : (
                  <>
                    <span style={{ color: coverColor, fontWeight: 600 }}>{s.coveringParent}</span>
                    {" covers ("}
                    <span style={{ color: origColor, fontWeight: 500 }}>{s.originalParent}</span>
                    <span style={{ color: C.muted }}>'s {isRedemption ? "time-bank cash-in" : (s.reason || "commitment")}</span>
                    {!isRedemption && s.reason && s.reason !== "commitment" && (
                      <span style={{ color: C.muted }}>: <em>{s.reason}</em></span>
                    )}
                    {")"}
                  </>
                )}
              </div>
              {impactsMe && !isRedemption && !isBalance && onDispute && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: C.muted, alignSelf: "center" }}>
                    you've picked up this shift
                  </span>
                  <button onClick={() => onDispute(s)} style={{
                    marginLeft: "auto",
                    background: "transparent", color: C.muted,
                    border: `1px solid ${C.line}33`, borderRadius: 14,
                    padding: "3px 10px", fontSize: 10, cursor: "pointer", fontWeight: 500,
                  }}>
                    discuss
                  </button>
                </div>
              )}
              {impactsMe && isRedemption && (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontStyle: "italic" }}>
                  cashing in time-bank credit · already settled
                </div>
              )}
              {impactsMe && isBalance && (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontStyle: "italic" }}>
                  auto-balanced so today stays roughly 50/50
                </div>
              )}
            </div>
          );
        })}
        {blocked.map((s, i) => (
          <div key={`b${i}`} style={{
            padding: "8px 10px",
            background: "#C4454510", borderRadius: 8,
            fontSize: 13, lineHeight: 1.5, color: "#C44545",
          }}>
            ⚠ <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>
              {fmtShiftRange(s.shift)}
            </span>
            {" — both parents blocked ("}
            <span style={{ color: s.originalParent === "Mommy" ? C.mommy : C.daddy, fontWeight: 600 }}>
              {s.originalParent}
            </span>
            {"'s "}{s.reason || "commitment"}{") — manual fix needed"}
          </div>
        ))}
      </div>
    </div>
  );
}

function NowView({ C, mode, now, events, lastFeed, lastPump, nextPumpAt, inventory, totalSafeOz, rtSafeOz, fridgeOz, feedsRunway, shifts, baseShifts, swaps, meetings, todayCalories, lastBath, lastSkincare, todayDailyContent, loadingDaily, currentUser, myActiveCommitment, onEndCommitmentEarly, onOpenCommitmentLog, onDispute, onsite, onStartOnsite, onUpdateEta, onArrivedHome }) {
  const [rhythmFilter, setRhythmFilter] = useState("all");
  const [verseExpanded, setVerseExpanded] = useState(false);
  const [frenchExpanded, setFrenchExpanded] = useState(false);

  // Today = midnight-to-now (full day)
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const todayEvents = events
    .filter(e => new Date(e.ts) >= startOfDay && !e.silent)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const filteredRhythm = todayEvents.filter(e => {
    if (rhythmFilter === "all") return true;
    if (rhythmFilter === "feeding") return e.type === "feed" || e.type === "breastfeed";
    if (rhythmFilter === "pump") return e.type === "pump";
    if (rhythmFilter === "diaper") return e.type === "diaper";
    if (rhythmFilter === "sleep") return e.type === "sleep_down" || e.type === "sleep_up";
    if (rhythmFilter === "care") return e.type === "bath" || e.type === "skincare";
    if (rhythmFilter === "activity") return e.type === "activity";
    return true;
  });

  // Cluster close-together feeds (within 10 min) into single rows.
  // todayEvents is chrono-desc; clusterFeeds detects direction and preserves it.
  const clusteredRhythm = useMemo(() => clusterFeeds(filteredRhythm, 10), [filteredRhythm]);

  // Counts for filter pill badges
  const counts = useMemo(() => ({
    all: todayEvents.length,
    feeding: todayEvents.filter(e => e.type === "feed" || e.type === "breastfeed").length,
    pump: todayEvents.filter(e => e.type === "pump").length,
    diaper: todayEvents.filter(e => e.type === "diaper").length,
    sleep: todayEvents.filter(e => e.type === "sleep_down" || e.type === "sleep_up").length,
    care: todayEvents.filter(e => e.type === "bath" || e.type === "skincare").length,
    activity: todayEvents.filter(e => e.type === "activity").length,
  }), [todayEvents]);

  return (
    <div style={{ marginTop: 14 }}>
      {/* IN-MEETING banner — shown when the current viewer is in an active
          commitment. Lets them tap "I'm back early" the moment the meeting
          ends, which truncates the meeting record to now. The partner
          (currently covering) sees the equivalent banner on their on-duty
          card, so either side can end the coverage. */}
      {myActiveCommitment && (
        <InMeetingBanner
          C={C}
          commitment={myActiveCommitment}
          now={now}
          onEndEarly={() => onEndCommitmentEarly(myActiveCommitment.id)}
        />
      )}

      {/* Tomorrow's commitments reminder lives at App level now, alongside
          the gift pip. See the App-level pip block above the OnDutyCard. */}

      {/* Mot du jour — per-parent tier. Mommy is intermediate French
          (recapturing fluency); Daddy is beginner (learner-tier). The daily
          content cache already generates both; we just pick the right one
          based on which profile is viewing. */}
      {(() => {
        // Pick the per-tier object based on current viewer. If somehow only
        // one tier was generated (older cache), fall back to whichever exists.
        const tier = currentUser === "Mommy" ? "frenchIntermediate" : "frenchBeginner";
        const fallbackTier = currentUser === "Mommy" ? "frenchBeginner" : "frenchIntermediate";
        const phraseObj = todayDailyContent?.[tier]?.phrase
          ? todayDailyContent[tier]
          : todayDailyContent?.[fallbackTier];
        if (!phraseObj?.phrase) return null;

        const viewerColor = currentUser === "Mommy" ? C.mommy : C.daddy;
        const tierLabel = currentUser === "Mommy" ? "intermediate" : "learner";
        const speak = () => {
          if (typeof window === "undefined" || !window.speechSynthesis) return;
          const utter = new window.SpeechSynthesisUtterance(phraseObj.phrase);
          utter.lang = "fr-FR";
          utter.rate = 0.9;
          const voices = window.speechSynthesis.getVoices();
          const fr = voices.find(v => v.lang.startsWith("fr"));
          if (fr) utter.voice = fr;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        };
        return (
          <div style={{
            background: `${viewerColor}10`,
            border: `1px solid ${viewerColor}33`,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 14,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <button onClick={speak} title="Hear pronunciation" aria-label="Hear pronunciation"
              style={{
                background: viewerColor, color: "#fff", border: "none",
                borderRadius: "50%", width: 38, height: 38, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: `0 2px 8px ${viewerColor}55`,
              }}>
              <Volume2 size={16} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
                color: viewerColor, fontWeight: 700, marginBottom: 3,
              }}>
                mot du jour
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                fontSize: 18, color: C.ink, lineHeight: 1.25,
              }}>
                « {phraseObj.phrase} »
              </div>
              {phraseObj.translation && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                  {phraseObj.translation}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Today's plan — quick access */}
      <TodaysPlanCard
        C={C}
        shifts={shifts}
        baseShifts={baseShifts}
        swaps={swaps || []}
        now={now}
        currentUser={currentUser}
        onDispute={onDispute}
      />

      <Section C={C} title={`Today's rhythm · ${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"}`}>
        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {[
            { v: "all", l: "All", emoji: "" },
            { v: "feeding", l: "Feeding", emoji: "🍼" },
            { v: "pump", l: "Pump", emoji: "💧" },
            { v: "diaper", l: "Diaper", emoji: "👶" },
            { v: "sleep", l: "Sleep", emoji: "🌙" },
            { v: "activity", l: "Activity", emoji: "⭐" },
          ].filter(f => f.v === "all" || counts[f.v] > 0).map(f => {
            const active = rhythmFilter === f.v;
            return (
              <button key={f.v} onClick={() => setRhythmFilter(f.v)} style={{
                background: active ? C.ink : "transparent",
                color: active ? C.paper : C.ink,
                border: `1px solid ${active ? C.ink : C.line + "33"}`,
                borderRadius: 20, padding: "5px 10px",
                fontSize: 11, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {f.emoji && <span>{f.emoji}</span>}
                <span>{f.l}</span>
                <span style={{
                  background: active ? "rgba(255,255,255,0.25)" : `${C.line}15`,
                  padding: "1px 5px", borderRadius: 9,
                  fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                }}>{counts[f.v]}</span>
              </button>
            );
          })}
        </div>

        {filteredRhythm.length === 0 ? (
          <div style={{ background: C.paper, borderRadius: 12, padding: 20, border: `1px solid ${C.line}15`, textAlign: "center" }}>
            <div style={{ color: C.muted, fontStyle: "italic", fontSize: 13 }}>
              {todayEvents.length === 0
                ? "Nothing logged yet today. Solène's day starts when you do — tap LOG below."
                : `No ${rhythmFilter} entries today.`}
            </div>
          </div>
        ) : (() => {
          // Cap to the 5 most recent so the landing page doesn't grow long.
          // Full list lives in the Journal tab.
          const RECENT_CAP = 5;
          const visible = clusteredRhythm.slice(0, RECENT_CAP);
          const hidden = Math.max(0, clusteredRhythm.length - RECENT_CAP);
          return (
            <div style={{ background: C.paper, borderRadius: 12, padding: "10px 16px 14px", border: `1px solid ${C.line}15`, position: "relative" }}>
              <div style={{ position: "absolute", left: 30, top: 22, bottom: hidden > 0 ? 56 : 22, width: 1, background: `${C.line}22` }} />
              {visible.map(e => (
                <TimelineEvent key={e._isCluster ? `cluster-${e.firstId}` : e.id} ev={e} C={C} now={now} />
              ))}
              {hidden > 0 && (
                <div style={{
                  marginTop: 6, paddingTop: 8,
                  borderTop: `1px solid ${C.line}15`,
                  fontSize: 11, color: C.muted, fontStyle: "italic", textAlign: "center",
                }}>
                  + {hidden} earlier event{hidden === 1 ? "" : "s"} · see Journal tab for full day
                </div>
              )}
            </div>
          );
        })()}
      </Section>

      {/* On-site / variable return — moved from Schedule tab. Sits above
          Today's shifts because being away from home is a Now-context
          status more than a planning concept. When active, shows the live
          ETA card; when not, a low-key "Going on-site?" button. */}
      {onsite ? (
        <Section C={C} title={`On-site · ${onsite.parent} away`}>
          <ActiveOnsiteCard
            C={C} onsite={onsite} now={now}
            onUpdateEta={onUpdateEta}
            onArrived={onArrivedHome}
          />
        </Section>
      ) : (onStartOnsite && (
        <button onClick={onStartOnsite} style={{
          width: "100%", marginTop: 14, marginBottom: 4,
          background: "transparent",
          color: C.muted,
          border: `1px dashed ${C.line}40`,
          borderRadius: 10, padding: "10px 14px",
          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <MapPin size={13} />
          Going on-site? Tap to log a variable-return window
        </button>
      ))}

      <Section C={C} title="Today's shifts">
        <ShiftStrip C={C} shifts={shifts} now={now} />
      </Section>
    </div>
  );
}

function SleepPlanCard({ C, events, now }) {
  const [expanded, setExpanded] = useState(false);
  const TARGET_WAKE_START = 6;  // 6 AM
  const TARGET_WAKE_END = 7;    // 7 AM

  // Pull last 7 days of sleep & feed events
  const cutoff = new Date(now.getTime() - 7 * 86400000);
  const recentEvents = events.filter(e => new Date(e.ts) >= cutoff && !e.silent);

  // Find the longest sleep stretches per night (last 5-6 nights of data)
  // A "night sleep" is sleep_down events between 7pm and 2am
  const nightSleeps = recentEvents.filter(e => {
    if (e.type !== "sleep_down") return false;
    const h = new Date(e.ts).getHours();
    return h >= 19 || h < 2;
  });

  // For each night sleep_down, find the next event of any kind that
  // would indicate she's awake (feed, diaper, sleep_up). Time-to-wake
  // approximates her longest stretch.
  const nightStretches = nightSleeps.map(sd => {
    const sdTs = new Date(sd.ts).getTime();
    const next = recentEvents
      .filter(e => new Date(e.ts).getTime() > sdTs && (
        e.type === "feed" || e.type === "breastfeed" || e.type === "diaper" || e.type === "sleep_up"
      ))
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))[0];
    if (!next) return null;
    const stretchMin = (new Date(next.ts).getTime() - sdTs) / 60000;
    return { sleepDown: sd.ts, wakeUp: next.ts, stretchMin };
  }).filter(Boolean);

  // Median longest stretch (in hours)
  const sortedStretches = nightStretches.map(s => s.stretchMin).sort((a, b) => a - b);
  const medianStretchMin = sortedStretches.length > 0
    ? sortedStretches[Math.floor(sortedStretches.length / 2)]
    : null;

  // Recommended bedtime: target wake = 6:30 AM. So bedtime = 6:30 - stretch.
  // If we have data, suggest that. Otherwise, suggest based on age-typical 6h.
  const targetWakeHrs = 6.5;
  const stretchHrs = medianStretchMin ? medianStretchMin / 60 : 5; // fallback 5h
  const recBedtimeHrs = (targetWakeHrs - stretchHrs + 24) % 24; // could be 1.5 = 1:30 AM

  // Recommended last feed before bed: ~30 min before bedtime
  const recLastFeedHrs = (recBedtimeHrs - 0.5 + 24) % 24;

  // Format bedtime as friendly string
  const formatHrs = (h) => {
    const totalMins = Math.round(h * 60);
    const hour = Math.floor(totalMins / 60) % 24;
    const min = totalMins % 60;
    const ap = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${String(min).padStart(2, "0")} ${ap}`;
  };

  // Tonight's recommended bedtime as a Date
  const recBedtimeDate = (() => {
    const d = new Date(now);
    d.setHours(Math.floor(recBedtimeHrs), Math.round((recBedtimeHrs % 1) * 60), 0, 0);
    // If recommended bedtime has already passed today, shift to tomorrow only if we're past 4 AM
    // (ensures we don't recommend "10:30 PM tonight" at 11 PM)
    if (d < now && now.getHours() >= 4) d.setDate(d.getDate() + 1);
    return d;
  })();

  const minsUntilBedtime = Math.round((recBedtimeDate - now) / 60000);

  // Average night-feed wake times (excluding the morning target window)
  const nightFeeds = recentEvents.filter(e => {
    if (e.type !== "feed" && e.type !== "breastfeed") return false;
    const h = new Date(e.ts).getHours();
    return h >= 0 && h < 6; // strict night feeds
  });
  const avgNightFeedHr = nightFeeds.length > 0
    ? nightFeeds.reduce((s, e) => s + new Date(e.ts).getHours() + new Date(e.ts).getMinutes() / 60, 0) / nightFeeds.length
    : null;

  // Confidence: how many data points feed this prediction
  const dataPoints = nightStretches.length;
  const confidence = dataPoints >= 5 ? "high" : dataPoints >= 3 ? "moderate" : dataPoints >= 1 ? "low" : "none";

  return (
    <div style={{
      marginBottom: 14,
      background: C.paper,
      border: `1px solid ${C.line}22`,
      borderRadius: 14,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", textAlign: "left", fontFamily: "inherit",
          background: "transparent", border: "none", cursor: "pointer",
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "#6B7CA822", color: "#6B7CA8",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Moon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Sleep plan · target wake 6–7 AM
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: C.ink, lineHeight: 1.1, marginTop: 2 }}>
            {confidence === "none" ? "Not enough data yet" : `Bedtime ~${formatHrs(recBedtimeHrs)}`}
          </div>
          {confidence !== "none" && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {minsUntilBedtime > 0 && minsUntilBedtime < 720
                ? `in ${minsUntilBedtime < 60 ? `${minsUntilBedtime}m` : `${Math.floor(minsUntilBedtime / 60)}h ${minsUntilBedtime % 60}m`}`
                : minsUntilBedtime <= 0 && minsUntilBedtime > -240
                ? `${Math.abs(minsUntilBedtime)}m past · still good`
                : `tonight`}
              {" · "}
              <span style={{ color: confidence === "high" ? "#5C8E5C" : confidence === "moderate" ? "#D4A03A" : C.muted }}>
                {confidence} confidence
              </span>
            </div>
          )}
        </div>
        <ChevronRight size={16} color={C.muted} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.line}10` }}>
          {confidence === "none" ? (
            <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 12, lineHeight: 1.6 }}>
              Log a few "down for sleep" and feed events through the night and this card will start predicting Solène's optimal bedtime to wake at 6–7 AM.
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}15` }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
                    Last feed by
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: C.ink, marginTop: 2, lineHeight: 1.1 }}>
                    {formatHrs(recLastFeedHrs)}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    full belly = longer stretch
                  </div>
                </div>
                <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}15` }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
                    Then sleep
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: C.ink, marginTop: 2, lineHeight: 1.1 }}>
                    {stretchHrs.toFixed(1)}h
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    her recent median stretch
                  </div>
                </div>
              </div>

              <div style={{
                background: `${C.accent}10`, border: `1px solid ${C.accent}33`, borderRadius: 8,
                padding: "10px 12px", marginBottom: 10,
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, fontWeight: 700, marginBottom: 4 }}>
                  Why this works
                </div>
                <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                  Targeting a {formatHrs(targetWakeHrs)} wake means putting her down at <strong>{formatHrs(recBedtimeHrs)}</strong> so her natural {stretchHrs.toFixed(1)}h stretch lands in your target window. Feeding her ~30 min before bed gives a full belly without too much pre-sleep activity.
                </div>
              </div>

              {avgNightFeedHr !== null && (
                <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}15`, marginBottom: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
                    Expect a night feed around
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, color: C.ink, marginTop: 2, lineHeight: 1.1 }}>
                    {formatHrs(avgNightFeedHr)}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    based on {nightFeeds.length} night feed{nightFeeds.length === 1 ? "" : "s"} this week
                  </div>
                </div>
              )}

              <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", lineHeight: 1.5 }}>
                Based on {dataPoints} night sleep{dataPoints === 1 ? "" : "s"} from the last 7 days. The more "down for sleep" events you log overnight, the sharper this prediction gets.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodaysPlanCard({ C, shifts, baseShifts, swaps, now, currentUser, onDispute }) {
  const hasSwaps = swaps && swaps.length > 0;
  const [adjExpanded, setAdjExpanded] = useState(false);
  // Build a map of which blocks were swapped, for highlight purposes
  const swappedKeys = useMemo(() => {
    const map = {};
    for (const s of swaps || []) {
      const k = `${s.shift.start}-${s.shift.end}`;
      map[k] = s;
    }
    return map;
  }, [swaps]);

  // Determine which shift block is "now" so we can mark it
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const isCurrentBlock = (s) => {
    const a = toMin(s.start);
    const b = toMin(s.end);
    return a < b ? currentMin >= a && currentMin < b : currentMin >= a || currentMin < b;
  };

  // Sort swaps so the ones impacting currentUser sort first
  const sortedSwaps = useMemo(() => {
    const arr = [...(swaps || [])];
    arr.sort((a, b) => {
      const aImpactsMe = a.coveringParent === currentUser;
      const bImpactsMe = b.coveringParent === currentUser;
      if (aImpactsMe && !bImpactsMe) return -1;
      if (!aImpactsMe && bImpactsMe) return 1;
      // Otherwise sort by shift start time
      return toMin(a.shift.start) - toMin(b.shift.start);
    });
    return arr;
  }, [swaps, currentUser]);

  return (
    <div style={{
      background: C.paper,
      border: `1px solid ${C.line}15`,
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 4,
    }}>
      <div style={{
        padding: "10px 14px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        borderBottom: `1px solid ${C.line}10`,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Today's plan
          </div>
          {hasSwaps && (
            <div style={{ fontSize: 11, color: C.accent, marginTop: 2, fontStyle: "italic" }}>
              {swaps.length} adjustment{swaps.length === 1 ? "" : "s"} from base
            </div>
          )}
        </div>
        {!hasSwaps && (
          <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>matches base</span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {["Mommy", "Daddy"].map(parent => {
          const color = parent === "Mommy" ? C.mommy : C.daddy;
          const list = shifts[parent] || [];
          return (
            <div key={parent} style={{
              padding: "10px 12px",
              borderTop: `3px solid ${color}`,
              borderRight: parent === "Mommy" ? `1px solid ${C.line}10` : "none",
            }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600,
                color, lineHeight: 1, marginBottom: 6,
              }}>
                {parent}
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>—</div>
              ) : list.map((s, i) => {
                const k = `${s.start}-${s.end}`;
                const swap = swappedKeys[k];
                const wasMoved = swap && swap.coveringParent === parent;
                const isBalance = swap && swap.kind === "balance";
                const isAntiCluster = swap && swap.kind === "anti-cluster";
                const isAutoRepayment = swap && swap.kind === "auto-repayment";
                const isRepaymentShift = s._isRepayment === true;
                const isAutoRepaymentShift = s._isAutoRepayment === true;
                const isTakeoverSlice = s._isTakeoverSlice === true;
                const current = isCurrentBlock(s);
                return (
                  <div key={i} style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    padding: "3px 0",
                    color: current ? C.ink : C.ink,
                    fontWeight: current ? 700 : (wasMoved || isRepaymentShift || isAutoRepaymentShift || isTakeoverSlice ? 600 : 400),
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {current && (
                      <span style={{
                        display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                        background: color, flexShrink: 0,
                      }} className="pulse-soft" />
                    )}
                    {wasMoved && !isBalance && !isAntiCluster && !isAutoRepayment && swap?.kind !== "takeover" && swap?.kind !== "repayment" && (
                      <span style={{ fontSize: 10, color: C.accent, flexShrink: 0 }}>+</span>
                    )}
                    {isTakeoverSlice && (
                      <span style={{ fontSize: 10, color: C.accent, flexShrink: 0 }} title={`Took over for ${s._takeoverDurationMin}m`}>↔</span>
                    )}
                    {isRepaymentShift && (
                      <span style={{ fontSize: 10, color: "#5C8E5C", flexShrink: 0 }} title={`Repaying ${s._takeoverDurationMin}m takeover`}>↩</span>
                    )}
                    {isAutoRepaymentShift && (
                      <span style={{ fontSize: 10, color: "#5C8E5C", flexShrink: 0 }} title={`Auto-repaying ${s._autoRepayDurationMin}m coverage from earlier`}>↩</span>
                    )}
                    {wasMoved && isBalance && (
                      <span style={{ fontSize: 10, color: color, flexShrink: 0 }}>⚖</span>
                    )}
                    {wasMoved && isAntiCluster && (
                      <span style={{ fontSize: 10, color: "#5C8E5C", flexShrink: 0 }} title="Breaking a 4h+ stretch for the other parent">⏸</span>
                    )}
                    <span>{fmtShiftRange(s)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Adjustments — collapsible drawer with explanations */}
      {hasSwaps && (
        <div style={{ borderTop: `1px solid ${C.line}10` }}>
          <button onClick={() => setAdjExpanded(v => !v)} style={{
            width: "100%", background: "transparent", border: "none",
            padding: "10px 14px",
            cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 8,
            color: C.ink,
          }}>
            <Edit3 size={12} color={C.accent} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: "0.04em" }}>
              {adjExpanded ? "hide" : "see"} why these adjustments were made
            </span>
            <span style={{
              marginLeft: "auto",
              fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
            }}>
              {sortedSwaps.length} {sortedSwaps.length === 1 ? "swap" : "swaps"}
            </span>
            <ChevronRight size={14} color={C.muted} style={{
              transform: adjExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }} />
          </button>
          {adjExpanded && (
            <div style={{
              padding: "0 14px 14px 14px",
              display: "grid", gap: 10,
            }}>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, padding: "6px 10px", background: C.bg, borderRadius: 8 }}>
                The base schedule is split into 2-hour blocks alternating between you. When commitments overlap a shift, the other parent picks it up automatically. To keep the day fair, the system also swaps an unblocked future shift back to even out the workload.
              </div>
              {sortedSwaps.map((s, i) => {
                const coverColor = s.coveringParent === "Mommy" ? C.mommy : C.daddy;
                const origColor = s.originalParent === "Mommy" ? C.mommy : C.daddy;
                const impactsMe = s.coveringParent === currentUser;
                const isRedemption = s.kind === "redemption";
                const isBalance = s.kind === "balance";
                const isTakeover = s.kind === "takeover";
                const isRepayment = s.kind === "repayment";

                return (
                  <div key={i} style={{
                    padding: "10px 12px",
                    background: impactsMe ? `${coverColor}10` : C.bg,
                    borderRadius: 8,
                    border: impactsMe ? `1px solid ${coverColor}33` : `1px solid ${C.line}11`,
                  }}>
                    {/* Header line: shift block + swap kind */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>
                        {isRepayment ? "↩" : isTakeover ? "↔" : isBalance ? "⚖" : isRedemption ? "💝" : s.blocked ? "⚠" : "↻"}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: C.ink }}>
                        {fmtShiftRange(s.shift)}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                        {isRepayment ? "auto-repayment" : isTakeover ? (s.active ? "active takeover" : "takeover") : isBalance ? "balance" : isRedemption ? "cash-in" : s.blocked ? "manual fix needed" : "coverage"}
                      </span>
                    </div>

                    {/* Body explanation */}
                    <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
                      {isRepayment ? (
                        <>
                          <strong style={{ color: origColor }}>{s.originalParent}</strong> automatically repays{" "}
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong>{" "}
                          for the {s.takeoverDurationMin || "?"}min impromptu takeover earlier. The whole shift flips to{" "}
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> ASAP — debt squared once this shift completes.
                        </>
                      ) : isTakeover ? (
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong>{" "}
                          {s.active ? "is currently covering" : "covered"}{" "}
                          <strong style={{ color: origColor }}>{s.originalParent}</strong>{" "}
                          during this shift via impromptu takeover. {s.active ? "Time owed will be logged when it ends." : "Time owed has been added to the time bank."}
                        </>
                      ) : s.blocked ? (
                        <>
                          <strong style={{ color: origColor }}>{s.originalParent}</strong> has{" "}
                          <em>{s.reason || "a commitment"}</em> during this shift, but{" "}
                          <strong style={{ color: s.originalParent === "Mommy" ? C.daddy : C.mommy }}>
                            {s.originalParent === "Mommy" ? "Daddy" : "Mommy"}
                          </strong>{" "}
                          is also blocked. You'll need to figure this one out manually.
                        </>
                      ) : isBalance ? (
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> takes back this block from{" "}
                          <strong style={{ color: origColor }}>{s.originalParent}</strong>{" "}
                          to keep today's workload roughly equal. No commitment is forcing this swap — it's purely fairness.
                        </>
                      ) : isRedemption ? (
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> covers this shift because{" "}
                          <strong style={{ color: origColor }}>{s.originalParent}</strong>{" "}
                          cashed in <em>time-bank credit</em> for{" "}
                          <em>{(s.reason || "").replace(/^Time bank:\s*/, "") || "owed time"}</em>. Already settled — no debt incurred.
                        </>
                      ) : (
                        <>
                          <strong style={{ color: origColor }}>{s.originalParent}</strong> has{" "}
                          <em>{s.reason || "a commitment"}</em> overlapping this shift, so{" "}
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> picks it up.
                        </>
                      )}
                    </div>

                    {/* Action row for the impacted user */}
                    {impactsMe && !isRedemption && !isBalance && !s.blocked && onDispute && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>
                          you've picked this up
                        </span>
                        <button onClick={() => onDispute(s)} style={{
                          marginLeft: "auto",
                          background: "transparent", color: C.muted,
                          border: `1px solid ${C.line}33`, borderRadius: 14,
                          padding: "3px 10px", fontSize: 10, cursor: "pointer", fontWeight: 500,
                        }}>
                          discuss with partner
                        </button>
                      </div>
                    )}
                    {impactsMe && isBalance && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
                        ↻ auto-balanced for fair workload
                      </div>
                    )}
                    {impactsMe && isRedemption && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
                        ↻ already paid via time-bank
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {hasSwaps && !adjExpanded && (
        <div style={{
          padding: "8px 12px",
          background: C.bg,
          fontSize: 10, color: C.muted, lineHeight: 1.5,
          borderTop: `1px solid ${C.line}10`,
        }}>
          <span style={{ color: C.accent, fontWeight: 600 }}>+</span> covering ·{" "}
          <span>⚖</span> fair-play swap-back ·{" "}
          <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: C.muted, verticalAlign: "middle", marginRight: 3 }} />
          on duty now
        </div>
      )}
    </div>
  );
}

function CollapsibleDailyCard({ C, icon, title, subtitle, expanded, onToggle, color, children }) {
  return (
    <div style={{
      background: C.paper,
      border: `1px solid ${C.line}15`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", background: "transparent", border: "none",
        padding: "12px 14px", cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12,
        color: C.ink,
      }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color, fontWeight: 600 }}>
            {title}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16, fontWeight: 500,
            fontStyle: "italic", color: C.ink,
            marginTop: 2, lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {subtitle}
          </div>
        </div>
        <ChevronRight size={16} color={C.muted} style={{
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }} />
      </button>
      {expanded && (
        <div style={{ padding: "0 14px 14px 14px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DailyVerseCard({ C, verse, loading }) {
  if (loading && !verse) {
    return (
      <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
        <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>preparing today's word…</div>
      </div>
    );
  }
  if (!verse) {
    return (
      <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
        <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>connect to internet to get today's verse</div>
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.soft}, ${C.paper})`,
      borderRadius: 14, padding: 20,
      border: `1px solid ${C.line}22`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative quote mark */}
      <div style={{
        position: "absolute", top: -12, left: 12,
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 96, color: C.accent, opacity: 0.18, lineHeight: 1,
        fontStyle: "italic", pointerEvents: "none",
      }}>"</div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: C.accent, fontWeight: 600, marginBottom: 8 }}>
          {verse.reference}
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400,
          fontStyle: "italic", color: C.ink, lineHeight: 1.5, marginBottom: 12,
        }}>
          {verse.text}
        </div>
        <div style={{
          fontSize: 13, color: C.muted, lineHeight: 1.55,
          paddingTop: 12, borderTop: `1px solid ${C.line}22`,
        }}>
          {verse.encouragement}
        </div>
      </div>
    </div>
  );
}

function FrenchCard({ C, content, loading }) {
  const [tab, setTab] = useState("daddy"); // 'daddy' | 'mommy'

  if (loading && !content) {
    return (
      <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
        <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>preparing today's phrases…</div>
      </div>
    );
  }
  if (!content) {
    return (
      <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
        <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>connect to internet for today's phrases</div>
      </div>
    );
  }

  const phrase = tab === "daddy" ? content.frenchBeginner : content.frenchIntermediate;
  const tabColor = tab === "daddy" ? C.daddy : C.mommy;

  if (!phrase) return null;

  return (
    <div style={{
      background: C.paper, borderRadius: 14,
      border: `1px solid ${C.line}22`,
      borderTop: `3px solid ${tabColor}`,
      overflow: "hidden",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {[
          { id: "daddy", l: "Daddy · beginner", color: C.daddy },
          { id: "mommy", l: "Mommy · refresher", color: C.mommy },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? t.color : "transparent",
            color: tab === t.id ? "#fff" : C.muted,
            border: "none", padding: "10px 8px",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            cursor: "pointer",
            borderBottom: `1px solid ${C.line}15`,
          }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ padding: 18 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500,
          color: tabColor, lineHeight: 1.2, fontStyle: "italic",
        }}>
          {phrase.phrase}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.muted,
          marginTop: 4, letterSpacing: "0.02em",
        }}>
          [{phrase.phonetic}]
        </div>
        <div style={{
          fontSize: 14, color: C.ink, marginTop: 10, fontWeight: 500,
        }}>
          {phrase.translation}
        </div>

        <div style={{
          marginTop: 14, padding: "10px 12px",
          background: C.bg, borderRadius: 8,
          fontSize: 12, color: C.muted, lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>
            when to use
          </span>
          {phrase.context}
        </div>

        {phrase.example && (
          <div style={{
            marginTop: 10, padding: "10px 12px",
            background: `${tabColor}11`, borderRadius: 8,
            fontSize: 13, color: C.ink, lineHeight: 1.5,
            borderLeft: `3px solid ${tabColor}`,
          }}>
            <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: tabColor, display: "block", marginBottom: 4, fontWeight: 600 }}>
              try saying
            </span>
            <div style={{ fontStyle: "italic", color: C.ink }}>
              {typeof phrase.example === "string" ? phrase.example : phrase.example.fr}
            </div>
            {typeof phrase.example === "object" && phrase.example.en && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {phrase.example.en}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ C, title, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        fontSize: 11, letterSpacing: "0.26em", textTransform: "uppercase",
        color: C.muted, fontWeight: 600, marginBottom: 12,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ display: "inline-block", width: 14, height: 1, background: C.muted, opacity: 0.45 }} />
        <span>{title}</span>
        <span style={{ flex: 1, height: 1, background: C.muted, opacity: 0.18 }} />
      </div>
      {children}
    </div>
  );
}

function RTTimer({ item, C }) {
  const remHrs = item.remaining;
  const pct = Math.max(0, Math.min(100, (item.ageHrs / item.limit) * 100));
  const urgent = remHrs < 1;
  return (
    <div style={{
      background: C.bg, padding: "10px 12px", borderRadius: 8,
      border: `1px solid ${urgent ? C.accent : C.line + "22"}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `conic-gradient(${urgent ? C.accent : C.ink} ${pct * 3.6}deg, ${C.line}22 0)`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Milk size={12} color={urgent ? C.accent : C.ink} />
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.oz} oz · room temp</div>
        <div style={{ fontSize: 11, color: urgent ? C.accent : C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
          {remHrs > 0 ? `${fmtHours(remHrs)} until expiration` : "expired"}
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ ev, C, now }) {
  // Cluster mode: rendered as a single condensed row showing combined oz + range
  if (ev._isCluster) {
    const startTs = new Date(ev.ts);
    const endTs = new Date(ev.endTs);
    // Build a description: "X oz from N bottles" plus breastfeed minutes if any
    const parts = [];
    if (ev.totalOz > 0) {
      const bottleCount = ev.events.filter(e => e.type === "feed").length;
      parts.push(`${ev.totalOz.toFixed(1)}oz · ${bottleCount} bottle${bottleCount === 1 ? "" : "s"}`);
    }
    if (ev.totalBfMin > 0) {
      parts.push(`${ev.totalBfMin}m breastfeed`);
    }
    const sourcesStr = ev.sources.filter(s => s !== "Breastfeed").join(" + ");
    return (
      <div style={{ position: "relative", padding: "7px 0", paddingLeft: 22 }}>
        <div style={{
          position: "absolute", left: -8, top: 9,
          width: 12, height: 12, borderRadius: "50%",
          background: C.accent, color: "#fff",
          border: `1.5px solid ${C.paper}`,
          boxShadow: `0 0 0 1px ${C.accent}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Milk size={10} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted, minWidth: 52 }}>
            {fmtTimeShort(startTs)}
          </span>
          <span style={{ fontSize: 13, flex: 1, color: C.ink }}>
            <span style={{
              display: "inline-block", width: 3, height: 12,
              background: C.accent, borderRadius: 2, marginRight: 8, verticalAlign: "middle",
            }} />
            <strong>Feeding session</strong> · {parts.join(" + ")}
            {sourcesStr && <span style={{ color: C.muted, fontSize: 11 }}> · {sourcesStr}</span>}
            <span style={{ display: "block", fontSize: 10, color: C.muted, marginLeft: 11, marginTop: 2, fontStyle: "italic" }}>
              {fmtTimeShort(startTs)}–{fmtTimeShort(endTs)} · {ev.events.length} entries grouped
            </span>
          </span>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtElapsed(minutesAgo(ev.ts))}
          </span>
        </div>
      </div>
    );
  }

  const icon = {
    feed: <Milk size={10} />,
    breastfeed: <Heart size={10} />,
    pump: <Droplet size={10} />,
    diaper: <Baby size={10} />,
    sleep_down: <Moon size={10} />,
    sleep_up: <Sun size={10} />,
    bath: <Bath size={10} />,
    skincare: <Sparkles size={10} />,
    activity: <Star size={10} />,
    takeover: <ArrowRightLeft size={10} />,
  }[ev.type];

  const activityInfo = ev.type === "activity" ? ACTIVITIES.find(a => a.v === ev.activityType) : null;

  // Color by event type
  const typeColor = {
    feed: C.accent,           // coral — bottle feeds
    breastfeed: C.mommy,      // rose — breastfeeds
    pump: C.mommy,            // rose — pumping
    diaper: C.daddy,          // sage
    sleep_down: "#6B7CA8",    // dusty blue
    sleep_up: "#D4A03A",      // gold (waking)
    bath: "#7B9CC4",          // light blue
    skincare: "#9C6BB0",      // soft purple
    activity: activityInfo?.color || C.daddy,
    takeover: C.accent,
  }[ev.type] || C.ink;

  const label = {
    feed: `Feed · ${ev.oz || "?"}oz ${ev.source || ""}`,
    breastfeed: `Breastfed · ${ev.totalDurationMin}m (L${ev.leftMin || 0}/R${ev.rightMin || 0})`,
    pump: `Pump · ${ev.oz || "?"}oz · ${ev.durationMin || "?"}m`,
    diaper: `Diaper${ev.notes ? ` · ${ev.notes}` : ""}`,
    sleep_down: "Down for sleep",
    sleep_up: "Awake",
    bath: `${BATH_TYPES[ev.bathType]?.icon || "🛁"} ${BATH_TYPES[ev.bathType]?.label || "Bath"}`,
    skincare: `${ev.routine === "AM" ? "☀️ AM" : "🌙 PM"} routine done`,
    activity: activityInfo ? `${activityInfo.emoji} ${activityInfo.l} · ${ev.durationMin}m` : `Activity · ${ev.durationMin}m`,
    takeover: `Takeover · ${ev.coveringParent} covered ${ev.originalParent} for ${fmtBalance(ev.durationMin || 0)}`,
  }[ev.type] || ev.type;

  return (
    <div style={{ position: "relative", padding: "7px 0", paddingLeft: 22 }}>
      <div style={{
        position: "absolute", left: -8, top: 9,
        width: 12, height: 12, borderRadius: "50%",
        background: typeColor, color: "#fff",
        border: `1.5px solid ${C.paper}`,
        boxShadow: `0 0 0 1px ${typeColor}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted, minWidth: 52 }}>
          {fmtTimeShort(new Date(ev.ts))}
        </span>
        <span style={{ fontSize: 13, flex: 1, color: C.ink }}>
          <span style={{
            display: "inline-block", width: 3, height: 12,
            background: typeColor, borderRadius: 2, marginRight: 8, verticalAlign: "middle",
          }} />
          {label}
        </span>
        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          {fmtElapsed(minutesAgo(ev.ts))}
        </span>
      </div>
    </div>
  );
}

function WeatherCard({ C, weather, uvNow, tempNow, walkWindows }) {
  if (!weather) {
    return <div style={{ color: C.muted, fontSize: 13, padding: "12px 0", fontStyle: "italic" }}>fetching weather…</div>;
  }
  const uvLabel = uvNow == null ? "—" : uvNow < 3 ? "low" : uvNow < 6 ? "moderate" : uvNow < 8 ? "high" : "very high";
  const uvColor = uvNow == null ? C.muted : uvNow < 3 ? "#5C8E5C" : uvNow < 6 ? "#D4A03A" : C.accent;

  return (
    <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase" }}>OUTSIDE NOW</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 2 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500 }}>
              {tempNow != null ? `${Math.round(tempNow)}°F` : "—"}
            </div>
            <div style={{ fontSize: 12, color: uvColor, fontWeight: 500 }}>
              UV {uvNow != null ? uvNow.toFixed(1) : "—"} · {uvLabel}
            </div>
          </div>
          {uvNow != null && uvNow >= 6 && (
            <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontWeight: 500 }}>
              ☀️ Apply Aveeno SPF before going out
            </div>
          )}
        </div>
        <Sun size={28} color={uvColor} style={{ opacity: 0.7 }} />
      </div>

      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
        Good walk windows
      </div>
      {walkWindows && walkWindows.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 6 }}>
          {walkWindows.map((w, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 8, padding: "7px 8px", border: `1px solid ${C.line}15` }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>
                {fmtTimeShort(w.time)}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                {Math.round(w.temp)}° · UV {w.uv.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No safe windows in next 24h</div>
      )}
    </div>
  );
}

function ShiftStrip({ C, shifts, now }) {
  // 24 hourly cells starting from current hour, showing who's on
  const startMins = now.getHours() * 60 + now.getMinutes();
  const cells = [];
  for (let i = 0; i < 24; i++) {
    const cellHour = (now.getHours() + i) % 24;
    const cellMins = cellHour * 60 + 30; // mid-hour
    let parent = "Mommy";
    for (const p of ["Mommy", "Daddy"]) {
      for (const s of shifts[p]) {
        const a = toMin(s.start);
        const b = toMin(s.end);
        const inShift = a < b ? cellMins >= a && cellMins < b : cellMins >= a || cellMins < b;
        if (inShift) { parent = p; break; }
      }
    }
    cells.push({ hour: cellHour, parent });
  }

  return (
    <div style={{ background: C.paper, borderRadius: 12, padding: 14, border: `1px solid ${C.line}15` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          next 24 hours →
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: C.mommy, borderRadius: 2 }} /> Mommy
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: C.daddy, borderRadius: 2 }} /> Daddy
          </span>
        </div>
      </div>

      {/* Hour blocks */}
      <div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}11`, marginBottom: 4 }}>
        {cells.map((c, i) => (
          <div key={i} style={{
            flex: 1,
            background: c.parent === "Mommy" ? C.mommy : C.daddy,
            opacity: 0.85,
            position: "relative",
            borderRight: i < 23 ? `1px solid ${C.bg}55` : "none",
          }}>
            {i === 0 && (
              <div style={{
                position: "absolute", top: -4, left: 0, bottom: -4, width: 2,
                background: C.accent, boxShadow: `0 0 8px ${C.accent}`,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Hour labels */}
      <div style={{ display: "flex", fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        {cells.map((c, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            {i % 3 === 0 ? (
              c.hour === 0 ? "12a" :
              c.hour === 12 ? "12p" :
              c.hour < 12 ? `${c.hour}a` : `${c.hour - 12}p`
            ) : ""}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: C.muted, fontStyle: "italic" }}>
        ↑ each block = 1 hour. Orange line marks <strong style={{ color: C.accent }}>now</strong>.
      </div>
    </div>
  );
}

function LogView({ C, events, removeEvent, updateEvent, now }) {
  const [editing, setEditing] = useState(null); // event being edited
  const visibleEvents = events.filter(e => !e.silent);
  const sorted = [...visibleEvents].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const grouped = {};
  for (const e of sorted) {
    const key = new Date(e.ts).toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }
  return (
    <div style={{ marginTop: 14 }}>
      <Section C={C} title={`Full journal · ${visibleEvents.length} entries`}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontStyle: "italic" }}>
          Tap any entry to edit · trash icon to delete
        </div>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ color: C.muted, fontStyle: "italic", padding: 20, fontSize: 14, textAlign: "center" }}>
            Nothing logged yet.
          </div>
        ) : Object.entries(grouped).map(([day, evs]) => {
          const dayDate = new Date(day);
          const isToday = dayDate.toDateString() === now.toDateString();
          const isYesterday = dayDate.toDateString() === new Date(now.getTime() - 86400000).toDateString();
          const dayLabel = isToday ? "Today"
            : isYesterday ? "Yesterday"
            : dayDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
          const safeKey = day.replace(/[^a-z0-9]/gi, '');

          // Today renders un-collapsed; older days wrap in <details> so the
          // journal isn't an info wall on first load.
          const dayHeader = (
            <div style={{
              display: "flex", alignItems: "baseline", gap: 8,
              fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
              fontSize: 18, color: C.muted,
            }}>
              {!isToday && (
                <ChevronRight size={12} className={`journal-chev-${safeKey}`} style={{ transition: "transform 0.2s", flexShrink: 0, alignSelf: "center" }} />
              )}
              <span>{dayLabel}</span>
              <span style={{ fontStyle: "normal", fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                · {evs.length} events
              </span>
            </div>
          );

          const dayBody = (
            <div style={{ background: C.paper, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.line}15`, marginTop: 8 }}>
              {evs.map((e, i) => (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  borderTop: i === 0 ? "none" : `1px solid ${C.line}10`,
                }}>
                  <button
                    onClick={() => setEditing(e)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontFamily: "inherit", textAlign: "left",
                    }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted, minWidth: 56 }}>
                      {fmtTimeShort(new Date(e.ts))}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: C.ink }}>
                      {e.type === "feed" && `Feed · ${e.oz || "?"}oz ${e.source || ""}`}
                      {e.type === "breastfeed" && `Breastfed · ${e.totalDurationMin}m (L${e.leftMin || 0}/R${e.rightMin || 0})`}
                      {e.type === "pump" && `Pump · ${e.oz || "?"}oz · ${e.durationMin || "?"}m`}
                      {e.type === "diaper" && `Diaper · ${e.notes || ""}`}
                      {e.type === "sleep_down" && `Down for sleep${e.estimated ? " (est.)" : ""}`}
                      {e.type === "sleep_up" && "Awake"}
                      {e.type === "bath" && `${BATH_TYPES[e.bathType]?.icon} ${BATH_TYPES[e.bathType]?.label}`}
                      {e.type === "skincare" && `${e.routine === "AM" ? "☀️" : "🌙"} ${e.routine} routine`}
                      {e.type === "activity" && (() => {
                        const a = ACTIVITIES.find(x => x.v === e.activityType);
                        return `${a?.emoji || "⭐"} ${a?.l || "Activity"} · ${e.durationMin}m`;
                      })()}
                      {e.type === "takeover" && `↔ ${e.coveringParent} covered ${e.originalParent} · ${e.durationMin}m`}
                    </span>
                    <Edit3 size={11} color={C.muted} style={{ opacity: 0.4 }} />
                  </button>
                  <button onClick={(ev) => { ev.stopPropagation(); removeEvent(e.id); }} style={{
                    background: "transparent", border: "none", color: C.muted, cursor: "pointer",
                    padding: "10px 14px 10px 4px", opacity: 0.5,
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          );

          if (isToday) {
            return (
              <div key={day} style={{ marginBottom: 20 }}>
                {dayHeader}
                {dayBody}
              </div>
            );
          }
          return (
            <details key={day} style={{ marginBottom: 14 }}>
              <summary style={{ cursor: "pointer", listStyle: "none" }}>
                {dayHeader}
              </summary>
              <style>{`details[open] .journal-chev-${safeKey} { transform: rotate(90deg); }`}</style>
              {dayBody}
            </details>
          );
        })}
      </Section>

      {editing && (
        <EditEventModal
          C={C}
          event={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            updateEvent(editing.id, updated);
            setEditing(null);
          }}
          onDelete={() => {
            removeEvent(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditEventModal({ C, event, onClose, onSave, onDelete }) {
  // Local edit state — start with the existing values
  const [tsLocal, setTsLocal] = useState(() => {
    const d = new Date(event.ts);
    // Format as local datetime-local: YYYY-MM-DDTHH:MM
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [oz, setOz] = useState(event.oz || 0);
  const [source, setSource] = useState(event.source || "BM");
  const [durationMin, setDurationMin] = useState(event.durationMin || 0);
  const [diaperKind, setDiaperKind] = useState(event.notes || "wet");
  const [leftMin, setLeftMin] = useState(event.leftMin || 0);
  const [rightMin, setRightMin] = useState(event.rightMin || 0);
  // Pump-specific: support editing as start+end time (range) or start+duration.
  // Default to "range" since it matches how users naturally log pumping.
  // endTsLocal lazily computed from event.ts + event.durationMin on mount.
  const [pumpEditMode, setPumpEditMode] = useState("range");
  const [endTsLocal, setEndTsLocal] = useState(() => {
    if (event.type !== "pump" || !event.durationMin) return "";
    const start = new Date(event.ts);
    if (isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + Number(event.durationMin) * 60000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  });

  const submit = () => {
    const ts = new Date(tsLocal).toISOString();
    const updated = { ...event, ts };
    if (event.type === "feed") {
      updated.oz = Number(oz);
      updated.source = source;
    } else if (event.type === "pump") {
      updated.oz = Number(oz);
      // If editing in start+end mode, recompute duration from the latest
      // tsLocal + endTsLocal (covers the case where the user changed the
      // start time after picking an end time). If in duration mode, just
      // trust the durationMin field.
      if (pumpEditMode === "range" && endTsLocal) {
        const s = new Date(tsLocal);
        const e = new Date(endTsLocal);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          updated.durationMin = Math.max(0, Math.round((e - s) / 60000));
        } else {
          updated.durationMin = Number(durationMin);
        }
      } else {
        updated.durationMin = Number(durationMin);
      }
    } else if (event.type === "diaper") {
      updated.notes = diaperKind;
    } else if (event.type === "breastfeed") {
      updated.leftMin = Number(leftMin);
      updated.rightMin = Number(rightMin);
      updated.totalDurationMin = Number(leftMin) + Number(rightMin);
    } else if (event.type === "activity") {
      updated.durationMin = Number(durationMin);
    } else if (event.type === "takeover") {
      updated.durationMin = Number(durationMin);
    }
    onSave(updated);
  };

  const titles = {
    feed: "Edit feed",
    breastfeed: "Edit breastfeed",
    pump: "Edit pump",
    diaper: "Edit diaper change",
    sleep_down: "Edit sleep-down time",
    sleep_up: "Edit wake time",
    bath: "Edit bath",
    skincare: "Edit skincare routine",
    activity: "Edit activity",
    takeover: "Edit takeover",
  };

  return (
    <ModalShell C={C} onClose={onClose} title={titles[event.type] || "Edit event"}>
      <Field C={C} label="When?">
        <input
          type="datetime-local"
          value={tsLocal}
          onChange={e => setTsLocal(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
            borderRadius: 8, fontSize: 14, background: C.bg, color: C.ink,
            fontFamily: "inherit",
          }}
        />
      </Field>

      {event.type === "feed" && (
        <>
          <Field C={C} label="Volume (oz)">
            <BigOzPicker C={C} value={oz} onChange={setOz} />
          </Field>
          <Field C={C} label="Source">
            <SegControl C={C} value={source} onChange={setSource} options={[
              { v: "BM", l: "Breast milk" },
              { v: "Formula", l: "Formula" },
              { v: "BM+Formula", l: "Mix" },
            ]} />
          </Field>
        </>
      )}

      {event.type === "pump" && (() => {
        // Pump editing supports two mental models:
        //  1) Start time + duration  → "I started at 6am and pumped for 30min"
        //  2) Start time + end time  → "I pumped 6:00–6:30am"
        // The user reports thinking in (2) — which matches how times are
        // logged in bulk-import format. We default to (2) but offer a
        // toggle so they can pick whichever feels natural for that edit.
        // Compute end time as a derived datetime-local string from
        // (tsLocal + durationMin) so toggling between modes preserves data.
        const computeEndFromStart = (startStr, dur) => {
          if (!startStr || !dur) return startStr;
          const start = new Date(startStr);
          if (isNaN(start.getTime())) return startStr;
          const end = new Date(start.getTime() + Number(dur) * 60000);
          const pad = (n) => String(n).padStart(2, "0");
          return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        };
        const computeDurFromRange = (startStr, endStr) => {
          if (!startStr || !endStr) return 0;
          const s = new Date(startStr);
          const e = new Date(endStr);
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
          const mins = Math.round((e - s) / 60000);
          return Math.max(0, mins);
        };

        return (
          <>
            <Field C={C} label="Volume (oz)">
              <BigOzPicker C={C} value={oz} onChange={setOz} />
            </Field>

            {/* Mode toggle — start+end (default) vs start+duration */}
            <div style={{ marginBottom: 10 }}>
              <SegControl C={C} value={pumpEditMode} onChange={setPumpEditMode} options={[
                { v: "range", l: "Start–End" },
                { v: "duration", l: "Duration" },
              ]} />
            </div>

            {pumpEditMode === "range" ? (
              <Field C={C} label="End time">
                <input
                  type="datetime-local"
                  value={endTsLocal || computeEndFromStart(tsLocal, durationMin)}
                  onChange={e => {
                    const newEnd = e.target.value;
                    setEndTsLocal(newEnd);
                    // Keep durationMin in sync so saving uses an accurate value
                    setDurationMin(computeDurFromRange(tsLocal, newEnd));
                  }}
                  style={{
                    width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
                    borderRadius: 8, fontSize: 14, background: C.bg, color: C.ink,
                    fontFamily: "inherit",
                  }}
                />
                {durationMin > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
                    duration: {durationMin} min
                  </div>
                )}
              </Field>
            ) : (
              <Field C={C} label="Duration (min)">
                <input
                  type="number" inputMode="numeric" min="1" max="120"
                  value={durationMin}
                  onChange={e => {
                    const newDur = e.target.value;
                    setDurationMin(newDur);
                    // Keep endTsLocal in sync
                    setEndTsLocal(computeEndFromStart(tsLocal, newDur));
                  }}
                  style={{
                    width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
                    borderRadius: 8, fontSize: 18, background: C.bg, color: C.ink,
                    fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
                  }}
                />
                {tsLocal && durationMin > 0 && (() => {
                  const endStr = computeEndFromStart(tsLocal, durationMin);
                  const endDate = new Date(endStr);
                  if (isNaN(endDate.getTime())) return null;
                  const pad = (n) => String(n).padStart(2, "0");
                  const period = endDate.getHours() >= 12 ? "pm" : "am";
                  const h12 = endDate.getHours() % 12 === 0 ? 12 : endDate.getHours() % 12;
                  return (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
                      ends at {h12}:{pad(endDate.getMinutes())}{period}
                    </div>
                  );
                })()}
              </Field>
            )}
          </>
        );
      })()}

      {event.type === "diaper" && (
        <Field C={C} label="Type">
          <SegControl C={C} value={diaperKind} onChange={setDiaperKind} options={[
            { v: "wet", l: "Wet" },
            { v: "dirty", l: "Dirty" },
            { v: "both", l: "Both" },
          ]} />
        </Field>
      )}

      {event.type === "breastfeed" && (
        <>
          <Field C={C} label="Left side (min)">
            <input
              type="number" inputMode="numeric" min="0" max="60"
              value={leftMin}
              onChange={e => setLeftMin(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
                borderRadius: 8, fontSize: 18, background: C.bg, color: C.ink,
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
              }}
            />
          </Field>
          <Field C={C} label="Right side (min)">
            <input
              type="number" inputMode="numeric" min="0" max="60"
              value={rightMin}
              onChange={e => setRightMin(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
                borderRadius: 8, fontSize: 18, background: C.bg, color: C.ink,
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
              }}
            />
          </Field>
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: -6, marginBottom: 12 }}>
            Total: {Number(leftMin) + Number(rightMin)} min
          </div>
        </>
      )}

      {event.type === "activity" && (
        <Field C={C} label="Duration (min)">
          <input
            type="number" inputMode="numeric" min="1" max="240"
            value={durationMin}
            onChange={e => setDurationMin(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
              borderRadius: 8, fontSize: 18, background: C.bg, color: C.ink,
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
            }}
          />
        </Field>
      )}

      {event.type === "takeover" && (
        <>
          <Field C={C} label="Coverage duration (min)">
            <input
              type="number" inputMode="numeric" min="1" max="480"
              value={durationMin}
              onChange={e => setDurationMin(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
                borderRadius: 8, fontSize: 18, background: C.bg, color: C.ink,
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 500,
              }}
            />
            <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>
              <strong>{event.coveringParent}</strong> covered <strong>{event.originalParent}</strong> for this many minutes. Editing this updates the time bank and today's plan automatically.
            </div>
          </Field>
        </>
      )}

      {(event.type === "sleep_down" || event.type === "sleep_up" || event.type === "bath" || event.type === "skincare") && (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginBottom: 12 }}>
          Only the time can be edited for this event type.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
        <button onClick={onDelete} style={{
          background: "transparent", color: C.accent,
          border: `1px solid ${C.accent}55`, borderRadius: 10,
          padding: 12, fontSize: 13, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}>
          <Trash2 size={13} /> Delete
        </button>
        <SubmitButton C={C} onClick={submit}>Save changes</SubmitButton>
      </div>
    </ModalShell>
  );
}

// ---- Day plan card -----------------------------------------------------
// Shows ONE day's coverage: the per-parent shift grid + auto-swap
// adjustments + commitments, all in one place. Used inside the unified
// "Day plan" section for both Today and Tomorrow.
//
// Props:
//   C          — palette
//   label      — "Today" or "Tomorrow" or any other day label
//   subLabel   — date string, e.g. "Tue, May 6"
//   defaultOpen — initial expand state (true for today, false for tomorrow)
//   shiftBlocks — { Mommy: [...], Daddy: [...] } projected for this day
//   daySwaps   — list of auto-swap adjustments for the day
//   commitments — meetings/commitments scheduled for the day
//   onRemoveCommitment — for tap-to-delete on commitments
//   onAddCommitment — only shown when this is "today" (you can add for any
//                    day really, but the affordance lives on today's card)
//   showAddButton — boolean, whether to show "Add commitment" button
//
// Visual hierarchy:
//   1. Day header with chevron (clickable to collapse/expand)
//   2. (When open) Shifts grid · auto-swap summary · commitments list · add button
function DayPlanCard({
  C, label, subLabel, defaultOpen,
  shiftBlocks, daySwaps, commitments,
  onRemoveCommitment, onAddCommitment, showAddButton,
  isToday,
  // Controlled-open mode: when controlledOpen + setControlledOpen are
  // provided, this component delegates open state to the parent. This
  // lets the peek strip toggle a specific day's card from outside.
  controlledOpen, setControlledOpen,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const totalCommits = commitments?.length || 0;
  const swapCount = daySwaps?.length || 0;
  const headerColor = isToday ? C.accent : C.mommy;

  return (
    <div id={isToday ? "dayplan-today" : "dayplan-tomorrow"} style={{
      background: C.paper,
      borderRadius: 12,
      border: `1px solid ${C.line}15`,
      borderLeft: `4px solid ${headerColor}`,
      marginBottom: 10,
      overflow: "hidden",
      scrollMarginTop: 80,
    }}>
      {/* Header — always visible. Tappable to expand/collapse. */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "12px 14px",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          display: "flex", alignItems: "center", gap: 10,
        }}>
        <ChevronRight
          size={14}
          color={C.muted}
          style={{
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 19, fontWeight: 600, fontStyle: "italic",
            color: headerColor, lineHeight: 1.1,
          }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            {subLabel}
          </div>
        </div>
        <div style={{
          display: "flex", gap: 6, alignItems: "center",
          fontSize: 11, color: C.muted,
        }}>
          {totalCommits > 0 && (
            <span style={{
              background: `${C.accent}18`, color: C.accent,
              padding: "2px 8px", borderRadius: 999,
              fontWeight: 600, fontSize: 10, letterSpacing: "0.04em",
            }}>
              {totalCommits} {totalCommits === 1 ? "commitment" : "commitments"}
            </span>
          )}
          {swapCount > 0 && (
            <span style={{
              background: `${C.gold}18`, color: C.gold,
              padding: "2px 8px", borderRadius: 999,
              fontWeight: 600, fontSize: 10, letterSpacing: "0.04em",
            }}>
              ↻ {swapCount}
            </span>
          )}
        </div>
      </button>

      {/* Body — only when open */}
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Per-parent shift grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {["Mommy", "Daddy"].map(parent => {
              const color = parent === "Mommy" ? C.mommy : C.daddy;
              const otherColor = parent === "Mommy" ? C.daddy : C.mommy;
              const blocks = shiftBlocks?.[parent] || [];
              return (
                <div key={parent} style={{
                  background: C.bg, borderRadius: 10, padding: 12,
                  border: `1px solid ${C.line}12`, borderTop: `2.5px solid ${color}`,
                }}>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 16, fontWeight: 500,
                    marginBottom: 6, color,
                  }}>
                    {parent}
                  </div>
                  {blocks.length === 0 ? (
                    <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>no shifts</div>
                  ) : blocks.map((s, i) => {
                    const isCovered = s._coveringFor;
                    const isConflict = s._conflict;
                    return (
                      <div key={i} style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        padding: "2px 0", color: C.ink,
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        {isCovered && <span style={{ color: otherColor, fontWeight: 600 }}>+</span>}
                        {isConflict && <span style={{ color: C.accent, fontWeight: 600 }}>!</span>}
                        <span>{fmtShiftRange(s)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Auto-swap summary — collapsed by default. Header shows just
              the count chip; tap to expand and see why each adjustment
              happened. The shifts grid above already has + indicators
              showing WHERE the changes are; this section answers WHY. */}
          {swapCount > 0 && (
            <details style={{
              background: `${C.accent}10`,
              border: `1px solid ${C.accent}30`,
              borderRadius: 8, marginBottom: 10,
              fontSize: 11, color: C.ink, lineHeight: 1.5,
            }}>
              <summary style={{
                padding: "6px 10px", cursor: "pointer", listStyle: "none",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                color: C.accent, fontWeight: 700,
              }}>
                <ChevronRight size={11} className={`autoswap-chevron-${label.toLowerCase()}`} style={{ transition: "transform 0.2s" }} />
                <span>↻ {swapCount} auto-adjustment{swapCount === 1 ? "" : "s"}</span>
                <span style={{ marginLeft: "auto", color: C.muted, fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", textTransform: "none", fontStyle: "italic" }}>
                  tap to see why
                </span>
              </summary>
              <style>{`details[open] .autoswap-chevron-${label.toLowerCase()} { transform: rotate(90deg); }`}</style>
              <div style={{ padding: "0 10px 8px" }}>
                {daySwaps.map((sw, i) => {
                  const cColor = sw.coveringParent === "Mommy" ? C.mommy : sw.coveringParent === "Daddy" ? C.daddy : C.muted;
                  const oColor = sw.originalParent === "Mommy" ? C.mommy : C.daddy;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0", flexWrap: "wrap" }}>
                      {sw.blocked ? (
                        <>
                          <span style={{ color: C.accent, fontWeight: 600 }}>!</span>
                          <span style={{ color: oColor, fontWeight: 600 }}>{sw.originalParent}</span>
                          <span style={{ color: C.muted }}>blocked at</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{fmtShiftRange(sw.shift)}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: cColor, fontWeight: 600 }}>+</span>
                          <span style={{ color: cColor, fontWeight: 600 }}>{sw.coveringParent}</span>
                          <span style={{ color: C.muted }}>covers</span>
                          <span style={{ color: oColor, fontWeight: 600 }}>{sw.originalParent}'s</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{fmtShiftRange(sw.shift)}</span>
                          {sw.reason && <span style={{ color: C.muted, fontStyle: "italic" }}>· {sw.reason}</span>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          {/* Commitments */}
          {totalCommits > 0 ? (
            <>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 6 }}>
                Commitments
              </div>
              <div style={{ display: "grid", gap: 6, marginBottom: showAddButton ? 10 : 0 }}>
                {commitments.map(m => (
                  <MeetingRow key={m.id} m={m} C={C} onRemove={() => onRemoveCommitment(m.id)} />
                ))}
              </div>
            </>
          ) : (
            <div style={{
              color: C.muted, fontSize: 11, fontStyle: "italic",
              textAlign: "center", padding: "6px 0",
              marginBottom: showAddButton ? 8 : 0,
            }}>
              No commitments {isToday ? "today" : "logged for this day"} yet.
            </div>
          )}

          {/* Add button — only shown when caller wants it */}
          {showAddButton && (
            <button onClick={onAddCommitment} style={{
              width: "100%",
              background: "transparent",
              color: C.accent,
              border: `1px dashed ${C.accent}55`,
              borderRadius: 8, padding: "8px 12px",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              fontFamily: "inherit",
            }}>
              <Plus size={12} /> Add commitment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Upcoming section --------------------------------------------------
// Collapsible list of commitments beyond tomorrow, with filter pills:
//   "All"        — everything beyond tomorrow
//   "Next 7"     — commitments in the next 7 days from now
//   "Next 30"    — commitments in the next 30 days from now
//   "Beyond"     — anything past 30 days
// Total count badge in header always shows total — filters scope the
// visible items but don't hide the bigger picture.
function UpcomingSection({ C, allFuture, sevenDaysOut, thirtyDaysOut, onRemoveMeeting, externalOpen, externalFilter, onExternalOpenHandled }) {
  const [filter, setFilter] = useState("all"); // "all" | "week" | "month" | "beyond"
  const detailsRef = useRef(null);

  // When the parent fires externalOpen (e.g. peek strip tap), open the
  // details element and (optionally) set the filter, then notify the parent
  // so it can clear its trigger flag.
  useEffect(() => {
    if (!externalOpen) return;
    if (detailsRef.current) detailsRef.current.open = true;
    if (externalFilter) setFilter(externalFilter);
    // Scroll the section into view
    if (detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onExternalOpenHandled && onExternalOpenHandled();
  }, [externalOpen, externalFilter, onExternalOpenHandled]);

  const filtered = useMemo(() => {
    if (filter === "all") return allFuture;
    if (filter === "week") return allFuture.filter(m => new Date(m.start) <= sevenDaysOut);
    if (filter === "month") return allFuture.filter(m => new Date(m.start) <= thirtyDaysOut);
    if (filter === "beyond") return allFuture.filter(m => new Date(m.start) > thirtyDaysOut);
    return allFuture;
  }, [allFuture, filter, sevenDaysOut, thirtyDaysOut]);

  // Group filtered items by date for date-section headings
  const sortedDateGroups = useMemo(() => {
    const byDate = {};
    for (const m of filtered) {
      const dt = new Date(m.start);
      const key = dt.toISOString().slice(0, 10);
      if (!byDate[key]) byDate[key] = { date: dt, items: [] };
      byDate[key].items.push(m);
    }
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Counts per filter for badge labels
  const counts = useMemo(() => ({
    all: allFuture.length,
    week: allFuture.filter(m => new Date(m.start) <= sevenDaysOut).length,
    month: allFuture.filter(m => new Date(m.start) <= thirtyDaysOut).length,
    beyond: allFuture.filter(m => new Date(m.start) > thirtyDaysOut).length,
  }), [allFuture, sevenDaysOut, thirtyDaysOut]);

  const FILTERS = [
    { v: "all",    l: "All" },
    { v: "week",   l: "Next 7d" },
    { v: "month",  l: "Next 30d" },
    { v: "beyond", l: "Beyond" },
  ];

  return (
    <details ref={detailsRef} id="upcoming-section" style={{
      background: C.paper, borderRadius: 12,
      border: `1px solid ${C.line}15`, marginTop: 14,
      overflow: "hidden",
      scrollMarginTop: 80,
    }}>
      <summary style={{
        padding: "12px 14px", cursor: "pointer",
        fontSize: 14, fontWeight: 600, color: C.ink,
        display: "flex", alignItems: "center", gap: 8,
        listStyle: "none",
      }}>
        <ChevronRight size={14} style={{ transition: "transform 0.2s" }} className="upcoming-chevron" />
        <span>Upcoming · {allFuture.length} commitment{allFuture.length === 1 ? "" : "s"}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted, fontWeight: 500 }}>
          next: {allFuture[0] && new Date(allFuture[0].start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </summary>
      <style>{`details[open] .upcoming-chevron { transform: rotate(90deg); }`}</style>
      <div style={{ padding: "0 14px 14px" }}>
        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, marginBottom: 12 }}>
          {FILTERS.map(f => {
            const active = filter === f.v;
            const count = counts[f.v];
            return (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                style={{
                  background: active ? C.accent : "transparent",
                  color: active ? "#fff" : C.ink,
                  border: `1px solid ${active ? C.accent : C.line + "40"}`,
                  borderRadius: 999, padding: "5px 11px",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                {f.l}
                <span style={{
                  fontSize: 10, opacity: active ? 0.85 : 0.6,
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtered date groups */}
        {sortedDateGroups.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
            Nothing in this window.
          </div>
        ) : sortedDateGroups.map(([key, { date, items }]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
              color: C.muted, fontWeight: 700, marginBottom: 6,
              paddingBottom: 4, borderBottom: `1px solid ${C.line}15`,
            }}>
              {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {items.map(m => (
                <MeetingRow key={m.id} m={m} C={C} onRemove={() => onRemoveMeeting(m.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function ShiftsView({ C, shifts, setShifts, meetings, setMeetings, now, onsite, setOnsite, activeShifts, swaps, tomorrowProjection, timeBank, setTimeBank, currentUser, pendingTimeBankAction, clearPendingTimeBankAction }) {
  const [showAdd, setShowAdd] = useState(false);
  // NOTE: Time Bank and on-site state used to live here. Time Bank is now
  // its own tab (BankView), and on-site lives in NowView. The
  // pendingTimeBankAction deep-link is handled at App level (forwarded to
  // BankView) — this view no longer reacts to it.

  // Day-plan open state hoisted to parent so the Next-7-days peek strip
  // can toggle it from outside. Both default to closed (low overload).
  const [todayOpen, setTodayOpen] = useState(false);
  const [tomorrowOpen, setTomorrowOpen] = useState(false);

  // Upcoming-section trigger from peek strip. When user taps a day 3+
  // ahead, we open the Upcoming details and (if we can) narrow the filter.
  const [upcomingTrigger, setUpcomingTrigger] = useState(null); // { open: bool, filter: "week"|"month"|null }

  const addMeeting = (m) => {
    const newMeeting = { ...m, id: crypto.randomUUID() };
    setMeetings(prev => {
      const next = [...prev, newMeeting];
      try {
        localStorage.setItem("solene:meetings", JSON.stringify(next));
        localStorage.setItem("solene:meetings:backup", JSON.stringify(prev));
      } catch (e) { console.warn("[addMeeting] sync persist failed", e); }
      return next;
    });
    setShowAdd(false);
  };
  const removeMeeting = (id) => setMeetings(prev => {
    const next = prev.filter(m => m.id !== id);
    try {
      localStorage.setItem("solene:meetings", JSON.stringify(next));
      localStorage.setItem("solene:meetings:backup", JSON.stringify(prev));
    } catch (e) { console.warn("[removeMeeting] sync persist failed", e); }
    return next;
  });
  const today = meetings.filter(m => new Date(m.start).toDateString() === now.toDateString());

  return (
    <div style={{ marginTop: 14 }}>
      <Section C={C} title="Base shift schedule">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {["Mommy", "Daddy"].map(parent => {
            const color = parent === "Mommy" ? C.mommy : C.daddy;
            // Show effective shifts (which may differ from base when onsite is active)
            const displayShifts = onsite ? activeShifts[parent] : shifts[parent];
            return (
              <div key={parent} style={{
                background: C.paper, borderRadius: 12, padding: 14,
                border: `1px solid ${C.line}15`, borderTop: `3px solid ${color}`,
              }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, marginBottom: 8, color }}>
                  {parent}
                  {onsite?.parent === parent && (
                    <span style={{ fontSize: 10, color: C.accent, marginLeft: 6, letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                      AWAY
                    </span>
                  )}
                </div>
                {displayShifts.length === 0 ? (
                  <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
                    no shifts (away)
                  </div>
                ) : displayShifts.map((s, i) => (
                  <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "3px 0", color: C.ink }}>
                    {fmtShiftRange(s)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {onsite && (
          <div style={{ marginTop: 8, fontSize: 11, color: C.muted, fontStyle: "italic", textAlign: "center" }}>
            ↑ shifts shown above include on-site coverage. base schedule resumes when you tap "I'm home."
          </div>
        )}
      </Section>

      {/* Day plan — unified Today + Tomorrow view. Each day shows shifts +
          auto-swap adjustments + commitments together so coverage and
          calendar are coupled. Both default to collapsed; tap headers to
          expand. The Next-7-days peek strip below provides the broader
          weekly context. */}
      <Section C={C} title="Day plan">
        {(() => {
          // ---- Today
          const todayLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
          const todayCommitments = today;

          // ---- Tomorrow
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dayAfter = new Date(tomorrow);
          dayAfter.setDate(dayAfter.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          dayAfter.setHours(0, 0, 0, 0);
          const tomorrowMeetings = (meetings || []).filter(m => {
            const t = new Date(m.start);
            return t >= tomorrow && t < dayAfter;
          });
          const tomorrowLabel = tomorrow.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
          const tomProj = tomorrowProjection?.projected || { Mommy: shifts.Mommy || [], Daddy: shifts.Daddy || [] };
          const tomSwaps = tomorrowProjection?.swaps || [];

          return (
            <>
              <DayPlanCard
                C={C}
                label="Today"
                subLabel={todayLabel}
                shiftBlocks={activeShifts}
                daySwaps={swaps || []}
                commitments={todayCommitments}
                onRemoveCommitment={removeMeeting}
                onAddCommitment={() => setShowAdd(true)}
                showAddButton={true}
                isToday={true}
                controlledOpen={todayOpen}
                setControlledOpen={setTodayOpen}
              />
              <DayPlanCard
                C={C}
                label="Tomorrow"
                subLabel={tomorrowLabel}
                shiftBlocks={tomProj}
                daySwaps={tomSwaps}
                commitments={tomorrowMeetings}
                onRemoveCommitment={removeMeeting}
                onAddCommitment={() => setShowAdd(true)}
                showAddButton={true}
                isToday={false}
                controlledOpen={tomorrowOpen}
                setControlledOpen={setTomorrowOpen}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted, fontStyle: "italic", textAlign: "center" }}>
                meetings, appointments, hair, friends — anything that takes you off duty
              </div>
            </>
          );
        })()}
      </Section>

      {/* Future peek — horizontal strip of the next 7 days. Each compact
          card summarizes the day at a glance: weekday, date, count of
          commitments, count of auto-adjustments. Tap behavior:
            • Today → expands the Today card in Day plan above and scrolls to it
            • Tomorrow → same for Tomorrow
            • Days 2-6 ahead → opens the Upcoming section below with a filter
              scoped to the week or month (whichever fits).
          Today's card is highlighted in coral. */}
      {(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          d.setHours(0, 0, 0, 0);
          const dEnd = new Date(d);
          dEnd.setDate(dEnd.getDate() + 1);
          const dayMeetings = (meetings || []).filter(m => {
            const t = new Date(m.start);
            return t >= d && t < dEnd;
          });
          let swapCount = 0;
          if (i === 0) swapCount = (swaps || []).length;
          else if (i === 1) swapCount = (tomorrowProjection?.swaps || []).length;
          const giftCount = dayMeetings.filter(m => (m.label || "").startsWith("🎁")).length;
          days.push({ date: d, meetings: dayMeetings, swapCount, giftCount, isToday: i === 0, daysAhead: i });
        }

        const handleTap = (d) => {
          if (d.daysAhead === 0) {
            setTodayOpen(true);
            setTimeout(() => {
              const el = document.getElementById("dayplan-today");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          } else if (d.daysAhead === 1) {
            setTomorrowOpen(true);
            setTimeout(() => {
              const el = document.getElementById("dayplan-tomorrow");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          } else {
            // Open Upcoming with appropriate filter
            const filter = d.daysAhead <= 7 ? "week" : "month";
            setUpcomingTrigger({ open: true, filter });
          }
        };

        return (
          <Section C={C} title="Next 7 days">
            <div style={{
              display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6,
              scrollbarWidth: "thin",
            }}>
              {days.map((d, i) => {
                const isToday = d.isToday;
                const isTomorrow = i === 1;
                const count = d.meetings.length;
                const hasGifts = d.giftCount > 0;
                const hasSwaps = d.swapCount > 0;
                const dim = count === 0 && !hasSwaps;
                return (
                  <button
                    key={i}
                    onClick={() => handleTap(d)}
                    style={{
                      flex: "0 0 auto",
                      minWidth: 76,
                      background: isToday ? `${C.accent}15` : C.paper,
                      border: `1px solid ${isToday ? C.accent + "55" : C.line + "20"}`,
                      borderRadius: 12, padding: "10px 8px",
                      textAlign: "center",
                      opacity: dim ? 0.7 : 1,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "transform 0.1s, box-shadow 0.15s",
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <div style={{
                      fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                      color: isToday ? C.accent : C.muted, fontWeight: 700,
                    }}>
                      {isToday ? "Today" : isTomorrow ? "Tom." : d.date.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 24, fontWeight: 500, fontStyle: "italic",
                      color: isToday ? C.accent : C.ink, lineHeight: 1.05,
                      marginTop: 1,
                    }}>
                      {d.date.getDate()}
                    </div>
                    <div style={{
                      fontSize: 9, color: C.muted,
                      fontFamily: "'JetBrains Mono', monospace",
                      marginTop: 2,
                    }}>
                      {d.date.toLocaleDateString(undefined, { month: "short" }).toLowerCase()}
                    </div>
                    <div style={{
                      marginTop: 6, paddingTop: 6,
                      borderTop: `1px solid ${C.line}15`,
                      display: "flex", flexDirection: "column", gap: 2,
                      minHeight: 28,
                    }}>
                      {count === 0 && !hasSwaps ? (
                        <div style={{ fontSize: 9, color: C.muted, fontStyle: "italic" }}>—</div>
                      ) : (
                        <>
                          {count > 0 && (
                            <div style={{
                              fontSize: 10, color: C.accent, fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                            }}>
                              {hasGifts && <span style={{ fontSize: 9 }}>🎁</span>}
                              {count}{count === 1 ? " mtg" : " mtgs"}
                            </div>
                          )}
                          {hasSwaps && (
                            <div style={{
                              fontSize: 9, color: C.gold, fontWeight: 600,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              ↻ {d.swapCount}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>
              tap a day to jump to its details
            </div>
          </Section>
        );
      })()}

      {/* Upcoming — anything beyond tomorrow. Collapsible because it can grow
          long once recurring commitments accumulate. Groups by date so
          scanning is easier than a flat list. Includes filter pills for
          quick narrowing: Day-after / This week / This month / All. Filters
          act on the visible groups; the count badge in the header still
          shows the TOTAL future count so you can see at a glance whether
          things are falling outside the current filter. */}
      {(() => {
        const dayAfterTomorrow = new Date(now);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        dayAfterTomorrow.setHours(0, 0, 0, 0);
        const allFuture = (meetings || [])
          .filter(m => new Date(m.start) >= dayAfterTomorrow)
          .sort((a, b) => new Date(a.start) - new Date(b.start));
        if (allFuture.length === 0) return null;

        // Filter cutoffs (relative to now)
        const sevenDaysOut = new Date(now); sevenDaysOut.setDate(sevenDaysOut.getDate() + 7); sevenDaysOut.setHours(23, 59, 59, 999);
        const thirtyDaysOut = new Date(now); thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30); thirtyDaysOut.setHours(23, 59, 59, 999);

        return (
          <UpcomingSection
            C={C}
            allFuture={allFuture}
            sevenDaysOut={sevenDaysOut}
            thirtyDaysOut={thirtyDaysOut}
            onRemoveMeeting={removeMeeting}
            externalOpen={upcomingTrigger?.open}
            externalFilter={upcomingTrigger?.filter}
            onExternalOpenHandled={() => setUpcomingTrigger(null)}
          />
        );
      })()}

      {showAdd && <AddMeetingModal C={C} onClose={() => setShowAdd(false)} onSubmit={addMeeting} currentUser={currentUser} />}
    </div>
  );
}

function DiffCard({ C, swaps, shifts, activeShifts }) {
  // Show side-by-side base vs effective for each parent, with arrows on swapped blocks
  const swappedKeySet = new Set(swaps.map(s => `${s.originalParent}|${s.shift.start}-${s.shift.end}`));

  return (
    <div style={{ background: C.paper, borderRadius: 12, padding: 14, border: `1px solid ${C.line}15` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {["Mommy", "Daddy"].map(parent => {
          const color = parent === "Mommy" ? C.mommy : C.daddy;
          const baseList = shifts[parent];
          const liveList = activeShifts[parent];
          // Build a unified list of {shift, status} based on what's in base vs live
          const liveSet = new Set(liveList.map(s => `${s.start}-${s.end}`));
          const baseSet = new Set(baseList.map(s => `${s.start}-${s.end}`));
          const all = [...baseList, ...liveList.filter(s => !baseSet.has(`${s.start}-${s.end}`))]
            .sort((a, b) => toMin(a.start) - toMin(b.start));

          return (
            <div key={parent} style={{ borderTop: `3px solid ${color}`, paddingTop: 8 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color, marginBottom: 6 }}>
                {parent}
              </div>
              {all.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>—</div>
              ) : all.map((s, i) => {
                const inBase = baseSet.has(`${s.start}-${s.end}`);
                const inLive = liveSet.has(`${s.start}-${s.end}`);
                const lostFromBase = inBase && !inLive; // they're losing this shift
                const gainedNow = !inBase && inLive;    // they're picking this up
                return (
                  <div key={i} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    padding: "2px 0",
                    color: lostFromBase ? C.muted : C.ink,
                    textDecoration: lostFromBase ? "line-through" : "none",
                    fontWeight: gainedNow ? 600 : 400,
                  }}>
                    {gainedNow && "+ "}{lostFromBase && "− "}{fmtShiftRange(s)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, padding: "8px 10px", background: C.bg, borderRadius: 8, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
        <strong style={{ color: C.ink }}>+ added</strong> = picking up to cover · <strong style={{ color: C.ink, textDecoration: "line-through" }}>removed</strong> = covered by partner
      </div>
    </div>
  );
}

// ---- Time Bank --------------------------------------------------------
// Convention: balance > 0 means Mommy owes Daddy (Daddy gave Mommy time).
//             balance < 0 means Daddy owes Mommy.
function fmtBalance(mins) {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function TimeBankCard({ C, timeBank, onOpen, currentUser, onRedeem }) {
  const balance = timeBank.balance || 0;
  // Breakdown by transaction kind, FROM currentUser's perspective.
  // Gifts and debts both contribute to balance the same way (per the
  // computeTimeBankBalance logic), but for breakdown display we want to
  // show them separately so the user sees what's accumulating where:
  //   - gifts directed AT currentUser show as positive (received)
  //   - debts owed BY currentUser show as negative
  // This mirrors the "+ and -" mental model the user asked for.
  const breakdown = useMemo(() => {
    let giftsReceived = 0;  // gifts where currentUser is the recipient
    let giftsGiven = 0;     // gifts where currentUser is the giver
    let debtsOwedToYou = 0; // owed where currentUser is owed (i.e. partner covered for them)
    let debtsYouOwe = 0;    // owed where currentUser owes
    let payback = 0;        // either direction
    for (const tx of (timeBank.transactions || [])) {
      const m = tx.mins || 0;
      if (tx.kind === "gift") {
        if (tx.to === currentUser) giftsReceived += m;
        else if (tx.from === currentUser) giftsGiven += m;
      } else if (tx.kind === "owed") {
        if (tx.to === currentUser) debtsYouOwe += m;       // partner covered for you → you owe them
        else if (tx.from === currentUser) debtsOwedToYou += m; // you covered for partner → they owe you
      } else if (tx.kind === "paid") {
        payback += m;
      }
    }
    return { giftsReceived, giftsGiven, debtsOwedToYou, debtsYouOwe, payback };
  }, [timeBank.transactions, currentUser]);

  // From currentUser's POV:
  //   if balance > 0: Mommy owes Daddy.
  //     - if currentUser=Mommy → "You owe Daddy"
  //     - if currentUser=Daddy → "Mommy owes you"
  //   if balance < 0: Daddy owes Mommy.
  //     - if currentUser=Daddy → "You owe Mommy"
  //     - if currentUser=Mommy → "Daddy owes you"
  const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
  const partnerColor = currentUser === "Mommy" ? C.daddy : C.mommy;
  const youColor = currentUser === "Mommy" ? C.mommy : C.daddy;

  let directionLabel, primaryColor, youOwe;
  if (balance === 0) {
    directionLabel = "All square";
    primaryColor = C.ink;
    youOwe = null;
  } else if (
    (balance > 0 && currentUser === "Mommy") ||
    (balance < 0 && currentUser === "Daddy")
  ) {
    // currentUser owes partner
    directionLabel = `You owe ${partner}`;
    primaryColor = partnerColor;
    youOwe = true;
  } else {
    // partner owes currentUser → time to spend!
    directionLabel = `${partner} owes you`;
    primaryColor = youColor;
    youOwe = false;
  }

  // Total +/- shown in the breakdown strip.
  // From your view: +gifts received, -gifts given, +debts owed to you, -debts you owe.
  const positiveTotal = breakdown.giftsReceived + breakdown.debtsOwedToYou;
  const negativeTotal = breakdown.giftsGiven + breakdown.debtsYouOwe;
  const hasAny = (timeBank.transactions || []).length > 0;

  return (
    <div style={{
      background: balance === 0
        ? C.paper
        : `linear-gradient(135deg, ${primaryColor}22, ${C.paper})`,
      border: `1px solid ${C.line}15`,
      borderLeft: balance === 0 ? `1px solid ${C.line}15` : `4px solid ${primaryColor}`,
      borderRadius: 12, padding: 16,
    }}>
      <div onClick={onOpen} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Time bank · {directionLabel}
          </div>
          <div style={{ marginTop: 4 }}>
            {balance === 0 ? (
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500, fontStyle: "italic", color: C.ink }}>
                no debts
              </span>
            ) : (
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 500, color: primaryColor, lineHeight: 1 }}>
                {fmtBalance(balance)}
              </span>
            )}
          </div>
          {/* Breakdown strip — from current user's perspective.
              Plus side = gifts received + debts owed to you (both move balance toward you).
              Minus side = gifts given + debts you owe (both move balance away from you).
              Hidden when there are no transactions. */}
          {hasAny && (positiveTotal > 0 || negativeTotal > 0) && (
            <div style={{
              marginTop: 10, display: "flex", alignItems: "center", gap: 12,
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            }}>
              {positiveTotal > 0 && (
                <span style={{ color: "#4F6E4D", fontWeight: 600 }}>
                  +{fmtBalance(positiveTotal)}
                  <span style={{ color: C.muted, fontWeight: 400, marginLeft: 4 }}>received</span>
                </span>
              )}
              {negativeTotal > 0 && (
                <span style={{ color: C.accent, fontWeight: 600 }}>
                  −{fmtBalance(negativeTotal)}
                  <span style={{ color: C.muted, fontWeight: 400, marginLeft: 4 }}>given</span>
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            {timeBank.transactions.length === 0
              ? "tap to log a swap, gift, or payback"
              : `${timeBank.transactions.length} transaction${timeBank.transactions.length === 1 ? "" : "s"} · tap for history`}
          </div>
        </div>
        <ChevronRight size={18} color={C.muted} />
      </div>

      {/* Redeem button — only show if partner owes currentUser */}
      {youOwe === false && Math.abs(balance) >= 30 && (
        <button onClick={onRedeem} style={{
          marginTop: 12, width: "100%",
          background: youColor, color: "#fff", border: "none",
          padding: "10px 14px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Gift size={14} /> Cash in: have {partner} cover a shift
        </button>
      )}
    </div>
  );
}

function TimeBankModal({ C, timeBank, setTimeBank, initialMode, onClose }) {
  // initialMode is "gift" | "payback" | null. Maps to TimeBankAddForm's
  // initial 'kind' state: gift → 'gift', payback → 'paid'.
  const [tab, setTab] = useState("add"); // 'add' | 'history'
  const initialKind = initialMode === "gift" ? "gift" : initialMode === "payback" ? "paid" : null;
  // Confirmation banner: after saving a transaction we briefly show a
  // success message so the user sees the action took effect (especially
  // important for gifts, which don't visibly change the balance number).
  const [lastSaved, setLastSaved] = useState(null); // { kind, mins, to } | null

  const recordTransaction = (tx) => {
    const newTx = { ...tx, id: crypto.randomUUID(), ts: new Date().toISOString() };
    const newTransactions = [...timeBank.transactions, newTx];
    // Always derive balance from the full ledger — no cached-balance drift.
    setTimeBank({
      balance: computeTimeBankBalance(newTransactions),
      transactions: newTransactions,
    });
    // Show a 4s confirmation. Capture the new tx's id in the toast so the
    // auto-clear setTimeout only clears THIS toast (not a newer one if the
    // user records a second transaction within 4 seconds).
    setLastSaved({ id: newTx.id, kind: tx.kind, mins: tx.mins, to: tx.to, from: tx.from });
    setTimeout(() => setLastSaved(prev => prev && prev.id === newTx.id ? null : prev), 4000);
  };

  const removeTransaction = (id) => {
    const newTransactions = timeBank.transactions.filter(t => t.id !== id);
    setTimeBank({
      balance: computeTimeBankBalance(newTransactions),
      transactions: newTransactions,
    });
  };

  const settleAll = () => {
    if (!confirm("Wipe the slate clean — set balance to zero and clear history?")) return;
    setTimeBank({ balance: 0, transactions: [] });
  };

  // Detect drift between stored balance and ledger-derived balance.
  // Should always be 0 with the new logic, but if a legacy entry had a
  // calculation bug, this surfaces it for the user with a "Recompute" button.
  const ledgerBalance = computeTimeBankBalance(timeBank.transactions);
  const storedBalance = timeBank.balance || 0;
  const driftDetected = ledgerBalance !== storedBalance;
  const recomputeBalance = () => {
    setTimeBank({
      balance: ledgerBalance,
      transactions: timeBank.transactions,
    });
  };

  return (
    <ModalShell C={C} onClose={onClose} title="Time Bank">
      {driftDetected && (
        <div style={{
          background: `${C.accent}10`,
          border: `1px solid ${C.accent}40`,
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 12,
          fontSize: 12, color: C.ink, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600, color: C.accent, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={13} /> Balance doesn't match the history
          </div>
          <div style={{ marginBottom: 8 }}>
            Stored: <strong>{fmtBalance(Math.abs(storedBalance))}</strong> {storedBalance > 0 ? "(Mommy → Daddy)" : storedBalance < 0 ? "(Daddy → Mommy)" : "(zero)"} ·{" "}
            From history: <strong>{fmtBalance(Math.abs(ledgerBalance))}</strong> {ledgerBalance > 0 ? "(Mommy → Daddy)" : ledgerBalance < 0 ? "(Daddy → Mommy)" : "(zero)"}
          </div>
          <button onClick={recomputeBalance} style={{
            background: C.accent, color: "#fff", border: "none",
            borderRadius: 8, padding: "6px 12px",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Recompute from history
          </button>
        </div>
      )}
      {lastSaved && (
        <div style={{
          background: "#5C8E5C12",
          border: "1px solid #5C8E5C55",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 12,
          fontSize: 13, color: "#3D6B3D", lineHeight: 1.5,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={14} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Saved.</strong>{" "}
            {lastSaved.kind === "gift"
              ? <>Gift of <strong>{fmtBalance(lastSaved.mins)}</strong> for <strong>{lastSaved.to}</strong> is now pending — they'll see it on their Now page and choose when to redeem.</>
              : lastSaved.kind === "paid"
              ? <>Payback of <strong>{fmtBalance(lastSaved.mins)}</strong> from {lastSaved.from} → {lastSaved.to} recorded. Balance updated.</>
              : <>Debt of <strong>{fmtBalance(lastSaved.mins)}</strong> recorded. {lastSaved.to} owes {lastSaved.from}.</>
            }
          </div>
        </div>
      )}
      <SegControl C={C} value={tab} onChange={setTab} options={[
        { v: "add", l: "Record" },
        { v: "history", l: `History (${timeBank.transactions.length})` },
      ]} />

      <div style={{ marginTop: 14 }}>
        {tab === "add" ? (
          <TimeBankAddForm C={C} onSubmit={recordTransaction} balance={timeBank.balance || 0} initialKind={initialKind} />
        ) : (
          <TimeBankHistory C={C} transactions={timeBank.transactions} onRemove={removeTransaction} onSettleAll={settleAll} />
        )}
      </div>
    </ModalShell>
  );
}

function TimeBankAddForm({ C, onSubmit, balance, initialKind, initialTx }) {
  // Edit mode: when initialTx is provided, pre-fill all fields. The submit
  // label changes to "Save changes" and the parent's onSubmit callback
  // gets the same shape — but it's the parent's job to replace the tx
  // (rather than append) when initialTx was passed.
  const isEdit = !!initialTx;
  const [kind, setKind] = useState(initialTx?.kind || initialKind || "owed");
  const [from, setFrom] = useState(initialTx?.from || "Daddy");
  const [to, setTo] = useState(initialTx?.to || "Mommy");
  const [mins, setMins] = useState(initialTx?.mins || 60);
  const [reason, setReason] = useState(initialTx?.reason || "");

  // Quick reason chips
  const REASONS = {
    owed: ["Took my shift while I napped", "Covered an extra hour", "Handled bedtime", "Took early morning"],
    gift: ["Sleep in", "Self-care time", "Hobby time", "Gym session"],
    paid: ["Covered overnight", "Took weekend morning", "Handled bath + bed", "Extra shift today"],
  };

  const fromColor = from === "Mommy" ? C.mommy : C.daddy;
  const toColor = to === "Mommy" ? C.mommy : C.daddy;

  const swapDirection = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <>
      <Field C={C} label="What kind?">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[
            { v: "owed", l: "Owed", emoji: "⏰", desc: "covered my shift" },
            { v: "gift", l: "Gift", emoji: "🎁", desc: "no payback" },
            { v: "paid", l: "Paid back", emoji: "✓", desc: "settling up" },
          ].map(o => (
            <button key={o.v} onClick={() => setKind(o.v)} style={{
              background: kind === o.v ? C.accent : C.bg,
              color: kind === o.v ? "#fff" : C.ink,
              border: `1.5px solid ${kind === o.v ? C.accent : C.line + "22"}`,
              borderRadius: 10, padding: "10px 6px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontSize: 18 }}>{o.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{o.l}</span>
              <span style={{ fontSize: 9, opacity: 0.85 }}>{o.desc}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field C={C} label={
        kind === "owed" ? "Who covered for whom?"
        : kind === "gift" ? "Who's giving the gift?"
        : "Who's paying back?"
      }>
        <div style={{
          background: `${C.line}08`, borderRadius: 12, padding: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
              {kind === "owed" ? "Covered" : kind === "gift" ? "From" : "From"}
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 500,
              color: fromColor, marginTop: 2,
            }}>
              {from}
            </div>
          </div>
          <button onClick={swapDirection} style={{
            background: C.paper, color: C.ink, border: `1px solid ${C.line}33`,
            borderRadius: "50%", width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ArrowRightLeft size={14} />
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
              {kind === "owed" ? "For" : kind === "gift" ? "To" : "To"}
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 500,
              color: toColor, marginTop: 2,
            }}>
              {to}
            </div>
          </div>
        </div>
      </Field>

      <Field C={C} label="How much time?">
        <BigNumberPicker C={C} value={mins} onChange={setMins} step={15} presets={[15, 30, 60, 90, 120, 180]} unit="MINUTES" />
      </Field>

      <Field C={C} label="Reason (optional)">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
          {REASONS[kind].map(r => (
            <button key={r} onClick={() => setReason(r)} style={{
              background: reason === r ? C.ink : "transparent",
              color: reason === r ? C.paper : C.ink,
              border: `1px solid ${C.line}33`, borderRadius: 14,
              padding: "4px 10px", fontSize: 11, cursor: "pointer",
            }}>
              {r}
            </button>
          ))}
        </div>
        <TextInput C={C} value={reason} onChange={setReason} placeholder="or write your own…" />
      </Field>

      {/* Preview */}
      <div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
        <strong style={{ color: C.ink }}>Preview:</strong>{" "}
        {kind === "owed" && <span><span style={{ color: fromColor, fontWeight: 600 }}>{from}</span> covered {fmtBalance(mins)} for <span style={{ color: toColor, fontWeight: 600 }}>{to}</span> → {to} owes {from} {fmtBalance(mins)}.</span>}
        {kind === "gift" && <span><span style={{ color: fromColor, fontWeight: 600 }}>{from}</span> gifts {fmtBalance(mins)} to <span style={{ color: toColor, fontWeight: 600 }}>{to}</span> · {to} chooses when to redeem.</span>}
        {kind === "paid" && <span><span style={{ color: fromColor, fontWeight: 600 }}>{from}</span> pays back {fmtBalance(mins)} to <span style={{ color: toColor, fontWeight: 600 }}>{to}</span> · debt reduced.</span>}
      </div>

      <SubmitButton C={C} onClick={() => onSubmit({ kind, from, to, mins: Number(mins), reason: reason.trim() })}>
        {isEdit ? "Save changes" : kind === "owed" ? "Log debt" : kind === "gift" ? "Log gift" : "Log payback"}
      </SubmitButton>
    </>
  );
}

function TimeBankHistory({ C, transactions, onRemove, onSettleAll }) {
  if (transactions.length === 0) {
    return (
      <div style={{ background: C.paper, borderRadius: 12, padding: 24, border: `1px solid ${C.line}15`, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic" }}>No transactions yet.</div>
      </div>
    );
  }
  const sorted = [...transactions].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return (
    <>
      <div style={{ display: "grid", gap: 6, maxHeight: 400, overflowY: "auto" }}>
        {sorted.map(tx => {
          const fromColor = tx.from === "Mommy" ? C.mommy : C.daddy;
          const toColor = tx.to === "Mommy" ? C.mommy : C.daddy;
          const emoji = tx.kind === "owed" ? "⏰" : tx.kind === "gift" ? "🎁" : "✓";
          return (
            <div key={tx.id} style={{
              background: C.paper, borderRadius: 10, padding: "10px 12px",
              border: `1px solid ${C.line}15`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.ink, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>
                    <span style={{ color: fromColor, fontWeight: 600 }}>{tx.from}</span>
                    {tx.kind === "owed" && " covered "}
                    {tx.kind === "gift" && " gifted "}
                    {tx.kind === "paid" && " paid back "}
                    <strong>{fmtBalance(tx.mins)}</strong>
                    {" "}{tx.kind === "owed" ? "for" : "to"}{" "}
                    <span style={{ color: toColor, fontWeight: 600 }}>{tx.to}</span>
                  </span>
                  {tx.kind === "gift" && (
                    tx.redeemed ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                        background: "#5C8E5C20", color: "#3D6B3D",
                        padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
                      }}>✓ Redeemed</span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                        background: `${C.gold}25`, color: "#7A5A00",
                        padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
                      }}>Pending</span>
                    )
                  )}
                </div>
                {tx.reason && (
                  <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 2 }}>
                    {tx.reason}
                  </div>
                )}
                {tx.redeemed && (
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    redeemed {new Date(tx.redeemed.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · used {fmtTimeShort(new Date(tx.redeemed.blockStart))}
                  </div>
                )}
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {new Date(tx.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {fmtTimeShort(new Date(tx.ts))}
                </div>
              </div>
              <button onClick={() => onRemove(tx.id)} style={{
                background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 4, opacity: 0.5,
              }}>
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onSettleAll} style={{
        marginTop: 14, width: "100%",
        background: "transparent", color: C.muted, border: `1px dashed ${C.line}33`, borderRadius: 10,
        padding: 10, fontSize: 12, cursor: "pointer",
      }}>
        Wipe slate clean (zero everything)
      </button>
    </>
  );
}

// Redeem modal: cash in owed time as a shift cover by partner
function RedeemModal({ C, timeBank, setTimeBank, setMeetings, currentUser, now, onClose }) {
  const balance = timeBank.balance || 0;
  const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
  const partnerColor = currentUser === "Mommy" ? C.daddy : C.mommy;
  // Owed minutes available to currentUser (positive number)
  const owedToYou = (currentUser === "Mommy" && balance < 0) || (currentUser === "Daddy" && balance > 0)
    ? Math.abs(balance) : 0;

  const [mins, setMins] = useState(Math.min(owedToYou, 120));
  const [whenChoice, setWhenChoice] = useState("now"); // 'now' | 'pick'
  const [pickedDateTime, setPickedDateTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  });
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    const startTime = whenChoice === "now" ? new Date(now) : new Date(pickedDateTime);
    const endTime = new Date(startTime.getTime() + mins * 60000);
    // Create a red commitment for currentUser → projection auto-swaps to partner covering
    const newMeeting = {
      id: crypto.randomUUID(),
      parent: currentUser,
      level: "red",
      label: `Time bank: ${reason || "cashed in"}${reason ? "" : " owed time"}`,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    };
    setMeetings(prev => {
      const next = [...prev, newMeeting];
      try {
        localStorage.setItem("solene:meetings", JSON.stringify(next));
        localStorage.setItem("solene:meetings:backup", JSON.stringify(prev));
      } catch (e) { console.warn("[redeem addMeeting] sync persist failed", e); }
      return next;
    });
    // Record the payback transaction (partner is "paying" currentUser their owed time)
    const newTx = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: "paid",
      from: partner,
      to: currentUser,
      mins,
      reason: `Cashed in ${reason || "owed time"}`,
    };
    const newTransactions = [...timeBank.transactions, newTx];
    setTimeBank({
      balance: computeTimeBankBalance(newTransactions),
      transactions: newTransactions,
    });
    onClose();
  };

  return (
    <ModalShell C={C} onClose={onClose} title="Cash in owed time">
      <div style={{
        background: `${partnerColor}15`, borderRadius: 10, padding: 12, marginBottom: 14,
        border: `1px solid ${partnerColor}33`, fontSize: 13, color: C.ink, lineHeight: 1.5,
      }}>
        <strong style={{ color: partnerColor }}>{partner}</strong> owes you{" "}
        <strong>{fmtBalance(owedToYou)}</strong>. Pick how much to redeem and when —
        the shift will auto-flip to {partner} covering for you, and the debt reduces.
      </div>

      <Field C={C} label="How much time?">
        <BigNumberPicker C={C} value={mins} onChange={setMins} step={15}
          presets={[30, 60, 90, 120, 180, 240].filter(p => p <= owedToYou)}
          unit="MINUTES" />
        {mins > owedToYou && (
          <div style={{ fontSize: 11, color: C.accent, marginTop: 4 }}>
            ⚠ exceeds owed balance — the rest will become a new debt
          </div>
        )}
      </Field>

      <Field C={C} label="When?">
        <SegControl C={C} value={whenChoice} onChange={setWhenChoice} options={[
          { v: "now", l: "Right now" },
          { v: "pick", l: "Pick a time" },
        ]} />
        {whenChoice === "pick" && (
          <div style={{ marginTop: 8 }}>
            <DateTimeInput C={C} value={pickedDateTime} onChange={setPickedDateTime} />
          </div>
        )}
      </Field>

      <Field C={C} label="What for? (optional)">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
          {["Nap", "Self-care", "Workout", "Shower", "Hobby time", "Just need a break"].map(r => (
            <button key={r} onClick={() => setReason(r)} style={{
              background: reason === r ? C.ink : "transparent",
              color: reason === r ? C.paper : C.ink,
              border: `1px solid ${C.line}33`, borderRadius: 14,
              padding: "4px 10px", fontSize: 11, cursor: "pointer",
            }}>
              {r}
            </button>
          ))}
        </div>
        <TextInput C={C} value={reason} onChange={setReason} placeholder="or write your own…" />
      </Field>

      <SubmitButton C={C} onClick={handleSubmit}>
        Redeem {fmtBalance(mins)} — {partner} covers
      </SubmitButton>
    </ModalShell>
  );
}

// ---- BankView ----------------------------------------------------------
// Standalone tab for time bank management. Acts like a real bank app —
// balance hero card at top, quick action buttons below, transaction
// ledger with filter pills, drill-down on each transaction.
//
// Lives separate from Schedule because time-bank accounting is its own
// mental model: credits / debits / gifts that flow between two parents.
// Mixing it with shift scheduling made both feel cluttered.
function BankView({ C, timeBank, setTimeBank, setMeetings, now, currentUser, pendingTimeBankAction, clearPendingTimeBankAction }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInitialMode, setAddInitialMode] = useState(null); // "owed" | "gift" | "paid" | null
  const [editingTx, setEditingTx] = useState(null); // tx being edited; when set, shows the form pre-filled
  const [showRedeem, setShowRedeem] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "gifts" | "debts" | "paybacks"

  // Honor deep-link pending action (e.g. from LOG sheet pills)
  useEffect(() => {
    if (!pendingTimeBankAction) return;
    setAddInitialMode(pendingTimeBankAction === "gift" ? "gift" : "paid");
    setShowAddModal(true);
    clearPendingTimeBankAction && clearPendingTimeBankAction();
  }, [pendingTimeBankAction, clearPendingTimeBankAction]);

  const balance = timeBank.balance || 0;
  const transactions = timeBank.transactions || [];
  const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
  const partnerColor = currentUser === "Mommy" ? C.daddy : C.mommy;
  const youColor = currentUser === "Mommy" ? C.mommy : C.daddy;

  // From currentUser's POV — direction language matches the modal
  let directionLabel, primaryColor, youOwe;
  if (balance === 0) {
    directionLabel = "All square";
    primaryColor = C.ink;
    youOwe = null;
  } else if (
    (balance > 0 && currentUser === "Mommy") ||
    (balance < 0 && currentUser === "Daddy")
  ) {
    directionLabel = `You owe ${partner}`;
    primaryColor = partnerColor;
    youOwe = true;
  } else {
    directionLabel = `${partner} owes you`;
    primaryColor = youColor;
    youOwe = false;
  }

  // Breakdown for the +/- summary
  const breakdown = useMemo(() => {
    let giftsReceived = 0, giftsGiven = 0, debtsOwedToYou = 0, debtsYouOwe = 0, payback = 0;
    for (const tx of transactions) {
      const m = tx.mins || 0;
      if (tx.kind === "gift") {
        if (tx.to === currentUser) giftsReceived += m;
        else if (tx.from === currentUser) giftsGiven += m;
      } else if (tx.kind === "owed") {
        if (tx.to === currentUser) debtsYouOwe += m;
        else if (tx.from === currentUser) debtsOwedToYou += m;
      } else if (tx.kind === "paid") {
        payback += m;
      }
    }
    return { giftsReceived, giftsGiven, debtsOwedToYou, debtsYouOwe, payback };
  }, [transactions, currentUser]);

  const positiveTotal = breakdown.giftsReceived + breakdown.debtsOwedToYou;
  const negativeTotal = breakdown.giftsGiven + breakdown.debtsYouOwe;

  // Filter transactions for the ledger
  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filter === "gifts") result = result.filter(t => t.kind === "gift");
    else if (filter === "debts") result = result.filter(t => t.kind === "owed");
    else if (filter === "paybacks") result = result.filter(t => t.kind === "paid");
    return result.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [transactions, filter]);

  const counts = useMemo(() => ({
    all: transactions.length,
    gifts: transactions.filter(t => t.kind === "gift").length,
    debts: transactions.filter(t => t.kind === "owed").length,
    paybacks: transactions.filter(t => t.kind === "paid").length,
  }), [transactions]);

  // Drift detection — for the recompute button
  const ledgerBalance = computeTimeBankBalance(transactions);
  const driftDetected = ledgerBalance !== balance;
  const recomputeBalance = () => {
    setTimeBank({ balance: ledgerBalance, transactions });
  };

  const removeTransaction = (id) => {
    const newTransactions = transactions.filter(t => t.id !== id);
    setTimeBank({ balance: computeTimeBankBalance(newTransactions), transactions: newTransactions });
  };

  const recordTransaction = (tx) => {
    const newTx = { ...tx, id: crypto.randomUUID(), ts: new Date().toISOString() };
    const newTransactions = [...transactions, newTx];
    setTimeBank({ balance: computeTimeBankBalance(newTransactions), transactions: newTransactions });
  };

  // Update an existing transaction in place. Preserves id, original
  // timestamp, and any side-channel fields like .redeemed (so editing a
  // redeemed gift's reason doesn't accidentally un-redeem it). The
  // mutable shape is only what TimeBankAddForm owns: kind, from, to,
  // mins, reason. Balance is recomputed from history afterward.
  const updateTransaction = (id, patch) => {
    const newTransactions = transactions.map(t =>
      t.id === id ? { ...t, ...patch } : t
    );
    setTimeBank({ balance: computeTimeBankBalance(newTransactions), transactions: newTransactions });
  };

  const FILTERS = [
    { v: "all",      l: "All" },
    { v: "debts",    l: "Debts" },
    { v: "gifts",    l: "Gifts" },
    { v: "paybacks", l: "Paybacks" },
  ];

  return (
    <div style={{ marginTop: 14 }}>
      {/* === Balance hero card === */}
      <div style={{
        background: balance === 0
          ? C.paper
          : `linear-gradient(135deg, ${primaryColor}22, ${C.paper})`,
        border: `1px solid ${C.line}15`,
        borderLeft: balance === 0 ? `1px solid ${C.line}15` : `4px solid ${primaryColor}`,
        borderRadius: 14, padding: 18,
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
          Time bank
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 14, fontStyle: "italic", color: C.muted, marginTop: 2,
        }}>
          {directionLabel}
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: balance === 0 ? 36 : 44,
          fontWeight: 500,
          color: balance === 0 ? C.ink : primaryColor,
          lineHeight: 1, marginTop: 6,
          fontStyle: balance === 0 ? "italic" : "normal",
        }}>
          {balance === 0 ? "no debts" : fmtBalance(balance)}
        </div>

        {/* +/- breakdown */}
        {transactions.length > 0 && (positiveTotal > 0 || negativeTotal > 0) && (
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: `1px solid ${C.line}15`,
            display: "flex", alignItems: "center", gap: 16,
            fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
          }}>
            {positiveTotal > 0 && (
              <span style={{ color: "#4F6E4D", fontWeight: 600 }}>
                +{fmtBalance(positiveTotal)}
                <span style={{ color: C.muted, fontWeight: 400, marginLeft: 5 }}>received</span>
              </span>
            )}
            {negativeTotal > 0 && (
              <span style={{ color: C.accent, fontWeight: 600 }}>
                −{fmtBalance(negativeTotal)}
                <span style={{ color: C.muted, fontWeight: 400, marginLeft: 5 }}>given</span>
              </span>
            )}
          </div>
        )}

        {/* Recompute drift warning */}
        {driftDetected && (
          <div style={{
            marginTop: 12,
            background: `${C.accent}10`,
            border: `1px solid ${C.accent}40`,
            borderRadius: 8, padding: "8px 10px",
            fontSize: 11, color: C.ink,
          }}>
            <div style={{ color: C.accent, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertCircle size={11} /> Balance doesn't match the history
            </div>
            <button onClick={recomputeBalance} style={{
              background: C.accent, color: "#fff", border: "none",
              borderRadius: 6, padding: "4px 10px",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              Recompute from history
            </button>
          </div>
        )}
      </div>

      {/* === Quick actions === */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8, marginBottom: 14,
      }}>
        <button onClick={() => { setAddInitialMode("owed"); setShowAddModal(true); }} style={{
          background: C.paper, border: `1.5px solid ${C.line}30`,
          borderRadius: 10, padding: "12px 8px",
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <ArrowRightLeft size={16} color={C.accent} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>Log debt</span>
        </button>
        <button onClick={() => { setAddInitialMode("gift"); setShowAddModal(true); }} style={{
          background: C.paper, border: `1.5px solid ${C.line}30`,
          borderRadius: 10, padding: "12px 8px",
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <Gift size={16} color={C.gold} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>Send gift</span>
        </button>
        <button onClick={() => { setAddInitialMode("paid"); setShowAddModal(true); }} style={{
          background: C.paper, border: `1.5px solid ${C.line}30`,
          borderRadius: 10, padding: "12px 8px",
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <Check size={16} color={C.mommy} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>Log payback</span>
        </button>
      </div>

      {/* === Redeem button — only when partner owes you ≥30m === */}
      {youOwe === false && Math.abs(balance) >= 30 && (
        <button onClick={() => setShowRedeem(true)} style={{
          width: "100%", marginBottom: 14,
          background: youColor, color: "#fff", border: "none",
          padding: "14px 18px", borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "inherit",
          boxShadow: `0 2px 8px ${youColor}55`,
        }}>
          <Gift size={16} /> Cash in: have {partner} cover a shift
        </button>
      )}

      {/* === Transaction ledger === */}
      <Section C={C} title={`Ledger · ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}>
        {transactions.length === 0 ? (
          <div style={{
            background: C.paper, borderRadius: 12, padding: 20,
            border: `1px solid ${C.line}15`, textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
              fontStyle: "italic", color: C.muted,
            }}>
              No transactions yet.
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              When one parent covers for the other (or gifts time, or pays back),
              log it here. The bank tracks who's ahead and who's behind.
            </div>
          </div>
        ) : (
          <>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {FILTERS.map(f => {
                const active = filter === f.v;
                return (
                  <button key={f.v} onClick={() => setFilter(f.v)} style={{
                    background: active ? C.accent : "transparent",
                    color: active ? "#fff" : C.ink,
                    border: `1px solid ${active ? C.accent : C.line + "40"}`,
                    borderRadius: 999, padding: "5px 11px",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                    {f.l}
                    <span style={{
                      fontSize: 10, opacity: active ? 0.85 : 0.6,
                      fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                    }}>{counts[f.v]}</span>
                  </button>
                );
              })}
            </div>

            {/* Transaction rows */}
            {filtered.length === 0 ? (
              <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", textAlign: "center", padding: 20 }}>
                No {filter} in the ledger.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {filtered.map(tx => {
                  const fromColor = tx.from === "Mommy" ? C.mommy : C.daddy;
                  const toColor = tx.to === "Mommy" ? C.mommy : C.daddy;
                  const kindIcon = tx.kind === "gift" ? "🎁" : tx.kind === "paid" ? "✓" : "⇄";
                  const kindLabel = tx.kind === "gift" ? "GIFT" : tx.kind === "paid" ? "PAYBACK" : "DEBT";
                  const kindColor = tx.kind === "gift" ? C.gold : tx.kind === "paid" ? C.mommy : C.accent;
                  const date = new Date(tx.ts);
                  const isRedeemed = tx.kind === "gift" && tx.redeemed;
                  return (
                    <div key={tx.id} style={{
                      background: C.paper, borderRadius: 10,
                      padding: "10px 12px",
                      border: `1px solid ${C.line}15`,
                      borderLeft: `3px solid ${kindColor}`,
                      display: "flex", flexDirection: "column", gap: 4,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 9, letterSpacing: "0.16em", fontWeight: 700,
                          background: `${kindColor}18`, color: kindColor,
                          padding: "2px 7px", borderRadius: 4,
                        }}>
                          {kindIcon} {kindLabel}
                        </span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13, fontWeight: 600, color: C.ink,
                        }}>
                          {fmtBalance(tx.mins)}
                        </span>
                        {isRedeemed && (
                          <span style={{
                            fontSize: 9, letterSpacing: "0.12em", fontWeight: 600,
                            background: `${C.muted}18`, color: C.muted,
                            padding: "1px 6px", borderRadius: 3,
                          }}>
                            REDEEMED
                          </span>
                        )}
                        {tx.kind === "gift" && !isRedeemed && tx.to === currentUser && (
                          <span style={{
                            fontSize: 9, letterSpacing: "0.12em", fontWeight: 600,
                            background: `${C.gold}22`, color: C.gold,
                            padding: "1px 6px", borderRadius: 3,
                          }}>
                            PENDING
                          </span>
                        )}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                          {/* Edit — only enabled for non-redeemed transactions.
                              A redeemed gift has a downstream meeting that
                              auto-swapped coverage; editing its mins/direction
                              after redemption would create inconsistency. */}
                          {!isRedeemed && (
                            <button
                              onClick={() => setEditingTx(tx)}
                              title="Edit this transaction"
                              style={{
                                background: "transparent", border: "none",
                                color: C.muted, cursor: "pointer", padding: 2,
                                display: "flex", alignItems: "center",
                              }}>
                              <Edit3 size={12} />
                            </button>
                          )}
                          <button onClick={() => {
                            if (window.confirm(`Remove this ${kindLabel.toLowerCase()} transaction?`)) {
                              removeTransaction(tx.id);
                            }
                          }} style={{
                            background: "transparent", border: "none",
                            color: C.muted, cursor: "pointer", padding: 2,
                            display: "flex", alignItems: "center",
                          }}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.4 }}>
                        <span style={{ color: fromColor, fontWeight: 600 }}>{tx.from}</span>
                        <span style={{ color: C.muted }}>{" "}{tx.kind === "gift" ? "→ gifts to" : tx.kind === "paid" ? "→ pays back" : "covered for"}{" "}</span>
                        <span style={{ color: toColor, fontWeight: 600 }}>{tx.to}</span>
                      </div>
                      {tx.reason && (
                        <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
                          "{tx.reason}"
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {fmtTimeShort(date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Add transaction modal — reuses the same TimeBankAddForm */}
      {showAddModal && (
        <ModalShell C={C} onClose={() => { setShowAddModal(false); setAddInitialMode(null); }} title="Record transaction">
          <TimeBankAddForm
            C={C}
            balance={balance}
            initialKind={addInitialMode}
            onSubmit={(tx) => {
              recordTransaction(tx);
              setShowAddModal(false);
              setAddInitialMode(null);
            }}
          />
        </ModalShell>
      )}

      {/* Edit modal — same form pre-filled with the transaction's current
          values. Updates in place rather than appending a new row. */}
      {editingTx && (
        <ModalShell C={C} onClose={() => setEditingTx(null)} title="Edit transaction">
          <TimeBankAddForm
            C={C}
            balance={balance}
            initialTx={editingTx}
            onSubmit={(patch) => {
              updateTransaction(editingTx.id, patch);
              setEditingTx(null);
            }}
          />
        </ModalShell>
      )}

      {showRedeem && <RedeemModal
        C={C}
        timeBank={timeBank}
        setTimeBank={setTimeBank}
        setMeetings={setMeetings}
        currentUser={currentUser}
        now={now}
        onClose={() => setShowRedeem(false)}
      />}
    </div>
  );
}

// ---- RedeemGiftModal ----------------------------------------------------
// Recipient picks WHEN to use a specific gift. The flow is intentionally
// minimal — show what gift this is, ask "now or pick a time + duration",
// then on confirm: (a) create a red Meeting for the recipient at that time
// so the shift schedule auto-swaps the giver into coverage, and (b) mark
// the gift transaction as .redeemed so it stops appearing on the recipient's
// landing page.
function RedeemGiftModal({ C, gift, timeBank, setTimeBank, setMeetings, now, onClose }) {
  const recipient = gift.to;
  const giver = gift.from;
  const giverColor = giver === "Mommy" ? C.mommy : C.daddy;
  const recipientColor = recipient === "Mommy" ? C.mommy : C.daddy;

  const [whenChoice, setWhenChoice] = useState("now"); // 'now' | 'pick'
  const [pickedDateTime, setPickedDateTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  });
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    const startTime = whenChoice === "now" ? new Date(now) : new Date(pickedDateTime);
    const endTime = new Date(startTime.getTime() + gift.mins * 60000);
    const meetingId = crypto.randomUUID();

    // Create a red commitment for the recipient → projection auto-assigns
    // the giver to cover. Label it as "gift" so it's distinguishable in the
    // schedule view from regular meetings.
    const newMeeting = {
      id: meetingId,
      parent: recipient,
      level: "red",
      label: `🎁 Gift from ${giver}${reason ? ` · ${reason}` : ""}`,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    };
    setMeetings(prev => {
      const next = [...prev, newMeeting];
      try { localStorage.setItem("solene:meetings", JSON.stringify(next)); } catch {}
      return next;
    });

    // Mark the gift as redeemed (don't add a new transaction; just update
    // the existing one). This keeps the gift's history intact while
    // preventing it from re-appearing on the landing page.
    const newTransactions = (timeBank.transactions || []).map(t =>
      t.id === gift.id
        ? { ...t, redeemed: { at: new Date().toISOString(), blockStart: startTime.toISOString(), blockEnd: endTime.toISOString(), meetingId } }
        : t
    );
    setTimeBank({
      balance: computeTimeBankBalance(newTransactions),
      transactions: newTransactions,
    });
    onClose();
  };

  return (
    <ModalShell C={C} onClose={onClose} title="Redeem gift">
      <div style={{
        background: `${giverColor}15`,
        border: `1px solid ${giverColor}40`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.55, marginBottom: 8 }}>
          🎁 <strong style={{ color: giverColor }}>{giver}</strong> gifted you{" "}
          <strong>{fmtBalance(gift.mins)}</strong> off-duty time
          {gift.reason ? <> for <em>{gift.reason}</em></> : null}
          .
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          Logged {new Date(gift.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {fmtTimeShort(new Date(gift.ts))}
        </div>
      </div>

      <Field C={C} label="When do you want to use it?">
        <SegControl C={C} value={whenChoice} onChange={setWhenChoice} options={[
          { v: "now", l: "Right now" },
          { v: "pick", l: "Pick a time" },
        ]} />
      </Field>

      {whenChoice === "pick" && (
        <Field C={C} label="Start">
          <input type="datetime-local"
            value={pickedDateTime}
            onChange={(e) => setPickedDateTime(e.target.value)}
            style={{
              width: "100%", padding: 10, fontSize: 14,
              background: C.bg, border: `1px solid ${C.line}33`,
              borderRadius: 8, color: C.ink, outline: "none",
              fontFamily: "inherit",
            }} />
        </Field>
      )}

      <Field C={C} label="Optional note">
        <input type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="nap, gym, errand…"
          style={{
            width: "100%", padding: 10, fontSize: 14,
            background: C.bg, border: `1px solid ${C.line}33`,
            borderRadius: 8, color: C.ink, outline: "none",
            fontFamily: "inherit",
          }} />
      </Field>

      {(() => {
        const startTime = whenChoice === "now" ? new Date(now) : new Date(pickedDateTime);
        const endTime = new Date(startTime.getTime() + gift.mins * 60000);
        const startDate = new Date(startTime);
        startDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(now);
        todayDate.setHours(0, 0, 0, 0);
        const daysAhead = Math.round((startDate - todayDate) / 86400000);
        // We compute live shift swaps for today and tomorrow only. Beyond
        // that, the meeting is recorded but the visible auto-swap doesn't
        // appear in any pre-computed view until that day becomes today
        // or tomorrow. Surface this so the user knows what to expect.
        const isFarFuture = daysAhead >= 2;
        return (
          <div style={{
            background: C.bg, borderRadius: 8, padding: 10,
            fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            <div style={{ marginBottom: isFarFuture ? 6 : 0 }}>
              <strong style={{ color: C.ink }}>What happens:</strong>{" "}
              You go off-duty for{" "}
              <strong>{fmtBalance(gift.mins)}</strong>{" "}
              starting{" "}
              <strong>
                {whenChoice === "now" ? "right now" : new Date(pickedDateTime).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
              </strong>.{" "}
              <span style={{ color: giverColor, fontWeight: 600 }}>{giver}</span>{" "}
              {daysAhead === 0 ? "covers — today's shifts auto-adjust immediately." :
               daysAhead === 1 ? "covers — tomorrow's shifts auto-adjust on the Schedule tab." :
                                 "covers — a commitment block is created for that day."}
            </div>
            {isFarFuture && (
              <div style={{
                fontSize: 11, color: C.gold, fontStyle: "italic",
                paddingTop: 6, borderTop: `1px solid ${C.line}15`,
              }}>
                Note: shift auto-swap is computed for today and tomorrow only. The block is saved and will appear in coverage when {daysAhead === 2 ? "the day after tomorrow" : "that day"} becomes tomorrow.
              </div>
            )}
          </div>
        );
      })()}

      <SubmitButton C={C} onClick={handleSubmit}>
        Redeem · {giver} covers {fmtBalance(gift.mins)}
      </SubmitButton>
    </ModalShell>
  );
}

function ActiveOnsiteCard({ C, onsite, now, onUpdateEta, onArrived }) {
  const awayColor = onsite.parent === "Mommy" ? C.mommy : C.daddy;
  const homeColor = onsite.parent === "Mommy" ? C.daddy : C.mommy;
  const homeParent = onsite.parent === "Mommy" ? "Daddy" : "Mommy";
  const departure = new Date(onsite.departedAt);
  const earliest = new Date(onsite.earliestReturn);
  const latest = new Date(onsite.latestReturn);
  const etaUpdate = onsite.etaUpdate ? new Date(onsite.etaUpdate) : null;
  const effectiveReturn = etaUpdate || latest;

  const minsAway = Math.round((now - departure) / 60000);
  const hoursAway = Math.floor(minsAway / 60);
  const minsRemainder = minsAway % 60;
  const minsToReturn = Math.round((effectiveReturn - now) / 60000);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${awayColor}15, ${C.paper})`,
      borderRadius: 12, padding: 16,
      border: `2px solid ${awayColor}55`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: awayColor, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0,
        }}>
          <MapPin size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, lineHeight: 1.1, color: awayColor }}>
            {onsite.parent} is on-site
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
            left {fmtTimeShort(departure)} · {hoursAway > 0 ? `${hoursAway}h ${minsRemainder}m` : `${minsRemainder}m`} ago
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
            Earliest back
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, marginTop: 2 }}>
            {fmtTimeShort(earliest)}
          </div>
        </div>
        <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
            {etaUpdate ? "Updated ETA" : "Latest back"}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, marginTop: 2, color: etaUpdate ? C.accent : C.ink }}>
            {fmtTimeShort(effectiveReturn)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.ink, padding: "10px 12px", background: `${homeColor}15`, borderRadius: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, color: homeColor }}>{homeParent}</span> is covering all shifts until you're back. Tap below to update your ETA or mark yourself home.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={onUpdateEta} style={{
          background: "transparent", color: C.ink, border: `1.5px solid ${C.line}33`,
          borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Edit3 size={13} /> Update ETA
        </button>
        <button onClick={onArrived} style={{
          background: C.accent, color: "#fff", border: "none",
          borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Check size={13} /> I'm home
        </button>
      </div>
    </div>
  );
}

// ---- SleepDownPickerModal ---------------------------------------------
// When the parent confirms the baby fell asleep (after a "still awake?"
// prompt), this lets them specify the actual sleep-down time. Pre-filled
// with the system's midpoint estimate, but if the parent remembers — say
// — that she dozed off 20 min ago, they can adjust.
//
// Behavior:
//   • Default selection = "Use estimate" (one-tap path stays fast)
//   • "I know when" reveals a datetime-local input
//   • Bound to range [last feed, now] — can't pick the future or before
//     the last feed since that would be nonsensical
//   • The `estimated` flag on the resulting event is true ONLY when the
//     user accepts the system estimate. If they specify a time, we trust
//     them and mark estimated:false.
function SleepDownPickerModal({ C, prefill, now, onClose, onSubmit }) {
  const [mode, setMode] = useState("estimate"); // "estimate" | "exact"
  // datetime-local format: YYYY-MM-DDTHH:MM (local time, no seconds, no TZ)
  const toLocalIso = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [exactTime, setExactTime] = useState(toLocalIso(prefill));

  const submit = () => {
    if (mode === "estimate") {
      onSubmit(prefill, true);
    } else {
      const ts = new Date(exactTime);
      if (isNaN(ts.getTime())) return;
      // Clamp: don't allow future, or earlier than 8h ago (sanity bound).
      const eightHoursAgo = new Date(now.getTime() - 8 * 3600 * 1000);
      if (ts > now) return onSubmit(now, false);
      if (ts < eightHoursAgo) return onSubmit(eightHoursAgo, false);
      onSubmit(ts, false);
    }
  };

  const fmtPretty = (d) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const minsAgo = Math.round((now - prefill) / 60000);

  return (
    <ModalShell C={C} onClose={onClose} title="When did she fall asleep?">
      <div style={{
        background: `${C.gold}10`,
        border: `1px solid ${C.gold}30`,
        borderRadius: 10, padding: "10px 12px", marginBottom: 14,
        fontSize: 12, color: C.muted, lineHeight: 1.5,
      }}>
        Based on the last feed, she likely went down around{" "}
        <strong style={{ color: C.ink }}>{fmtPretty(prefill)}</strong>{" "}
        ({minsAgo} min ago). If you remember the actual time, you can enter it below.
      </div>

      {/* Mode toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setMode("estimate")} style={{
          padding: "12px 10px", borderRadius: 10,
          background: mode === "estimate" ? C.accent : "transparent",
          color: mode === "estimate" ? "#fff" : C.ink,
          border: `1.5px solid ${mode === "estimate" ? C.accent : C.line + "40"}`,
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.16em", opacity: 0.85 }}>USE ESTIMATE</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
            {fmtPretty(prefill)}
          </span>
        </button>
        <button onClick={() => setMode("exact")} style={{
          padding: "12px 10px", borderRadius: 10,
          background: mode === "exact" ? C.accent : "transparent",
          color: mode === "exact" ? "#fff" : C.ink,
          border: `1.5px solid ${mode === "exact" ? C.accent : C.line + "40"}`,
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.16em", opacity: 0.85 }}>I KNOW WHEN</span>
          <span style={{ fontSize: 12 }}>specify time</span>
        </button>
      </div>

      {/* Exact time input — shown only when mode = "exact" */}
      {mode === "exact" && (
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: "block", fontSize: 11, color: C.muted,
            marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            She fell asleep at
          </label>
          <input
            type="datetime-local"
            value={exactTime}
            onChange={e => setExactTime(e.target.value)}
            max={toLocalIso(now)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${C.line}40`,
              background: C.bg,
              color: C.ink,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontStyle: "italic" }}>
            Use 24h format. Can't pick a future time.
          </div>
        </div>
      )}

      <SubmitButton C={C} onClick={submit}>
        Log sleep-down
      </SubmitButton>
    </ModalShell>
  );
}

function OnsiteModal({ C, onClose, onSubmit }) {
  const [parent, setParent] = useState("Mommy");
  const nowIso = () => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  };
  const plusHours = (h) => {
    const d = new Date();
    d.setHours(d.getHours() + h);
    return d.toISOString().slice(0, 16);
  };
  const [departedAt, setDepartedAt] = useState(nowIso());
  const [earliestReturn, setEarliestReturn] = useState(plusHours(3));
  const [latestReturn, setLatestReturn] = useState(plusHours(8));

  return (
    <ModalShell C={C} onClose={onClose} title="Going on-site">
      <Field C={C} label="Who's leaving?">
        <SegControl C={C} value={parent} onChange={setParent} options={[
          { v: "Mommy", l: "Mommy", color: C.mommy },
          { v: "Daddy", l: "Daddy", color: C.daddy },
        ]} />
      </Field>
      <Field C={C} label="Departure time">
        <DateTimeInput C={C} value={departedAt} onChange={setDepartedAt} />
      </Field>
      <Field C={C} label="Earliest plausible return">
        <DateTimeInput C={C} value={earliestReturn} onChange={setEarliestReturn} />
      </Field>
      <Field C={C} label="Latest plausible return">
        <DateTimeInput C={C} value={latestReturn} onChange={setLatestReturn} />
      </Field>
      <div style={{ background: `${C.line}08`, borderRadius: 10, padding: 12, fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
        Your partner will cover all your shifts in this window. You can tap "Update ETA" anytime when you have a clearer estimate, or "I'm home" when you arrive.
      </div>
      <SubmitButton C={C} onClick={() => onSubmit({
        parent,
        departedAt: new Date(departedAt).toISOString(),
        earliestReturn: new Date(earliestReturn).toISOString(),
        latestReturn: new Date(latestReturn).toISOString(),
      })}>
        Activate on-site mode
      </SubmitButton>
    </ModalShell>
  );
}

function EtaUpdateModal({ C, onsite, onClose, onSubmit }) {
  const fmtIso = (d) => new Date(d).toISOString().slice(0, 16);
  const plusMin = (m) => fmtIso(new Date(Date.now() + m * 60000));
  const [eta, setEta] = useState(onsite.etaUpdate ? fmtIso(onsite.etaUpdate) : plusMin(60));

  const quickSet = (mins) => setEta(plusMin(mins));

  return (
    <ModalShell C={C} onClose={onClose} title="Update ETA home">
      <Field C={C} label="Quick options">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[
            { mins: 15, label: "15 min" },
            { mins: 30, label: "30 min" },
            { mins: 45, label: "45 min" },
            { mins: 60, label: "1 hour" },
            { mins: 90, label: "1.5 hr" },
            { mins: 120, label: "2 hours" },
          ].map(opt => (
            <button key={opt.mins} onClick={() => quickSet(opt.mins)} style={{
              background: C.bg, color: C.ink,
              border: `1px solid ${C.line}22`, borderRadius: 8,
              padding: "10px 6px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </Field>
      <Field C={C} label="Or pick exactly">
        <DateTimeInput C={C} value={eta} onChange={setEta} />
      </Field>
      <SubmitButton C={C} onClick={() => onSubmit(new Date(eta).toISOString())}>
        Update ETA to {fmtTimeShort(new Date(eta))}
      </SubmitButton>
    </ModalShell>
  );
}

function MeetingRow({ m, C, onRemove }) {
  const colors = {
    red: { bg: "#C44545", fg: "#fff", label: "RED" },
    yellow: { bg: "#D4A03A", fg: "#1F1B16", label: "YELLOW" },
    green: { bg: "#5C8E5C", fg: "#fff", label: "GREEN" },
  }[m.level];
  const start = new Date(m.start);
  const end = new Date(m.end);
  const parentColor = m.parent === "Mommy" ? C.mommy : C.daddy;
  // 2-step delete: first tap arms the button, second tap confirms.
  // Auto-disarms after 4 seconds so accidental arming doesn't linger.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);
  const handleClick = () => {
    if (confirming) {
      onRemove();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  return (
    <div style={{
      background: C.paper, borderRadius: 10, padding: "10px 12px",
      border: `1px solid ${confirming ? C.accent : C.line + "15"}`,
      display: "flex", alignItems: "center", gap: 10,
      transition: "border-color 0.15s",
    }}>
      <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: colors.bg }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{m.label || "(untitled)"}</div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
          <span style={{ color: parentColor, fontWeight: 600 }}>{m.parent}</span>
          {" · "}{fmtTimeShort(start)}–{fmtTimeShort(end)}
        </div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
        background: colors.bg, color: colors.fg,
        padding: "3px 6px", borderRadius: 4,
      }}>
        {colors.label}
      </span>
      <button
        onClick={handleClick}
        title={confirming ? "Tap again to confirm — this will remove the commitment" : "Remove this commitment"}
        style={{
          background: confirming ? C.accent : "transparent",
          border: confirming ? "none" : `1px solid ${C.line}22`,
          color: confirming ? "#fff" : C.muted,
          cursor: "pointer",
          padding: confirming ? "4px 10px" : 4,
          borderRadius: confirming ? 14 : 4,
          fontSize: confirming ? 11 : "inherit",
          fontWeight: confirming ? 600 : "inherit",
          letterSpacing: confirming ? "0.04em" : 0,
          display: "flex", alignItems: "center", gap: 4,
          transition: "all 0.15s",
        }}>
        {confirming ? <>Sure?</> : <Trash2 size={14} />}
      </button>
    </div>
  );
}

// Thin wrapper around InlineCommitmentForm so the Shifts tab "Add commitment"
// button uses the same simplified form as the LOG sheet. Single source of truth
// for commitment-creation UX.
function AddMeetingModal({ C, onClose, onSubmit, currentUser }) {
  return (
    <ModalShell C={C} onClose={onClose} title="Add commitment">
      <InlineCommitmentForm C={C} currentUser={currentUser}
        onSubmit={(m) => { onSubmit(m); onClose(); }} />
    </ModalShell>
  );
}


function InventoryView({ C, inventory, moveToFridge, removeInventory, emptyLocation, editBottle, totalSafeOz, rtSafeOz, fridgeOz, feedsRunway, hoursRunway, lastPump, nextPumpAt, now, todayCalories }) {
  const valid = inventory.filter(i => !i.expired);
  const expired = inventory.filter(i => i.expired);
  const lowAlert = feedsRunway < 2;
  const minsToNextPump = nextPumpAt ? Math.round((nextPumpAt - now) / 60000) : null;
  const [emptyConfirm, setEmptyConfirm] = useState(null); // 'rt' | 'fridge' | null

  return (
    <div style={{ marginTop: 14 }}>
      {/* Calorie burn — small mom flex */}
      <Section C={C} title="Mommy's burn today">
        <div style={{
          background: `linear-gradient(135deg, ${C.mommy}22, ${C.paper})`,
          borderRadius: 14, padding: 18,
          border: `1px solid ${C.mommy}44`,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: C.mommy, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
          }}>
            <Flame size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 500, lineHeight: 1, color: C.mommy }}>
              {todayCalories} <span style={{ fontSize: 16, color: C.muted, fontFamily: "'Inter', sans-serif" }}>kcal</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              from pumping & breastfeeding · keep snacks close 💪
            </div>
          </div>
        </div>
      </Section>

      <Section C={C} title="Pump timing">
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>Last pump</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, marginTop: 2 }}>
                {lastPump ? fmtTimeShort(new Date(lastPump.ts)) : "—"}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                {lastPump ? `${lastPump.oz}oz · ${lastPump.durationMin || "?"}m` : ""}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>Next due</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, marginTop: 2, color: minsToNextPump < 0 ? C.accent : C.ink }}>
                {nextPumpAt ? fmtTimeShort(nextPumpAt) : "—"}
              </div>
              <div style={{ fontSize: 11, color: minsToNextPump < 0 ? C.accent : C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                {minsToNextPump == null ? "" : minsToNextPump < 0 ? "overdue" : `in ${Math.floor(minsToNextPump / 60)}h ${minsToNextPump % 60}m`}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section C={C} title="Breast milk · live runway">
        <div style={{
          background: lowAlert ? `${C.accent}15` : C.paper,
          border: lowAlert ? `1px solid ${C.accent}` : `1px solid ${C.line}15`,
          borderRadius: 14, padding: 18,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <BigStat C={C} label="Room temp" value={`${rtSafeOz.toFixed(1)} oz`} />
            <BigStat C={C} label="Fridge" value={`${fridgeOz.toFixed(1)} oz`} />
            <BigStat C={C} label="Total safe" value={`${totalSafeOz.toFixed(1)} oz`} accent />
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${C.line}22` }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
              Projected runway
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500 }}>
                {feedsRunway} feed{feedsRunway === 1 ? "" : "s"}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>· ~{hoursRunway}h coverage</span>
            </div>
            {lowAlert && (
              <div style={{
                marginTop: 10, padding: 10, background: C.accent, color: "#fff",
                borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Bell size={14} />
                <span>{feedsRunway === 0 ? "Formula needed before next feed" : "Mom should pump or have formula ready"}</span>
              </div>
            )}
          </div>
        </div>
      </Section>

      {valid.length > 0 && (
        <Section C={C} title="In stock">
          {/* Quick adjust row */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {rtSafeOz > 0 && (
              <button onClick={() => {
                if (emptyConfirm === "rt") { emptyLocation("rt"); setEmptyConfirm(null); }
                else setEmptyConfirm("rt");
              }} style={{
                flex: 1,
                background: emptyConfirm === "rt" ? C.accent : "transparent",
                color: emptyConfirm === "rt" ? "#fff" : C.muted,
                border: emptyConfirm === "rt" ? "none" : `1px dashed ${C.line}33`,
                borderRadius: 8,
                padding: "8px 10px", fontSize: 11, cursor: "pointer",
                fontWeight: emptyConfirm === "rt" ? 600 : 400,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
                <Trash2 size={11} /> {emptyConfirm === "rt" ? "Sure? Tap again" : `Empty RT (${rtSafeOz.toFixed(1)} oz)`}
              </button>
            )}
            {fridgeOz > 0 && (
              <button onClick={() => {
                if (emptyConfirm === "fridge") { emptyLocation("fridge"); setEmptyConfirm(null); }
                else setEmptyConfirm("fridge");
              }} style={{
                flex: 1,
                background: emptyConfirm === "fridge" ? C.accent : "transparent",
                color: emptyConfirm === "fridge" ? "#fff" : C.muted,
                border: emptyConfirm === "fridge" ? "none" : `1px dashed ${C.line}33`,
                borderRadius: 8,
                padding: "8px 10px", fontSize: 11, cursor: "pointer",
                fontWeight: emptyConfirm === "fridge" ? 600 : 400,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
                <Trash2 size={11} /> {emptyConfirm === "fridge" ? "Sure? Tap again" : `Empty fridge (${fridgeOz.toFixed(1)} oz)`}
              </button>
            )}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {valid.map(item => (
              <InventoryRow key={item.id} item={item} C={C}
                onMoveToFridge={() => moveToFridge(item.id)}
                onEdit={() => editBottle && editBottle(item.id)}
                onRemove={() => removeInventory(item.id)} />
            ))}
          </div>
        </Section>
      )}

      {/* Expired-inventory section removed in v05.05av — was visual clutter
          without much value. Expired items are auto-excluded from totals
          and bottle picker; no need to surface them as a separate section. */}
    </div>
  );
}

function BigStat({ C, label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500,
        color: accent ? C.accent : C.ink, marginTop: 2, lineHeight: 1.1,
      }}>
        {value}
      </div>
    </div>
  );
}

function InventoryRow({ item, C, onMoveToFridge, onRemove, onEdit }) {
  const remHrs = item.remaining;
  const isRT = item.location === "rt";
  const urgent = remHrs < 1 && isRT;
  return (
    <div style={{
      background: C.paper, borderRadius: 10, padding: "10px 12px",
      border: `1px solid ${urgent ? C.accent : C.line + "15"}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        background: isRT ? `${C.accent}22` : `${C.ink}11`,
        color: isRT ? C.accent : C.ink,
        padding: "3px 8px", borderRadius: 5,
        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
      }}>
        {isRT ? "RT" : "FRIDGE"}
      </div>
      <button onClick={onEdit} style={{
        flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
        padding: 0, fontFamily: "inherit",
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{item.oz} oz</div>
        <div style={{ fontSize: 10, color: urgent ? C.accent : C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
          {fmtHours(remHrs)} left · pumped {fmtElapsed(minutesAgo(item.pumpedAt))}
        </div>
      </button>
      {isRT && (
        <button onClick={onMoveToFridge} style={{
          background: "transparent", color: C.ink,
          border: `1px solid ${C.line}33`, borderRadius: 6,
          padding: "4px 9px", fontSize: 10, fontWeight: 500, cursor: "pointer",
        }}>
          → fridge
        </button>
      )}
      <button onClick={onEdit} title="Edit (no log)" style={{
        background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 4, opacity: 0.5,
      }}>
        <Edit3 size={12} />
      </button>
      <button onClick={onRemove} style={{
        background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 4, opacity: 0.5,
      }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ---- Care View (bath, skincare, diaper bag) -----------------------------
function CareView({ C, now, events, addEvent, removeEvent, diaperBag, setDiaperBag, lastBath, lastSkincare }) {
  const [section, setSection] = useState("routine"); // routine | bag

  return (
    <div style={{ marginTop: 14 }}>
      <SegControl C={C} value={section} onChange={setSection} options={[
        { v: "routine", l: "Routines & bath" },
        { v: "bag", l: "Diaper bag" },
      ]} />

      {section === "routine" && (
        <RoutineSection C={C} now={now} events={events} addEvent={addEvent} lastBath={lastBath} lastSkincare={lastSkincare} />
      )}
      {section === "bag" && (
        <DiaperBagSection C={C} diaperBag={diaperBag} setDiaperBag={setDiaperBag} />
      )}
    </div>
  );
}

function RoutineSection({ C, now, events, addEvent, lastBath, lastSkincare }) {
  const hour = now.getHours();
  const isMorning = hour < 12;
  const recommendedRoutine = isMorning ? "AM" : "PM";

  const lastBathTime = lastBath ? minutesAgo(lastBath.ts) : null;
  const todayBath = lastBath && new Date(lastBath.ts).toDateString() === now.toDateString();

  const [showBath, setShowBath] = useState(false);

  return (
    <>
      <Section C={C} title={`${isMorning ? "☀️ Morning" : "🌙 Evening"} skincare cheat sheet`}>
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, fontStyle: "italic" }}>
                {recommendedRoutine === "AM" ? "AM routine" : "PM routine"}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {lastSkincare && new Date(lastSkincare.ts).toDateString() === now.toDateString()
                  ? `last done ${fmtElapsed(minutesAgo(lastSkincare.ts))}`
                  : "not yet today"}
              </div>
            </div>
            <Sparkles size={24} color={C.accent} style={{ opacity: 0.7 }} />
          </div>

          <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {SKINCARE[recommendedRoutine].map((s, i) => (
              <li key={i} style={{
                display: "flex", gap: 12, padding: "10px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}11`,
              }}>
                <div style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
                  background: C.bg, border: `1px solid ${C.line}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: C.ink }}>{s.step}</div>
                  {s.note && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 2 }}>{s.note}</div>}
                </div>
              </li>
            ))}
          </ol>

          <button onClick={() => addEvent({ type: "skincare", routine: recommendedRoutine })} style={{
            marginTop: 12, width: "100%",
            background: C.accent, color: "#fff", border: "none",
            padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Check size={15} /> Mark {recommendedRoutine} routine done
          </button>
        </div>
      </Section>

      <Section C={C} title="Bath log">
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
          {lastBath ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                Last bath
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 24 }}>{BATH_TYPES[lastBath.bathType]?.icon}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500 }}>
                  {BATH_TYPES[lastBath.bathType]?.label}
                </span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>
                  {fmtElapsed(minutesAgo(lastBath.ts))}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 2 }}>
                {BATH_TYPES[lastBath.bathType]?.desc}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic", marginBottom: 12 }}>
              No baths logged yet.
            </div>
          )}
          <button onClick={() => setShowBath(true)} style={{
            width: "100%",
            background: "transparent", color: C.ink,
            border: `1.5px dashed ${C.line}55`, borderRadius: 10,
            padding: 12, fontSize: 14, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Bath size={15} /> Log a bath
          </button>
        </div>
      </Section>

      {showBath && (
        <BathLoggerModal C={C} onClose={() => setShowBath(false)} onSubmit={(ev) => { addEvent(ev); setShowBath(false); }} />
      )}
    </>
  );
}

function BathLoggerModal({ C, onClose, onSubmit }) {
  const [bathType, setBathType] = useState("partial");
  return (
    <ModalShell C={C} onClose={onClose} title="Log bath">
      <Field C={C} label="Which routine just happened?">
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(BATH_TYPES).map(([key, info]) => (
            <button key={key} onClick={() => setBathType(key)} style={{
              background: bathType === key ? C.accent : C.bg,
              color: bathType === key ? "#fff" : C.ink,
              border: `1.5px solid ${bathType === key ? C.accent : C.line + "22"}`,
              borderRadius: 10, padding: "12px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 12, textAlign: "left",
            }}>
              <span style={{ fontSize: 24 }}>{info.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{info.label}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>{info.desc}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>{info.duration}</div>
            </button>
          ))}
        </div>
      </Field>
      <SubmitButton C={C} onClick={() => onSubmit({ type: "bath", bathType })}>
        Log bath
      </SubmitButton>
    </ModalShell>
  );
}

function DiaperBagSection({ C, diaperBag, setDiaperBag }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState(1);

  const adjust = (id, delta) => {
    setDiaperBag(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newCurrent = Math.max(0, Math.min(item.target, item.current + delta));
      return { ...item, current: newCurrent };
    }));
  };

  const remove = (id) => setDiaperBag(prev => prev.filter(i => i.id !== id));
  const restock = () => setDiaperBag(prev => prev.map(i => ({ ...i, current: i.target })));

  const lowItems = diaperBag.filter(i => i.current < i.target);
  const empty = diaperBag.filter(i => i.current === 0);

  return (
    <>
      <Section C={C} title="Diaper bag · pre-flight check">
        <div style={{
          background: empty.length > 0 ? `${C.accent}15` : C.paper,
          borderRadius: 14, padding: 18,
          border: `1px solid ${empty.length > 0 ? C.accent : C.line + "15"}`,
          marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Package size={28} color={empty.length > 0 ? C.accent : C.ink} style={{ opacity: 0.7 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500 }}>
                {empty.length === 0 && lowItems.length === 0 ? "Fully stocked"
                  : empty.length > 0 ? `${empty.length} item${empty.length > 1 ? "s" : ""} empty`
                  : `${lowItems.length} item${lowItems.length > 1 ? "s" : ""} low`}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                tap +/− as you use or restock items
              </div>
            </div>
            <button onClick={restock} style={{
              background: C.ink, color: C.paper, border: "none",
              padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              restock all
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {diaperBag.map(item => (
            <div key={item.id} style={{
              background: C.paper, borderRadius: 10, padding: "10px 12px",
              border: `1px solid ${item.current === 0 ? C.accent : C.line + "15"}`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                  {Array.from({ length: item.target }).map((_, i) => (
                    <div key={i} style={{
                      width: 14, height: 4, borderRadius: 2,
                      background: i < item.current ? (item.current === 0 ? C.accent : C.daddy) : `${C.line}22`,
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => adjust(item.id, -1)} style={{
                  background: C.bg, border: `1px solid ${C.line}22`, borderRadius: 6,
                  width: 28, height: 28, fontSize: 16, cursor: "pointer", color: C.ink,
                }}>−</button>
                <span style={{ minWidth: 32, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500 }}>
                  {item.current}/{item.target}
                </span>
                <button onClick={() => adjust(item.id, 1)} style={{
                  background: C.bg, border: `1px solid ${C.line}22`, borderRadius: 6,
                  width: 28, height: 28, fontSize: 16, cursor: "pointer", color: C.ink,
                }}>+</button>
                <button onClick={() => remove(item.id)} style={{
                  background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 4, marginLeft: 4, opacity: 0.5,
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAdd ? (
          <div style={{ marginTop: 10, padding: 12, background: C.paper, borderRadius: 10, border: `1px dashed ${C.line}33` }}>
            <TextInput C={C} value={newName} onChange={setNewName} placeholder="Item name" />
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.muted }}>target qty:</span>
              <input type="number" value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} min="1" max="20" style={{
                width: 60, background: C.bg, border: `1px solid ${C.line}22`, borderRadius: 6, padding: "6px 8px", fontSize: 13, color: C.ink, outline: "none",
              }} />
              <button onClick={() => {
                if (newName.trim()) {
                  setDiaperBag(prev => [...prev, { id: crypto.randomUUID(), name: newName.trim(), target: newTarget, current: newTarget }]);
                  setNewName(""); setNewTarget(1); setShowAdd(false);
                }
              }} style={{
                background: C.accent, color: "#fff", border: "none",
                padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>add</button>
              <button onClick={() => setShowAdd(false)} style={{
                background: "transparent", color: C.muted, border: "none", padding: "6px 8px", fontSize: 13, cursor: "pointer",
              }}>cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} style={{
            marginTop: 10, width: "100%",
            background: "transparent", color: C.ink,
            border: `1.5px dashed ${C.line}55`, borderRadius: 10,
            padding: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Plus size={14} /> Add item
          </button>
        )}
      </Section>
    </>
  );
}

// ---- Central LOG button (impossible to miss) --------------------------
function CentralLogButton({ C, mode, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: "fixed",
      bottom: 70, left: "50%", transform: "translateX(-50%)",
      zIndex: 7,
      width: 72, height: 72, borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.accent}, ${mode === "night" ? "#D88454" : "#A04822"})`,
      color: "#fff", border: `4px solid ${C.bg}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
      cursor: "pointer",
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
      boxShadow: `0 8px 24px ${C.accent}55`,
    }}>
      <Plus size={24} strokeWidth={2.5} />
      <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
        LOG
      </span>
    </button>
  );
}

function TabBar({ C, tab, setTab }) {
  const tabs = [
    { id: "now", label: "Now" },
    { id: "log", label: "Journal" },
    { id: "doctor", label: "Wellness" },
    { id: "_spacer" },
    { id: "inventory", label: "Milk" },
    { id: "shifts", label: "Schedule" },
    { id: "bank", label: "Bank" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: `${C.bg}EE`,
      borderTop: `1px solid ${C.line}15`,
      zIndex: 6,
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        maxWidth: 720, margin: "0 auto",
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
      }}>
        {tabs.map(t => t.id === "_spacer" ? (
          <div key="_s" />
        ) : (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: "none",
            padding: "12px 2px",
            color: tab === t.id ? C.accent : C.muted,
            fontWeight: tab === t.id ? 600 : 400,
            fontSize: 10, cursor: "pointer",
            position: "relative",
            letterSpacing: "0.04em",
          }}>
            {t.label}
            {tab === t.id && (
              <span style={{
                position: "absolute", top: 0, left: "30%", right: "30%",
                height: 2, background: C.accent, borderRadius: 2,
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Bulk import modal ------------------------------------------------
// Lets the user paste free-form text (e.g. logs from a notebook, dictation,
// a partner's text message) and convert it into journal events. Always
// shows a preview before committing — parser is permissive and may make
// inferences the user wants to verify.
function BulkImportModal({ C, onClose, onCommit, now }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null); // null = not parsed yet
  const [skipped, setSkipped] = useState(new Set()); // indices of preview rows the user has unchecked
  const referenceDate = now || new Date();

  const exampleText = `Sun May 3
6:44a   Feed   4 oz   BM   Yes
9:15a-9:30a   Pump   3 oz
12:15p   Feed   2 oz   Formula

Mon May 4
3:47a   Pump   4 oz`;

  const doParse = () => {
    if (!text.trim()) return;
    const result = parseBulkImport(text, { referenceDate });
    setParsed(result);
    setSkipped(new Set());
  };

  const fmtTs = (ts) => {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    const month = d.toLocaleDateString(undefined, { month: "short" });
    const period = d.getHours() >= 12 ? "pm" : "am";
    const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
    return `${month} ${d.getDate()} · ${h12}:${pad(d.getMinutes())}${period}`;
  };

  const fmtDetails = (ev) => {
    const parts = [];
    if (ev.oz != null) parts.push(`${ev.oz} oz`);
    if (ev.source) parts.push(ev.source);
    if (ev.mode && ev.mode !== "standard") parts.push(`${ev.mode} pump`);
    if (ev.durationMin) parts.push(`${ev.durationMin}m duration`);
    if (ev.notes && ev.type === "diaper") parts.push(ev.notes);
    return parts.join(" · ");
  };

  const typeColor = (type) => {
    if (type === "feed") return C.accent;
    if (type === "breastfeed") return C.mommy;
    if (type === "pump") return C.mommy;
    if (type === "diaper") return C.daddy;
    return C.ink;
  };
  const typeLabel = (type) => type === "breastfeed" ? "Breastfeed" : type[0].toUpperCase() + type.slice(1);

  const validParsed = parsed ? parsed.filter(p => p.ok) : [];
  const errors = parsed ? parsed.filter(p => !p.ok) : [];
  const acceptedCount = validParsed.filter((_, i) => !skipped.has(i)).length;

  const toggleRow = (i) => {
    setSkipped(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const commit = () => {
    const events = validParsed.filter((_, i) => !skipped.has(i)).map(p => p.event);
    onCommit(events);
  };

  return (
    <ModalShell C={C} onClose={onClose} title={parsed ? `Preview · ${acceptedCount} of ${validParsed.length}` : "Bulk import"}>
      {!parsed ? (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
            Paste your log below. The parser handles dates, times (single or ranges),
            oz, BM/Formula, and the "Yes" diaper-at-same-time column.
            Tap parse → preview → confirm before adding.
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={exampleText}
            rows={14}
            style={{
              width: "100%", background: `${C.line}08`,
              border: `1px solid ${C.line}22`, borderRadius: 10,
              padding: "10px 12px", fontSize: 12, color: C.ink,
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none", resize: "vertical",
              lineHeight: 1.5,
            }}
          />
          <SubmitButton C={C} onClick={doParse} disabled={!text.trim()}>
            {!text.trim() ? "Paste something first" : "Parse →"}
          </SubmitButton>
        </>
      ) : (
        <>
          {/* Preview header — count + back-to-edit link */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 10, gap: 8, flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
              Tap a row to skip it. {errors.length > 0 && (
                <span style={{ color: C.accent }}>
                  {errors.length} line{errors.length === 1 ? "" : "s"} couldn't be parsed.
                </span>
              )}
            </div>
            <button onClick={() => { setParsed(null); setSkipped(new Set()); }} style={{
              background: "transparent", border: "none", color: C.accent,
              fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "inherit",
            }}>
              ← back to edit
            </button>
          </div>

          {/* Errors first, if any */}
          {errors.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                color: C.accent, fontWeight: 700, marginBottom: 6,
              }}>
                couldn't parse · {errors.length}
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {errors.map((e, i) => (
                  <div key={i} style={{
                    background: `${C.accent}08`,
                    border: `1px solid ${C.accent}22`,
                    borderRadius: 8, padding: "6px 10px",
                    fontSize: 11, color: C.muted, lineHeight: 1.4,
                  }}>
                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>{e.raw.trim()}</code>
                    <div style={{ fontStyle: "italic", marginTop: 2 }}>→ {e.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid rows — tap to toggle inclusion */}
          {validParsed.length > 0 && (
            <div style={{
              fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
              color: C.muted, fontWeight: 700, marginBottom: 6,
            }}>
              parsed · {validParsed.length}
            </div>
          )}
          <div style={{ display: "grid", gap: 4, marginBottom: 14, maxHeight: 360, overflowY: "auto" }}>
            {validParsed.map((p, i) => {
              const isSkipped = skipped.has(i);
              const ev = p.event;
              const tColor = typeColor(ev.type);
              return (
                <div key={i}
                  onClick={() => toggleRow(i)}
                  style={{
                    background: isSkipped ? `${C.line}08` : C.paper,
                    border: `1px solid ${isSkipped ? C.line + "15" : tColor + "33"}`,
                    borderLeft: `4px solid ${isSkipped ? C.line + "40" : tColor}`,
                    borderRadius: 8, padding: "8px 10px",
                    cursor: "pointer", fontFamily: "inherit",
                    opacity: isSkipped ? 0.45 : 1,
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                  {/* Inclusion checkbox */}
                  <span style={{
                    width: 16, height: 16, borderRadius: 4,
                    border: `1.5px solid ${isSkipped ? C.line + "55" : tColor}`,
                    background: isSkipped ? "transparent" : tColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {!isSkipped && <Check size={11} color="#fff" strokeWidth={3} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.4 }}>
                      <span style={{
                        fontWeight: 600, color: tColor,
                        textDecoration: isSkipped ? "line-through" : "none",
                      }}>
                        {typeLabel(ev.type)}
                      </span>
                      <span style={{ color: C.muted, marginLeft: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {fmtTs(ev.ts)}
                      </span>
                    </div>
                    {fmtDetails(ev) && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {fmtDetails(ev)}
                      </div>
                    )}
                    {p.warnings.length > 0 && (
                      <div style={{ fontSize: 10, color: C.accent, marginTop: 2, fontStyle: "italic" }}>
                        {p.warnings.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <SubmitButton C={C} onClick={commit} disabled={acceptedCount === 0}>
            {acceptedCount === 0 ? "Nothing to add" : `Add ${acceptedCount} ${acceptedCount === 1 ? "entry" : "entries"}`}
          </SubmitButton>
        </>
      )}
    </ModalShell>
  );
}

// ---- Log picker sheet (single entry point) ----------------------------
function LogPickerSheet({ C, onClose, onPick, loggerType, onSubmit, lastFeed, lastPump, activeBfTimer, setActiveBfTimer, activeActivity, setActiveActivity, addNote, addMeeting, liveInventory, onOpenTimeBank, onOpenBulkImport, currentUser, flaggedNotes, updateNote }) {
  if (loggerType) {
    return (
      <ModalShell C={C} onClose={onClose} title={
        loggerType === "feed" ? "Log bottle feed"
        : loggerType === "breastfeed" ? "Log breastfeed"
        : loggerType === "pump" ? "Log pump"
        : loggerType === "diaper" ? "Log diaper"
        : loggerType === "activity" ? "Log activity"
        : loggerType === "note" ? "Add note / observation"
        : loggerType === "commitment" ? "Add commitment"
        : "Log sleep"
      }>
        {loggerType === "feed" && <FeedForm C={C} lastFeed={lastFeed} onSubmit={onSubmit} liveInventory={liveInventory} />}
        {loggerType === "breastfeed" && <BreastfeedForm C={C} onSubmit={onSubmit} activeTimer={activeBfTimer} setActiveTimer={setActiveBfTimer} />}
        {loggerType === "pump" && <PumpForm C={C} lastPump={lastPump} onSubmit={onSubmit} />}
        {loggerType === "diaper" && <DiaperForm C={C} onSubmit={onSubmit} />}
        {loggerType === "sleep" && <SleepForm C={C} onSubmit={onSubmit} />}
        {loggerType === "activity" && <ActivityForm C={C} onSubmit={onSubmit} activeActivity={activeActivity} setActiveActivity={setActiveActivity} />}
        {loggerType === "note" && <NoteForm C={C} onSubmit={(note) => { addNote(note); onClose(); }} flaggedNotes={flaggedNotes} updateNote={updateNote} />}
        {loggerType === "commitment" && <InlineCommitmentForm C={C} onSubmit={(m) => { addMeeting(m); onClose(); }} currentUser={currentUser} />}
      </ModalShell>
    );
  }

  return (
    <ModalShell C={C} onClose={onClose} title="What just happened?">
      <div style={{ display: "grid", gap: 10 }}>
        <PickerOption C={C} icon={<Milk size={22} />} label="Bottle feed" sub="oz, BM or formula" onClick={() => onPick("feed")} color={C.accent} />
        <PickerOption C={C} icon={<Baby size={22} />} label="Diaper" sub="wet, dirty, both" onClick={() => onPick("diaper")} color={C.daddy} />
        <PickerOption C={C} icon={<Droplet size={22} />} label="Pump" sub="standard or power pump" onClick={() => onPick("pump")} color={C.mommy} />
        <PickerOption C={C} icon={<Heart size={22} />} label="Breastfeed" sub="L/R timer" onClick={() => onPick("breastfeed")} color={C.mommy} />
        <PickerOption C={C} icon={<Moon size={22} />} label="Sleep" sub="down or awake" onClick={() => onPick("sleep")} color={C.ink} />
        <PickerOption C={C} icon={<Star size={22} />} label="Activity" sub="tummy time, reading, etc." onClick={() => onPick("activity")} color={C.daddy} />
        <PickerOption C={C} icon={<MessageSquare size={22} />} label="Note / observation" sub="optional 🚩 to flag as concern" onClick={() => onPick("note")} color={C.accent} />
        <PickerOption C={C} icon={<Calendar size={22} />} label="Meeting / appointment" sub="auto-adjusts shifts" onClick={() => onPick("commitment")} color={C.ink} />
      </div>

      {/* Time bank quick-actions — visually subordinate pills below the main
          picker. Lower frequency than baby-care logging, so smaller targets,
          paired in a row to save vertical space. Tapping opens the existing
          Time Bank modal in the right mode. */}
      {onOpenTimeBank && (
        <>
          <div style={{
            margin: "16px 0 10px",
            height: 1,
            background: `${C.line}15`,
          }} />
          <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            Time bank
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => onOpenTimeBank("gift")}
              style={{
                background: C.paper,
                border: `1px solid ${C.line}20`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8,
                color: C.ink,
                textAlign: "left",
              }}>
              <Gift size={16} style={{ color: C.gold, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Gift time</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>no payback</div>
              </div>
            </button>
            <button
              onClick={() => onOpenTimeBank("payback")}
              style={{
                background: C.paper,
                border: `1px solid ${C.line}20`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8,
                color: C.ink,
                textAlign: "left",
              }}>
              <Check size={16} style={{ color: "#5C8E5C", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Pay back</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>settle a debt</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Bulk import — for catching up after a backlog. Single full-width
          pill, separate visual section so it doesn't compete with the time
          bank pair. Lowest-frequency action on this sheet, so smallest
          target and dashed border to read as "occasional / utility". */}
      {onOpenBulkImport && (
        <>
          <div style={{
            margin: "14px 0 10px",
            height: 1,
            background: `${C.line}15`,
          }} />
          <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            Catch up
          </div>
          <button
            onClick={onOpenBulkImport}
            style={{
              background: C.paper,
              border: `1px dashed ${C.line}33`,
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 10,
              color: C.ink,
              textAlign: "left",
              width: "100%",
            }}>
            <FileText size={16} style={{ color: C.accent, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Bulk import</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                paste a free-form log · parser handles the rest
              </div>
            </div>
            <ChevronRight size={14} color={C.muted} style={{ flexShrink: 0 }} />
          </button>
        </>
      )}
    </ModalShell>
  );
}

// Canonical commitment form — used by both the LOG sheet and the Shifts tab's
// "Add commitment" button (via AddMeetingModal which wraps this in a ModalShell).
// Single source of truth for commitment creation: change the form here and both
// entry points update.
function InlineCommitmentForm({ C, onSubmit, currentUser }) {
  const PRESETS = [
    { id: "meeting_red",    label: "Work meeting",    emoji: "🔴", level: "red",    duration: 60 },
    { id: "meeting_yellow", label: "Work meeting",    emoji: "🟡", level: "yellow", duration: 60 },
    { id: "meeting_green",  label: "Work meeting",    emoji: "🟢", level: "green",  duration: 60 },
    { id: "doctor",         label: "Doctor visit",    emoji: "🩺", level: "red",    duration: 60 },
    { id: "personal",       label: "Personal appt",   emoji: "📅", level: "red",    duration: 120 },
    { id: "errand",         label: "Quick errand",    emoji: "🛒", level: "yellow", duration: 30 },
    { id: "friends",        label: "Friends / social", emoji: "🍷", level: "red",    duration: 180 },
    { id: "flex_out",       label: "Going out",       emoji: "🚪", level: "red",    duration: 120, flex: true },
  ];
  const DURATIONS = [
    { v: 30,  l: "30m" },
    { v: 60,  l: "1h" },
    { v: 90,  l: "1.5h" },
    { v: 120, l: "2h" },
    { v: 180, l: "3h" },
  ];

  // Defaults: current user's calendar, red level, start = next half hour,
  // duration = 1 hour. These cover the most common case so most adds become
  // "tap preset → tap save."
  const [presetId, setPresetId] = useState(null);
  const [parent, setParent] = useState(currentUser || "Mommy");
  const [level, setLevel] = useState("red");
  const [isFlex, setIsFlex] = useState(false);
  const [start, setStart] = useState(() => {
    const d = new Date();
    if (d.getMinutes() > 30) { d.setHours(d.getHours() + 1); d.setMinutes(0); }
    else { d.setMinutes(30); }
    return d.toISOString().slice(0, 16);
  });
  const [durationMin, setDurationMin] = useState(60);
  const [customDurationOpen, setCustomDurationOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Compute end from start + duration. The end is implicit, no separate input.
  const computedEnd = useMemo(() => {
    const startD = new Date(start);
    const endD = new Date(startD.getTime() + durationMin * 60000);
    return endD;
  }, [start, durationMin]);

  const applyPreset = (p) => {
    setPresetId(p.id);
    setLevel(p.level);
    setIsFlex(p.flex || false);
    setDurationMin(p.duration);
    if (!label) setLabel(p.label);
  };

  const partner = parent === "Mommy" ? "Daddy" : "Mommy";
  const partnerColor = partner === "Mommy" ? C.mommy : C.daddy;
  const parentColor = parent === "Mommy" ? C.mommy : C.daddy;

  return (
    <>
      {/* Quick presets — first thing the user sees. Tapping one auto-fills
          label, level, duration, flex. Most adds end after this + start time + save. */}
      <Field C={C} label="What is it?">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p)} style={{
              background: presetId === p.id ? `${C.accent}22` : C.bg,
              color: C.ink,
              border: `1.5px solid ${presetId === p.id ? C.accent : C.line + "22"}`,
              borderRadius: 10, padding: "8px 10px", cursor: "pointer",
              textAlign: "left", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500,
              minHeight: 44, // consistent target height regardless of subtitle
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{p.emoji}</span>
              <span style={{ minWidth: 0, lineHeight: 1.15 }}>
                <div>{p.label}</div>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
                  {p.level === "red" && "no baby"}
                  {p.level === "yellow" && "partial"}
                  {p.level === "green" && "ok with baby"}
                  {p.flex && " · flex"}
                </div>
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* Label — pre-filled by preset, customizable */}
      <Field C={C} label="Label">
        <TextInput C={C} value={label} onChange={setLabel} placeholder={isFlex ? "e.g. Coffee with Rachel" : "e.g. Lab meeting at 9"} />
      </Field>

      {/* Start time — single picker */}
      <Field C={C} label="Start">
        <DateTimeInput C={C} value={start} onChange={setStart} />
      </Field>

      {/* Duration as quick pills + custom — replaces explicit end picker.
          The 'Custom' pill at the end opens a free-form minutes input so
          users can enter 45m, 2h 30m, etc. without being boxed in by the
          presets. */}
      <Field C={C} label={`Duration · ends ${computedEnd.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${isFlex ? " (flexible)" : ""}`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {DURATIONS.map(d => (
            <button key={d.v} onClick={() => { setDurationMin(d.v); setCustomDurationOpen(false); }} style={{
              background: durationMin === d.v && !customDurationOpen ? C.accent : C.bg,
              color: durationMin === d.v && !customDurationOpen ? "#fff" : C.ink,
              border: `1.5px solid ${durationMin === d.v && !customDurationOpen ? C.accent : C.line + "22"}`,
              borderRadius: 8, padding: "10px 4px", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              fontFamily: "inherit",
            }}>{d.l}</button>
          ))}
          <button onClick={() => setCustomDurationOpen(v => !v)} style={{
            background: customDurationOpen ? C.accent : C.bg,
            color: customDurationOpen ? "#fff" : C.ink,
            border: `1.5px dashed ${customDurationOpen ? C.accent : C.line + "55"}`,
            borderRadius: 8, padding: "10px 4px", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
            fontFamily: "inherit",
          }}>Custom</button>
        </div>
        {customDurationOpen && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              min={5}
              max={720}
              step={5}
              value={durationMin}
              onChange={e => setDurationMin(Math.max(5, Math.min(720, Number(e.target.value) || 0)))}
              style={{
                width: 90, padding: "8px 10px", fontSize: 14,
                background: C.bg, border: `1.5px solid ${C.accent}`,
                borderRadius: 8, color: C.ink, outline: "none",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              autoFocus
            />
            <span style={{ fontSize: 12, color: C.muted }}>
              minutes ({Math.floor(durationMin / 60)}h {durationMin % 60}m)
            </span>
          </div>
        )}
      </Field>

      {/* Advanced options — collapsed by default. Most adds don't need to
          touch parent/level/flex; the defaults (current user, red, fixed end)
          are right ~80% of the time. */}
      <button onClick={() => setShowAdvanced(v => !v)} style={{
        background: "transparent", border: "none", color: C.muted,
        fontSize: 11, cursor: "pointer", fontFamily: "inherit",
        marginBottom: 8, padding: "4px 0",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {showAdvanced ? "▾" : "▸"} {showAdvanced ? "Hide" : "Advanced"} · whose calendar, availability, flex
      </button>

      {showAdvanced && (
        <div style={{
          background: C.paper,
          border: `1px solid ${C.line}15`,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
        }}>
          <Field C={C} label="Whose calendar?">
            <SegControl C={C} value={parent} onChange={setParent} options={[
              { v: "Mommy", l: "Mommy", color: C.mommy },
              { v: "Daddy", l: "Daddy", color: C.daddy },
            ]} />
            {parent !== currentUser && currentUser && (
              <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 4 }}>
                logging on behalf of {parent} (you're {currentUser})
              </div>
            )}
          </Field>

          <Field C={C} label="Availability for baby">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[
                { v: "red", l: "Red", c: "#C44545", sub: "no baby" },
                { v: "yellow", l: "Yellow", c: "#D4A03A", sub: "partial" },
                { v: "green", l: "Green", c: "#5C8E5C", sub: "ok" },
              ].map(o => (
                <button key={o.v} onClick={() => setLevel(o.v)} style={{
                  background: level === o.v ? o.c : "transparent",
                  color: level === o.v ? "#fff" : C.ink,
                  border: `1.5px solid ${level === o.v ? o.c : C.line + "33"}`,
                  borderRadius: 8, padding: "10px 6px", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                }}>
                  {o.l}
                  <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>{o.sub}</div>
                </button>
              ))}
            </div>
          </Field>

          <button
            onClick={() => setIsFlex(v => !v)}
            style={{
              width: "100%",
              background: isFlex ? `${C.accent}15` : "transparent",
              border: `1px ${isFlex ? "solid" : "dashed"} ${isFlex ? C.accent : C.line + "33"}`,
              borderRadius: 10, padding: "10px 12px",
              color: isFlex ? C.accent : C.muted,
              fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
              fontFamily: "inherit",
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${isFlex ? C.accent : C.line + "55"}`,
              background: isFlex ? C.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              {isFlex && <Check size={12} color="#fff" strokeWidth={3} />}
            </span>
            <span style={{ lineHeight: 1.4 }}>
              <strong style={{ fontSize: 12 }}>Flexible end time</strong>
              <span style={{ display: "block", fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                update later if you're back early or stay longer
              </span>
            </span>
          </button>
        </div>
      )}

      <SubmitButton C={C} onClick={() => {
        if (!label.trim()) return;
        onSubmit({
          parent, level, label: label.trim(),
          start: new Date(start).toISOString(),
          end: computedEnd.toISOString(),
          flex: isFlex,
        });
      }} disabled={!label.trim()}>
        {!label.trim() ? "Add a label first" : `Save · ${parent} · ${durationMin}m`}
      </SubmitButton>
    </>
  );
}

function PickerOption({ C, icon, label, sub, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: C.bg, border: `1px solid ${C.line}22`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: "14px 16px", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 14, textAlign: "left", color: C.ink,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: `${color}22`, color,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 500, lineHeight: 1.1 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <ChevronRight size={18} color={C.muted} />
    </button>
  );
}

// ---- Forms ------------------------------------------------------------
function ModalShell({ C, onClose, title, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        background: C.paper, color: C.ink,
        width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        padding: "20px 18px 28px",
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ width: 36, height: 4, background: `${C.line}33`, borderRadius: 2 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500, margin: 0, fontStyle: "italic" }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            background: `${C.line}11`, border: "none", borderRadius: "50%",
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.ink,
          }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Soft prompt that fires automatically at handoff
function HandoffPromptModal({ C, fromParent, toParent, existingText, onClose, onSubmit, onSkip }) {
  const [text, setText] = useState(existingText || "");
  const fromColor = fromParent === "Mommy" ? C.mommy : C.daddy;
  const toColor = toParent === "Mommy" ? C.mommy : C.daddy;

  return (
    <ModalShell C={C} onClose={onClose} title={`Handoff to ${toParent}`}>
      <div style={{
        background: `${fromColor}15`, borderRadius: 10, padding: 12, marginBottom: 14,
        border: `1px solid ${fromColor}33`, fontSize: 13, color: C.ink, lineHeight: 1.5,
      }}>
        <strong style={{ color: fromColor }}>{fromParent}</strong>, your shift just ended. Anything <strong style={{ color: toColor }}>{toParent}</strong> should know? (mood, last feed details, what's coming up, things that worked…)
      </div>
      <Field C={C} label={`Note for ${toParent}`}>
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
          placeholder="e.g. She was super fussy until I found the white-noise playlist on the speaker. Pump bottle in the fridge labeled 6oz. Next bath is full tonight."
          style={{
            width: "100%", background: `${C.line}08`, border: `1px solid ${C.line}22`,
            borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.ink, fontFamily: "inherit",
            outline: "none", resize: "vertical", minHeight: 100,
          }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
        <button onClick={onSkip} style={{
          background: "transparent", color: C.muted, border: `1px solid ${C.line}33`,
          padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>
          Skip
        </button>
        <button onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()} style={{
          background: text.trim() ? toColor : `${C.line}22`, color: text.trim() ? "#fff" : C.muted,
          border: "none", padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: text.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <MessageSquare size={14} /> Send to {toParent}
        </button>
      </div>
    </ModalShell>
  );
}

// Always-available note editor (from the persistent button on the on-duty card)
function HandoffNoteEditor({ C, fromParent, toParent, existingText, onClose, onSubmit, onClear }) {
  const [text, setText] = useState(existingText || "");
  const toColor = toParent === "Mommy" ? C.mommy : C.daddy;
  const isEditing = !!existingText;

  return (
    <ModalShell C={C} onClose={onClose} title={isEditing ? `Edit note for ${toParent}` : `Note for ${toParent}`}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Drop a note for <strong style={{ color: toColor }}>{toParent}</strong> — something they should see when their shift starts. They'll see it inline on the on-duty card and can acknowledge it with one tap.
      </div>
      <Field C={C} label={`Note text`}>
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
          placeholder="e.g. She refused the 5oz bottle but took 3oz; might want food earlier than usual"
          style={{
            width: "100%", background: `${C.line}08`, border: `1px solid ${C.line}22`,
            borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.ink, fontFamily: "inherit",
            outline: "none", resize: "vertical", minHeight: 100,
          }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: isEditing ? "1fr 2fr" : "1fr", gap: 8 }}>
        {isEditing && (
          <button onClick={onClear} style={{
            background: "transparent", color: C.muted, border: `1px solid ${C.line}33`,
            padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>
            <Trash2 size={13} /> Clear
          </button>
        )}
        <button onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()} style={{
          background: text.trim() ? toColor : `${C.line}22`, color: text.trim() ? "#fff" : C.muted,
          border: "none", padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: text.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Check size={14} /> {isEditing ? "Update note" : `Save for ${toParent}`}
        </button>
      </div>
    </ModalShell>
  );
}

function FeedForm({ C, lastFeed, onSubmit, liveInventory }) {
  const [oz, setOz] = useState(lastFeed?.oz || 5);
  const [source, setSource] = useState(lastFeed?.source || "BM");
  const [time, setTime] = useState("now");
  const [customTime, setCustomTime] = useState(localDateTimeNow);
  const [selectedBottleId, setSelectedBottleId] = useState(null);
  // When user explicitly taps "none of these," we want that choice to STICK —
  // otherwise the auto-pick effect below re-selects the first bottle on every
  // re-render and the button appears broken.
  const [userClearedSelection, setUserClearedSelection] = useState(false);
  const [dreamFeed, setDreamFeed] = useState(false);

  // Available BM bottles (RT first, then fridge, both ordered oldest first)
  const usesBM = source === "BM" || source === "BM+Formula";
  const availableBottles = useMemo(() => {
    if (!liveInventory) return [];
    const valid = liveInventory.filter(i => !i.expired);
    const rt = valid.filter(i => i.location === "rt").sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));
    const fr = valid.filter(i => i.location === "fridge").sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));
    return [...rt, ...fr];
  }, [liveInventory]);

  // Auto-pick the most-likely bottle: oldest RT (use up first), or oldest fridge if no RT.
  // Only runs when the user hasn't yet made an explicit choice (including "none").
  useEffect(() => {
    if (!usesBM) { setSelectedBottleId(null); return; }
    if (selectedBottleId) return;
    if (userClearedSelection) return; // respect explicit "none of these"
    if (availableBottles.length > 0) setSelectedBottleId(availableBottles[0].id);
  }, [usesBM, availableBottles, selectedBottleId, userClearedSelection]);

  return (
    <>
      <Field C={C} label="Volume (oz)">
        <BigOzPicker C={C} value={oz} onChange={setOz} />
      </Field>
      <Field C={C} label="Source">
        <SegControl C={C} value={source} onChange={setSource} options={[
          { v: "BM", l: "Breast milk" },
          { v: "Formula", l: "Formula" },
          { v: "BM+Formula", l: "Mix" },
        ]} />
      </Field>

      {usesBM && availableBottles.length > 0 && (
        <Field C={C} label="Which bottle did you use?">
          <div style={{ display: "grid", gap: 6 }}>
            {availableBottles.map(b => {
              const pumpedAt = new Date(b.pumpedAt);
              const isSelected = selectedBottleId === b.id;
              const locColor = b.location === "rt" ? "#D4A03A" : C.daddy;
              return (
                <button key={b.id}
                  onClick={() => { setSelectedBottleId(b.id); setUserClearedSelection(false); }}
                  style={{
                    background: isSelected ? `${locColor}22` : C.bg,
                    border: `1.5px solid ${isSelected ? locColor : C.line + "22"}`,
                    borderRadius: 10, padding: "10px 12px",
                    cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: locColor, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    flexShrink: 0,
                  }}>{b.location === "rt" ? "RT" : "Fr"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>
                      {b.oz} oz · pumped {fmtTimeShort(pumpedAt)}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {b.location === "rt"
                        ? `expires ${fmtTimeShort(new Date(pumpedAt.getTime() + BM_RT_HOURS_HARD * 3600000))} · ${fmtHours(b.remaining)} left`
                        : `fridge · ${b.remaining.toFixed(0)}h left`}
                    </div>
                  </div>
                  {isSelected && <Check size={16} color={locColor} />}
                </button>
              );
            })}
            <button
              onClick={() => { setSelectedBottleId(null); setUserClearedSelection(true); }}
              style={{
                background: userClearedSelection ? `${C.accent}15` : "transparent",
                border: `1px ${userClearedSelection ? "solid" : "dashed"} ${userClearedSelection ? C.accent : C.line + "33"}`,
                borderRadius: 10,
                padding: "10px 12px", fontSize: 12, cursor: "pointer",
                color: userClearedSelection ? C.accent : C.muted,
                fontStyle: "italic",
                fontWeight: userClearedSelection ? 600 : 400,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: "inherit",
              }}>
              {userClearedSelection && <Check size={14} />}
              {userClearedSelection ? "Skipping inventory deduction" : "None of these · don't deduct from inventory"}
            </button>
          </div>
        </Field>
      )}

      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime} />

      {/* Dream-feed checkbox: a feed during sleep that doesn't actually wake the baby */}
      <button
        onClick={() => setDreamFeed(v => !v)}
        style={{
          width: "100%", marginBottom: 12,
          background: dreamFeed ? `${C.daddy}15` : "transparent",
          border: `1px ${dreamFeed ? "solid" : "dashed"} ${dreamFeed ? C.daddy : C.line + "33"}`,
          borderRadius: 10, padding: "10px 12px",
          color: dreamFeed ? C.daddy : C.muted,
          fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
          fontFamily: "inherit",
        }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${dreamFeed ? C.daddy : C.line + "55"}`,
          background: dreamFeed ? C.daddy : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}>
          {dreamFeed && <Check size={12} color="#fff" strokeWidth={3} />}
        </span>
        <span style={{ lineHeight: 1.4 }}>
          <strong style={{ fontSize: 12 }}>Dream feed</strong> · she stayed asleep through this feed
          <span style={{ display: "block", fontSize: 10, opacity: 0.8, marginTop: 2 }}>
            check this if she didn't wake up — otherwise we'll auto-log a wake event
          </span>
        </span>
      </button>

      <SubmitButton C={C} onClick={() => onSubmit({
        type: "feed", oz: Number(oz), source,
        ts: time === "now" ? new Date() : new Date(customTime),
        usedBottleId: selectedBottleId,
        dreamFeed,
      })}>Log feed</SubmitButton>
    </>
  );
}

function BreastfeedForm({ C, onSubmit, activeTimer, setActiveTimer }) {
  // Two timers: left and right
  const [leftSec, setLeftSec] = useState(activeTimer?.leftSec || 0);
  const [rightSec, setRightSec] = useState(activeTimer?.rightSec || 0);
  const [running, setRunning] = useState(activeTimer?.running || null); // 'left' | 'right' | null
  const [time, setTime] = useState("now");
  const [customTime, setCustomTime] = useState(localDateTimeNow);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (running === "left") setLeftSec(s => s + 1);
        else setRightSec(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Persist active timer
  useEffect(() => {
    setActiveTimer({ leftSec, rightSec, running });
  }, [leftSec, rightSec, running]);

  const fmtSec = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  const totalMin = Math.round((leftSec + rightSec) / 60);
  const kcal = Math.round(totalMin * KCAL_PER_BF_MINUTE);

  const reset = () => { setLeftSec(0); setRightSec(0); setRunning(null); };

  return (
    <>
      <div style={{ background: `${C.mommy}15`, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.mommy}33` }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.mommy, fontWeight: 600, marginBottom: 4 }}>
          Total session
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 500, color: C.mommy, lineHeight: 1 }}>
            {Math.floor((leftSec + rightSec) / 60)}:{pad((leftSec + rightSec) % 60)}
          </span>
          <span style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
            <Flame size={11} /> ~{kcal} kcal
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { side: "left", label: "Left", sec: leftSec },
          { side: "right", label: "Right", sec: rightSec },
        ].map(({ side, label, sec }) => (
          <div key={side} style={{
            background: running === side ? C.mommy : C.bg,
            color: running === side ? "#fff" : C.ink,
            borderRadius: 12, padding: 16,
            border: `2px solid ${running === side ? C.mommy : C.line + "22"}`,
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, opacity: 0.8 }}>
              {label}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 500, marginTop: 4, marginBottom: 10 }}>
              {fmtSec(sec)}
            </div>
            <button onClick={() => setRunning(running === side ? null : side)} style={{
              width: "100%",
              background: running === side ? "#fff" : C.mommy, color: running === side ? C.mommy : "#fff",
              border: "none", borderRadius: 8, padding: "10px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {running === side ? <><Pause size={14} /> Pause</> : <><Play size={14} /> {sec > 0 ? "Resume" : "Start"}</>}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={reset} style={{
          flex: 1, background: "transparent", color: C.muted,
          border: `1px solid ${C.line}33`, borderRadius: 8,
          padding: "10px", fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime} label="When did this end?" />

      <SubmitButton C={C} onClick={() => {
        if (leftSec + rightSec === 0) return;
        onSubmit({
          type: "breastfeed",
          leftMin: Math.round(leftSec / 60),
          rightMin: Math.round(rightSec / 60),
          totalDurationMin: totalMin,
          ts: time === "now" ? new Date() : new Date(customTime),
        });
        reset();
      }} disabled={leftSec + rightSec === 0}>
        {leftSec + rightSec === 0 ? "Start a timer first" : `Save ${totalMin}m breastfeed`}
      </SubmitButton>
    </>
  );
}

function PumpForm({ C, lastPump, onSubmit }) {
  const [oz, setOz] = useState(lastPump?.oz || 4);
  const [duration, setDuration] = useState(lastPump?.durationMin || 20);
  const [mode, setMode] = useState("end"); // logging when pump ENDED (default) or START
  const [location, setLocation] = useState("rt"); // rt | fridge | freezer
  const [pumpType, setPumpType] = useState("standard"); // 'standard' | 'power'
  const [time, setTime] = useState("now");
  const [customTime, setCustomTime] = useState(localDateTimeNow);

  // Power pump = 60 min total: 20 on / 10 off / 10 on / 10 off / 10 on
  // When user toggles to power pump, default duration to 60 min
  useEffect(() => {
    if (pumpType === "power" && duration < 50) setDuration(60);
    if (pumpType === "standard" && duration === 60) setDuration(20);
  }, [pumpType]); // eslint-disable-line

  const kcal = Math.round(oz * KCAL_PER_OZ_BM);
  const startTime = mode === "end" ? new Date(Date.now() - duration * 60000) : new Date();
  const nextPump = new Date(startTime.getTime() + PUMP_INTERVAL_HRS * 3600000);

  const locInfo = {
    rt:      { label: "Room temp",  short: "RT",     hours: "4 hrs" },
    fridge:  { label: "Fridge",     short: "Fridge", hours: "96 hrs (4 days)" },
    freezer: { label: "Freezer",    short: "Freezer", hours: "6 months" },
  }[location];

  return (
    <>
      <Field C={C} label="Pump type">
        <SegControl C={C} value={pumpType} onChange={setPumpType} options={[
          { v: "standard", l: "Standard" },
          { v: "power", l: "Power pump" },
        ]} />
        {pumpType === "power" && (
          <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>
            60 min protocol: 20 on · 10 off · 10 on · 10 off · 10 on. Mimics cluster feeding to boost supply.
          </div>
        )}
      </Field>

      <Field C={C} label="Logging this as">
        <SegControl C={C} value={mode} onChange={setMode} options={[
          { v: "end", l: "Just finished" },
          { v: "start", l: "Just starting" },
        ]} />
      </Field>

      {mode === "end" && (
        <Field C={C} label="Duration (minutes)">
          <BigNumberPicker C={C} value={duration} onChange={setDuration} step={5}
            presets={pumpType === "power" ? [50, 55, 60, 65, 70] : [10, 15, 20, 25, 30, 45]}
            unit="MINUTES" />
        </Field>
      )}

      <Field C={C} label={mode === "end" ? "Volume pumped (oz)" : "Estimated volume target (oz)"}>
        <BigOzPicker C={C} value={oz} onChange={setOz} />
      </Field>

      {mode === "end" && (
        <Field C={C} label="Where are you storing it?">
          <SegControl C={C} value={location} onChange={setLocation} options={[
            { v: "rt", l: "Room temp" },
            { v: "fridge", l: "Fridge" },
            { v: "freezer", l: "Freezer" },
          ]} />
          <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>
            {location === "rt"
              ? "Use within 4 hours · Daddy can grab it without asking"
              : location === "fridge"
              ? "Keeps up to 96 hours (4 days) — great for next-day feeds"
              : "Long-term storage — up to 6 months. Thaw in the fridge before use."}
          </div>
        </Field>
      )}

      <div style={{ background: `${C.mommy}15`, borderRadius: 10, padding: 12, fontSize: 13, color: C.ink, marginBottom: 8, border: `1px solid ${C.mommy}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Flame size={14} color={C.mommy} />
          <strong>~{kcal} kcal burned</strong> from this pump
          {pumpType === "power" && <span style={{ fontSize: 11, color: C.mommy, fontStyle: "italic" }}>· power pump</span>}
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          next pump due: <strong style={{ color: C.ink }}>{fmtTime12(nextPump)}</strong> · 3hr from start ({fmtTimeShort(startTime)})
        </div>
      </div>

      {mode === "end" && (
        <div style={{ background: `${C.accent}11`, borderRadius: 10, padding: 10, fontSize: 12, color: C.muted, marginBottom: 12 }}>
          Adding {oz}oz to <strong>{locInfo.label}</strong> · keeps {locInfo.hours}
        </div>
      )}

      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime}
        label={mode === "end" ? "When did you finish?" : "When did you start?"} />

      <SubmitButton C={C} onClick={() => onSubmit({
        type: "pump",
        oz: Number(oz),
        durationMin: Number(duration),
        mode,
        pumpType,
        location: mode === "end" ? location : null,
        ts: time === "now" ? new Date() : new Date(customTime),
      })}>Log {pumpType === "power" ? "power pump" : "pump"}</SubmitButton>
    </>
  );
}

function DiaperForm({ C, onSubmit }) {
  const [kind, setKind] = useState("wet");
  const [time, setTime] = useState("now");
  const [customTime, setCustomTime] = useState(localDateTimeNow);
  return (
    <>
      <Field C={C} label="Kind">
        <SegControl C={C} value={kind} onChange={setKind} options={[
          { v: "wet", l: "Wet 💧" },
          { v: "dirty", l: "Dirty 💩" },
          { v: "both", l: "Both" },
        ]} />
      </Field>
      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime} />
      <SubmitButton C={C} onClick={() => onSubmit({
        type: "diaper", notes: kind,
        ts: time === "now" ? new Date() : new Date(customTime),
      })}>Log diaper</SubmitButton>
    </>
  );
}

function SleepForm({ C, onSubmit }) {
  const [time, setTime] = useState("now");
  const [customTime, setCustomTime] = useState(localDateTimeNow);
  const submit = (type) => onSubmit({
    type,
    ts: time === "now" ? new Date() : new Date(customTime),
  });
  return (
    <>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>What just happened?</div>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <button onClick={() => submit("sleep_down")} style={{
          background: C.ink, color: C.paper, border: "none",
          padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
        }}>
          <Moon size={18} /> Down for sleep
        </button>
        <button onClick={() => submit("sleep_up")} style={{
          background: C.accent, color: "#fff", border: "none",
          padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
        }}>
          <Sun size={18} /> Awake
        </button>
      </div>
      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime} />
    </>
  );
}

function ActivityForm({ C, onSubmit, activeActivity, setActiveActivity }) {
  const [picked, setPicked] = useState(activeActivity?.type || ACTIVITIES[0].v);
  const [duration, setDuration] = useState(10);
  const [running, setRunning] = useState(activeActivity ? activeActivity.type === picked : false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [time, setTime] = useState("now");
  const [customTime, setCustomTime] = useState(localDateTimeNow);
  const intervalRef = useRef(null);

  // If there's an active activity, sync elapsed
  useEffect(() => {
    if (activeActivity && activeActivity.type === picked) {
      const sec = Math.floor((Date.now() - new Date(activeActivity.startedAt).getTime()) / 1000);
      setElapsedSec(sec);
      setRunning(true);
    } else {
      setElapsedSec(0);
      setRunning(false);
    }
  }, [picked, activeActivity]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const startTimer = () => {
    setActiveActivity({ type: picked, startedAt: new Date().toISOString() });
    setElapsedSec(0);
    setRunning(true);
  };

  const stopAndSave = () => {
    const mins = Math.max(1, Math.round(elapsedSec / 60));
    onSubmit({
      type: "activity",
      activityType: picked,
      durationMin: mins,
    });
    setActiveActivity(null);
    setRunning(false);
    setElapsedSec(0);
  };

  const fmtSec = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  const activityInfo = ACTIVITIES.find(a => a.v === picked);

  return (
    <>
      <Field C={C} label="What activity?">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {ACTIVITIES.map(a => (
            <button key={a.v} onClick={() => setPicked(a.v)} style={{
              background: picked === a.v ? a.color : C.bg,
              color: picked === a.v ? "#fff" : C.ink,
              border: `1.5px solid ${picked === a.v ? a.color : C.line + "22"}`,
              borderRadius: 10, padding: "12px 8px", cursor: "pointer",
              fontSize: 13, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start",
            }}>
              <span style={{ fontSize: 18 }}>{a.emoji}</span>
              <span>{a.l}</span>
            </button>
          ))}
        </div>
      </Field>

      <div style={{
        background: `${activityInfo.color}15`,
        border: `1px solid ${activityInfo.color}44`,
        borderRadius: 12, padding: 16, marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: activityInfo.color, fontWeight: 600 }}>
          Live timer
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 500, color: activityInfo.color, marginTop: 4 }}>
          {fmtSec(elapsedSec)}
        </div>
        {!running ? (
          <button onClick={startTimer} style={{
            marginTop: 10, width: "100%",
            background: activityInfo.color, color: "#fff", border: "none",
            padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Play size={14} /> Start timer
          </button>
        ) : (
          <button onClick={stopAndSave} style={{
            marginTop: 10, width: "100%",
            background: C.paper, color: activityInfo.color, border: `1px solid ${activityInfo.color}`,
            padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Pause size={14} /> Stop & save ({Math.max(1, Math.round(elapsedSec / 60))} min)
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 8 }}>or log it manually</div>

      <Field C={C} label="Manual duration (minutes)">
        <BigNumberPicker C={C} value={duration} onChange={setDuration} step={1} presets={[5, 10, 15, 20, 30]} unit="MINUTES" />
      </Field>
      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime} label="When did this end?" />
      <SubmitButton C={C} onClick={() => onSubmit({
        type: "activity",
        activityType: picked,
        durationMin: Number(duration),
        ts: time === "now" ? new Date() : new Date(customTime),
      })}>
        Log {duration}m {activityInfo.l.toLowerCase()}
      </SubmitButton>
    </>
  );
}

function NoteForm({ C, onSubmit, initial, flaggedNotes, updateNote }) {
  const [category, setCategory] = useState(initial?.category || "development");
  const [text, setText] = useState(initial?.text || "");
  const [flagged, setFlagged] = useState(initial?.flagged || false);
  // After user taps Save with flag on, we go into a "dedup prompt" step
  // showing prior flagged concerns so they can be marked as recurrence.
  // null = filling form; "asking" = showing dedup choices.
  const [step, setStep] = useState("form");

  // Filter flagged notes that exist in the same category (more likely to be
  // actual recurrences). Sort by recency. Cap at 5 to avoid wall-of-text.
  const matchCandidates = useMemo(() => {
    if (!flaggedNotes || flaggedNotes.length === 0) return [];
    return flaggedNotes
      .filter(n => n.category === category)
      .sort((a, b) => new Date(b.lastRecurrenceTs || b.ts) - new Date(a.lastRecurrenceTs || a.ts))
      .slice(0, 5);
  }, [flaggedNotes, category]);

  const handleSave = () => {
    if (!text.trim()) return;
    // Editing an existing note: skip dedup, just save
    if (initial) {
      onSubmit({ category, text: text.trim(), flagged });
      return;
    }
    // New flagged concern with prior matches: ask if it's a recurrence
    if (flagged && matchCandidates.length > 0) {
      setStep("asking");
      return;
    }
    // Otherwise just save as new
    onSubmit({ category, text: text.trim(), flagged });
  };

  const markAsRecurrence = (existingNote) => {
    // Append a new recurrence entry instead of mutating the original text.
    // Each entry preserves its own timestamp and (optional) context text.
    // The expanded view of NoteRow shows these as a per-instance list.
    const newRecurrence = {
      ts: new Date().toISOString(),
      // Only include the new text if it adds context beyond what's already
      // in the note. Otherwise leave empty — the row will render this as
      // "marked as recurring" with just the timestamp.
      text: text.trim() && text.trim() !== existingNote.text ? text.trim() : "",
    };
    const recurrences = [...(existingNote.recurrences || []), newRecurrence];
    updateNote(existingNote.id, {
      recurrences,
      // Keep recurrenceCount in sync for backwards compat with any callers
      // still reading it; new code should derive count from recurrences.length.
      recurrenceCount: recurrences.length + 1,
      lastRecurrenceTs: newRecurrence.ts,
    });
    onSubmit(null);
  };

  const saveAsNew = () => {
    onSubmit({ category, text: text.trim(), flagged });
  };

  // === Dedup prompt step ===
  if (step === "asking") {
    return (
      <>
        <div style={{
          background: `${C.accent}10`,
          border: `1px solid ${C.accent}33`,
          borderRadius: 10, padding: "12px 14px",
          marginBottom: 14,
          fontSize: 13, color: C.ink, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Is this a recurring concern?</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            You've flagged similar concerns before. Tap one to mark this as a recurrence (bumps the count), or save as a new concern.
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {matchCandidates.map(n => {
            const cat = NOTE_CATEGORIES.find(c => c.v === n.category) || NOTE_CATEGORIES[5];
            // Total instances = original + recurrences.length. Fall back to
            // the legacy recurrenceCount field for notes from older builds.
            const count = (n.recurrences ? n.recurrences.length + 1 : (n.recurrenceCount || 1));
            const lastTs = new Date(n.lastRecurrenceTs || n.ts);
            return (
              <button key={n.id} onClick={() => markAsRecurrence(n)} style={{
                background: C.paper,
                border: `1.5px solid ${C.line}22`,
                borderLeft: `4px solid ${cat.color}`,
                borderRadius: 10, padding: "10px 12px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                color: C.ink,
              }}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {n.text.split("\n")[0].slice(0, 120)}{n.text.length > 120 ? "…" : ""}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    last: {lastTs.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  {count > 1 && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: C.accent,
                      background: `${C.accent}12`,
                      padding: "1px 6px", borderRadius: 6,
                      letterSpacing: "0.04em",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {count}× already
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <SubmitButton C={C} onClick={saveAsNew}>
          Save as a new concern
        </SubmitButton>
        <button onClick={() => setStep("form")} style={{
          background: "transparent", border: "none", color: C.muted,
          width: "100%", padding: "10px 0", marginTop: 6,
          fontSize: 11, cursor: "pointer", fontFamily: "inherit",
        }}>
          ← back to edit
        </button>
      </>
    );
  }

  // === Main form step ===
  return (
    <>
      <Field C={C} label="Category">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {NOTE_CATEGORIES.map(cat => (
            <button key={cat.v} onClick={() => setCategory(cat.v)} style={{
              background: category === cat.v ? cat.color : C.bg,
              color: category === cat.v ? "#fff" : C.ink,
              border: `1.5px solid ${category === cat.v ? cat.color : C.line + "22"}`,
              borderRadius: 8, padding: "10px 4px", cursor: "pointer",
              fontSize: 12, fontWeight: 500,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontSize: 18 }}>{cat.emoji}</span>
              <span>{cat.l}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field C={C} label="Observation">
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={5}
          placeholder="e.g. Tracking objects with eyes from L to R; rolled belly to back at 3:45p; some redness on right cheek after feed..."
          style={{
            width: "100%", background: `${C.line}08`, border: `1px solid ${C.line}22`,
            borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.ink, fontFamily: "inherit",
            outline: "none", resize: "vertical", minHeight: 100,
          }} />
      </Field>

      {/* Flag — optional. Toggling it ON marks this as a concern to bring up
          at the next pediatrician visit. Surfaces in Wellness as a
          🚩 Flagged filter pill in Care notes. */}
      <button onClick={() => setFlagged(v => !v)} style={{
        width: "100%",
        background: flagged ? `${C.accent}15` : "transparent",
        border: `1px ${flagged ? "solid" : "dashed"} ${flagged ? C.accent : C.line + "33"}`,
        borderRadius: 10, padding: "10px 12px",
        color: flagged ? C.accent : C.muted,
        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
        marginBottom: 12,
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${flagged ? C.accent : C.line + "55"}`,
          background: flagged ? C.accent : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}>
          {flagged && <Check size={12} color="#fff" strokeWidth={3} />}
        </span>
        <span style={{ lineHeight: 1.4 }}>
          🚩 <strong style={{ fontSize: 12 }}>Raise with the doctor</strong>
          <span style={{ display: "block", fontSize: 10, opacity: 0.85, marginTop: 2 }}>
            mark as a concern to bring up at the next visit
          </span>
        </span>
      </button>

      <SubmitButton C={C} onClick={handleSave} disabled={!text.trim()}>
        {!text.trim() ? "Type something first"
         : initial ? "Update note"
         : (flagged && matchCandidates.length > 0) ? "Next · check for recurrence"
         : flagged ? "Save & flag for visit"
         : "Save note"}
      </SubmitButton>
    </>
  );
}

// ---- Daily intake trend chart ------------------------------------------
// 14-day rolling view of total daily intake (oz). Computed from feed events
// (which carry an explicit `oz` field) and breastfeed events (which only
// have a duration — we estimate at 1 oz per 5 minutes of nursing, the
// common pediatric reference for a 3-month-old). The estimation is
// conservative and surfaced to the user via the legend footnote so a
// data-aware viewer can judge the assumption.
//
// Visual layers (back to front):
//   1. AAP-typical band (horizontal dashed band shading the normal range)
//   2. Daily bars (terracotta, today brighter)
//   3. 7-day rolling-mean line (gold, smoothed)
//   4. Tap detail callout (when a day is selected)
//
// Statistics surfaced below the chart:
//   - 14-day median (central tendency)
//   - 14-day mean ± σ (variability)
//   - Trend direction (last-7 mean vs first-7 mean, % change)
//   - Anomaly count (days >2σ from mean — flagged in chart with ring)
//
// Hand-rolled SVG (no recharts dependency) so it themes cleanly via the
// shared C palette and stays consistent with the rest of the app's
// typography (Cormorant labels, JetBrains Mono numerics).
function DailyIntakeTrendChart({ C, events, now, ageNorms }) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);

  // BF oz estimation: standard pediatric reference is ~1 oz per 5 min for
  // a 3-month-old. We surface this in the footnote.
  const BF_OZ_PER_MIN = 1 / 5;

  // ---- Build the 14-day series ----
  const series = useMemo(() => {
    const DAYS = 14;
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Build a map: dayIdx -> { oz_bm, oz_bf, feeds_bm, feeds_bf }
    // dayIdx 0 = 13 days ago, dayIdx 13 = today
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - (DAYS - 1 - i));
      return {
        idx: i,
        date: d,
        ozBM: 0,
        ozBF: 0,
        countBM: 0,
        countBF: 0,
        hasData: false,
      };
    });

    // Map each feed/breastfeed event to its bucket
    for (const e of events) {
      if (e.type !== "feed" && e.type !== "breastfeed") continue;
      const ts = new Date(e.ts);
      const dayStart = new Date(ts);
      dayStart.setHours(0, 0, 0, 0);
      const daysAgo = Math.round((startOfToday - dayStart) / 86400000);
      const idx = (DAYS - 1) - daysAgo;
      if (idx < 0 || idx >= DAYS) continue;

      buckets[idx].hasData = true;
      if (e.type === "feed") {
        buckets[idx].ozBM += e.oz || 0;
        buckets[idx].countBM += 1;
      } else if (e.type === "breastfeed") {
        const dur = e.totalDurationMin || 0;
        buckets[idx].ozBF += dur * BF_OZ_PER_MIN;
        buckets[idx].countBF += 1;
      }
    }

    return buckets.map(b => ({
      ...b,
      total: b.ozBM + b.ozBF,
    }));
  }, [events, now]);

  // ---- Statistics ----
  const stats = useMemo(() => {
    const totals = series.filter(d => d.hasData).map(d => d.total);
    if (totals.length === 0) return null;
    const sorted = [...totals].sort((a, b) => a - b);
    const median = sorted.length % 2
      ? sorted[Math.floor(sorted.length / 2)]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length;
    const sigma = Math.sqrt(variance);

    // Trend: compare last-7 mean vs first-7 mean (when we have ≥7 days each)
    // — gives a directional signal that smooths daily noise.
    let trendPct = null;
    if (series.length >= 14) {
      const first7 = series.slice(0, 7).filter(d => d.hasData).map(d => d.total);
      const last7 = series.slice(7, 14).filter(d => d.hasData).map(d => d.total);
      if (first7.length >= 3 && last7.length >= 3) {
        const f = first7.reduce((a, b) => a + b, 0) / first7.length;
        const l = last7.reduce((a, b) => a + b, 0) / last7.length;
        trendPct = f > 0 ? ((l - f) / f) * 100 : null;
      }
    }

    return { median, mean, sigma, trendPct, n: totals.length };
  }, [series]);

  // ---- Rolling 7-day mean (centered where possible, trailing at edges) ----
  const rolling = useMemo(() => {
    return series.map((d, i) => {
      // Use a trailing 7-day window (more honest for the "current trend"
      // story than a centered window which would peek into the future
      // for the right-edge points).
      const lo = Math.max(0, i - 6);
      const hi = i + 1;
      const window = series.slice(lo, hi).filter(p => p.hasData);
      if (window.length === 0) return null;
      return window.reduce((a, b) => a + b.total, 0) / window.length;
    });
  }, [series]);

  // ---- Anomalies: flag days outside ±2σ ----
  const anomalyIdxs = useMemo(() => {
    if (!stats) return new Set();
    const set = new Set();
    series.forEach((d, i) => {
      if (!d.hasData) return;
      if (Math.abs(d.total - stats.mean) > 2 * stats.sigma) set.add(i);
    });
    return set;
  }, [series, stats]);

  // ---- Chart geometry ----
  // Use a viewBox-based SVG so it scales cleanly. Internal units don't
  // need to match pixels — viewBox "0 0 W H" defines the coordinate space.
  const W = 700;
  const H = 220;
  const PAD_L = 36; // y-axis labels
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 32; // x-axis labels
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // Y-domain: 0 to nearest-4 above max(bar, ageNorm-high)
  const maxData = Math.max(
    ...series.map(d => d.total),
    ageNorms?.ozPerDay?.[1] || 0,
    20 // ensure a sensible floor even with sparse data
  );
  const yMax = Math.ceil(maxData / 4) * 4;
  const yToPx = (v) => PAD_T + plotH - (v / yMax) * plotH;
  const xToPx = (i) => PAD_L + (plotW / 14) * (i + 0.5);
  const barW = (plotW / 14) * 0.62;

  // Y-axis ticks at sensible intervals
  const yTicks = [];
  const tickStep = yMax >= 32 ? 8 : yMax >= 16 ? 4 : 2;
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  // AAP normal band
  const normLow = ageNorms?.ozPerDay?.[0];
  const normHigh = ageNorms?.ozPerDay?.[1];

  // ---- Render ----
  if (!stats || stats.n === 0) {
    // Empty state: no feeds in the last 14 days.
    return (
      <div style={{
        background: C.paper, borderRadius: 14,
        border: `1px solid ${C.line}22`,
        padding: 20, textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: "italic",
          color: C.muted,
        }}>
          Not enough data yet for a 14-day trend.
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          Log a few feedings and the chart will populate.
        </div>
      </div>
    );
  }

  const selectedDay = selectedDayIdx != null ? series[selectedDayIdx] : null;

  return (
    <div style={{
      background: C.paper,
      borderRadius: 14,
      border: `1px solid ${C.line}22`,
      padding: "14px 14px 12px",
    }}>
      {/* Header strip — title + median callout */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6, gap: 8, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 18, fontWeight: 600, color: C.ink, lineHeight: 1.1,
          }}>
            Daily intake — 14-day trend
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 2 }}>
            total oz per calendar day · bottle + breast (estimated)
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
              median
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22, fontWeight: 600, color: C.ink, lineHeight: 1,
            }}>
              {stats.median.toFixed(1)}<span style={{ fontSize: 11, color: C.muted, marginLeft: 3 }}>oz</span>
            </div>
          </div>
          {stats.trendPct != null && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
                trend
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14, fontWeight: 600,
                color: Math.abs(stats.trendPct) < 5 ? C.muted : (stats.trendPct > 0 ? "#5C8E5C" : C.accent),
                lineHeight: 1, marginTop: 4,
              }}>
                {stats.trendPct > 0 ? "↑" : stats.trendPct < 0 ? "↓" : "→"} {Math.abs(stats.trendPct).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet"
           style={{ display: "block", marginTop: 8 }}>
        {/* AAP normal band — dashed horizontal stripe */}
        {normLow != null && normHigh != null && (
          <g>
            <rect
              x={PAD_L} y={yToPx(normHigh)}
              width={plotW} height={yToPx(normLow) - yToPx(normHigh)}
              fill={C.gold} opacity="0.10"
            />
            <line x1={PAD_L} y1={yToPx(normLow)} x2={W - PAD_R} y2={yToPx(normLow)}
              stroke={C.gold} strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
            <line x1={PAD_L} y1={yToPx(normHigh)} x2={W - PAD_R} y2={yToPx(normHigh)}
              stroke={C.gold} strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
            <text x={W - PAD_R - 4} y={yToPx(normHigh) - 4}
              textAnchor="end" fontSize="9" fill={C.gold} fontWeight="600"
              style={{ letterSpacing: "0.06em" }}>
              AAP {normLow}–{normHigh} oz
            </text>
          </g>
        )}

        {/* Y-axis ticks + grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD_L} y1={yToPx(v)} x2={W - PAD_R} y2={yToPx(v)}
              stroke={C.line} strokeWidth="0.5" opacity="0.15" />
            <text x={PAD_L - 6} y={yToPx(v) + 3} textAnchor="end"
              fontSize="9" fill={C.muted} fontFamily="'JetBrains Mono', monospace">
              {v}
            </text>
          </g>
        ))}

        {/* Bars */}
        {series.map((d, i) => {
          if (!d.hasData) {
            // Sparse-data marker — tiny tick at y=0
            return (
              <line key={`empty-${i}`}
                x1={xToPx(i) - barW / 2} x2={xToPx(i) + barW / 2}
                y1={yToPx(0)} y2={yToPx(0)}
                stroke={C.muted} strokeWidth="2" opacity="0.3" />
            );
          }
          const isToday = i === series.length - 1;
          const isAnomaly = anomalyIdxs.has(i);
          const isSelected = selectedDayIdx === i;
          return (
            <g key={`bar-${i}`}>
              <rect
                x={xToPx(i) - barW / 2}
                y={yToPx(d.total)}
                width={barW}
                height={Math.max(1, yToPx(0) - yToPx(d.total))}
                fill={isToday ? C.accent : `${C.accent}CC`}
                stroke={isAnomaly ? C.accent : isSelected ? C.ink : "none"}
                strokeWidth={isAnomaly ? "1.5" : isSelected ? "1" : "0"}
                rx="2"
                style={{ cursor: "pointer", transition: "fill 0.15s" }}
                onClick={() => setSelectedDayIdx(isSelected ? null : i)}
              />
              {/* Today label */}
              {isToday && (
                <text x={xToPx(i)} y={yToPx(d.total) - 5} textAnchor="middle"
                  fontSize="9" fontWeight="700" fill={C.accent}
                  style={{ letterSpacing: "0.06em" }}>
                  TODAY
                </text>
              )}
              {/* Anomaly star */}
              {isAnomaly && !isToday && (
                <text x={xToPx(i)} y={yToPx(d.total) - 5} textAnchor="middle"
                  fontSize="11" fill={C.accent}>
                  ✦
                </text>
              )}
            </g>
          );
        })}

        {/* 7-day rolling mean line — drawn on top of bars */}
        {(() => {
          const points = rolling
            .map((v, i) => v == null ? null : `${xToPx(i)},${yToPx(v)}`)
            .filter(Boolean)
            .join(" ");
          if (!points) return null;
          return (
            <g>
              <polyline
                points={points}
                fill="none"
                stroke={C.gold}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
              {/* Dots at each rolling-mean point for emphasis */}
              {rolling.map((v, i) => v == null ? null : (
                <circle key={`r-${i}`} cx={xToPx(i)} cy={yToPx(v)} r="2"
                  fill={C.gold} opacity="0.9" />
              ))}
            </g>
          );
        })()}

        {/* X-axis: label every other day, today emphasized */}
        {series.map((d, i) => {
          // Label every other day to avoid crowding (i % 2 === 1 means
          // label days 1, 3, 5, ... — gives 7 labels across 14 days)
          if (i % 2 !== 1 && i !== series.length - 1) return null;
          const isToday = i === series.length - 1;
          const dateStr = `${d.date.getMonth() + 1}/${d.date.getDate()}`;
          return (
            <text key={`x-${i}`}
              x={xToPx(i)} y={H - 14}
              textAnchor="middle"
              fontSize="9"
              fontFamily="'JetBrains Mono', monospace"
              fill={isToday ? C.accent : C.muted}
              fontWeight={isToday ? "700" : "500"}>
              {dateStr}
            </text>
          );
        })}
      </svg>

      {/* Selected-day detail callout */}
      {selectedDay && selectedDay.hasData && (
        <div style={{
          background: `${C.accent}10`,
          border: `1px solid ${C.accent}40`,
          borderRadius: 10, padding: "8px 12px",
          fontSize: 12, color: C.ink, marginTop: 4,
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <strong style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: "italic" }}>
            {selectedDay.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </strong>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: C.accent }}>
            {selectedDay.total.toFixed(1)} oz total
          </span>
          <span style={{ color: C.muted, fontSize: 11 }}>
            {selectedDay.countBM > 0 && <>{selectedDay.countBM} bottle{selectedDay.countBM === 1 ? "" : "s"} ({selectedDay.ozBM.toFixed(1)} oz)</>}
            {selectedDay.countBM > 0 && selectedDay.countBF > 0 && " · "}
            {selectedDay.countBF > 0 && <>{selectedDay.countBF} BF (~{selectedDay.ozBF.toFixed(1)} oz est.)</>}
          </span>
          {anomalyIdxs.has(selectedDayIdx) && (
            <span style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
              ✦ {selectedDay.total > stats.mean ? "ABOVE" : "BELOW"} 2σ
            </span>
          )}
          <button
            onClick={() => setSelectedDayIdx(null)}
            style={{
              background: "transparent", border: "none", color: C.muted,
              cursor: "pointer", marginLeft: "auto", fontSize: 12, fontFamily: "inherit",
            }}>
            ✕
          </button>
        </div>
      )}

      {/* Legend + statistics footer */}
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: `1px solid ${C.line}15`,
        display: "flex", flexWrap: "wrap", gap: 14,
        fontSize: 10, color: C.muted,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 10, height: 8, background: C.accent, borderRadius: 1 }} />
          daily total
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 14, height: 2, background: C.gold }} />
          7-day rolling mean
        </div>
        {normLow != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 10, height: 8, background: C.gold, opacity: 0.18, border: `1px dashed ${C.gold}`, borderRadius: 1 }} />
            AAP {normLow}–{normHigh} oz/day
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>✦</span>
          anomaly (&gt;2σ from mean)
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>
          μ {stats.mean.toFixed(1)} ± {stats.sigma.toFixed(1)} oz · n={stats.n}{anomalyIdxs.size > 0 && ` · ${anomalyIdxs.size} flagged`}
        </div>
      </div>

      <div style={{
        marginTop: 6, fontSize: 10, color: C.muted, fontStyle: "italic", lineHeight: 1.4,
      }}>
        BF intake estimated at 1 oz / 5 min nursing — adjust mentally if Solène's transfer is faster or slower than typical.
      </div>
    </div>
  );
}

// ---- Doctor tab --------------------------------------------------------
function DoctorView({ C, now, events, notes, appointments, removeNote, updateNote, addAppointment, removeAppointment, docSummary, setDocSummary }) {
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  // Sort upcoming appointments
  const upcomingAppts = appointments
    .filter(a => new Date(a.dateTime) >= new Date(now.getTime() - 86400000))
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  const nextAppt = upcomingAppts[0];

  // Notes since last completed appointment (or all if no past appts)
  const lastPastAppt = appointments
    .filter(a => new Date(a.dateTime) < now)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
  const cutoff = lastPastAppt ? new Date(lastPastAppt.dateTime) : new Date(now.getTime() - 30 * 86400000);

  const recentNotes = notes
    .filter(n => new Date(n.ts) >= cutoff)
    .filter(n => {
      if (filterCategory === "all") return true;
      if (filterCategory === "flagged") return n.flagged;
      return n.category === filterCategory;
    })
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const flaggedCount = notes.filter(n => new Date(n.ts) >= cutoff && n.flagged).length;

  // Group notes by category for the summary
  const notesByCategory = useMemo(() => {
    const grouped = {};
    for (const n of notes.filter(n => new Date(n.ts) >= cutoff)) {
      if (!grouped[n.category]) grouped[n.category] = [];
      grouped[n.category].push(n);
    }
    return grouped;
  }, [notes, cutoff]);

  // Generate summary via Claude API
  const generateSummary = async () => {
    setGenerating(true);
    try {
      // Compile data for the model
      const recentNotesData = notes
        .filter(n => new Date(n.ts) >= cutoff)
        .map(n => ({
          date: new Date(n.ts).toLocaleDateString(),
          time: fmtTimeShort(new Date(n.ts)),
          category: n.category,
          text: n.text,
        }));

      // Compile feeding/sleep stats from events for context
      const last7Days = events.filter(e => (now - new Date(e.ts)) / 86400000 < 7);
      const feeds = last7Days.filter(e => e.type === "feed" || e.type === "breastfeed");
      const totalFeedOz = feeds.filter(e => e.oz).reduce((s, e) => s + e.oz, 0);
      const numFeeds = feeds.length;
      const numDiapers = last7Days.filter(e => e.type === "diaper").length;
      const dirtyDiapers = last7Days.filter(e => e.type === "diaper" && (e.notes === "dirty" || e.notes === "both")).length;
      const sleeps = last7Days.filter(e => e.type === "sleep_down").length;

      const stats = {
        period: "last 7 days",
        totalFeeds: numFeeds,
        avgOzPerBottleFeed: feeds.filter(e => e.oz && e.type === "feed").length > 0
          ? (feeds.filter(e => e.oz && e.type === "feed").reduce((s, e) => s + e.oz, 0) / feeds.filter(e => e.oz && e.type === "feed").length).toFixed(1)
          : null,
        breastfeedSessions: feeds.filter(e => e.type === "breastfeed").length,
        diaperChanges: numDiapers,
        dirtyDiapers: dirtyDiapers,
        sleepSessions: sleeps,
      };

      const ageStr = fmtAge(BIRTHDAY, now);

      const prompt = `You are helping prepare a structured summary for a pediatrician visit. Solène is ${ageStr} (born January 23, 2026). The parent has logged the following observations and stats over the period since the last doctor visit (or last 30 days if none).

OBSERVATIONS BY DATE:
${recentNotesData.map(n => `- ${n.date} ${n.time} [${n.category}]: ${n.text}`).join("\n") || "(no notes recorded)"}

FEEDING & CARE STATS (last 7 days):
${JSON.stringify(stats, null, 2)}

Please produce TWO outputs in JSON format:

1. "copyText": A concise plain-text summary suitable to paste into MyChart or email to the doctor before the visit. Group by topic (Feeding, Sleep, Skin, Development, Mood, Questions for doctor). Use bullets. Include only the most relevant observations — tighten and de-duplicate. End with 2-4 specific questions the parent might want to ask the doctor based on the patterns.

2. "htmlReport": A more detailed HTML report (no <html> or <body> wrapper, just inner content) organized by section with <h2>, <h3>, <ul>, <p> tags. Include all observations grouped by category, the stats summary in a small table, and a "Questions for the doctor" section. Style should be print-friendly. Use simple inline styles only where needed.

Respond with ONLY a valid JSON object with keys "copyText" and "htmlReport". No preamble, no markdown fences.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = (data.content || []).map(c => c.text || "").join("");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      setDocSummary({
        generated: new Date().toISOString(),
        copyText: parsed.copyText,
        htmlReport: parsed.htmlReport,
      });
      setShowSummary(true);
    } catch (err) {
      console.error("Summary generation failed:", err);
      alert("Could not generate summary. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* Analytics & predictions */}
      <AnalyticsSection C={C} events={events} now={now} />

      {/* Next appointment card */}
      <Section C={C} title={nextAppt ? "Next visit" : "No upcoming visits"}>
        {nextAppt ? (
          <NextApptCard C={C} appt={nextAppt} now={now} onRemove={() => removeAppointment(nextAppt.id)} />
        ) : (
          <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.line}15` }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
              Schedule an appointment to see a countdown and prep checklist on this card.
            </div>
            <button onClick={() => setShowAddAppt(true)} style={{
              width: "100%",
              background: C.accent, color: "#fff", border: "none",
              padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Stethoscope size={15} /> Add appointment
            </button>
          </div>
        )}
        {nextAppt && (
          <button onClick={() => setShowAddAppt(true)} style={{
            marginTop: 8, width: "100%",
            background: "transparent", color: C.ink,
            border: `1.5px dashed ${C.line}55`, borderRadius: 10,
            padding: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Plus size={14} /> Add another appointment
          </button>
        )}
      </Section>

      {/* Other upcoming appointments */}
      {upcomingAppts.length > 1 && (
        <Section C={C} title="Other upcoming">
          <div style={{ display: "grid", gap: 8 }}>
            {upcomingAppts.slice(1).map(a => (
              <ApptRow key={a.id} appt={a} C={C} onRemove={() => removeAppointment(a.id)} />
            ))}
          </div>
        </Section>
      )}

      {/* Generate summary */}

      {/* Notes & observations — single list with filter pills, including 🚩
          flagged-only filter so concerns are reachable in one tap without
          duplicating notes across two sections. Care notes come BEFORE the
          summary because the summary is generated FROM these notes — readers
          should see the source material before the synthesis. */}
      <Section C={C} title={`Care notes since ${lastPastAppt ? "last visit" : "last 30 days"} · ${notes.filter(n => new Date(n.ts) >= cutoff).length}`}>
        {/* Category filter pills — 'All' and 🚩 'Flagged' come first, then categories */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <CategoryPill C={C} active={filterCategory === "all"} onClick={() => setFilterCategory("all")}
            label="All" emoji="" color={C.ink} count={notes.filter(n => new Date(n.ts) >= cutoff).length} />
          {flaggedCount > 0 && (
            <CategoryPill C={C} active={filterCategory === "flagged"} onClick={() => setFilterCategory("flagged")}
              label="Flagged" emoji="🚩" color={C.accent} count={flaggedCount} />
          )}
          {NOTE_CATEGORIES.map(cat => {
            const count = (notesByCategory[cat.v] || []).length;
            if (count === 0) return null;
            return (
              <CategoryPill key={cat.v} C={C} active={filterCategory === cat.v}
                onClick={() => setFilterCategory(cat.v)}
                label={cat.l} emoji={cat.emoji} color={cat.color} count={count} />
            );
          })}
        </div>

        {recentNotes.length === 0 ? (
          <div style={{ background: C.paper, borderRadius: 12, padding: 20, border: `1px solid ${C.line}15`, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic", marginBottom: 4 }}>
              No notes in this category yet.
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              Tap LOG → Note to add an observation.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {recentNotes.map(n => (
              <NoteRow key={n.id} note={n} C={C} now={now}
                onEdit={() => setEditingNote(n)}
                onRemove={() => removeNote(n.id)} />
            ))}
          </div>
        )}
      </Section>

      <Section C={C} title="Doctor visit summary">
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}15, ${C.paper})`,
          borderRadius: 12, padding: 16,
          border: `1px solid ${C.accent}33`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <FileText size={22} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>
                Generate a structured summary
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                Compiles your observations + 7-day stats into copy-paste text and a printable report, grouped by category.
                {docSummary && (
                  <span style={{ display: "block", marginTop: 4, color: C.accent, fontWeight: 500 }}>
                    Last generated {fmtElapsed(minutesAgo(docSummary.generated))}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: docSummary ? "1fr 1fr" : "1fr", gap: 8 }}>
            <button onClick={generateSummary} disabled={generating} style={{
              background: C.accent, color: "#fff", border: "none",
              padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: generating ? "wait" : "pointer", opacity: generating ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {generating ? "Generating…" : <><Sparkles size={14} /> {docSummary ? "Regenerate" : "Generate"}</>}
            </button>
            {docSummary && (
              <button onClick={() => setShowSummary(true)} style={{
                background: "transparent", color: C.ink, border: `1.5px solid ${C.accent}`,
                padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <FileText size={14} /> View
              </button>
            )}
          </div>
        </div>
      </Section>

      {showAddAppt && <AppointmentModal C={C} onClose={() => setShowAddAppt(false)}
        onSubmit={(a) => { addAppointment(a); setShowAddAppt(false); }} />}
      {editingNote && (
        <ModalShell C={C} onClose={() => setEditingNote(null)} title="Edit note">
          <NoteForm C={C} initial={editingNote}
            onSubmit={(patch) => { updateNote(editingNote.id, patch); setEditingNote(null); }} />
        </ModalShell>
      )}
      {showSummary && docSummary && <SummaryModal C={C} summary={docSummary} onClose={() => setShowSummary(false)} />}
    </div>
  );
}

// ---- Analytics --------------------------------------------------------
function AnalyticsSection({ C, events, now }) {
  const [windowDays, setWindowDays] = useState(7);

  const stats = useMemo(() => {
    const cutoff = new Date(now.getTime() - windowDays * 86400000);
    const recent = events.filter(e => new Date(e.ts) >= cutoff && !e.silent);

    // Bucket events by type
    const feeds = recent.filter(e => e.type === "feed");
    const breastfeeds = recent.filter(e => e.type === "breastfeed");
    const allFeeds = [...feeds, ...breastfeeds].sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const pumps = recent.filter(e => e.type === "pump");
    const diapers = recent.filter(e => e.type === "diaper");
    const sleeps = recent.filter(e => e.type === "sleep_down");

    // Cluster close-together feeds (within 10 min) into single sessions for accurate
    // count + interval analytics. Each "session" represents a real feeding event,
    // not every paused-then-resumed log entry.
    const feedSessions = clusterFeeds(allFeeds, 10);
    const sessionCount = feedSessions.length;
    // Total oz per session (for avg-per-session)
    const sessionOz = feedSessions.map(s => {
      if (s._isCluster) return s.totalOz;
      return s.type === "feed" ? (s.oz || 0) : 0;
    });
    const totalSessionOz = sessionOz.reduce((a, b) => a + b, 0);

    // === Feeding stats ===
    const totalOz = feeds.reduce((s, e) => s + (e.oz || 0), 0);
    const totalBmOz = feeds.filter(e => (e.source || "").includes("BM")).reduce((s, e) => s + (e.oz || 0), 0);
    const totalFormulaOz = feeds.filter(e => (e.source || "").includes("Formula")).reduce((s, e) => s + (e.oz || 0), 0);
    // Avg per SESSION (counts a clustered set as one feeding)
    const avgOzPerFeed = sessionCount > 0 ? totalSessionOz / sessionCount : 0;
    // Sessions per day (more accurate than raw event count)
    const totalFeedsPerDay = sessionCount / windowDays;
    // Keep raw counts available too
    const rawFeedCount = feeds.length + breastfeeds.length;

    // === Pump stats ===
    const totalPumpOz = pumps.reduce((s, e) => s + (e.oz || 0), 0);
    const avgPumpOz = pumps.length > 0 ? totalPumpOz / pumps.length : 0;
    const pumpsPerDay = pumps.length / windowDays;

    // === Diaper stats ===
    const diapersPerDay = diapers.length / windowDays;
    const dirtyCount = diapers.filter(e => e.notes === "dirty" || e.notes === "both").length;
    const dirtyPerDay = dirtyCount / windowDays;

    // === Change cadence — daytime intervals between consecutive diapers ===
    // Filter to daytime (6am-10pm) so overnight gaps don't pollute the median.
    // Pediatric guidance is for waking-hour cadence; sleeping babies legitimately
    // have longer gaps (the AAP says don't wake a sleeping baby for a wet diaper).
    const sortedDiapers = diapers.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const daytimeIntervals = []; // hours
    let longestDaytimeGapH = 0;
    for (let i = 1; i < sortedDiapers.length; i++) {
      const prev = new Date(sortedDiapers[i-1].ts);
      const cur = new Date(sortedDiapers[i].ts);
      const prevHr = prev.getHours();
      const curHr = cur.getHours();
      // Both endpoints in daytime (6am-10pm) → count this interval
      const bothDaytime = prevHr >= 6 && prevHr < 22 && curHr >= 6 && curHr < 22;
      // Same calendar day OR consecutive days but both in daytime window
      const gapHours = (cur - prev) / 3600000;
      if (bothDaytime && gapHours > 0 && gapHours < 12) {
        daytimeIntervals.push(gapHours);
        if (gapHours > longestDaytimeGapH) longestDaytimeGapH = gapHours;
      }
    }
    daytimeIntervals.sort((a, b) => a - b);
    const medianChangeIntervalH = daytimeIntervals.length > 0
      ? daytimeIntervals[Math.floor(daytimeIntervals.length / 2)]
      : null;

    // === Feed-interval prediction (use session start times so back-to-back
    // entries don't pollute the gap distribution) ===
    const feedIntervals = [];
    for (let i = 1; i < feedSessions.length; i++) {
      const prev = new Date(feedSessions[i-1].ts);
      const cur = new Date(feedSessions[i].ts);
      const mins = (cur - prev) / 60000;
      // Sessions are already de-clustered at 10 min, so any gap here is a real
      // between-session interval. Bound at 6h to drop overnight outliers.
      if (mins > 0 && mins < 360) feedIntervals.push(mins);
    }
    feedIntervals.sort((a, b) => a - b);
    const median = (arr) => arr.length === 0 ? 0
      : arr.length % 2 === 1 ? arr[Math.floor(arr.length / 2)]
      : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
    const medianInterval = median(feedIntervals);
    const p25 = feedIntervals[Math.floor(feedIntervals.length * 0.25)] || 0;
    const p75 = feedIntervals[Math.floor(feedIntervals.length * 0.75)] || 0;

    // === Hourly activity heatmap (which hour of day has most activity) ===
    // For feeds, use sessions (clustered) so one feeding session = one tick on
    // the hour bar even if it was logged as several back-to-back entries.
    const hourBuckets = Array.from({ length: 24 }, () => ({ feeds: 0, sleeps: 0, diapers: 0 }));
    for (const s of feedSessions) {
      const h = new Date(s.ts).getHours();
      hourBuckets[h].feeds++;
    }
    for (const e of recent) {
      const h = new Date(e.ts).getHours();
      if (e.type === "sleep_down") hourBuckets[h].sleeps++;
      if (e.type === "diaper") hourBuckets[h].diapers++;
    }

    // === Trends (compare recent half vs older half of window) ===
    const halfPoint = new Date(now.getTime() - (windowDays / 2) * 86400000);
    const newerFeeds = allFeeds.filter(e => new Date(e.ts) >= halfPoint);
    const olderFeeds = allFeeds.filter(e => new Date(e.ts) < halfPoint);
    const newerOzPerDay = newerFeeds.reduce((s, e) => s + (e.oz || 0), 0) / (windowDays / 2);
    const olderOzPerDay = olderFeeds.reduce((s, e) => s + (e.oz || 0), 0) / (windowDays / 2);
    const ozTrend = olderOzPerDay > 0 ? ((newerOzPerDay - olderOzPerDay) / olderOzPerDay) * 100 : 0;

    // === Daily oz consistency (CV = stddev/mean × 100) ===
    // Bucket feeds by calendar day, compute per-day total oz, then CV.
    // CV < 15% = very consistent; 15-25% = moderate; > 25% = chaotic. Doctors
    // care about consistency as a proxy for whether feeding is settling
    // into a rhythm. A biochemist will appreciate this number directly.
    const dailyOzMap = {};
    for (const f of allFeeds) {
      const d = new Date(f.ts);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dailyOzMap[dayKey] = (dailyOzMap[dayKey] || 0) + (f.oz || 0);
    }
    const dailyOzValues = Object.values(dailyOzMap);
    let ozCV = null;
    if (dailyOzValues.length >= 3) {
      const mean = dailyOzValues.reduce((a, b) => a + b, 0) / dailyOzValues.length;
      const variance = dailyOzValues.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyOzValues.length;
      const stddev = Math.sqrt(variance);
      ozCV = mean > 0 ? (stddev / mean) * 100 : null;
    }

    // === Last feed → predicted next feed ===
    const lastAnyFeed = allFeeds[allFeeds.length - 1];
    const predictedNextFeed = lastAnyFeed && medianInterval > 0
      ? new Date(new Date(lastAnyFeed.ts).getTime() + medianInterval * 60000)
      : null;

    // === Sleep stats — paired sleep_down → sleep_up ===
    const sleepEvents = recent
      .filter(e => e.type === "sleep_down" || e.type === "sleep_up")
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const sleepDurations = []; // mins
    const sleepPairs = []; // {downTs, upTs, mins} for pattern analysis
    let openSleep = null;
    for (const e of sleepEvents) {
      if (e.type === "sleep_down") openSleep = e;
      else if (e.type === "sleep_up" && openSleep) {
        const mins = (new Date(e.ts) - new Date(openSleep.ts)) / 60000;
        if (mins > 5 && mins < 600) {
          sleepDurations.push(mins);
          sleepPairs.push({
            downTs: new Date(openSleep.ts),
            upTs: new Date(e.ts),
            mins,
          });
        }
        openSleep = null;
      }
    }
    sleepDurations.sort((a, b) => a - b);
    const medianSleep = median(sleepDurations);
    const longestSleep = sleepDurations.length > 0 ? sleepDurations[sleepDurations.length - 1] : 0;

    // === Wake window — duration between waking and next sleep ===
    // Sort sleep events chronologically, then for each sleep_up find the next
    // sleep_down. The gap is the wake window. Filter to reasonable durations
    // (10 min to 6 h) so log gaps don't pollute the median.
    const wakeWindows = []; // mins
    const sortedSleep = sleepEvents.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));
    for (let i = 0; i < sortedSleep.length - 1; i++) {
      if (sortedSleep[i].type === "sleep_up" && sortedSleep[i + 1].type === "sleep_down") {
        const mins = (new Date(sortedSleep[i + 1].ts) - new Date(sortedSleep[i].ts)) / 60000;
        if (mins >= 10 && mins <= 360) wakeWindows.push(mins);
      }
    }
    wakeWindows.sort((a, b) => a - b);
    const medianWakeWindow = wakeWindows.length > 0
      ? wakeWindows[Math.floor(wakeWindows.length / 2)]
      : null;
    const wakeWindowP25 = wakeWindows.length >= 4
      ? wakeWindows[Math.floor(wakeWindows.length * 0.25)]
      : null;
    const wakeWindowP75 = wakeWindows.length >= 4
      ? wakeWindows[Math.floor(wakeWindows.length * 0.75)]
      : null;

    // === Sleep pattern — typical bedtime/wake + drift over the window ===
    // Bedtime = the "down" of the night's longest stretch (or the latest down
    // before midnight). We pick a per-day "main sleep" as the longest stretch
    // for that day, then take median of (down hour, up hour) and trend the
    // bedtime from older half vs newer half of window.
    const dayMainSleep = {}; // dayKey → longest sleep pair for that day
    for (const p of sleepPairs) {
      // attribute to the calendar day of the down event
      const d = p.downTs;
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!dayMainSleep[dayKey] || p.mins > dayMainSleep[dayKey].mins) {
        dayMainSleep[dayKey] = p;
      }
    }
    const mainSleeps = Object.values(dayMainSleep);
    // Convert to minutes-of-day (0-1439). Bedtimes around midnight need
    // wraparound: treat times after noon as same day, before noon as +24h.
    // This way 10pm and 1am both cluster as "evening bedtime."
    const toMinOfDay = (date) => date.getHours() * 60 + date.getMinutes();
    const adjustForBedtime = (mins) => mins < 12 * 60 ? mins + 24 * 60 : mins;
    const bedtimes = mainSleeps.map(p => adjustForBedtime(toMinOfDay(p.downTs)));
    const wakeTimes = mainSleeps.map(p => toMinOfDay(p.upTs));
    bedtimes.sort((a, b) => a - b);
    wakeTimes.sort((a, b) => a - b);
    const medBedtime = bedtimes.length > 0 ? bedtimes[Math.floor(bedtimes.length / 2)] : null;
    const medWake = wakeTimes.length > 0 ? wakeTimes[Math.floor(wakeTimes.length / 2)] : null;

    // Bedtime drift: median of older half vs newer half. If only a few days,
    // we compare last 3 to prior 3.
    let bedtimeDriftMin = null; // negative = drifting earlier, positive = later
    if (mainSleeps.length >= 4) {
      const sortedByDay = mainSleeps.slice().sort((a, b) => a.downTs - b.downTs);
      const mid = Math.floor(sortedByDay.length / 2);
      const older = sortedByDay.slice(0, mid).map(p => adjustForBedtime(toMinOfDay(p.downTs)));
      const newer = sortedByDay.slice(mid).map(p => adjustForBedtime(toMinOfDay(p.downTs)));
      older.sort((a, b) => a - b);
      newer.sort((a, b) => a - b);
      const olderMed = older[Math.floor(older.length / 2)];
      const newerMed = newer[Math.floor(newer.length / 2)];
      bedtimeDriftMin = newerMed - olderMed;
    }

    // Stretch trend: longest stretch in newer half vs older half
    let stretchTrendMin = null;
    if (mainSleeps.length >= 4) {
      const sortedByDay = mainSleeps.slice().sort((a, b) => a.downTs - b.downTs);
      const mid = Math.floor(sortedByDay.length / 2);
      const olderMax = Math.max(0, ...sortedByDay.slice(0, mid).map(p => p.mins));
      const newerMax = Math.max(0, ...sortedByDay.slice(mid).map(p => p.mins));
      stretchTrendMin = newerMax - olderMax;
    }

    // === Diaper composition (wet vs dirty vs both) ===
    const diaperKinds = { wet: 0, dirty: 0, both: 0 };
    for (const e of recent.filter(e => e.type === "diaper")) {
      const k = e.notes || "wet";
      if (k === "dirty" || k === "soiled") diaperKinds.dirty++;
      else if (k === "both") diaperKinds.both++;
      else diaperKinds.wet++;
    }
    const dirtyRatio = (diaperKinds.dirty + diaperKinds.both) /
      Math.max(1, diaperKinds.wet + diaperKinds.dirty + diaperKinds.both);

    // === Pump output trend (recent half vs older half) ===
    const allPumps = recent.filter(e => e.type === "pump").sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const newerPumps = allPumps.filter(e => new Date(e.ts) >= halfPoint);
    const olderPumps = allPumps.filter(e => new Date(e.ts) < halfPoint);
    const newerPumpAvg = newerPumps.length > 0 ? newerPumps.reduce((s, e) => s + (e.oz || 0), 0) / newerPumps.length : 0;
    const olderPumpAvg = olderPumps.length > 0 ? olderPumps.reduce((s, e) => s + (e.oz || 0), 0) / olderPumps.length : 0;
    const pumpTrend = olderPumpAvg > 0 ? ((newerPumpAvg - olderPumpAvg) / olderPumpAvg) * 100 : 0;

    return {
      windowDays,
      totalFeeds: sessionCount,           // session-based count
      rawFeedCount,                        // raw event count (entries logged)
      totalFeedsPerDay,                    // sessions per day
      totalOzPerDay: totalOz / windowDays,
      avgOzPerFeed,                        // total oz / sessions
      totalBmOz, totalFormulaOz,
      bmRatio: (totalBmOz + totalFormulaOz) > 0 ? totalBmOz / (totalBmOz + totalFormulaOz) : 0,
      pumpsPerDay,
      totalPumpOzPerDay: totalPumpOz / windowDays,
      avgPumpOz,
      diapersPerDay, dirtyPerDay,
      medianChangeIntervalH,
      longestDaytimeGapH,
      daytimeIntervalCount: daytimeIntervals.length,
      medianInterval, p25, p75,
      hourBuckets,
      ozTrend,
      ozCV, // coefficient of variation, %
      pumpTrend,
      newerPumpAvg, olderPumpAvg,
      predictedNextFeed,
      medianSleep,
      longestSleep,
      sleepCount: sleepDurations.length,
      // Wake window — typical awake duration before next nap/sleep
      medianWakeWindow,
      wakeWindowP25,
      wakeWindowP75,
      wakeWindowCount: wakeWindows.length,
      // Sleep pattern stats
      medBedtime,        // mins-of-day, with adjustForBedtime applied
      medWake,           // mins-of-day
      bedtimeDriftMin,   // signed minutes; null if not enough data
      stretchTrendMin,   // signed minutes; null if not enough data
      mainSleepDays: mainSleeps.length,
      diaperKinds, dirtyRatio,
    };
  }, [events, now, windowDays]);

  // Find max value for heatmap normalization
  const maxHourActivity = Math.max(1, ...stats.hourBuckets.map(b => b.feeds + b.sleeps + b.diapers));

  const trendArrow = stats.ozTrend > 5 ? "↑" : stats.ozTrend < -5 ? "↓" : "→";
  const trendColor = stats.ozTrend > 5 ? "#5C8E5C" : stats.ozTrend < -5 ? C.accent : C.muted;

  return (
    <Section C={C} title="Analytics & predictions">
      {/* Window selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[3, 7, 14, 30].map(d => (
          <button key={d} onClick={() => setWindowDays(d)} style={{
            background: windowDays === d ? C.ink : "transparent",
            color: windowDays === d ? C.paper : C.ink,
            border: `1px solid ${C.line}33`,
            borderRadius: 18, padding: "5px 12px",
            fontSize: 11, fontWeight: 500, cursor: "pointer",
          }}>
            {d === 30 ? "30d" : `${d}d`}
          </button>
        ))}
      </div>

      {/* At-a-glance snapshot — card grid designed for low mental load while
          talking to the pediatrician. Each card has THREE clearly separated
          zones (top-down): metric label as quiet eyebrow / big value with
          status badge / range strip. The status badge is the FIRST thing your
          eye lands on. Cards live in a 2-col grid for density. */}
      {(() => {
        const days = stats.windowDays;
        const dailyOz = stats.totalOzPerDay;
        const sessionsPerDay = stats.totalFeedsPerDay;

        const ageMonthsExact = (now - BIRTHDAY) / (1000 * 60 * 60 * 24 * 30.4375);
        const norms = getAgeNorms(ageMonthsExact);

        const diaperCount = stats.diaperKinds
          ? Object.values(stats.diaperKinds).reduce((a, b) => a + b, 0)
          : 0;
        const diapersPerDay = diaperCount / Math.max(1, days);

        const longestSleepH = stats.longestSleep ? stats.longestSleep / 60 : null;

        const peakHour = stats.hourBuckets
          .map((b, h) => ({ h, n: b.feeds }))
          .sort((a, b) => b.n - a.n)[0];
        const fmtHour = (h) => h === 0 ? "12am" : h === 12 ? "noon" : h < 12 ? `${h}am` : `${h - 12}pm`;
        const peakStr = peakHour && peakHour.n > 0 ? fmtHour(peakHour.h) : null;

        const feedsStatus    = rangeStatus(sessionsPerDay, norms.feedsPerDay);
        const ozStatus       = rangeStatus(dailyOz, norms.ozPerDay);
        const diapersStatus  = rangeStatus(diapersPerDay, norms.diapersPerDay);
        const longSleepStatus = longestSleepH != null ? rangeStatus(longestSleepH, norms.sleepStretchH) : "in";

        // Visual identity per status — green=in, gold=above, coral=below.
        // Above-range is intentionally a different color from below: doctors
        // care about the direction. Gold reads as "more than expected" without
        // alarming; coral reads as "less than expected" which is the more
        // urgent direction for things like diapers or feeds.
        const statusVisual = (s) => {
          if (s === "in")    return { color: "#5C8E5C", label: "in range",    bg: "#5C8E5C12" };
          if (s === "above") return { color: C.gold,    label: "above range", bg: `${C.gold}12` };
          return                     { color: C.accent, label: "below range", bg: `${C.accent}12` };
        };

        // Range strip — a small horizontal bar showing where the value lands
        // within the normal range. Visually anchors the reader: a glance
        // tells you "in the middle / at the edge / outside the band."
        const RangeStrip = ({ value, range, color }) => {
          if (!range) return null;
          const [lo, hi] = range;
          const span = hi - lo;
          // Position the marker; clamp to [-15%, 115%] so out-of-range values
          // render visibly off the band.
          const raw = span > 0 ? ((value - lo) / span) * 100 : 50;
          const pct = Math.max(-15, Math.min(115, raw));
          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ position: "relative", height: 4, borderRadius: 2, background: `${C.line}22` }}>
                {/* "Normal range" band */}
                <div style={{
                  position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                  background: `${C.muted}22`, borderRadius: 2,
                }} />
                {/* Marker dot for current value */}
                <div style={{
                  position: "absolute",
                  left: `calc(${pct}% - 5px)`,
                  top: -3, width: 10, height: 10, borderRadius: "50%",
                  background: color, border: `2px solid ${C.paper}`,
                  boxShadow: `0 1px 2px ${C.ink}22`,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{lo}</span>
                <span style={{ fontStyle: "italic", letterSpacing: "0.05em" }}>normal</span>
                <span>{hi}</span>
              </div>
            </div>
          );
        };

        // The metric card itself — three clearly separated zones.
        // displayedValue can be a string ("Stable", "1h 30m") for layman
        // labels; numericValue (optional) overrides parseFloat(value) for the
        // range strip so units don't lose precision.
        const MetricCard = ({ topic, value, unit, range, status, note, numericValue }) => {
          const vis = statusVisual(status);
          return (
            <div style={{
              background: C.paper,
              border: `1px solid ${C.line}15`,
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex", flexDirection: "column",
              gap: 0,
            }}>
              {/* Zone 1: Topic — quiet, eyebrow-style, no competition with value */}
              <div style={{
                fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                color: C.muted, fontWeight: 600,
                marginBottom: 8,
              }}>
                {topic}
              </div>
              {/* Zone 2: Value + status badge — the headline */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 30, fontWeight: 500, lineHeight: 1,
                  color: C.ink,
                }}>
                  {value}
                  {unit && <span style={{ fontSize: 14, color: C.muted, marginLeft: 4, fontFamily: "'Inter', sans-serif" }}>{unit}</span>}
                </div>
                <span style={{
                  background: vis.bg,
                  color: vis.color,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "3px 7px", borderRadius: 10,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {vis.label}
                </span>
              </div>
              {/* Zone 3: Range strip — visual context */}
              <RangeStrip value={numericValue != null ? numericValue : parseFloat(value)} range={range} color={vis.color} />
              {/* Optional sub-note */}
              {note && (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 }}>
                  {note}
                </div>
              )}
            </div>
          );
        };

        return (
          <div style={{ marginBottom: 12 }}>
            {/* Daily intake trend chart — 14-day rolling view of total oz/day.
                Sits above the snapshot card grid because it gives temporal
                context that the cards (which show single aggregated numbers)
                can't. The chart is also where you'd notice anomalies (a low
                day, a sudden trend shift) before they become a pattern. */}
            <div style={{ marginBottom: 14 }}>
              <DailyIntakeTrendChart
                C={C}
                events={events}
                now={now}
                ageNorms={norms}
              />
            </div>

            {/* Window header — what window we're showing, age band */}
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: 10, gap: 8, flexWrap: "wrap",
            }}>
              <div>
                <div style={{
                  fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
                  color: C.mommy, fontWeight: 700,
                }}>
                  snapshot · last {days} {days === 1 ? "day" : "days"}
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 2 }}>
                  age band: <strong style={{ fontStyle: "normal", color: C.ink }}>{norms.label}</strong>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", textAlign: "right", maxWidth: 180 }}>
                ranges are general references, not medical advice
              </div>
            </div>

            {/* Card grid — pared down 2026.05.05av. Removed:
                  • Feedings/day (already shown in the daily intake chart)
                  • Intake/day (chart's primary metric, with full 14-day context)
                  • Change cadence (duplicates Diapers/day; longest-gap was
                    only unique signal and isn't worth its own card)
                Kept: Diapers/day, Longest stretch, Eating rhythm (CV%),
                Wake window — each measures something the chart doesn't. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              <MetricCard
                topic="Diapers / day"
                value={diapersPerDay.toFixed(1)}
                range={norms.diapersPerDay}
                status={diapersStatus}
                note={(() => {
                  if (!stats.diaperKinds) return null;
                  const wet = stats.diaperKinds.wet || 0;
                  const dirty = (stats.diaperKinds.dirty || 0) + (stats.diaperKinds.both || 0);
                  if (wet || dirty) return `${wet} wet · ${dirty} dirty`;
                  return null;
                })()}
              />
              {longestSleepH != null && (
                <MetricCard
                  topic="Longest stretch"
                  value={fmtHours(longestSleepH)}
                  numericValue={longestSleepH}
                  range={norms.sleepStretchH}
                  status={longSleepStatus}
                  note={stats.medianSleep > 0 ? `median ${fmtDuration(stats.medianSleep)}` : null}
                />
              )}
              {/* Daily intake stability — value is a layman-friendly word
                  (Stable / Moderate / Variable) with the CV% as a small
                  technical sub-line for those who care. Threshold heuristics
                  are <15% stable, 15-25% moderate, >25% variable. */}
              {stats.ozCV != null && (() => {
                const layperson = stats.ozCV < 15 ? "Stable"
                                : stats.ozCV < 25 ? "Moderate"
                                : "Variable";
                const status = stats.ozCV < 15 ? "in"
                             : stats.ozCV < 25 ? "above"
                             : "below";
                const note = stats.ozCV < 15 ? `varies ±${stats.ozCV.toFixed(0)}% day-to-day · stable rhythm` :
                             stats.ozCV < 25 ? `varies ±${stats.ozCV.toFixed(0)}% day-to-day · still settling` :
                                               `varies ±${stats.ozCV.toFixed(0)}% day-to-day · uneven pattern`;
                return (
                  <MetricCard
                    topic="Eating rhythm"
                    value={layperson}
                    range={null}
                    status={status}
                    note={note}
                  />
                );
              })()}
              {/* Wake window — typical awake duration before next sleep.
                  Helps anticipate when Solène will be ready for next nap.
                  Soft age-based sanity bands: ~45-90m for 0-2mo, 90-150m for
                  2-4mo, 150-180m for 4-6mo. We display the value but only
                  flag status against a loose age-band guide. */}
              {stats.medianWakeWindow != null && (() => {
                const mins = stats.medianWakeWindow;
                // Rough wake-window expectations by age (mins)
                const wakeBand = ageMonthsExact < 1 ? [40, 60]
                              : ageMonthsExact < 2 ? [45, 90]
                              : ageMonthsExact < 4 ? [75, 120]
                              : ageMonthsExact < 6 ? [120, 180]
                              : ageMonthsExact < 9 ? [150, 240]
                              : [180, 300];
                const wakeStatus = rangeStatus(mins, wakeBand);
                return (
                  <MetricCard
                    topic="Wake window"
                    value={fmtDuration(mins)}
                    numericValue={mins}
                    range={wakeBand}
                    status={wakeStatus}
                    note={
                      stats.wakeWindowP25 != null && stats.wakeWindowP75 != null
                        ? `range ${fmtDuration(stats.wakeWindowP25)}–${fmtDuration(stats.wakeWindowP75)} · ${stats.wakeWindowCount} samples`
                        : `${stats.wakeWindowCount} sample${stats.wakeWindowCount === 1 ? "" : "s"}`
                    }
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Feed interval prediction */}
      {stats.medianInterval > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}15, ${C.paper})`,
          borderRadius: 12, padding: 14, marginBottom: 10,
          border: `1px solid ${C.accent}33`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Sparkles size={13} color={C.accent} />
            <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.accent, fontWeight: 600 }}>
              Predicted feed pattern
            </span>
          </div>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.55 }}>
            Solène typically feeds every <strong>{fmtDuration(stats.medianInterval)}</strong>
            <span style={{ color: C.muted, fontSize: 12 }}>
              {" "}(range {fmtDuration(stats.p25)}–{fmtDuration(stats.p75)}).
            </span>
          </div>
          {stats.predictedNextFeed && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              next feed predicted around {fmtTime12(stats.predictedNextFeed)}
            </div>
          )}
        </div>
      )}

      {/* When things happen — redesigned 2026.05.05af to be readable at a
          glance. Old version showed three rows of normalized bars with only
          5 hour labels — figuring out "when does X actually happen" required
          counting bars. New version uses a single day strip with labeled
          time-of-day blocks (early am / morning / midday / afternoon /
          evening / night), three colored peak markers showing where each
          event type clusters, and a plain-language summary below. */}
      {(() => {
        // Find peak hour and total count for each event type
        const findPeak = (key) => {
          const buckets = stats.hourBuckets;
          let peakH = -1, peakV = 0;
          for (let i = 0; i < 24; i++) {
            if (buckets[i][key] > peakV) { peakV = buckets[i][key]; peakH = i; }
          }
          return peakH < 0 ? null : { hour: peakH, count: peakV };
        };
        const feedsPeak = findPeak("feeds");
        const sleepsPeak = findPeak("sleeps");
        const diapersPeak = findPeak("diapers");
        const anyData = feedsPeak || sleepsPeak || diapersPeak;
        if (!anyData) return null;

        const fmtHour = (h) => h === 0 ? "12am"
                            : h === 12 ? "12pm"
                            : h < 12 ? `${h}am`
                            : `${h - 12}pm`;

        // Time-of-day blocks: each defines its own range so we can highlight
        // where peaks fall against named periods of the day.
        const blocks = [
          { label: "early am", start: 0, end: 6, color: "#5A6E8A" },
          { label: "morning", start: 6, end: 11, color: "#D4A03A" },
          { label: "midday", start: 11, end: 14, color: "#E8B074" },
          { label: "afternoon", start: 14, end: 17, color: "#C77B8E" },
          { label: "evening", start: 17, end: 21, color: "#B85C2E" },
          { label: "night", start: 21, end: 24, color: "#3D4A66" },
        ];
        const blockForHour = (h) => blocks.find(b => h >= b.start && h < b.end)?.label || "";

        // Markers to position on the strip
        const markers = [
          feedsPeak && { key: "feeds", label: "feeds", color: "#A8745C", icon: "🍼", hour: feedsPeak.hour, count: feedsPeak.count },
          sleepsPeak && { key: "sleeps", label: "sleep starts", color: "#5A6E8A", icon: "🌙", hour: sleepsPeak.hour, count: sleepsPeak.count },
          diapersPeak && { key: "diapers", label: "diapers", color: "#7B9B6E", icon: "👶", hour: diapersPeak.hour, count: diapersPeak.count },
        ].filter(Boolean);

        return (
          <div style={{
            background: C.paper, borderRadius: 12, padding: 14,
            border: `1px solid ${C.line}15`, marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 4 }}>
              When things happen
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginBottom: 14, lineHeight: 1.4 }}>
              Where each activity peaks across the day.
            </div>

            {/* Day strip with labeled time-of-day blocks */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              {/* Block backgrounds */}
              <div style={{ display: "flex", height: 30, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}15` }}>
                {blocks.map(b => {
                  const widthPct = ((b.end - b.start) / 24) * 100;
                  return (
                    <div key={b.label} style={{
                      width: `${widthPct}%`,
                      background: `${b.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: C.muted, letterSpacing: "0.04em",
                      borderRight: b.end < 24 ? `1px solid ${C.line}15` : "none",
                      whiteSpace: "nowrap", overflow: "hidden",
                    }}>
                      {widthPct > 8 ? b.label : ""}
                    </div>
                  );
                })}
              </div>
              {/* Hour ticks below */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginTop: 4, fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
              }}>
                {[0, 6, 12, 18, 24].map(h => (
                  <span key={h} style={{ flex: h === 0 || h === 24 ? "0 0 auto" : 1, textAlign: h === 0 ? "left" : h === 24 ? "right" : "center" }}>
                    {h === 24 ? "12am" : fmtHour(h)}
                  </span>
                ))}
              </div>
              {/* Marker pins — one per event type, positioned at peak hour */}
              <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 38, pointerEvents: "none" }}>
                {markers.map((m, i) => {
                  const leftPct = (m.hour / 24) * 100;
                  // Stagger vertically so multiple markers at similar hours don't overlap
                  const verticalOffset = i * 2;
                  return (
                    <div key={m.key} style={{
                      position: "absolute",
                      left: `calc(${leftPct}% - 11px)`,
                      top: verticalOffset,
                    }}>
                      <div style={{
                        background: m.color,
                        color: "#fff",
                        fontSize: 11,
                        width: 22, height: 22, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 1px 4px ${C.ink}33`,
                        border: `2px solid ${C.paper}`,
                      }}>
                        {m.icon}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plain-language summary */}
            <div style={{ display: "grid", gap: 6, marginTop: 14 }}>
              {markers.map(m => (
                <div key={m.key} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 12, color: C.ink,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: m.color, flexShrink: 0,
                  }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ color: C.muted }}>{m.label}</span> peak around{" "}
                    <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>{fmtHour(m.hour)}</strong>
                    <span style={{ color: C.muted, fontSize: 11 }}> · {blockForHour(m.hour)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* BM vs Formula split */}
      {(stats.totalBmOz + stats.totalFormulaOz) > 0 && (
        <div style={{
          background: C.paper, borderRadius: 12, padding: 14,
          border: `1px solid ${C.line}15`, marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            BM vs Formula split (by oz)
          </div>
          <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}11` }}>
            <div style={{
              width: `${stats.bmRatio * 100}%`,
              background: C.mommy, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, minWidth: 0,
            }}>
              {stats.bmRatio > 0.15 && `${(stats.bmRatio * 100).toFixed(0)}% BM`}
            </div>
            <div style={{
              width: `${(1 - stats.bmRatio) * 100}%`,
              background: C.daddy, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, minWidth: 0,
            }}>
              {(1 - stats.bmRatio) > 0.15 && `${((1 - stats.bmRatio) * 100).toFixed(0)}% Formula`}
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            {stats.totalBmOz.toFixed(1)}oz BM · {stats.totalFormulaOz.toFixed(1)}oz Formula over {windowDays} days
          </div>
        </div>
      )}

      {/* Sleep pattern — descriptive, not prescriptive. Shows typical bedtime
          and wake from main sleep stretches, plus how bedtime is drifting and
          whether the longest stretch is growing. No targets or "plans" —
          just observed pattern that's reportable to the pediatrician. */}
      {stats.medBedtime != null && stats.medWake != null && (() => {
        // Format minutes-of-day back to a readable time. medBedtime may be
        // shifted past 24h to handle wrap-around; mod it back into 24h.
        const fmtTime = (mins) => {
          const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
          const h = Math.floor(m / 60);
          const min = Math.round(m % 60);
          const period = h >= 12 ? "pm" : "am";
          const h12 = h % 12 === 0 ? 12 : h % 12;
          return `${h12}:${String(min).padStart(2, "0")}${period}`;
        };
        const driftLabel = stats.bedtimeDriftMin == null ? null
          : Math.abs(stats.bedtimeDriftMin) < 10 ? "stable"
          : stats.bedtimeDriftMin > 0 ? `drifting ${Math.round(stats.bedtimeDriftMin)}m later`
          : `drifting ${Math.round(Math.abs(stats.bedtimeDriftMin))}m earlier`;
        const stretchLabel = stats.stretchTrendMin == null ? null
          : Math.abs(stats.stretchTrendMin) < 15 ? "stretch is steady"
          : stats.stretchTrendMin > 0 ? `stretch up ${Math.round(stats.stretchTrendMin)}m`
          : `stretch down ${Math.round(Math.abs(stats.stretchTrendMin))}m`;
        const stretchColor = stats.stretchTrendMin == null ? C.muted
          : stats.stretchTrendMin >= 15 ? "#5C8E5C"
          : stats.stretchTrendMin <= -15 ? C.accent : C.muted;
        return (
          <div style={{
            background: C.paper, borderRadius: 12, padding: 14,
            border: `1px solid ${C.line}15`, marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
              Sleep pattern
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  Typical bedtime
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 500, marginTop: 2, lineHeight: 1.1, color: C.ink }}>
                  {fmtTime(stats.medBedtime)}
                </div>
                {driftLabel && (
                  <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 3 }}>
                    {driftLabel}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  Typical wake
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 500, marginTop: 2, lineHeight: 1.1, color: C.ink }}>
                  {fmtTime(stats.medWake)}
                </div>
                {stretchLabel && (
                  <div style={{ fontSize: 11, color: stretchColor, fontStyle: "italic", marginTop: 3 }}>
                    {stretchLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Insights row — actual numbers for median, longest, total sleep
                in the window. These are the "how much" numbers a doctor will
                ask about. Kept compact so the card stays digestible. */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
              padding: "10px 0",
              borderTop: `1px solid ${C.line}10`,
              borderBottom: `1px solid ${C.line}10`,
              marginBottom: 10,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  median
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: C.ink, lineHeight: 1.2, marginTop: 2 }}>
                  {fmtDuration(stats.medianSleep)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  longest
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: "#5C8E5C", lineHeight: 1.2, marginTop: 2 }}>
                  {fmtDuration(stats.longestSleep)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  stretches
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: C.ink, lineHeight: 1.2, marginTop: 2 }}>
                  {stats.sleepCount}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", lineHeight: 1.5 }}>
              based on {stats.mainSleepDays} {stats.mainSleepDays === 1 ? "day" : "days"} of main sleep stretches over the last {stats.windowDays} days.
              accuracy depends on logging — if 'awake' isn't logged the stretch won't count.
            </div>
          </div>
        );
      })()}

      {/* Diaper composition */}
      {(stats.diaperKinds.wet + stats.diaperKinds.dirty + stats.diaperKinds.both) > 0 && (() => {
        const total = stats.diaperKinds.wet + stats.diaperKinds.dirty + stats.diaperKinds.both;
        return (
          <div style={{
            background: C.paper, borderRadius: 12, padding: 14,
            border: `1px solid ${C.line}15`, marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
              Diaper composition
            </div>
            <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}11`, marginBottom: 8 }}>
              <div style={{
                width: `${(stats.diaperKinds.wet / total) * 100}%`,
                background: "#A8C8E8", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, minWidth: 0,
              }}>
                {(stats.diaperKinds.wet / total) > 0.18 && `wet ${stats.diaperKinds.wet}`}
              </div>
              <div style={{
                width: `${(stats.diaperKinds.dirty / total) * 100}%`,
                background: "#B8956A", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, minWidth: 0,
              }}>
                {(stats.diaperKinds.dirty / total) > 0.18 && `dirty ${stats.diaperKinds.dirty}`}
              </div>
              <div style={{
                width: `${(stats.diaperKinds.both / total) * 100}%`,
                background: "#7B9B6E", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, minWidth: 0,
              }}>
                {(stats.diaperKinds.both / total) > 0.18 && `both ${stats.diaperKinds.both}`}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              <strong>{stats.dirtyPerDay.toFixed(1)}</strong> dirty/day · about {(stats.dirtyRatio * 100).toFixed(0)}% of changes.
              {stats.dirtyPerDay >= 1 && stats.dirtyPerDay < 4 && " Within typical newborn range (1–4/day)."}
              {stats.dirtyPerDay < 1 && " Below typical — mention to pediatrician if persistent."}
            </div>
          </div>
        );
      })()}

      {/* Pump output trend */}
      {stats.olderPumpAvg > 0 && stats.newerPumpAvg > 0 && (
        <div style={{
          background: C.paper, borderRadius: 12, padding: 14,
          border: `1px solid ${C.line}15`, marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            Pump output trend
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                Earlier half
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, marginTop: 2, lineHeight: 1.1, color: C.muted }}>
                {stats.olderPumpAvg.toFixed(1)} oz
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                Recent half
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500,
                marginTop: 2, lineHeight: 1.1,
                color: stats.pumpTrend > 5 ? "#5C8E5C" : stats.pumpTrend < -5 ? C.accent : C.ink,
              }}>
                {stats.newerPumpAvg.toFixed(1)} oz
                <span style={{ fontSize: 14, marginLeft: 4 }}>
                  {stats.pumpTrend > 5 ? "↑" : stats.pumpTrend < -5 ? "↓" : "→"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
            {Math.abs(stats.pumpTrend) < 5
              ? "Output is steady — supply looks well-matched to demand."
              : stats.pumpTrend > 5
              ? `Output is up ${stats.pumpTrend.toFixed(0)}% — supply is increasing.`
              : `Output is down ${Math.abs(stats.pumpTrend).toFixed(0)}% — consider hydration, nursing frequency, or a power pump session.`}
          </div>
        </div>
      )}
    </Section>
  );
}

function AnalyticsCell({ C, label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500, marginTop: 2, lineHeight: 1.1, color: C.ink }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function NextApptCard({ C, appt, now, onRemove }) {
  const apptDate = new Date(appt.dateTime);
  const minsUntil = Math.round((apptDate - now) / 60000);
  const isPast = minsUntil < 0;
  const isToday = apptDate.toDateString() === now.toDateString();
  const daysUntil = Math.floor(minsUntil / 1440);
  const hoursUntil = Math.floor((minsUntil % 1440) / 60);

  let countdownText;
  if (isPast) {
    countdownText = `${Math.abs(daysUntil)}d ago`;
  } else if (isToday) {
    countdownText = hoursUntil > 0 ? `in ${hoursUntil}h` : `in ${minsUntil}m`;
  } else if (daysUntil === 1) {
    countdownText = "tomorrow";
  } else {
    countdownText = `in ${daysUntil} days`;
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.daddy}22, ${C.paper})`,
      borderRadius: 14, padding: 18,
      border: `1px solid ${C.daddy}55`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: C.daddy, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0,
        }}>
          <Stethoscope size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, lineHeight: 1.1 }}>
            {appt.title || "Pediatrician visit"}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            {apptDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {fmtTime12(apptDate)}
          </div>
          {appt.doctor && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              with {appt.doctor}
            </div>
          )}
          {appt.location && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} /> {appt.location}
            </div>
          )}
        </div>
        <div style={{
          background: C.daddy, color: "#fff",
          padding: "6px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
        }}>
          {countdownText}
        </div>
      </div>
      {appt.prepNotes && (
        <div style={{ marginTop: 12, padding: 10, background: C.bg, borderRadius: 8, fontSize: 12, color: C.ink, lineHeight: 1.4 }}>
          <strong style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>Prep notes</strong>
          <div style={{ marginTop: 4 }}>{appt.prepNotes}</div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button onClick={onRemove} style={{
          background: "transparent", border: "none", color: C.muted,
          fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <Trash2 size={12} /> remove
        </button>
      </div>
    </div>
  );
}

function ApptRow({ appt, C, onRemove }) {
  const apptDate = new Date(appt.dateTime);
  return (
    <div style={{
      background: C.paper, borderRadius: 10, padding: "10px 12px",
      border: `1px solid ${C.line}15`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <Calendar size={16} color={C.muted} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{appt.title || "Visit"}</div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
          {apptDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {fmtTime12(apptDate)}
          {appt.doctor && ` · ${appt.doctor}`}
        </div>
      </div>
      <button onClick={onRemove} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 4 }}>
        <X size={14} />
      </button>
    </div>
  );
}

function CategoryPill({ C, active, onClick, label, emoji, color, count }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : "transparent",
      color: active ? "#fff" : C.ink,
      border: `1px solid ${active ? color : C.line + "33"}`,
      borderRadius: 20, padding: "6px 10px",
      fontSize: 12, fontWeight: 500, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 4,
    }}>
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
      <span style={{
        background: active ? "rgba(255,255,255,0.25)" : `${C.line}15`,
        padding: "1px 6px", borderRadius: 10,
        fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
      }}>{count}</span>
    </button>
  );
}

function NoteRow({ note, C, now, onEdit, onRemove }) {
  const cat = NOTE_CATEGORIES.find(c => c.v === note.category) || NOTE_CATEGORIES[5];
  const noteDate = new Date(note.ts);
  // Recurrences: array of { ts, text } entries representing each time this
  // concern was re-flagged via the dedup prompt. Original entry is implicit
  // (note.text + note.ts). Total instances = recurrences.length + 1.
  const recurrences = note.recurrences || [];
  const totalInstances = recurrences.length + 1;
  // Most recent occurrence: the latest of (original ts, last recurrence ts).
  // We display this on the row instead of the original ts so users see when
  // the concern was last raised, not when it first appeared.
  const lastTs = recurrences.length > 0
    ? new Date(recurrences[recurrences.length - 1].ts)
    : noteDate;
  // Expand state — tap row to see per-instance breakdown
  const [expanded, setExpanded] = useState(false);
  const isExpandable = totalInstances > 1;

  return (
    <div style={{
      background: note.flagged ? `${C.accent}08` : C.paper,
      borderRadius: 10,
      border: note.flagged ? `1px solid ${C.accent}33` : `1px solid ${C.line}15`,
      borderLeft: `4px solid ${cat.color}`,
      overflow: "hidden",
    }}>
      {/* Main row — clickable surface if expandable */}
      <div
        onClick={isExpandable ? () => setExpanded(v => !v) : undefined}
        style={{
          padding: "10px 12px",
          display: "flex", alignItems: "flex-start", gap: 10,
          cursor: isExpandable ? "pointer" : "default",
        }}>
        {/* Category bullet dot */}
        <span style={{
          display: "inline-block",
          width: 7, height: 7, borderRadius: "50%",
          background: cat.color,
          marginTop: 7, flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5 }}>
            {note.text}
            {totalInstances > 1 && (
              <span style={{
                fontSize: 12, color: C.accent, marginLeft: 6,
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
              }}>
                ({totalInstances}×)
              </span>
            )}
            {note.flagged && (
              <span style={{ marginLeft: 6, fontSize: 13 }} title="flagged to raise with doctor">🚩</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
              <button onClick={onEdit} style={{
                background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 2,
                display: "flex", alignItems: "center", gap: 3, fontSize: 10,
              }}>
                <Edit3 size={10} /> edit
              </button>
              <button onClick={onRemove} style={{
                background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 2,
              }}>
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Far-right timestamp column — shows MOST RECENT occurrence so
            users see when the concern was last raised, not when first logged */}
        <div style={{
          textAlign: "right", flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: C.muted, lineHeight: 1.3,
        }}>
          <div>{lastTs.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
          <div>{fmtTimeShort(lastTs)}</div>
          {isExpandable && (
            <ChevronRight size={12} color={C.muted}
              style={{
                marginTop: 4,
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
              }} />
          )}
        </div>
      </div>

      {/* Expanded panel — per-instance breakdown when this is a recurring concern.
          Lists each occurrence as its own timestamped entry, oldest first. */}
      {isExpandable && expanded && (
        <div style={{
          background: `${C.line}08`,
          borderTop: `1px solid ${C.line}15`,
          padding: "10px 12px 12px 26px",
        }}>
          <div style={{
            fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
            color: C.muted, fontWeight: 600, marginBottom: 8,
          }}>
            Each time it came up
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {/* Original entry */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12 }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: cat.color, flexShrink: 0, marginTop: 6,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.ink, lineHeight: 1.4 }}>{note.text}</div>
              </div>
              <span style={{
                fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {noteDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {fmtTimeShort(noteDate)}
              </span>
            </div>
            {/* Recurrences */}
            {recurrences.map((r, idx) => {
              const rTs = new Date(r.ts);
              return (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: cat.color, flexShrink: 0, marginTop: 6, opacity: 0.6,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: r.text ? C.ink : C.muted, fontStyle: r.text ? "normal" : "italic", lineHeight: 1.4 }}>
                      {r.text || "marked as recurring"}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {rTs.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {fmtTimeShort(rTs)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentModal({ C, onClose, onSubmit }) {
  const [title, setTitle] = useState("Pediatrician visit");
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [doctor, setDoctor] = useState("");
  const [location, setLocation] = useState("");
  const [prepNotes, setPrepNotes] = useState("");

  return (
    <ModalShell C={C} onClose={onClose} title="Add appointment">
      <Field C={C} label="Visit type">
        <TextInput C={C} value={title} onChange={setTitle} placeholder="e.g. 4-month well-baby visit" />
      </Field>
      <Field C={C} label="Date & time">
        <DateTimeInput C={C} value={dateTime} onChange={setDateTime} />
      </Field>
      <Field C={C} label="Doctor (optional)">
        <TextInput C={C} value={doctor} onChange={setDoctor} placeholder="Dr. Patel" />
      </Field>
      <Field C={C} label="Location (optional)">
        <TextInput C={C} value={location} onChange={setLocation} placeholder="Pediatrics — 2nd floor" />
      </Field>
      <Field C={C} label="Prep notes (optional)">
        <textarea
          value={prepNotes} onChange={e => setPrepNotes(e.target.value)} rows={3}
          placeholder="Bring breast pump cleaning supplies, fill out form…"
          style={{
            width: "100%", background: `${C.line}08`, border: `1px solid ${C.line}22`,
            borderRadius: 10, padding: "11px 13px", fontSize: 14, color: C.ink, fontFamily: "inherit",
            outline: "none", resize: "vertical",
          }} />
      </Field>
      <SubmitButton C={C} onClick={() => onSubmit({
        title, dateTime: new Date(dateTime).toISOString(),
        doctor: doctor.trim() || null, location: location.trim() || null,
        prepNotes: prepNotes.trim() || null,
      })}>Save appointment</SubmitButton>
    </ModalShell>
  );
}

function SummaryModal({ C, summary, onClose }) {
  const [view, setView] = useState("copy"); // 'copy' | 'report'
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><title>Solène — Doctor visit summary</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1F1B16; line-height: 1.6; }
  h1 { font-size: 28px; font-style: italic; margin-bottom: 4px; }
  h2 { font-size: 18px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 14px; color: #C44545; margin-top: 16px; margin-bottom: 4px; }
  ul { padding-left: 22px; }
  li { margin-bottom: 4px; }
  .meta { color: #888; font-size: 12px; margin-bottom: 24px; }
  table { border-collapse: collapse; margin: 12px 0; }
  td, th { border: 1px solid #ddd; padding: 6px 10px; font-size: 13px; }
  th { background: #f4ece0; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Solène — Doctor Visit Summary</h1>
<div class="meta">Generated ${new Date(summary.generated).toLocaleString()}</div>
${summary.htmlReport}
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  return (
    <ModalShell C={C} onClose={onClose} title="Visit summary">
      <SegControl C={C} value={view} onChange={setView} options={[
        { v: "copy", l: "Copy text" },
        { v: "report", l: "Printable" },
      ]} />

      <div style={{ marginTop: 14 }}>
        {view === "copy" ? (
          <>
            <div style={{
              background: C.bg, border: `1px solid ${C.line}22`, borderRadius: 10,
              padding: 14, fontSize: 13, color: C.ink, lineHeight: 1.6,
              maxHeight: 400, overflowY: "auto",
              whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace",
            }}>
              {summary.copyText}
            </div>
            <button onClick={handleCopy} style={{
              marginTop: 12, width: "100%",
              background: copied ? "#5C8E5C" : C.accent, color: "#fff", border: "none",
              padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy to clipboard</>}
            </button>
          </>
        ) : (
          <>
            <div style={{
              /* In day mode this stays paper-cream; in dusk it lifts to a
                 print-preview-style white so the rendered HTML's black text
                 stays readable. The doctor summary's rendered content uses
                 dark text by design for printability. */
              background: C.paper === "#FCF8F1" ? "#fff" : C.paper,
              color: "#1F1B16",
              border: `1px solid ${C.line}22`, borderRadius: 10,
              padding: 18, fontSize: 13, lineHeight: 1.6,
              maxHeight: 400, overflowY: "auto",
              fontFamily: "Georgia, serif",
            }} dangerouslySetInnerHTML={{ __html: summary.htmlReport }} />
            <button onClick={handlePrint} style={{
              marginTop: 12, width: "100%",
              background: C.accent, color: "#fff", border: "none",
              padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Printer size={15} /> Print / save as PDF
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ---- Form primitives --------------------------------------------------
function Field({ C, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SegControl({ C, value, onChange, options }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      background: `${C.line}11`, borderRadius: 10, padding: 3, gap: 2,
    }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          background: value === o.v ? (o.color || C.paper) : "transparent",
          color: value === o.v ? (o.color ? "#fff" : C.ink) : C.muted,
          border: "none", borderRadius: 8,
          padding: "9px 6px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          boxShadow: value === o.v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function BigOzPicker({ C, value, onChange }) {
  return (
    <BigNumberPicker C={C} value={value} onChange={onChange} step={0.25} presets={[2, 3, 4, 5, 6, 7]} unit="OUNCES" />
  );
}

function BigNumberPicker({ C, value, onChange, step = 1, presets = [], unit = "" }) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
        background: `${C.line}08`, borderRadius: 12, padding: "12px 14px", marginBottom: 6,
      }}>
        <button onClick={() => onChange(Math.max(0, Number(value) - step))} style={{
          background: C.paper, border: `1px solid ${C.line}22`, borderRadius: "50%",
          width: 38, height: 38, fontSize: 18, cursor: "pointer", color: C.ink,
        }}>−</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <input
            type="number" value={value}
            onChange={e => onChange(e.target.value)}
            step={step} inputMode="decimal"
            style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 500,
              border: "none", background: "transparent", color: C.ink,
              width: "100%", textAlign: "center", outline: "none",
            }}
          />
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.2em" }}>{unit}</div>
        </div>
        <button onClick={() => onChange(Number(value) + step)} style={{
          background: C.paper, border: `1px solid ${C.line}22`, borderRadius: "50%",
          width: 38, height: 38, fontSize: 18, cursor: "pointer", color: C.ink,
        }}>+</button>
      </div>
      {presets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${presets.length}, 1fr)`, gap: 4 }}>
          {presets.map(p => (
            <button key={p} onClick={() => onChange(p)} style={{
              background: Number(value) === p ? C.ink : "transparent",
              color: Number(value) === p ? C.paper : C.muted,
              border: `1px solid ${C.line}22`,
              padding: 6, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TextInput({ C, value, onChange, placeholder }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      width: "100%", background: `${C.line}08`, border: `1px solid ${C.line}22`,
      borderRadius: 10, padding: "11px 13px", fontSize: 14, color: C.ink, fontFamily: "inherit",
      outline: "none",
    }} />
  );
}

function DateTimeInput({ C, value, onChange }) {
  return (
    <input type="datetime-local" value={value} onChange={e => onChange(e.target.value)} style={{
      width: "100%", background: `${C.line}08`, border: `1px solid ${C.line}22`,
      borderRadius: 10, padding: "11px 13px", fontSize: 14, color: C.ink, fontFamily: "'JetBrains Mono', monospace",
      outline: "none",
    }} />
  );
}

// WhenField — a "Now / Earlier" picker used by every log form.
// Lets the user back-date an entry if they forgot to log in the moment.
// `mode` is 'now' or 'custom'. `customLocal` is the YYYY-MM-DDTHH:MM string for the
// datetime-local input. Consumers compute the final ts at submit time as:
//   mode === "now" ? new Date() : new Date(customLocal)
// Caps "earlier" to today so accidental wrong-date entries don't slip in.

// Format current local time as "YYYY-MM-DDTHH:MM" for <input type="datetime-local">
// (using toISOString() gives UTC and renders wrong in the picker).
function localDateTimeNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function WhenField({ C, mode, setMode, customLocal, setCustomLocal, label = "When?" }) {
  // Auto-switch to "custom" mode whenever the user actually edits the time field.
  // Without this, users type in a time, expect it to be honored, but the form
  // silently uses "now" because the segment toggle wasn't flipped — a classic
  // UX trap with mode-based inputs.
  const handleTimeChange = (val) => {
    setCustomLocal(val);
    if (mode !== "custom") setMode("custom");
  };
  return (
    <Field C={C} label={label}>
      <SegControl C={C} value={mode} onChange={setMode} options={[
        { v: "now", l: "Now" },
        { v: "custom", l: "Earlier" },
      ]} />
      <div style={{ marginTop: 8 }}>
        <DateTimeInput C={C} value={customLocal} onChange={handleTimeChange} />
        <div style={{ fontSize: 11, color: mode === "custom" ? C.accent : C.muted, fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>
          {mode === "custom"
            ? `↑ Using this time (${new Date(customLocal).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`
            : "Editing the time above will switch to ‘Earlier’ automatically."}
        </div>
      </div>
    </Field>
  );
}

function SubmitButton({ C, onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", marginTop: 6,
      background: disabled ? `${C.line}22` : C.accent, color: disabled ? C.muted : "#fff", border: "none",
      padding: 15, borderRadius: 12, fontSize: 15, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
      {children}
    </button>
  );
}
