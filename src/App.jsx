import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Moon, Sun, Droplet, Milk, Baby, Clock, AlertCircle,
  ChevronRight, Plus, X, Check, Wind, Edit3, Calendar,
  Bell, Trash2, Cloud, Heart, Sparkles, Bath, ShoppingBag,
  Play, Pause, RotateCcw, Flame, Package, Coffee, Timer, MapPin,
  BookOpen, Stethoscope, FileText, Copy, Printer, MessageSquare, Star,
  ArrowRightLeft, Gift, Volume2, AlarmClock, Search,
} from "lucide-react";

// ---- App identity ------------------------------------------------------
// Little Ledger — a journal of care, rhythm & handoff for Solène.
// Versions are date-stamped (YYYY.MM.DD). When multiple builds ship in one
// day, append a letter: 2026.05.05a, 2026.05.05b, etc.
const APP_NAME = "Little Ledger";
const APP_SUBTITLE = "for Solène";
const APP_VERSION = "2026.05.05bt34";
// Notes for THIS build, shown in the About panel of the Profile Switcher modal.
// Keep to a couple of lines per item — these are personal release notes, not
// a full changelog. The full changelog lives in CHANGELOG below.
const APP_BUILD_NOTES = [
  "POLISH: 'made with care by Cyndell · for Solène ✦' colophon now sits prominently at the top of every page (under the tagline)",
  "FIX: Day plan shift chart now updates immediately when commitments are added/removed",
  "Build fix: JS comments in JSX attribute position (rejected by Rolldown)",
  "DATA INTEGRITY: auto-snapshot before any family-code change · 'Restore from snapshot' UI",
  "DATA INTEGRITY: '22:NaNa' bug fixed everywhere",
  "MILK: prominent expiration banner · sharpie label visible per bottle · auto-suggest next letter",
  "JOURNAL: pump entries show start–end range",
  "WELLNESS: awake-7h impossibility flag · doctor summary period-over-period + local fallback",
];
// CHANGELOG — newest first. Each entry is { version, date, summary }.
const APP_CHANGELOG = [
  { version: "2026.05.05bt34", summary: "PUMP-END SYNC FIX: previously, ending a pump fired two unbatched cloud pushes (clear activePump + add pump event) which could race with a poll and leave activePump stuck. Now wraps the transaction in cloudWritePaused (same mechanism imports use) and force-pushes all 3 keys after a 500ms settle. Also added DEV button 'Clear stuck active pump' in Profile Switcher for one-time cleanup of any existing stuck state." },
  { version: "2026.05.05bt33", summary: "LOG → Feed bottle picker now shows 'Bottle X' label next to oz when bottles have one. Also handles freezer bottles (was previously filtered out — only RT and fridge were shown). Freezer bottles get the Fz badge and a 'Xd frozen' caption." },
  { version: "2026.05.05bt32", summary: "Bug fix: Log → Feed with BM was disabled when inventory was empty, despite the empty-state message saying 'feed will be logged.' canSubmit now allows submission when no BM bottles exist. The feed is logged with inventoryReconcileNeeded:true so it shows ⚠ in journal — tap to reconcile later by adding the missing bottle and marking resolved. Same flow that already worked from the bottle picker." },
  { version: "2026.05.05bt31", summary: "Tile eyebrow text now reads 'tap to use or add' when populated (was 'tap to use'). Surfaces the bt30 add-bottle affordance to the user before they tap. Applied to RT, Fridge, and Freezer." },
  { version: "2026.05.05bt30", summary: "Add bottle from non-empty picker — Use mode now has a '+ Add another bottle to [location]' button (above log-anyway escape hatch). Manage mode also gets a '+ Add a new bottle to [location]' button between bottle list and bulk action bar. Both routes open the existing EditBottleModal in add mode (oz, location, label, pumped time). Manage mode also now shows bottle labels next to oz." },
  { version: "2026.05.05bt29", summary: "Added always-visible inline edit + delete buttons to MeetingRow (commitments on Schedule tab Today/Tomorrow cards). Swipe gesture and body tap still work as before; these are just an always-visible fallback for users who don't discover the swipe." },
  { version: "2026.05.05bt28", summary: "Bug fix: auto-repayment indicator (↩ sage green) was silently never rendering on either the landing page Today's Plan or the Schedule tab Today/Tomorrow cards. Root cause: stripAnnotations whitelist in activeShifts dropped _isAutoRepayment and _autoRepayDurationMin flags. Now preserved through projection. When Daddy covers Mommy's 5-6a meeting, the shift she's automatically repaying him on now shows the indicator on both surfaces." },
  { version: "2026.05.05bt27", summary: "Schedule tab Today/Tomorrow cards now use the same two-column shift list as the landing page (Mommy | Daddy with annotation indicators on the left of each adjusted shift) instead of the visual bar strip. ShiftListGrid component extracted from TodaysPlanCard so both surfaces render identically. Tomorrow's card never shows the current-block pulse dot." },
  { version: "2026.05.05bt26", summary: "Bug fix: 'now is not defined' render crash when expanding Today/Tomorrow cards on Schedule tab. DayPlanCard wasn't accepting `now` as a prop but was forwarding it to inner DayPlanShiftStrip. Now properly threaded through." },
  { version: "2026.05.05bt25", summary: "Bath after dismissing 'no bath tonight' — (1) logging a bath auto-supersedes any same-day bath_skipped events so the journal stays clean, (2) bath_skipped events now show in journal as muted italic '🛁 No bath tonight' with an inline '↻ undo · log bath' affordance that opens the bath logger directly. No new buttons added to the LOG sheet." },
  { version: "2026.05.05bt24", summary: "VISIBLE GUARD BANNER — peak-count safety net now surfaces a terracotta banner at the top of the app when it blocks a cloud push, with diagnostic info (X → Y entries) and two actions: 'Dismiss' (keeps local data, no push) or 'It's intentional · Push anyway' (calls acknowledgeShrink and force-pushes). Hydration + write-pause guards remain silent (they're routine)." },
  { version: "2026.05.05bt23", summary: "UPDATE CHECK — app polls /index.html every 10 min (and on tab focus) comparing the deployed bundle hash to the running one. Coral 'Update available — tap to refresh' banner appears when stale code is detected. About panel shows ✓ up to date / ↻ update available status. Solves the 'phone stuck on stale code' problem. PLUS cloud sync race fixes: hydration guard prevents cloud writes until first poll completes, write-pause flag disables pushes during imports, peak-event-count safety net aborts pushes that would shrink events array by 5+ from peak. New acknowledgeShrink() method for legitimate bulk deletes." },
  { version: "2026.05.05bt22", summary: "Pump edit form gains bottle-label field · journal + today's rhythm pump labels show 'Bottle X' suffix · inventory tile bottle label upgraded · fridge tile clickable when 0 oz" },
  { version: "2026.05.05bt21", summary: "Freezer milk: new strip below RT/Fridge tiles · picker shows 'frozen Xd ago' captions · feeds from freezer auto-tag source as BM-thawed · NEW 'Bottle not in list — log anyway' escape hatch · edit modal on flagged feeds shows reconciliation banner · BM-thawed added to feed source picker" },
  { version: "2026.05.05bt20", summary: "Removed bt19 diagnostic · added 'Reset today's bath/skip events' button in DEV section · ⚡ Power pump indicator added to journal + today's rhythm pump labels" },
  { version: "2026.05.05bt19", summary: "TEMP: diagnostic banner inside OnDutyCard reports why bedtime banner is/isn't showing — surfaces current now value, window check, and any blocking conditions. Will remove after root cause found." },
  { version: "2026.05.05bt18", summary: "Bug fix: bedtime banner 'Yes, log it' routed to 'Log sleep' placeholder instead of bath form. Extracted BathForm so it's used by both BathLoggerModal AND the LogPickerSheet's bath branch." },
  { version: "2026.05.05bt17", summary: "Bedtime banner: dropped over-engineered feed-time gate · prompt window extended to 8:30pm · NEW: swipe-left on commitments reveals Edit + Delete actions" },
  { version: "2026.05.05bt16", summary: "DEV: time-travel for previewing time-dependent UI · Profile Switcher → DEV section with preset jumps · gold banner at top of page when active" },
  { version: "2026.05.05bt15", summary: "Bedtime check-in: banner during 9-11:30pm window asks 'bath tonight?' if last feed was in window and no bath logged · bath types restructured to toe_dip / full_sudsy / full_with_hair / quick_dunk · 'was a book read?' toggle on bath log · groundwork for good-night insight feature" },
  { version: "2026.05.05bt14", summary: "Sleep/wake chart markers now show a hover/tap tooltip with event time, duration of resulting stretch, ongoing flag, and inferred-from source · clicking outside the chart dismisses on mobile" },
  { version: "2026.05.05bt13", summary: "Sleep/wake chart redrawn as a literal SVG step plot — Y-axis 0 (asleep) and 1 (awake) labeled per row, sharp viewer-colored trace line with filled area under, vertical step transitions, time gridlines, circle markers at each transition" },
  { version: "2026.05.05bt12", summary: "Sleep / wake EKG-style trace at top of Wellness tab — asleep band + awake region with ↓↑ tick markers · 24h vs 7d toggle · viewer-themed (mauve for Mommy, blue for Daddy)" },
  { version: "2026.05.05bt11", summary: "SMART IMPORT — Backup→Import now merges instead of overwriting. Dedupes events, meetings, bottles, notes, time-bank, archive against current state. Recent logging is preserved when importing an older backup. Singletons (handoffNote, activePump) only adopted if current is null. Shifts/diaperBag never overwritten." },
  { version: "2026.05.05bt10", summary: "Day Plan card now shows a visual hour-block strip (mauve/blue per parent, ↻ markers on adjusted slots, ! on conflicts, commitment bars on top, now line on today)" },
  { version: "2026.05.05bt9", summary: "Asleep/awake tile shows duration ('2h 15m') instead of 'X min ago' — labels read 'asleep for' / 'awake for' so the value should be a duration, not a relative time" },
  { version: "2026.05.05bt8", summary: "Fix: + (covering) and ! (conflict) indicators now show on Today's day-plan chart, matching Tomorrow — annotations were being stripped by activeShifts" },
  { version: "2026.05.05bt7", summary: "Wake-check banner: belt-and-suspenders dismiss — any wake_confirmed or sleep_down within last hour hides the banner regardless of feed-relative timing" },
  { version: "2026.05.05bt6", summary: "Cyndell font softened (lighter weight, warmer color) · Day vs Dusk theme toggle removed" },
  { version: "2026.05.05bt5", summary: "Maker's name corrected: Cyndi → Cyndell" },
  { version: "2026.05.05bt4", summary: "Maker's colophon promoted to header (quiet italic line under the tagline)" },
  { version: "2026.05.05bt3", summary: "Day plan chart now reflects new commitments immediately (force-remount on commitment count change)" },
  { version: "2026.05.05bt2", summary: "Build fix for v05.05bt — Rolldown rejected JS comments in JSX attribute position" },
  { version: "2026.05.05bt", summary: "DATA INTEGRITY: auto-backup before code change + restore UI · 22:NaNa fix · expiration banner · sharpie sync · pump time-range · awake-7h flag · doctor summary fallback + period-over-period" },
  { version: "2026.05.05bs", summary: "Icon updated to mauve · pip labels PUMP/REST · terracotta deeper · tile divider warmed · About panel maker's colophon" },
  { version: "2026.05.05br", summary: "State colors muted: overdue red → terracotta, on-schedule kelly → sage · whole alarm/success palette retuned for mauve" },
  { version: "2026.05.05bq", summary: "Mommy color: rose → mauve-violet · sophistication match for Daddy's slate-blue" },
  { version: "2026.05.05bp", summary: "Coverage tag only shows when current shift slice is actually a covering slice — phantom-coverage bug fixed" },
  { version: "2026.05.05bo", summary: "Blue policy: reserved for Daddy only · all generic blue chrome migrated to warm-palette neutrals" },
  { version: "2026.05.05bn", summary: "Diaper Pee/Poo relabel · new Poo/day metric vs AAP norm · clearer composition labels" },
  { version: "2026.05.05bm", summary: "Logo follows viewer · home-screen icon assets + setup instructions" },
  { version: "2026.05.05bl", summary: "Bottom UI fully viewer-themed: LOG button base + tab active state in viewer color · drop milk panel coral stripe" },
  { version: "2026.05.05bk", summary: "Milk panel viewer-tint guaranteed · LOG button viewer halo · tab bar elevated docked panel" },
  { version: "2026.05.05bj", summary: "Milk panel container + fridge bottles follow viewer color" },
  { version: "2026.05.05bi", summary: "Power pump live mode: PUMP/REST phase guidance with countdown + 5-pip progress" },
  { version: "2026.05.05bh", summary: "Grain bump · gold token swap · Wellness snapshot eyebrow viewer-aware" },
  { version: "2026.05.05bg", summary: "Adopted Refined Ledger palette: warmer paper, antique-brass gold, subtle CSS grain" },
  { version: "2026.05.05bf", summary: "Solène header follows viewer · inventory Add-bottle button follows viewer" },
  { version: "2026.05.05be", summary: "Viewer-aware chrome: Daddy sees blue accents on shared content; Mommy-specific stays rose" },
  { version: "2026.05.05bd", summary: "Sleep correlation analysis card · top-quartile vs baseline across 5 features" },
  { version: "2026.05.05bc", summary: "Feed amount prediction + per-session vs age norm metric · Daddy bluer · theme bleed fix · swipe-down modal · device persona durability · error boundary" },
  { version: "2026.05.05bb", summary: "Multi-bottle feed picker · sorted commitments · simplified small-size logo" },
  { version: "2026.05.05ba", summary: "Tag-in fix: handoff countdown points to other parent · take-back affordance" },
  { version: "2026.05.05az", summary: "Bug-fix sweep: tab bar, clock, edit meetings, balance auto-heal, takeover ordering, ?m fallbacks" },
  { version: "2026.05.05ay", summary: "Coverage card phrasing rewrite · auto-repay clean wording" },
  { version: "2026.05.05ax", summary: "On-site to LOG sheet · supply analytics moved to Milk · sleep prediction · sleep card cleanup" },
  { version: "2026.05.05aw", summary: "Edit Bank transactions · clearer redeem preview · far-future caveat" },
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
  //
  // ozPerFeed bands added v05.05bb. Sourced from AAP "Healthy Children"
  // bottle-feeding guidance and CDC infant nutrition material:
  //   newborn      → 1.5–3 oz/feed (small stomach, frequent feeds)
  //   1–2 mo       → 3–4 oz/feed
  //   2–4 mo       → 4–6 oz/feed
  //   4–6 mo       → 6–8 oz/feed (then plateaus as solids start)
  //   6+ mo        → 6–8 oz/feed alongside solids; downward as solids ramp
  // 0–1 mo (newborn)
  if (ageMonths < 1) return {
    label: "newborn (0–1 mo)",
    feedsPerDay: [8, 12],
    ozPerDay: [16, 24],
    ozPerFeed: [1.5, 3],
    sleepStretchH: [2, 4],
    totalSleepH: [14, 17],
    diapersPerDay: [8, 12],
    pooPerDay: [1, 5],
    changeIntervalH: [2, 3],
  };
  // 1–2 mo
  if (ageMonths < 2) return {
    label: "1–2 mo",
    feedsPerDay: [7, 10],
    ozPerDay: [20, 30],
    ozPerFeed: [3, 4],
    sleepStretchH: [3, 5],
    totalSleepH: [14, 17],
    diapersPerDay: [8, 12],
    pooPerDay: [1, 4],
    changeIntervalH: [2, 3],
  };
  // 2–4 mo
  if (ageMonths < 4) return {
    label: "2–4 mo",
    feedsPerDay: [6, 8],
    ozPerDay: [24, 32],
    ozPerFeed: [4, 6],
    sleepStretchH: [4, 8],
    totalSleepH: [12, 16],
    diapersPerDay: [8, 10],
    pooPerDay: [1, 3],
    changeIntervalH: [3, 4],
  };
  // 4–6 mo
  if (ageMonths < 6) return {
    label: "4–6 mo",
    feedsPerDay: [5, 7],
    ozPerDay: [27, 36],
    ozPerFeed: [6, 8],
    sleepStretchH: [6, 10],
    totalSleepH: [12, 15],
    diapersPerDay: [8, 10],
    pooPerDay: [1, 3],
    changeIntervalH: [3, 4],
  };
  // 6–9 mo (solids starting; milk volumes drop slightly)
  if (ageMonths < 9) return {
    label: "6–9 mo",
    feedsPerDay: [4, 6],
    ozPerDay: [24, 32],
    ozPerFeed: [6, 8],
    sleepStretchH: [8, 11],
    totalSleepH: [12, 14],
    diapersPerDay: [6, 8],
    pooPerDay: [1, 2],
    changeIntervalH: [3, 4],
  };
  // 9–12 mo
  if (ageMonths < 12) return {
    label: "9–12 mo",
    feedsPerDay: [3, 5],
    ozPerDay: [20, 30],
    ozPerFeed: [6, 8],
    sleepStretchH: [9, 12],
    totalSleepH: [11, 14],
    diapersPerDay: [6, 8],
    pooPerDay: [1, 2],
    changeIntervalH: [3, 4],
  };
  // 12+ mo (toddler)
  return {
    label: "12+ mo",
    feedsPerDay: [2, 4],
    ozPerDay: [16, 24],
    ozPerFeed: [6, 8],
    sleepStretchH: [10, 12],
    totalSleepH: [11, 14],
    diapersPerDay: [4, 7],
    pooPerDay: [1, 2],
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

// Diaper display labels — clearer than the legacy stored values.
// We KEEP "wet" / "dirty" / "both" in the data layer (so existing logged
// events still read correctly without migration), but display them as
// "Pee" / "Poo" / "Pee + Poo" everywhere the user sees them. The original
// pediatric-tracker convention treats "dirty" = poop, but in practice
// users find that ambiguous — Pee/Poo is unambiguous to anyone.
function diaperLabel(notes) {
  if (notes === "dirty" || notes === "soiled") return "Poo";
  if (notes === "both") return "Pee + Poo";
  return "Pee";  // covers "wet" and any unexpected value
}

// === Power pump protocol ===
// Standard 60-minute protocol (mimics cluster feeding to signal supply).
//   pump 20m  →  rest 10m  →  pump 10m  →  rest 10m  →  pump 10m
// Phase indices 0-4. Phase types alternate pump/rest after the first.
const POWER_PUMP_PHASES = [
  { type: "pump", durationMin: 20, label: "Pump 20" },
  { type: "rest", durationMin: 10, label: "Rest 10" },
  { type: "pump", durationMin: 10, label: "Pump 10" },
  { type: "rest", durationMin: 10, label: "Rest 10" },
  { type: "pump", durationMin: 10, label: "Pump 10" },
];
const POWER_PUMP_TOTAL_MIN = POWER_PUMP_PHASES.reduce((s, p) => s + p.durationMin, 0); // 60

// Given an active pump session (has startedAt, type === "power") and the
// current time, return the live phase state. Computes phase by walking the
// schedule from session start. If we're past the last phase, returns
// { complete: true } so the caller can prompt the user to log oz.
function getPowerPumpPhase(activePump, now) {
  if (!activePump || activePump.type !== "power") return null;
  const startMs = new Date(activePump.startedAt).getTime();
  const elapsedMs = now.getTime() - startMs;
  if (elapsedMs < 0) return null;
  let cumul = 0;
  for (let i = 0; i < POWER_PUMP_PHASES.length; i++) {
    const p = POWER_PUMP_PHASES[i];
    const phaseDurationMs = p.durationMin * 60000;
    const phaseEndCumul = cumul + phaseDurationMs;
    if (elapsedMs < phaseEndCumul) {
      const phaseElapsedMs = elapsedMs - cumul;
      return {
        complete: false,
        phaseIndex: i,
        phaseType: p.type,
        phaseLabel: p.label,
        phaseDurationMs,
        phaseElapsedMs,
        phaseRemainingMs: phaseDurationMs - phaseElapsedMs,
        totalElapsedMs: elapsedMs,
        totalRemainingMs: POWER_PUMP_TOTAL_MIN * 60000 - elapsedMs,
      };
    }
    cumul = phaseEndCumul;
  }
  return {
    complete: true,
    phaseIndex: POWER_PUMP_PHASES.length,
    totalElapsedMs: elapsedMs,
    totalRemainingMs: 0,
  };
}

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
  { v: "sleep", l: "Sleep", emoji: "😴", color: "#7C5C84" },
  { v: "feeding", l: "Feeding", emoji: "🍼", color: "#C77B8E" },
  { v: "skin", l: "Skin", emoji: "🌿", color: "#7B9479" },
  { v: "development", l: "Development", emoji: "✨", color: "#C44545" },
  { v: "mood", l: "Mood", emoji: "💛", color: "#C49A3A" },
  // Illness — fevers, vomiting, congestion, anything pediatrician should hear about
  { v: "illness", l: "Illness", emoji: "🤒", color: "#B85C2E" },
  { v: "other", l: "Other", emoji: "📝", color: "#7C6F5E" },
];

// Activity types
const ACTIVITIES = [
  { v: "tummy", l: "Tummy time", emoji: "🤸", color: "#C44545" },
  { v: "reading", l: "Book reading", emoji: "📖", color: "#A37750" },
  { v: "french", l: "French time", emoji: "🇫🇷", color: "#C77B8E" },
  { v: "music", l: "Music time", emoji: "🎵", color: "#7B9479" },
  { v: "play", l: "Free play", emoji: "🧸", color: "#C49A3A" },
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

// Bath taxonomy — restructured in v05.05bt15 to match the bedtime-routine
// study Cyndell wants to track. Each type captures a different sleep-hygiene
// hypothesis: full hair wash is most stimulating + cleansing; quick dunk is
// soothing without disrupting sleep oils; toe dip is sensory play; full
// sudsy is the standard "clean baby" routine. We track which type was used
// alongside whether a book was read so good-night insight (later feature)
// can correlate routine with stretches.
const BATH_TYPES = {
  toe_dip: {
    label: "Toe dip",
    desc: "Plays with her toes in warm water",
    icon: "🦶",
    duration: "5 min",
  },
  full_sudsy: {
    label: "Full sudsy",
    desc: "Full body scrub with baby wash, no hair",
    icon: "💦",
    duration: "10–15 min",
  },
  full_with_hair: {
    label: "Full + hair",
    desc: "Head-to-toe scrub including hair wash",
    icon: "🛁",
    duration: "15–20 min",
  },
  quick_dunk: {
    label: "Quick dunk",
    desc: "Sudsy on privates + bottom, sits and relaxes",
    icon: "🧼",
    duration: "8 min",
  },
  // Legacy keys preserved for backward compatibility — existing logged baths
  // will still display correctly. New bath logs use the new keys.
  full: { label: "Full + hair", desc: "Head-to-toe scrub + hair wash", icon: "🛁", duration: "15–20 min" },
  partial: { label: "Full sudsy", desc: "Body wash, no hair", icon: "💦", duration: "10–15 min" },
  quickie: { label: "Toe dip", desc: "Feet in water + face wash", icon: "🦶", duration: "5 min" },
  wipe: { label: "Wipe-down", desc: "No tub, just a warm cloth", icon: "🧻", duration: "3 min" },
};

// ---- Helpers -----------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

// 24-hour HH:MM formatter — tolerates Date or ISO string and Invalid Date.
// Returns "00:00" rather than "NaN:NaN" if the date is invalid, because the
// callers (carveWindow, slice construction, etc) parse the result with
// toMin() which would propagate NaN through shift math. "00:00" is a safe
// fallback that produces a tiny zero-width slice that downstream filters
// will drop. v05.05bt: hoisted from inline definitions to fix the
// "22:NaNa" bug seen in Journal/shift display when an event has a
// corrupted ts.
const safeHHMM = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) {
    console.warn("[safeHHMM] Invalid Date input, returning 00:00 fallback");
    return "00:00";
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Local datetime string formatter for <input type="datetime-local">.
// Format: YYYY-MM-DDTHH:MM (local, no Z). Tolerates Date or ISO string.
// Falls back to NOW for Invalid Date so a corrupted event timestamp doesn't
// produce "NaN-NaN-NaNTNaN:NaN" which the input rejects, leaving the user
// stuck in an unfixable form. Falling back to "now" keeps the form editable;
// the user re-enters whatever the actual time should be.
const safeDatetimeLocal = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) {
    console.warn("[safeDatetimeLocal] Invalid Date input, falling back to now");
    d = new Date();
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 12-hour formatters everywhere — tolerate Date or ISO string
const fmtTime12 = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  // Guard against Invalid Date — prevents NaN:NaN output ("22:NaNa" bug)
  if (isNaN(d.getTime())) return "—";
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
};
const fmtTimeShort = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  // Guard against Invalid Date — prevents NaN:NaN output ("22:NaNa" bug)
  if (isNaN(d.getTime())) return "—";
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

function nextHandoff(shifts, now = new Date(), currentOnDutyParent = null) {
  // The "next handoff" should be when the OTHER parent takes over, not just
  // the next shift in time order. Without filtering, this would return the
  // current parent's next shift (e.g. Mommy's afternoon block) when the
  // user is on duty in the morning — which reads as "X min until handoff
  // to Mommy" while Mommy is already on duty. That's the bug this filter
  // fixes.
  //
  // We chronologically order all shifts in [now, +24h), then return the
  // first one whose parent != currentOnDutyParent. Time-comparison logic
  // is in absolute milliseconds rather than minutes-of-day so we don't
  // get tripped up by overnight shifts (e.g. an 11pm-3am block on tomorrow's
  // calendar).
  const nowAbs = now.getTime();
  const ONE_DAY = 24 * 3600 * 1000;
  const all = [];
  // Build absolute timestamps for each shift, anchored to today and tomorrow
  // (so we don't miss an overnight or early-morning shift that wraps).
  for (const p of ["Mommy", "Daddy"]) {
    for (const s of shifts[p] || []) {
      const [h, m] = s.start.split(":").map(Number);
      for (const dayOffset of [0, 1]) {
        const candidate = new Date(now);
        candidate.setHours(h, m, 0, 0);
        candidate.setDate(candidate.getDate() + dayOffset);
        if (candidate.getTime() > nowAbs && candidate.getTime() < nowAbs + ONE_DAY) {
          all.push({ ...s, parent: p, _absStart: candidate.getTime() });
        }
      }
    }
  }
  all.sort((a, b) => a._absStart - b._absStart);

  // Prefer the next shift owned by the OTHER parent (the actual handoff).
  if (currentOnDutyParent) {
    const otherParent = currentOnDutyParent === "Mommy" ? "Daddy" : "Mommy";
    const otherNext = all.find(s => s.parent === otherParent);
    if (otherNext) return otherNext;
  }
  // Fallback: just return the next shift in time order. Old behavior, kept
  // for the rare case where one parent doesn't appear in the next 24h.
  if (all[0]) return all[0];
  // Last resort if shifts is empty entirely
  const fallback = shifts.Mommy?.[0];
  return fallback ? { ...fallback, parent: "Mommy" } : { parent: "Mommy", start: "00:00", end: "00:00" };
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
// Palette refined v05.05bg to adopt the Mockup 1 "Refined Ledger" coloring:
//   • paper bumped from FCF8F1 → FCF7EB (a half-step warmer; reads as
//     oatmeal cream rather than near-white)
//   • gold muted from D4A03A → C49A3A (antique brass instead of marigold;
//     pairs more naturally with the cream paper without competing for
//     attention with the rose accent)
//   • dusk/night gold equivalently muted: E5B860 → D6A856
// The bg, ink, accent, mommy, daddy, muted, and line tokens are
// intentionally unchanged — those already worked.
// Mommy palette token updated v05.05bq from saturated rose (#C77893) to
// mauve-violet (#9C7B96). The rose was visually "pretty" but read as girlier
// than Daddy's calm slate-blue (#6286B0); mauve-violet is desaturated to
// the same sophistication level as the slate-blue, so the two together
// feel like equal-weight partners with the same mood, different temperature.
// Dusk/night versions (#BFA0BC) are lifted proportionally to how Daddy's
// blue gets lifted in dark mode, preserving the day↔dark contrast curve.
const PALETTES = {
  day:   { bg: "#F5EEE3", ink: "#1F1B16", paper: "#FCF7EB", accent: "#B85C2E", soft: "#E8D7BC", muted: "#7C6F5E", line: "#1F1B16",
           mommy: "#9C7B96", daddy: "#6286B0", gold: "#C49A3A" },
  dawn:  { bg: "#F5EEE3", ink: "#1F1B16", paper: "#FCF7EB", accent: "#B85C2E", soft: "#E8D7BC", muted: "#7C6F5E", line: "#1F1B16",
           mommy: "#9C7B96", daddy: "#6286B0", gold: "#C49A3A" },
  dusk:  { bg: "#1F1A22", ink: "#EFE5D5", paper: "#2A2329", accent: "#D88A5C", soft: "#322932", muted: "#A89A87", line: "#D9CDB5",
           mommy: "#BFA0BC", daddy: "#8FA8C4", gold: "#D6A856" },
  night: { bg: "#1F1A22", ink: "#EFE5D5", paper: "#2A2329", accent: "#D88A5C", soft: "#322932", muted: "#A89A87", line: "#D9CDB5",
           mommy: "#BFA0BC", daddy: "#8FA8C4", gold: "#D6A856" },
};

// Little Ledger app mark — the artwork now fills the full viewBox so it reads
// at any size. Open journal base + swaddled-baby motif + small star + heart.
function LittleLedgerLogo({ C, size = 40, currentUser }) {
  // Logo is brand-neutral — represents the baby's app identity, not a specific
  // parent. Like Solène's name in the header, the rose-tinted elements
  // (swaddle teardrop + heart) follow the viewer color so the brand mark
  // feels like the viewer's. Star (gold) and journal (ink) are brand-neutral
  // and stay as-is. v05.05bm: was hardcoded C.mommy.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;
  // viewBox extends to 54 to accommodate the heart that hangs slightly
  // below the baby (was previously clipped by 48-tall viewBox). Display
  // is block to prevent the inline-baseline whitespace that can give a
  // floating image the appearance of sitting in a faint container.
  //
  // At small sizes (<32px) we render a simplified mark — just teardrop +
  // star + heart — without the open-journal curves that collapse to noise
  // at favicon scale. This matches the home-screen icon shipped as
  // /public/little-ledger-icon.svg so the in-app glyph and the home-
  // screen shortcut read as the same brand mark.
  const isCompact = size < 32;
  if (isCompact) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 54" fill="none"
           xmlns="http://www.w3.org/2000/svg" aria-label="Little Ledger"
           style={{ display: "block" }}>
        <path d="M37 6 L38.4 9.6 L42 11 L38.4 12.4 L37 16 L35.6 12.4 L32 11 L35.6 9.6 Z" fill={C.gold} />
        <path d="M24 9 Q14 17 14 28 Q14 36 24 38 Q34 36 34 28 Q34 17 24 9 Z" fill={viewerColor} opacity="0.92" />
        <circle cx="24" cy="14" r="3.2" fill="none" stroke={C.bg} strokeWidth="1.6" />
        <path d="M37 47 C35.5 45.5 33.5 46 33.5 47.5 C33.5 49 35.5 50.5 37 51.8 C38.5 50.5 40.5 49 40.5 47.5 C40.5 46 38.5 45.5 37 47 Z" fill={viewerColor} opacity="0.75" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 54" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-label="Little Ledger"
         style={{ display: "block" }}>
      {/* small star upper-right — soft gold */}
      <path d="M37 6 L38.4 9.6 L42 11 L38.4 12.4 L37 16 L35.6 12.4 L32 11 L35.6 9.6 Z" fill={C.gold} />
      {/* swaddled baby — large viewer-color teardrop centered */}
      <path d="M24 9 Q14 17 14 28 Q14 36 24 38 Q34 36 34 28 Q34 17 24 9 Z" fill={viewerColor} opacity="0.92" />
      {/* baby head — outline only, no fill (the teardrop shows through).
          A solid C.bg fill here read as a faint "patch" against any subtle
          page tint, which is what made the logo look boxed-in. */}
      <circle cx="24" cy="14" r="3.2" fill="none" stroke={C.bg} strokeWidth="1.6" />
      {/* open journal — two stroked curves form the open book */}
      <path d="M4 40 Q14 35 24 39 Q34 35 44 40" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
      <path d="M6 44 Q14 40 24 42 Q34 40 42 44" stroke={C.ink} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* small heart bottom-right — viewer-color */}
      <path d="M37 47 C35.5 45.5 33.5 46 33.5 47.5 C33.5 49 35.5 50.5 37 51.8 C38.5 50.5 40.5 49 40.5 47.5 C40.5 46 38.5 45.5 37 47 Z" fill={viewerColor} opacity="0.75" />
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
  _onCloudWriteError: null, // callback for offline-pip UI (network failure)
  _onCloudWriteBlocked: null, // v05.05bt23: callback when peak-count safety net fires (data loss prevention)
  // v05.05bt23: cloud write protection.
  // _cloudHydrated: only true after the first cloud poll has completed
  // successfully. Until then, NO cloud writes happen. Prevents the boot
  // race where the app's autosave effects fire before the cloud pull has
  // populated state, pushing an empty/stale local state up and overwriting
  // good cloud data.
  // _cloudWritePaused: temporarily disables cloud writes during multi-step
  // state mutations (imports, restores). Caller is responsible for clearing
  // and triggering a fresh push.
  // _peakEventCount: highest events array length we've seen this session.
  // If we're about to push an events array meaningfully smaller (>5 fewer),
  // abort and warn — this is the defensive net for race conditions we
  // didn't catch otherwise.
  _cloudHydrated: false,
  _cloudWritePaused: false,
  _peakEventCount: 0,

  setCloudContext({ familyCode, syncingFromCloud, onCloudWriteError, onCloudWriteBlocked, cloudHydrated, cloudWritePaused }) {
    if (familyCode !== undefined) this._familyCode = familyCode;
    if (syncingFromCloud !== undefined) this._syncingFromCloud = syncingFromCloud;
    if (onCloudWriteError !== undefined) this._onCloudWriteError = onCloudWriteError;
    if (onCloudWriteBlocked !== undefined) this._onCloudWriteBlocked = onCloudWriteBlocked;
    if (cloudHydrated !== undefined) this._cloudHydrated = cloudHydrated;
    if (cloudWritePaused !== undefined) this._cloudWritePaused = cloudWritePaused;
  },

  // v05.05bt23: explicitly allow the next push to shrink the events array
  // (used after legitimate bulk delete or reset). Resets the peak counter
  // so the next setEvents push isn't blocked by the safety check.
  acknowledgeShrink() {
    this._peakEventCount = 0;
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
    // v05.05bt23 protections:
    //   - _cloudHydrated: don't push before first cloud pull has confirmed
    //     received state (stops boot race)
    //   - _cloudWritePaused: lets imports temporarily disable pushes during
    //     multi-step mutations
    //   - peak event count check: refuse to push solene:events if we're
    //     about to wipe a meaningful number of entries (defensive net)
    //
    // Why we exclude solene:meta:* keys: those are local-only infrastructure
    // (wipe marker, daily-content cache, etc.) that don't belong on the
    // cloud. Pushing them would pollute the namespace and could even loop
    // (the wipe marker push on Device A would propagate to Device B and
    // confuse its hydrate).
    if (this._familyCode && !this._syncingFromCloud && !key.startsWith("solene:meta:")) {
      // Hydration guard: silently swallow the push if we haven't yet
      // confirmed a successful cloud pull. localStorage already has the
      // value; cloud will catch up on the first push after hydration.
      if (!this._cloudHydrated) {
        console.log("[storage] skipping cloud push (not hydrated yet):", key);
        return;
      }
      // Pause guard: imports/restores set this so multi-step state changes
      // don't generate intermediate cloud pushes.
      if (this._cloudWritePaused) {
        console.log("[storage] skipping cloud push (writes paused):", key);
        return;
      }
      // Peak-count safety check: only applies to solene:events. If the
      // value we're pushing has 5+ fewer entries than the largest we've
      // seen this session, that's suspicious — abort the push and log a
      // warning. The user can still see the data locally; manual
      // intervention is needed to push.
      if (key === "solene:events" && Array.isArray(value)) {
        if (value.length > this._peakEventCount) {
          this._peakEventCount = value.length;
        } else if (this._peakEventCount - value.length >= 5) {
          console.error(
            "[storage] CLOUD PUSH ABORTED: events array shrunk from peak " +
            `${this._peakEventCount} to ${value.length}. ` +
            "This looks like data loss. Push blocked. " +
            "Banner shown to user with override option."
          );
          if (this._onCloudWriteBlocked) {
            try {
              this._onCloudWriteBlocked({
                peakCount: this._peakEventCount,
                currentCount: value.length,
                droppedCount: this._peakEventCount - value.length,
              });
            } catch {}
          }
          return;
        }
      }
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
    // v05.05bt23: also gated by _cloudHydrated and _cloudWritePaused.
    if (this._familyCode && !this._syncingFromCloud && !key.startsWith("solene:meta:")
        && this._cloudHydrated && !this._cloudWritePaused) {
      this.cloudDel(this._familyCode, key).catch(() => {});
    }
  },
  async wipeAll() {
    // Set the wipe marker FIRST so even if anything below fails, the next
    // boot will see the marker and refuse to self-heal artifact storage.
    try {
      localStorage.setItem(this.WIPE_MARKER_KEY, String(Date.now()));
    } catch {}
    // v05.05bt23: explicitly acknowledge that we're about to shrink things,
    // so the peak-count guard doesn't block the wipe pushes.
    this.acknowledgeShrink();

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


// ---- Error Boundary ----------------------------------------------------
// Catches render errors anywhere in the tree so a crash shows a recoverable
// UI instead of a blank white page. Reload preserves localStorage, so any
// logged data survives.
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[AppErrorBoundary] caught:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", padding: "40px 20px",
          background: "#F4EEE6", color: "#1F1B16",
          fontFamily: "'Inter', -apple-system, sans-serif",
          maxWidth: 600, margin: "0 auto",
        }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500, marginBottom: 8 }}>
            Something hiccuped
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5A5448", marginBottom: 16 }}>
            The app hit a render error. Your data is safe — it's stored in
            this browser. Tapping reload below will reload the app fresh
            without losing any logged events or inventory.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#C44545", color: "#fff", border: "none",
              padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: "pointer", marginBottom: 16, fontFamily: "inherit",
            }}>
            Reload app
          </button>
          <details style={{ fontSize: 12, color: "#5A5448" }}>
            <summary style={{ cursor: "pointer", marginBottom: 8 }}>
              Show error detail (for debugging)
            </summary>
            <pre style={{
              background: "#fff", border: "1px solid #ddd",
              padding: 12, borderRadius: 6,
              fontSize: 11, lineHeight: 1.4,
              overflow: "auto", maxHeight: 300,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {String(this.state.error?.message || this.state.error)}
              {"\n\n"}
              {this.state.error?.stack || ""}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- Main App ----------------------------------------------------------
export default function SoleneHandoff() {
  return (
    <AppErrorBoundary>
      <SoleneHandoffInner />
    </AppErrorBoundary>
  );
}

function SoleneHandoffInner() {
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
  // v05.05bt23: when the peak-count safety net fires, we set this with
  // diagnostic info so the UI can show a banner. null = no warning.
  // Shape: { peakCount, currentCount, droppedCount }
  const [cloudGuardWarning, setCloudGuardWarning] = useState(null);
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
  // Which parent is currently using the app — affects what's primary, what's
  // "your" data. STORED PER-DEVICE in localStorage (under a non-synced key)
  // so Mom's phone defaults to Mommy and Dad's phone defaults to Daddy.
  // This was previously synced through the cloud, which caused both devices
  // to show the same view (whoever changed it last won). Fixed in v05.05bb.
  const [currentUser, setCurrentUserState] = useState(() => {
    try {
      const stored = localStorage.getItem("ll:devicePersona");
      if (stored === "Mommy" || stored === "Daddy") return stored;
    } catch {}
    return "Mommy";
  });
  // Wrapper that ALSO writes to the device-local key on every change.
  const setCurrentUser = (next) => {
    setCurrentUserState(next);
    try { localStorage.setItem("ll:devicePersona", next); } catch {}
  };
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  // v05.05bt16: time-travel for demoing time-dependent UI (bedtime banner,
  // wake-check, day-plan now-line, etc.). Stored as an offset in ms applied
  // to every `now` read. Session-only (not persisted) so a page reload
  // returns to real time. Configured in Profile Switcher → DEV section.
  const [timeTravelOffset, setTimeTravelOffset] = useState(0);

  // v05.05bt23: Update-available detection. On boot we capture the
  // currently-running JS bundle filename (Vite content-hashes it, so it
  // changes on every deploy). Periodically we re-fetch index.html and
  // compare. If the deployed bundle name differs from the running one,
  // there's a newer version on the server. Show a banner so the user knows
  // to refresh — solves the "phone stuck on stale code" problem we hit
  // when the home-screen shortcut's PWA cache served bt7 long after bt22
  // was deployed.
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [bundleHash, setBundleHash] = useState(null); // running version
  const [latestBundleHash, setLatestBundleHash] = useState(null); // deployed
  const [updateCheckFailed, setUpdateCheckFailed] = useState(false);

  // Capture the running bundle hash once on mount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      const scripts = document.querySelectorAll('script[src*="/assets/"]');
      // Take the first matching one — Vite emits index-XXX.js as the entry.
      for (const s of scripts) {
        const src = s.getAttribute("src") || "";
        if (src.includes("/assets/") && src.endsWith(".js")) {
          // Extract just the filename part for comparison
          const filename = src.split("/").pop();
          setBundleHash(filename);
          break;
        }
      }
    } catch (e) { console.warn("[update-check] couldn't read running bundle hash", e); }
  }, []);

  // Periodically fetch index.html and check whether the deployed bundle
  // differs from what's running. Skip the first 30 seconds to avoid noise
  // during deploy windows. Fetch with no-store to bypass any PWA cache.
  useEffect(() => {
    if (!bundleHash) return; // wait until we have our own hash
    let cancelled = false;
    const checkForUpdate = async () => {
      if (cancelled) return;
      try {
        const url = `/index.html?_v=${Date.now()}`;
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) {
          setUpdateCheckFailed(true);
          return;
        }
        const text = await resp.text();
        // Parse out the bundle filename from the script tag in the HTML
        const match = text.match(/<script[^>]*src="[^"]*\/assets\/([^"]+\.js)"/);
        if (!match) {
          setUpdateCheckFailed(true);
          return;
        }
        const deployedFilename = match[1];
        if (cancelled) return;
        setLatestBundleHash(deployedFilename);
        setUpdateCheckFailed(false);
        if (deployedFilename !== bundleHash) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        if (!cancelled) setUpdateCheckFailed(true);
        // Non-fatal — could be offline. We just don't set updateAvailable.
      }
    };
    // First check after 30 seconds (avoid deploy-window noise)
    const initial = setTimeout(checkForUpdate, 30000);
    // Then every 10 minutes
    const interval = setInterval(checkForUpdate, 10 * 60000);
    // Also check when tab regains visibility (user comes back)
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [bundleHash]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date(Date.now() + timeTravelOffset)), 15000);
    return () => clearInterval(t);
  }, [timeTravelOffset]);
  // When the offset changes, snap `now` immediately so the UI reflects the
  // change without waiting for the next 15s tick.
  useEffect(() => {
    setNow(new Date(Date.now() + timeTravelOffset));
  }, [timeTravelOffset]);

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
      // INTENTIONALLY skip `if (cu) setCurrentUser(cu)`. The device-local
      // localStorage key `ll:devicePersona` already determined currentUser
      // at mount; cloud-side currentUser is just a stale crumb from when
      // the OTHER device set it. Pulling that value here would clobber
      // the per-device default — Mommy's phone would suddenly show
      // Daddy's view because that's who saved last.
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
      // v05.05bt23: peak-count guard — surfaces a banner with override
      onCloudWriteBlocked: (info) => {
        setCloudGuardWarning(info);
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
    // INTENTIONALLY no setter for "solene:currentUser". Device persona is
    // strictly device-local (ll:devicePersona localStorage). Cross-device
    // sync would cause Mommy's phone to flip to Daddy's view whenever
    // Daddy switched on his device, which is the bug we just fixed.
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
          // v05.05bt23: even though there was nothing new, we successfully
          // contacted the cloud and confirmed our local state matches.
          // Lift the hydration guard so subsequent local edits push.
          storage.setCloudContext({ cloudHydrated: true });
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
          // v05.05bt23: lift the hydration guard now that we've pulled
          // and applied the cloud's state. Future local edits will push.
          storage.setCloudContext({ syncingFromCloud: false, cloudHydrated: true });
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
  // currentUser autosave intentionally removed — device persona is local
  // only (ll:devicePersona). See cloudKeySetters above for rationale.

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

  // Sync html + body backgrounds to the current theme. Without this, iOS
  // overscroll, the area under the safe-area inset, and any rendering gap
  // shows the browser's default white. This makes the theme bleed all the
  // way to the edges of the viewport in every state.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = C.bg;
    document.body.style.backgroundColor = C.bg;
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, [C.bg]);

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
      // v05.05bt25 — Option 2: bath supersedes same-day bath_skipped.
      // When the user logs an actual bath, any "no bath tonight" decision
      // from earlier today is invalidated. Remove the skip events from the
      // same calendar day. We use the new event's date as the anchor so
      // late-night baths (after midnight) don't accidentally clear next-day
      // skip events.
      let result = next;
      if (newEv.type === "bath") {
        const newEvDate = new Date(newEv.ts);
        const startOfDay = new Date(newEvDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const before = result.length;
        result = result.filter(e => {
          if (e.type !== "bath_skipped") return true;
          const t = new Date(e.ts);
          return !(t >= startOfDay && t < endOfDay);
        });
        if (result.length < before) {
          console.log(`[addEvent] bath supersedes ${before - result.length} bath_skipped event(s) from today`);
        }
      }
      // SYNC PERSIST: write straight to localStorage so data is durable
      // even if the runtime tears down before the React effect runs.
      try {
        localStorage.setItem("solene:events", JSON.stringify(result));
        localStorage.setItem("solene:events:backup", JSON.stringify(prev));
      } catch (e) { console.warn("[addEvent] sync persist failed", e); }
      return result;
    });

    if (ev.type === "feed" && ev.source && ev.source.includes("BM") && ev.oz && !ev.inventoryReconcileNeeded) {
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
        bottleLabel: ev.bottleLabel || null,
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

    // v05.05bt22: when editing a pump, sync the matching inventory bottle.
    // The pump event's ts is the same value used as the bottle's pumpedAt
    // when addEvent originally created it. Match on the OLD ts (since the
    // user may have edited the time, in which case we update pumpedAt too).
    if (oldEvent && oldEvent.type === "pump" && updated.type !== "deleted") {
      const oldTsISO = typeof oldEvent.ts === "string" ? oldEvent.ts : new Date(oldEvent.ts).toISOString();
      setInventory(prev => prev.map(b => {
        const bPumpedAtISO = typeof b.pumpedAt === "string" ? b.pumpedAt : new Date(b.pumpedAt).toISOString();
        if (bPumpedAtISO !== oldTsISO) return b;
        return {
          ...b,
          oz: updated.oz != null ? Number(updated.oz) : b.oz,
          location: updated.location != null ? updated.location : b.location,
          bottleLabel: updated.bottleLabel !== undefined ? updated.bottleLabel : b.bottleLabel,
          pumpedAt: updated.ts || b.pumpedAt,
        };
      }));
    }

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
      const tStartHHMM = safeHHMM(takeoverStart);
      const tEndHHMM = safeHHMM(takeoverEnd);

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

          // Helper: format a Date back to "HH:MM" for the shift block format.
          // Using top-level safeHHMM which guards against Invalid Date.
          const fmtHM = safeHHMM;
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
          const fmtHM = safeHHMM;
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
      Mommy: obj.Mommy.map(s => ({
        start: s.start, end: s.end,
        _isRepayment: s._isRepayment, _isTakeoverSlice: s._isTakeoverSlice,
        _takeoverEventId: s._takeoverEventId, _takeoverDurationMin: s._takeoverDurationMin,
        // v05.05bt28: also preserve auto-repayment annotations so the ↩
        // (sage green) indicator fires on the shift used to repay an
        // earlier coverage. Without these flags, the indicator silently
        // never rendered — affected both the landing page Today's Plan
        // and the Schedule tab Today/Tomorrow cards.
        _isAutoRepayment: s._isAutoRepayment, _autoRepayDurationMin: s._autoRepayDurationMin,
        // v05.05bt8: preserve carve/cover annotations so Today's DayPlanCard
        // chart can render the + (covering) and ! (conflict) indicators
        // matching what Tomorrow's chart shows. The original "strip" was
        // for downstream helpers that didn't care about these flags;
        // keeping them in activeShifts is harmless to those helpers and
        // restores the visual cue Today's chart needs.
        _coveringFor: s._coveringFor, _conflict: s._conflict, _reason: s._reason,
        _isCarvedSlice: s._isCarvedSlice, _isCarvedFree: s._isCarvedFree,
      })),
      Daddy: obj.Daddy.map(s => ({
        start: s.start, end: s.end,
        _isRepayment: s._isRepayment, _isTakeoverSlice: s._isTakeoverSlice,
        _takeoverEventId: s._takeoverEventId, _takeoverDurationMin: s._takeoverDurationMin,
        _isAutoRepayment: s._isAutoRepayment, _autoRepayDurationMin: s._autoRepayDurationMin,
        _coveringFor: s._coveringFor, _conflict: s._conflict, _reason: s._reason,
        _isCarvedSlice: s._isCarvedSlice, _isCarvedFree: s._isCarvedFree,
      })),
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
  const next = nextHandoff(activeShifts, now, onDuty.parent);

  // ACTIVE COVERING COMMITMENT: is the on-duty parent currently covering for
  // their partner because of a real commitment that's still in progress?
  // If yes, we offer an "ended early" button so either parent can truncate
  // the meeting and reclaim the partner's shift the moment the meeting ends.
  //
  // FIX v05.05bp: previously this just returned ANY meeting on the other
  // parent's calendar that overlapped now — which falsely flagged "Mommy
  // covering Daddy" when Daddy had a meeting that happened to fall during
  // Mommy's REGULAR shift (no swap occurred, no coverage was needed). The
  // correct test is: did the on-duty parent's current shift slice get
  // carved/swapped specifically because of this meeting? We answer that by
  // checking whether the current slice in projectedShifts.projected has
  // _coveringFor === otherParent. If not, no coverage tag.
  const activeCoveringCommitment = useMemo(() => {
    if (takeover) return null; // takeover has its own end-flow
    const otherParent = onDuty.parent === "Mommy" ? "Daddy" : "Mommy";
    // Find the on-duty parent's current slice in the annotated projection
    const currentSlice = (projectedShifts.projected[onDuty.parent] || []).find(s => {
      const sStart = new Date(now);
      const [sh, sm] = s.start.split(":").map(Number);
      sStart.setHours(sh, sm, 0, 0);
      const sEnd = new Date(now);
      const [eh, em] = s.end.split(":").map(Number);
      sEnd.setHours(eh, em, 0, 0);
      if (sEnd <= sStart) sEnd.setDate(sEnd.getDate() + 1);
      return sStart <= now && now < sEnd;
    });
    // If the current slice isn't a coverage slice for the other parent,
    // there's no active coverage — even if a meeting exists on the other
    // parent's calendar right now, it's during the on-duty parent's own
    // regular time, not coverage.
    if (!currentSlice || currentSlice._coveringFor !== otherParent) return null;
    // Find the meeting that caused the carving — match by parent + overlap.
    return meetings.find(m => {
      if (m.parent !== otherParent) return false;
      if (m.level === "green") return false;
      if (m.synthetic) return false;
      const ms = new Date(m.start);
      const me = new Date(m.end);
      return ms <= now && me > now;
    }) || null;
  }, [meetings, onDuty.parent, now, takeover, projectedShifts.projected]);

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
      paddingBottom: 130,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Per-user view tint — drastically stronger for cross-room recognition.
          v05.05bb: Daddy's blue wash is much more present so Mommy can tell
          at a glance which view he's on. We push the alpha up further on
          Daddy specifically since the muted slate-blue daddy color reads
          as less saturated than mommy's rose at the same opacity — to get
          equal perceptual punch, blue needs more alpha. */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        // Global wash: 12 alpha for Daddy (more present), 0C for Mommy
        background: currentUser === "Daddy" ? `${userTint}14` : `${userTint}0C`,
        pointerEvents: "none", zIndex: 0,
        transition: "background 0.4s ease",
      }} />
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "50vh",
        // Top gradient: 40 → 14 → transparent for Daddy; 28 → 0C → transparent for Mommy
        background: currentUser === "Daddy"
          ? `linear-gradient(180deg, ${userTint}40 0%, ${userTint}14 50%, transparent 100%)`
          : `linear-gradient(180deg, ${userTint}28 0%, ${userTint}0C 60%, transparent 100%)`,
        pointerEvents: "none", zIndex: 0,
        transition: "background 0.4s ease",
      }} />
      <FontImports />
      <PaperGrain mode={mode} />

      {/* Update-available banner — appears when a newer JS bundle is
          deployed than the one currently running. Tap to reload with
          cache-bust. v05.05bt23. Solves the "phone stuck on stale code"
          problem (e.g. PWA shortcut serving bt7 long after bt22 was
          deployed). The user gets a visible signal rather than silently
          running outdated code. */}
      {updateAvailable && (
        <div onClick={() => {
          // Reload with cache-bust query so even aggressive PWA caches yield.
          const url = new URL(window.location.href);
          url.searchParams.set("_v", Date.now().toString());
          window.location.replace(url.toString());
        }} style={{
          background: C.accent,
          color: "#fff",
          padding: "8px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 600,
          textAlign: "center",
          cursor: "pointer",
          letterSpacing: "0.04em",
          position: "relative", zIndex: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }}>
          ↻ UPDATE AVAILABLE · tap to refresh and load the latest version
        </div>
      )}

      {/* Time-travel indicator — only renders when an offset is active.
          Quick-exit by clicking anywhere on the banner. v05.05bt16. */}
      {timeTravelOffset !== 0 && (
        <div onClick={() => setTimeTravelOffset(0)} style={{
          background: C.gold,
          color: "#1F1B16",
          padding: "6px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 600,
          textAlign: "center",
          cursor: "pointer",
          letterSpacing: "0.05em",
          position: "relative", zIndex: 5,
        }}>
          ⏱ TIME TRAVEL · app sees {now.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · tap to exit
        </div>
      )}

      {/* Cloud sync guard banner — persistent until user acts. Fires when
          the peak-event-count safety net blocks a cloud push because the
          events array shrunk by 5+. Either real data loss prevented (good)
          or a legitimate bulk delete (false positive). User decides.
          v05.05bt23. */}
      {cloudGuardWarning && (
        <div style={{
          background: "#8A4A35", // terracotta — caution but not alarming
          color: "#FCF7EB",
          padding: "12px 16px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          position: "relative", zIndex: 5,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: -1 }}>⚠</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, letterSpacing: "0.04em", marginBottom: 3 }}>
                CLOUD SYNC PAUSED — POSSIBLE DATA LOSS PREVENTED
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 14, fontStyle: "italic", lineHeight: 1.4,
                fontWeight: 500,
              }}>
                Blocked an update that would have removed{" "}
                <span style={{ fontWeight: 700 }}>
                  {cloudGuardWarning.droppedCount} entries
                </span>{" "}
                ({cloudGuardWarning.peakCount} → {cloudGuardWarning.currentCount}).
                Your local data is unchanged.
              </div>
            </div>
          </div>
          <div style={{
            display: "flex", gap: 8, justifyContent: "flex-end",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <button
              onClick={() => setCloudGuardWarning(null)}
              style={{
                background: "transparent",
                color: "#FCF7EB",
                border: "1px solid #FCF7EB66",
                borderRadius: 6,
                padding: "5px 10px",
                fontSize: 10, fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
              }}>
              DISMISS
            </button>
            <button
              onClick={() => {
                // User confirms the shrink is intentional. Reset the peak
                // counter so the next push goes through, then trigger a
                // fresh push of current events to cloud.
                storage.acknowledgeShrink();
                // Use functional setState to read the current events and
                // immediately trigger the autosave effect.
                setEvents(curr => {
                  storage.set("solene:events", curr);
                  return curr;
                });
                setCloudGuardWarning(null);
              }}
              style={{
                background: "#FCF7EB",
                color: "#8A4A35",
                border: "none",
                borderRadius: 6,
                padding: "5px 10px",
                fontSize: 10, fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
              }}>
              IT'S INTENTIONAL · PUSH ANYWAY
            </button>
          </div>
        </div>
      )}

      <header style={{ padding: "20px 18px 8px", maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
            {/* Little Ledger mark — full-presence brand glyph */}
            <div style={{
              display: "flex", alignItems: "center", gap: 11,
              marginBottom: 10,
            }}>
              <LittleLedgerLogo C={C} size={44} currentUser={currentUser} />
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
              // v05.05bf: name follows viewer. Solène isn't Mommy-specific
              // content; she's the shared subject of the journal. Mom sees
              // her name in rose, Dad sees it in blue. The gold period stays
              // — it's brand punctuation, not person.
              color: userTint,
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
            {/* Maker's colophon — quiet credit line that lives at the top
                of every page so Cyndell gets her named credit prominently
                without competing with the wordmark or tagline. v05.05bt6:
                softened the Cyndell weight from 600 (semibold) to 500
                (medium) and shifted the color from C.ink (near-black) to
                a warmer two-step interpolation — name was reading as too
                hard against the cream palette. */}
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 12, fontStyle: "italic",
              color: C.muted, marginTop: 2, lineHeight: 1.3,
              opacity: 0.85,
            }}>
              made with care by <span style={{ color: C.muted, fontWeight: 500, fontStyle: "italic" }}>Cyndell</span>
              <span style={{ color: C.gold, margin: "0 4px" }}>·</span>
              for <span style={{ color: userTint, fontWeight: 500 }}>Solène</span>
              <span style={{ color: C.gold, marginLeft: 3 }}>✦</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ color: userTint, fontWeight: 600 }}>{fmtAge(BIRTHDAY, now)}</span>
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
          events={events}
          now={now}
          totalSafeOz={totalSafeOz}
          rtSafeOz={rtSafeOz}
          fridgeOz={fridgeOz}
          feedsRunway={feedsRunway}
          rtItems={liveInventory.filter(i => !i.expired && i.location === "rt")}
          fridgeItems={liveInventory.filter(i => !i.expired && i.location === "fridge")}
          freezerItems={liveInventory.filter(i => !i.expired && i.location === "freezer")}
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
          onOpenBathLog={() => { setLoggerType("bath"); setShowLogger(true); }}
          onSkipBath={() => addEvent({ type: "bath_skipped", silent: true })}
          activePump={activePump}
          onStartPump={(type = "standard") => setActivePump({
            startedAt: new Date().toISOString(),
            type,
          })}
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
            // CLEAR FIRST — this guarantees that even if anything below
            // throws, the takeover state is cleared. Previously the clear
            // was at the end, so a failure in addEvent or setTimeBank
            // would leave the takeover stuck.
            setTakeover(null);
            try {
              localStorage.setItem("solene:takeover", "null");
            } catch {}
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
          }}
          onPickBottle={(loc) => setBottlePickerLoc(loc)}
          onQuickLog={(eventType) => {
            // Quick-log from quadrants: tile tap opens the LOG sheet
            // pre-set to the given event type. Lets the user one-tap
            // from the at-a-glance view straight into a focused logger.
            setLoggerType(eventType); setShowLogger(true);
          }}
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
          <LogView C={C} events={events} removeEvent={removeEvent} updateEvent={updateEvent} now={now} onOpenBathLog={() => { setLoggerType("bath"); setShowLogger(true); }} />
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
            events={events}
            currentUser={currentUser}
            moveToFridge={moveToFridge}
            removeInventory={removeInventory}
            emptyLocation={(loc) => setInventory(prev => prev.filter(i => i.location !== loc))}
            editBottle={(bottleId) => setEditingBottleId(bottleId)}
            addBottle={() => setEditingBottleId("__new__")}
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
            docSummary={docSummary} setDocSummary={setDocSummary}
            currentUser={currentUser} />
        )}
      </main>

      {/* Central LOG button */}
      <CentralLogButton C={C} mode={mode} onClick={() => setShowLogger(true)} currentUser={currentUser} />

      <TabBar C={C} tab={tab} setTab={setTab} currentUser={currentUser} />

      {showLogger && (
        <LogPickerSheet
          C={C}
          onClose={() => { setShowLogger(false); setLoggerType(null); }}
          onPick={(t) => setLoggerType(t)}
          loggerType={loggerType}
          onSubmit={(payload) => {
            // Multi-bottle allocation path: payload.bottleAllocations is an
            // array of { bottleId, oz } describing how the feed was sourced
            // across multiple bottles. We deduct each bottle's specified
            // amount and bottles that hit zero are removed from inventory.
            if (payload.type === "feed" && Array.isArray(payload.bottleAllocations) && payload.bottleAllocations.length > 0) {
              const allocs = payload.bottleAllocations;
              setInventory(prev => prev.map(b => {
                const a = allocs.find(x => x.bottleId === b.id);
                if (!a) return b;
                const newOz = b.oz - a.oz;
                if (newOz <= 0.01) return null; // floating-point safety
                return { ...b, oz: newOz };
              }).filter(Boolean));
              const { bottleAllocations, usedBottleId, ...event } = payload;
              addEvent(event);
              return;
            }
            // Single-bottle path (backward compat)
            if (payload.type === "feed" && payload.usedBottleId) {
              const bottleId = payload.usedBottleId;
              const oz = payload.oz;
              setInventory(prev => prev.map(b => {
                if (b.id !== bottleId) return b;
                const newOz = b.oz - oz;
                if (newOz <= 0.01) return null;
                return { ...b, oz: newOz };
              }).filter(Boolean));
              const { usedBottleId, ...event } = payload;
              addEvent(event);
              return;
            }
            addEvent(payload);
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
            setTab("bank");
            setPendingTimeBankAction(action);
          }}
          onOpenBulkImport={() => {
            setShowLogger(false);
            setLoggerType(null);
            setShowBulkImport(true);
          }}
          onStartOnsite={() => {
            setShowLogger(false);
            setLoggerType(null);
            setShowOnsiteModal(true);
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
          currentCode={familyCode}
          currentUser={currentUser}
          onSet={async (code, mode) => {
            // SAFETY: if user is already linked and tries to GENERATE, that
            // would orphan them from the existing family. Confirm.
            if (mode === "generate" && familyCode && code !== familyCode) {
              const ok = window.confirm(
                `You're already linked to family code ${familyCode}.\n\n` +
                "Generating a new code will start a fresh family on this " +
                "device. Your partner won't be able to see your updates " +
                "unless they also enter the new code.\n\n" +
                "Are you SURE you want to leave the existing family and " +
                "start a new one?"
              );
              if (!ok) {
                setShowFamilyCodeSetup(false);
                return;
              }
            }
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

            // Race protection: the moment we change familyCode, autosave
            // useEffects fire and start writing local state to the new cloud
            // namespace. For ENTER mode, that's a disaster — local "blank"
            // state would clobber the partner's real data on the cloud.
            // Setting syncingFromCloud=true here suppresses the autosaves
            // until the enter-flow has explicitly downloaded cloud state
            // and re-enabled writes. For GENERATE mode it's a no-op (we
            // WANT the local state to flow up, but the explicit upload
            // below does that more atomically anyway).
            if (mode === "enter") {
              syncingFromCloudRef.current = true;
            }

            // === Auto-backup before any familyCode change ===
            // v05.05bt: If something goes wrong with the sync change (cloud
            // empty, partner's data overwrites ours, code regen wipes us),
            // we want a local snapshot we can restore from. This runs for
            // both generate and enter modes — both can lose data in their
            // own ways. The backup includes a timestamp + the "previous
            // code" so the About panel can offer a meaningful restore
            // option ("Restore data from before joining family XYZ789").
            try {
              const snapshot = {
                savedAt: new Date().toISOString(),
                previousCode: familyCode || null,
                newCode: code,
                mode,
                appVersion: APP_VERSION,
                data: {
                  events, inventory, meetings, shifts, diaperBag, onsite,
                  notes, appointments, activeActivity, activePump, takeover,
                  timeBank, weather,
                },
              };
              localStorage.setItem("ll:emergency-backup", JSON.stringify(snapshot));
            } catch (e) {
              console.warn("[familyCode change] emergency-backup save failed", e);
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
              // v05.05bt23: explicit hydration after initial setup completes.
              storage.setCloudContext({ cloudHydrated: true });
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
          timeTravelOffset={timeTravelOffset}
          setTimeTravelOffset={setTimeTravelOffset}
          onResetBedtimeCheck={() => {
            // Nuke today's bath and bath_skipped events so the bedtime
            // banner can re-trigger. Returns count for the alert.
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            let cleared = 0;
            setEvents(prev => {
              const next = prev.filter(e => {
                const isTodaysBath = (e.type === "bath" || e.type === "bath_skipped") &&
                                     new Date(e.ts) >= startOfDay;
                if (isTodaysBath) cleared++;
                return !isTodaysBath;
              });
              return next;
            });
            return { cleared };
          }}
          onClearStuckActivePump={() => {
            // v05.05bt34: clear a stuck activePump that wasn't cleared by
            // the normal end-pump flow (cloud sync race). Just sets it to
            // null so subsequent pump start works. Cloud syncs the clear.
            setActivePump(null);
          }}
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
            // v05.05bt11: SMART MERGE rather than wholesale replace.
            //
            // The old wholesale-replace import was destructive — anything
            // logged on the device after the source export was created
            // would be lost on import. The new merge dedupes incoming
            // entries against current state and only adds what's actually
            // new, so importing a stale recovery file no longer wipes
            // recent entries.
            //
            // Dedup keys per field:
            //   events    → (type, ts within 1 min, oz, source, notes,
            //                mode, durationMin)
            //   meetings  → (parent, start, end, label)
            //   inventory → (oz, pumpedAt within 1 min, location)
            //   notes     → (ts within 1 min, text)
            //   timeBank  → id (stable UUIDs)
            //   noteArch  → (from, to, text, ts within 1 min)
            //
            // Singletons (handoffNote, activePump, takeover, onsite,
            // activeActivity) are only adopted from the import if the
            // current value is null — never overwrite live state.
            //
            // Configuration (shifts, diaperBag) is left alone — user
            // has these tuned to their household; we don't replace.
            //
            // Bulk-import-into-wrong-box detection: the same friendly
            // redirect as before fires for non-JSON pastes.
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
              // v05.05bt23: pause cloud writes during the multi-step import.
              // This prevents intermediate state pushes (after each individual
              // setX call) from racing with cloud polls and producing partial
              // states on other devices. After all setX calls have fired, we
              // unpause + force a single push to capture the final merged
              // state. 500ms gives React time to batch and run all the
              // autosave effects before the unpause fires.
              storage.setCloudContext({ cloudWritePaused: true });
              const d = parsed.data;

              // --- Helpers ---
              const minBucket = (ts) => Math.floor(new Date(ts).getTime() / 60000);
              const eventKey = (e) => [
                e.type, minBucket(e.ts), e.oz ?? "", e.source ?? "",
                e.notes ?? "", e.mode ?? "", e.durationMin ?? "",
              ].join("|");
              const meetingKey = (m) => [m.parent, m.start, m.end, m.label || ""].join("|");
              const invKey = (b) => [b.oz, minBucket(b.pumpedAt), b.location || "rt"].join("|");
              const noteKey = (n) => [minBucket(n.ts), (n.text || "").trim()].join("|");
              const archiveKey = (a) => [a.from, a.to, (a.text || "").trim(), minBucket(a.ts)].join("|");

              // Counters for summary
              let added = { events: 0, meetings: 0, inventory: 0, notes: 0, timeBank: 0, noteArchive: 0 };
              let skipped = { events: 0, meetings: 0, inventory: 0, notes: 0, timeBank: 0, noteArchive: 0 };

              // --- Events: merge by dedup key ---
              if (Array.isArray(d.events)) {
                setEvents(prev => {
                  const seen = new Set(prev.map(eventKey));
                  const next = [...prev];
                  for (const e of d.events) {
                    const k = eventKey(e);
                    if (seen.has(k)) { skipped.events++; continue; }
                    seen.add(k);
                    next.push({ ...e, ts: new Date(e.ts) });
                    added.events++;
                  }
                  // Sort chronologically for cleanliness
                  next.sort((a, b) => new Date(a.ts) - new Date(b.ts));
                  return next;
                });
              }

              // --- Meetings: merge by dedup key ---
              if (Array.isArray(d.meetings)) {
                setMeetings(prev => {
                  const seen = new Set(prev.map(meetingKey));
                  const next = [...prev];
                  for (const m of d.meetings) {
                    const k = meetingKey(m);
                    if (seen.has(k)) { skipped.meetings++; continue; }
                    seen.add(k);
                    next.push(m);
                    added.meetings++;
                  }
                  return next;
                });
              }

              // --- Inventory: merge by dedup key ---
              if (Array.isArray(d.inventory)) {
                setInventory(prev => {
                  const seen = new Set(prev.map(invKey));
                  const next = [...prev];
                  for (const b of d.inventory) {
                    const k = invKey(b);
                    if (seen.has(k)) { skipped.inventory++; continue; }
                    seen.add(k);
                    next.push({ ...b, pumpedAt: new Date(b.pumpedAt) });
                    added.inventory++;
                  }
                  return next;
                });
              }

              // --- Notes: merge by dedup key ---
              if (Array.isArray(d.notes)) {
                setNotes(prev => {
                  const seen = new Set(prev.map(noteKey));
                  const next = [...prev];
                  for (const n of d.notes) {
                    const k = noteKey(n);
                    if (seen.has(k)) { skipped.notes++; continue; }
                    seen.add(k);
                    next.push(n);
                    added.notes++;
                  }
                  return next;
                });
              }

              // --- Time bank: merge by id (UUID) ---
              if (d.timeBank && Array.isArray(d.timeBank.transactions)) {
                setTimeBank(prev => {
                  const seenIds = new Set((prev.transactions || []).map(t => t.id));
                  const newTxns = [...(prev.transactions || [])];
                  for (const t of d.timeBank.transactions) {
                    if (seenIds.has(t.id)) { skipped.timeBank++; continue; }
                    seenIds.add(t.id);
                    newTxns.push(t);
                    added.timeBank++;
                  }
                  // Recompute balance from merged transactions to keep
                  // it consistent. balance = sum of owed - sum of paid.
                  const balance = newTxns.reduce((s, t) => {
                    if (t.kind === "owed") return s + t.mins;
                    if (t.kind === "paid") return s - t.mins;
                    return s;
                  }, 0);
                  return { ...prev, balance, transactions: newTxns };
                });
              }

              // --- Note archive: merge by dedup key ---
              if (Array.isArray(d.noteArchive)) {
                setNoteArchive(prev => {
                  const seen = new Set(prev.map(archiveKey));
                  const next = [...prev];
                  for (const a of d.noteArchive) {
                    const k = archiveKey(a);
                    if (seen.has(k)) { skipped.noteArchive++; continue; }
                    seen.add(k);
                    next.push(a);
                    added.noteArchive++;
                  }
                  return next;
                });
              }

              // --- Singletons: only adopt if current is null (don't clobber live state) ---
              if ("handoffNote" in d && d.handoffNote) {
                setHandoffNote(prev => prev || d.handoffNote);
              }
              if ("activePump" in d && d.activePump) {
                setActivePump(prev => prev || d.activePump);
              }
              if ("takeover" in d && d.takeover) {
                setTakeover(prev => prev || d.takeover);
              }
              if ("onsite" in d && d.onsite) {
                setOnsite(prev => prev || d.onsite);
              }
              if ("activeActivity" in d && d.activeActivity) {
                setActiveActivity(prev => prev || d.activeActivity);
              }

              // --- Appointments: merge by id ---
              if (Array.isArray(d.appointments)) {
                setAppointments(prev => {
                  const seenIds = new Set(prev.map(a => a.id));
                  const next = [...prev];
                  for (const a of d.appointments) {
                    if (a.id && seenIds.has(a.id)) continue;
                    if (a.id) seenIds.add(a.id);
                    next.push(a);
                  }
                  return next;
                });
              }

              // --- Daily content: merge by date key, prefer existing ---
              if (d.dailyContent && typeof d.dailyContent === "object") {
                setDailyContent(prev => ({ ...d.dailyContent, ...prev }));
              }

              // Configuration (shifts, diaperBag) and currentUser are NOT
              // merged or replaced — user's local config wins. If the
              // current user wants to adopt those from the import, they
              // can edit shifts directly and reset the bag manually.

              const totalAdded = Object.values(added).reduce((s, n) => s + n, 0);
              const totalSkipped = Object.values(skipped).reduce((s, n) => s + n, 0);
              // v05.05bt23: schedule the cloud-write-pause release after a
              // delay long enough for React to batch all the setX calls
              // above and run their autosave effects. The autosaves are
              // currently no-ops (paused), but as soon as we unpause, the
              // NEXT state change will trigger a push capturing the final
              // merged state. We force-push the events array immediately
              // on unpause to make sure the merged state lands on cloud
              // even if no further state changes happen.
              setTimeout(() => {
                storage.setCloudContext({ cloudWritePaused: false });
                // Force an immediate push of the merged state to cloud.
                // Reading from a setState callback to get the post-merge
                // events; the actual push happens via storage.set().
                setEvents(curr => {
                  storage.set("solene:events", curr);
                  return curr;
                });
                setMeetings(curr => { storage.set("solene:meetings", curr); return curr; });
                setInventory(curr => { storage.set("solene:inventory", curr); return curr; });
                setNotes(curr => { storage.set("solene:notes", curr); return curr; });
                setNoteArchive(curr => { storage.set("solene:noteArchive", curr); return curr; });
                setTimeBank(curr => { storage.set("solene:timeBank", curr); return curr; });
              }, 500);
              return {
                ok: true,
                count: totalAdded,
                added,
                skipped,
                summary: `Added ${totalAdded} new entries · skipped ${totalSkipped} duplicates`,
              };
            } catch (err) {
              // v05.05bt23: release cloud-write-pause on error too, otherwise
              // the app is permanently locked out of cloud writes.
              storage.setCloudContext({ cloudWritePaused: false });
              return { ok: false, error: err.message || String(err) };
            }
          }}
          onRestoreBackup={() => {
            // v05.05bt: Restore from the auto-snapshot saved before any
            // family-code change. The snapshot was written in the
            // FamilyCodeSetupModal onSet path; here we read it back and
            // apply it through the same set* family used by onImportData.
            // Returns { ok, savedAt, previousCode, mode } for the UI.
            try {
              const raw = localStorage.getItem("ll:emergency-backup");
              if (!raw) return { ok: false, error: "No backup found." };
              const snapshot = JSON.parse(raw);
              if (!snapshot || !snapshot.data) {
                return { ok: false, error: "Backup is corrupted or in an unknown format." };
              }
              const d = snapshot.data;
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
              if (d.timeBank) setTimeBank(d.timeBank);
              return {
                ok: true,
                savedAt: snapshot.savedAt,
                previousCode: snapshot.previousCode,
                newCode: snapshot.newCode,
                mode: snapshot.mode,
                count: (d.events?.length || 0) + (d.notes?.length || 0),
              };
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
          updateAvailable={updateAvailable}
          latestBundleHash={latestBundleHash}
          bundleHash={bundleHash}
          updateCheckFailed={updateCheckFailed}
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
          recentBottles={inventory}
          onCancel={() => setShowFinishPump(false)}
          onSubmit={({ oz, location, bottleLabel }) => {
            try {
              const start = new Date(activePump.startedAt);
              const wasPower = activePump.type === "power";
              // For power pumps the protocol is 60 min — round to that if
              // we're within ±2 min of the target so a small wall-clock
              // delay at "tap to end" doesn't make the event read as 62 or 58.
              const wallMin = Math.max(1, Math.round((now - start) / 60000));
              const durationMin = wasPower && Math.abs(wallMin - POWER_PUMP_TOTAL_MIN) <= 2
                ? POWER_PUMP_TOTAL_MIN
                : wallMin;
              // v05.05bt34: pause cloud writes during the pump-end
              // multi-step transaction. Without this, setActivePump(null)
              // and addEvent fire two separate cloud pushes; if a poll
              // runs between them and pulls the OLD activePump from cloud,
              // it overwrites our just-cleared local state. Pause + force
              // push both keys after a brief settle.
              storage.setCloudContext({ cloudWritePaused: true });
              // Clear timer FIRST so even if a downstream call throws,
              // the user isn't stuck with a stale active-pump state.
              setActivePump(null);
              setShowFinishPump(false);
              // Log pump event using start time. The addEvent helper
              // ALSO adds to inventory automatically (when mode !== "start"
              // and oz is set), so we must NOT separately call setInventory
              // here — that would create a duplicate bottle. The previous
              // implementation did both, causing inventory to double-count
              // every pump. Fixed in v05.05bb.
              addEvent({
                type: "pump",
                ts: start,
                oz,
                durationMin,
                mode: "end",
                location,
                bottleLabel,
                ...(wasPower ? { pumpType: "power" } : {}),
              });
              // Unpause + force-push both keys after React settles all
              // the state updates above. 500ms matches the import path.
              setTimeout(() => {
                storage.setCloudContext({ cloudWritePaused: false });
                // Functional setState to read the post-merge state and
                // force a fresh cloud push for both keys.
                setEvents(curr => { storage.set("solene:events", curr); return curr; });
                setInventory(curr => { storage.set("solene:inventory", curr); return curr; });
                storage.set("solene:activePump", null);
              }, 500);
            } catch (err) {
              console.error("[FinishPumpModal.onSubmit] failed:", err);
              // v05.05bt34: release cloud-write-pause on error too.
              storage.setCloudContext({ cloudWritePaused: false });
              // Even on error, clear the modal so the user isn't stuck
              setShowFinishPump(false);
              alert("Couldn't fully log the pump — please check the Journal and inventory. Error: " + (err?.message || err));
            }
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
            // Determine BM source variant: if the bottle came from freezer,
            // it's BM-thawed; otherwise BM (fresh from RT or fridge).
            // v05.05bt21 split — gives the future analytics signal to study
            // whether thawed milk affects feeding patterns differently.
            const usedBottle = liveInventory.find(b => b.id === bottleId);
            const source = usedBottle && usedBottle.location === "freezer"
              ? "BM-thawed" : "BM";
            addEvent({ type: "feed", oz: Number(oz), source, ts: new Date() });
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
          onAddBottle={(location) => {
            // Open Edit-bottle modal in ADD mode, with location preset.
            // Use a special flag the modal will read.
            setBottlePickerLoc(null);
            setEditingBottleId("__new__");
          }}
          onLogAnyway={({ oz, source }) => {
            // v05.05bt21: log a feed event WITHOUT inventory deduction and
            // mark with inventoryReconcileNeeded: true so it shows ⚠ in
            // journal for later reconciliation. The user explicitly chose
            // this path because the bottle they're using isn't tracked.
            addEvent({
              type: "feed",
              oz: Number(oz),
              source,
              ts: new Date(),
              inventoryReconcileNeeded: true,
            });
            setBottlePickerLoc(null);
          }}
        />
      )}

      {editingBottleId && (() => {
        // "__new__" sentinel = add a fresh bottle. The modal handles both
        // edit (existing bottle passed in) and add (bottle prop is null).
        const isNew = editingBottleId === "__new__";
        const bottle = isNew ? null : liveInventory.find(b => b.id === editingBottleId);
        if (!isNew && !bottle) { setEditingBottleId(null); return null; }
        return (
          <EditBottleModal
            C={C}
            bottle={bottle}
            onClose={() => setEditingBottleId(null)}
            onSave={(updates) => {
              if (isNew) {
                // Create a new bottle from the form values. Default to RT
                // location and now timestamp if not specified by the form.
                setInventory(prev => [...prev, {
                  id: crypto.randomUUID(),
                  oz: updates.oz || 0,
                  location: updates.location || "rt",
                  pumpedAt: updates.pumpedAt || new Date().toISOString(),
                  bottleLabel: updates.bottleLabel || "",
                }]);
              } else {
                setInventory(prev => prev.map(b => b.id === editingBottleId ? { ...b, ...updates } : b));
              }
              setEditingBottleId(null);
            }}
          />
        );
      })()}
    </div>
  );
}

function UseBottleModal({ C, location, inventory, now, onClose, onUse, onMoveToFridge, onDiscardBottle, onEditBottle, onAddBottle, onLogAnyway }) {
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
  // v05.05bt21: "Bottle not in list — log anyway" inline form state.
  // When the user opens this affordance, they pick oz and BM source variant
  // (BM fresh / BM thawed), and we log a feed event with
  // inventoryReconcileNeeded: true so it surfaces a ⚠ in journal for later
  // cleanup. No inventory deduction (since there's nothing matching to
  // deduct from).
  const [showLogAnyway, setShowLogAnyway] = useState(false);
  const [anywayOz, setAnywayOz] = useState(4);
  const [anywaySource, setAnywaySource] = useState(
    location === "freezer" ? "BM-thawed" : "BM"
  );
  // Auto-cancel bulk confirm after 4s like other 2-step actions
  useEffect(() => {
    if (!bulkConfirm) return;
    const t = setTimeout(() => setBulkConfirm(null), 4000);
    return () => clearTimeout(t);
  }, [bulkConfirm]);
  const selected = sorted.find(b => b.id === selectedId);
  const locColor = location === "rt" ? C.gold : location === "freezer" ? "#5A7E9C" : C.muted;
  const locLabel = location === "rt" ? "Room temp" : location === "freezer" ? "Freezer" : "Fridge";
  const locIcon = location === "rt" ? "" : location === "freezer" ? "🧊 " : "";

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
          <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic", marginBottom: 14 }}>
            No bottles in {locLabel.toLowerCase()} right now.
          </div>
          {onAddBottle && (
            <button onClick={() => { onAddBottle(location); onClose(); }} style={{
              background: "transparent", color: C.mommy,
              border: `1.5px dashed ${C.mommy}66`, borderRadius: 8,
              padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: onLogAnyway ? 10 : 0,
            }}>
              + Add a bottle to {locLabel.toLowerCase()}
            </button>
          )}
          {/* Log-anyway escape hatch in empty state — same as in use mode. */}
          {onLogAnyway && (
            !showLogAnyway ? (
              <div>
                <button
                  onClick={() => setShowLogAnyway(true)}
                  style={{
                    background: "transparent", color: C.muted,
                    border: `1px dashed ${C.line}55`, borderRadius: 8,
                    padding: "10px 14px", fontSize: 12, cursor: "pointer",
                    fontFamily: "inherit", fontStyle: "italic",
                  }}>
                  Bottle not in list — log anyway
                </button>
              </div>
            ) : (
              <div style={{
                background: `${C.gold}15`,
                border: `1px solid ${C.gold}55`,
                borderRadius: 10, padding: 14,
                textAlign: "left", marginTop: 10,
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, fontWeight: 700, marginBottom: 4 }}>
                  Log without picking
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                  Logs the feed without deducting inventory. Flagged with ⚠ in journal for later cleanup.
                </div>
                <Field C={C} label="How much oz?">
                  <BigOzPicker C={C} value={anywayOz} onChange={setAnywayOz} />
                </Field>
                <Field C={C} label="Source">
                  <SegControl C={C} value={anywaySource} onChange={setAnywaySource} options={[
                    { v: "BM", l: "BM (fresh)" },
                    { v: "BM-thawed", l: "BM (thawed)" },
                    { v: "Formula", l: "Formula" },
                  ]} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => setShowLogAnyway(false)} style={{
                    background: "transparent", color: C.ink,
                    border: `1px solid ${C.line}33`, borderRadius: 8,
                    padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>Cancel</button>
                  <button onClick={() => {
                    onLogAnyway({ oz: Number(anywayOz), source: anywaySource });
                  }} style={{
                    background: C.gold, color: "#1F1B16",
                    border: "none", borderRadius: 8,
                    padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    Log {Number(anywayOz).toFixed(1)} oz · ⚠
                  </button>
                </div>
              </div>
            )
          )}
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
                    // For freezer bottles, show "frozen X days/months ago"
                    // since the precise pump time matters less than the age.
                    // For RT/fridge, keep the pumped-time caption.
                    let captionText;
                    if (location === "freezer") {
                      const ageHrs = (now - pumpedAt) / 3600000;
                      const ageDays = ageHrs / 24;
                      if (ageDays < 1) {
                        captionText = `frozen ${Math.round(ageHrs)}h ago`;
                      } else if (ageDays < 14) {
                        captionText = `frozen ${Math.round(ageDays)}d ago`;
                      } else if (ageDays < 60) {
                        captionText = `frozen ${Math.round(ageDays / 7)}wk ago`;
                      } else {
                        captionText = `frozen ${Math.round(ageDays / 30)}mo ago`;
                      }
                    } else {
                      captionText = `pumped ${pumpedAt.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
                    }
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
                        }}>{location === "rt" ? "RT" : location === "freezer" ? "Fz" : "Fr"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                            {b.oz.toFixed(1)} oz
                            {b.bottleLabel && (
                              <span style={{
                                fontSize: 11, color: locColor, marginLeft: 6,
                                fontFamily: "'Cormorant Garamond', serif",
                                fontStyle: "italic", fontWeight: 600,
                              }}>· {b.bottleLabel}</span>
                            )}
                            {isRisky && <span style={{ fontSize: 10, color: C.accent, marginLeft: 6, fontWeight: 600 }}>RISKY</span>}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            {captionText}
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

              {/* v05.05bt30: "+ Add another bottle" affordance in Use mode
                  too, not just empty-state. Sometimes the user has a real
                  pumped bottle that wasn't auto-tracked (e.g. partner
                  pumped, manual bottle from older batch, etc.) — they want
                  it tracked as inventory, not just logged as a one-off
                  feed. Different intent from "log anyway" below. */}
              {onAddBottle && (
                <button
                  onClick={() => { onAddBottle(location); onClose(); }}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    background: "transparent", color: locColor,
                    border: `1.5px dashed ${locColor}66`,
                    borderRadius: 8, padding: "10px 12px",
                    fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                  + Add another bottle to {locLabel.toLowerCase()}
                </button>
              )}

              {/* "Bottle not in list — log anyway" escape hatch.
                  When inventory tracking misses a bottle (forgot to log a
                  pump, milk came from a different batch, etc.), the parent
                  shouldn't be blocked from logging the actual feed. This
                  inline affordance logs a feed without inventory deduction
                  and flags the event for later reconciliation. v05.05bt21. */}
              {onLogAnyway && (
                <div style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: `1px dashed ${C.line}33`,
                }}>
                  {!showLogAnyway ? (
                    <button
                      onClick={() => setShowLogAnyway(true)}
                      style={{
                        width: "100%",
                        background: "transparent", color: C.muted,
                        border: `1px dashed ${C.line}55`, borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        fontStyle: "italic",
                      }}>
                      Bottle not in list — log anyway
                    </button>
                  ) : (
                    <div style={{
                      background: `${C.gold}15`,
                      border: `1px solid ${C.gold}55`,
                      borderRadius: 10, padding: 14,
                    }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, fontWeight: 700, marginBottom: 4 }}>
                        Log without picking
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                        We'll log this feed without deducting from inventory and flag it with ⚠ in the journal. Tap the flag later to reconcile.
                      </div>
                      <Field C={C} label="How much oz did Solène drink?">
                        <BigOzPicker C={C} value={anywayOz} onChange={setAnywayOz} />
                      </Field>
                      <Field C={C} label="Source">
                        <SegControl C={C} value={anywaySource} onChange={setAnywaySource} options={[
                          { v: "BM", l: "BM (fresh)" },
                          { v: "BM-thawed", l: "BM (thawed)" },
                          { v: "Formula", l: "Formula" },
                        ]} />
                      </Field>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button onClick={() => setShowLogAnyway(false)} style={{
                          background: "transparent", color: C.ink,
                          border: `1px solid ${C.line}33`, borderRadius: 8,
                          padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                          fontFamily: "inherit",
                        }}>Cancel</button>
                        <button onClick={() => {
                          onLogAnyway({ oz: Number(anywayOz), source: anywaySource });
                        }} style={{
                          background: C.gold, color: "#1F1B16",
                          border: "none", borderRadius: 8,
                          padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                          fontFamily: "inherit",
                        }}>
                          Log {Number(anywayOz).toFixed(1)} oz · ⚠
                        </button>
                      </div>
                    </div>
                  )}
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
                          {b.bottleLabel && (
                            <span style={{
                              fontSize: 11, color: locColor, marginLeft: 6,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700, letterSpacing: "0.04em",
                            }}>· Bottle {b.bottleLabel}</span>
                          )}
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

              {/* v05.05bt30: "+ Add a new bottle" button in Manage mode.
                  Lets the user manually add a bottle with custom oz,
                  location, label, and pumped time. Useful when a pump
                  happened but wasn't logged, or for backfilling stock. */}
              {onAddBottle && (
                <button
                  onClick={() => { onAddBottle(location); onClose(); }}
                  style={{
                    width: "100%",
                    background: "transparent", color: locColor,
                    border: `1.5px dashed ${locColor}66`,
                    borderRadius: 10, padding: "10px 12px",
                    fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    marginBottom: 14,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  + Add a new bottle to {locLabel.toLowerCase()}
                </button>
              )}

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
                      background: bulkConfirm === "move" ? C.accent : (multiCount === 0 ? C.bg : "transparent"),
                      color: bulkConfirm === "move" ? "#fff" : (multiCount === 0 ? C.muted : C.accent),
                      border: bulkConfirm === "move" ? "none" : `1.5px solid ${multiCount === 0 ? C.line + "22" : C.accent + "55"}`,
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
  // bottle === null → ADD mode (manual new bottle entry)
  // bottle !== null → EDIT mode (correct existing bottle's values)
  const isAdd = !bottle;
  const [oz, setOz] = useState(isAdd ? 4 : bottle.oz);
  const [loc, setLoc] = useState(isAdd ? "rt" : bottle.location);
  const [pumpedAtLocal, setPumpedAtLocal] = useState(() => {
    const d = isAdd ? new Date() : new Date(bottle.pumpedAt);
    return safeDatetimeLocal(d);
  });
  const [bottleLabel, setBottleLabel] = useState(isAdd ? "" : (bottle.bottleLabel || ""));

  return (
    <ModalShell C={C} onClose={onClose} title={isAdd ? "Add a bottle (manual)" : "Edit bottle (no feed logged)"}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        {isAdd
          ? "Manually add a bottle — useful if a pump session wasn't logged in the app or to recover after a sync issue. No pump event is logged; this just adds to inventory."
          : "Use this when the app's tracking is wrong. Adjusting these values won't log a feed event — it just updates inventory directly."}
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

      <Field C={C} label="Bottle label (optional)">
        <input
          type="text"
          value={bottleLabel}
          onChange={e => setBottleLabel(e.target.value.slice(0, 4).toUpperCase())}
          placeholder="A, B, 1, 2…"
          maxLength={4}
          style={{
            width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
            borderRadius: 8, fontSize: 14, background: C.bg, color: C.ink,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        />
        <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>
          Sharpie a letter on the bottle, sync it here. Daddy will know exactly which one to grab.
        </div>
      </Field>

      <SubmitButton C={C} onClick={() => onSave({
        oz: Number(oz),
        location: loc,
        pumpedAt: new Date(pumpedAtLocal).toISOString(),
        bottleLabel: bottleLabel.trim() || null,
      })}>
        {isAdd ? "Add bottle" : "Save changes"}
      </SubmitButton>
    </ModalShell>
  );
}

function FinishPumpModal({ C, activePump, now, onCancel, onSubmit, onDiscard, recentBottles }) {
  const start = new Date(activePump.startedAt);
  const durationMin = Math.max(1, Math.round((now - start) / 60000));
  const [oz, setOz] = useState(4);
  const [location, setLocation] = useState("rt");

  // Auto-suggest the next sharpie letter. Walk through recent bottles
  // (last 24h) and find the lowest letter A-Z not currently in use. After
  // 24h, older labels are assumed to have been used up and consumed —
  // the cycle resets. If everything A-Z is somehow taken, fall back to
  // empty string. v05.05bt: the auto-suggestion lets the user just sharpie
  // whatever the app shows on the new bottle and tap save — no thinking.
  const suggestedLabel = useMemo(() => {
    const cutoff = new Date(now.getTime() - 24 * 3600000);
    const recentLabels = new Set(
      (recentBottles || [])
        .filter(b => new Date(b.pumpedAt) >= cutoff && b.bottleLabel)
        .map(b => b.bottleLabel.toUpperCase())
    );
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const ch of alphabet) {
      if (!recentLabels.has(ch)) return ch;
    }
    return "";
  }, [recentBottles, now]);

  const [bottleLabel, setBottleLabel] = useState(suggestedLabel);

  return (
    <ModalShell C={C} onClose={onCancel} title="Finish pump session">
      <div style={{
        background: `${C.mommy}15`, borderRadius: 10, padding: 12, marginBottom: 14,
        border: `1px solid ${C.mommy}33`,
      }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.mommy, fontWeight: 700, marginBottom: 4 }}>
          {activePump.type === "power" ? "Power pump session" : "Pump session"}
        </div>
        <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5 }}>
          Started <strong>{fmtTimeShort(start)}</strong> · ran for <strong>{durationMin} min</strong>
          {activePump.type === "power" && durationMin >= POWER_PUMP_TOTAL_MIN - 2 && (
            <span style={{ color: C.gold, fontWeight: 600 }}> · full protocol completed ✓</span>
          )}
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

      <Field C={C} label="Bottle label">
        <input
          type="text"
          value={bottleLabel}
          onChange={e => setBottleLabel(e.target.value.slice(0, 4).toUpperCase())}
          placeholder="A, B, 1…"
          maxLength={4}
          style={{
            width: "100%", padding: "10px 12px", border: `1px solid ${C.line}33`,
            borderRadius: 8, fontSize: 16, background: C.bg, color: C.ink,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em",
            textTransform: "uppercase", textAlign: "center", fontWeight: 700,
          }}
        />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
          {suggestedLabel
            ? `Suggested: "${suggestedLabel}" — sharpie this letter on the bottle so Daddy knows which one is which. Edit or clear if you want.`
            : "Sharpie a letter on the bottle so Daddy knows which one is which. Optional."}
        </div>
      </Field>

      <SubmitButton C={C} onClick={() => onSubmit({ oz, location, bottleLabel: bottleLabel.trim() || null })}>
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
function FamilyCodeSetupModal({ C, onSet, onSkip, currentCode, currentUser }) {
  // Viewer color for chrome — code generated/cloud sync isn't tied to a
  // specific person, so its accent should match whoever's looking at it.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;
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
      {currentCode && (
        <div style={{
          background: `${C.accent}15`,
          border: `1.5px solid ${C.accent}55`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 14,
          fontSize: 12, color: C.ink, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            ⚠ Already linked
          </div>
          You're currently linked to family code{" "}
          <strong style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{currentCode}</strong>.
          Don't generate a new code unless you want to start a fresh family. To share with your partner, just give them this code.
        </div>
      )}
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
            <button onClick={() => {
              // v05.05bt: extra confirm-gate when already linked. The
              // banner above explains this is dangerous; the confirm()
              // makes a wrong tap impossible (especially on mobile where
              // accidental taps happen). An emergency-backup snapshot also
              // runs in the onSet path before the code change takes effect,
              // so even if the user confirms by mistake, data isn't gone.
              if (currentCode) {
                const ok = window.confirm(
                  `You're currently linked to family code "${currentCode}". ` +
                  `Generating a NEW code will create a fresh family — your ` +
                  `partner's device on "${currentCode}" will stay there but ` +
                  `this device will be on the new code instead.\n\n` +
                  `Are you sure?`
                );
                if (!ok) return;
              }
              generate();
            }} style={{
              background: viewerColor, color: "#fff", border: "none",
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
              background: viewerColor, color: "#fff", border: "none",
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
            background: `${viewerColor}10`,
            border: `2px solid ${viewerColor}`,
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
              background: viewerColor, color: "#fff", border: "none",
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
                background: enteredCode.trim() ? viewerColor : `${C.line}33`,
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


function ProfileSwitcherModal({ C, currentUser, onSelect, onClose, onResetData, onExportData, onImportData, onRestoreBackup, takeover, onClearTakeover, familyCode, cloudSyncAvailable, onOpenFamilyCodeSetup, onClearFamilyCode, themeOverride, setThemeOverride, timeTravelOffset, setTimeTravelOffset, onResetBedtimeCheck, onClearStuckActivePump, updateAvailable, latestBundleHash, bundleHash, updateCheckFailed }) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Viewer color for chrome — cloud sync section, etc.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;
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
      {/* v05.05bt6: Day vs Dusk option removed — palette is tuned for the
          warm-cream day mode and the dusk option was unused. State plumbing
          (themeOverride, setThemeOverride) is still in App in case we want
          to surface a different appearance toggle later. */}

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
            letterSpacing: "0.06em", marginBottom: 6,
          }}>
            v{APP_VERSION}
          </div>
          {/* v05.05bt23: update-check status. Three states:
                - update available: coral with refresh prompt
                - up-to-date: sage with confirmation
                - check failed / unknown: muted dash */}
          {updateAvailable ? (
            <button onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("_v", Date.now().toString());
              window.location.replace(url.toString());
            }} style={{
              background: `${C.accent}15`,
              border: `1px solid ${C.accent}55`,
              color: C.accent,
              padding: "6px 10px", borderRadius: 6,
              fontSize: 10, fontWeight: 600,
              letterSpacing: "0.04em", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 10,
              display: "flex", alignItems: "center", gap: 5,
              width: "100%", textAlign: "left",
            }}>
              ↻ Update available — tap to refresh
            </button>
          ) : updateCheckFailed ? (
            <div style={{
              fontSize: 10, color: C.muted, fontStyle: "italic",
              marginBottom: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              · update check unavailable (offline?)
            </div>
          ) : latestBundleHash ? (
            <div style={{
              fontSize: 10, color: "#7B9B6E", fontWeight: 600,
              marginBottom: 10,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.04em",
            }}>
              ✓ up to date
            </div>
          ) : (
            <div style={{
              fontSize: 10, color: C.muted, fontStyle: "italic",
              marginBottom: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              · checking for updates…
            </div>
          )}
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
          {/* Maker's mark — discreet colophon, like the back-page note in
              an old book. Lives at the bottom of the About panel where
              attribution belongs. Italic Cormorant in muted to keep it
              quiet; the warmth comes from the wording, not the styling. */}
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: `1px solid ${C.line}12`,
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic", fontSize: 12,
            color: C.muted, lineHeight: 1.5,
          }}>
            made with care by Cyndell · for Solène <span style={{ color: C.gold }}>✦</span>
          </div>
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
              background: `${viewerColor}08`,
              border: `1px solid ${viewerColor}33`,
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
                background: viewerColor, color: "#fff", border: "none",
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

          {/* Emergency restore — only shows if a backup snapshot exists.
              The snapshot is auto-saved before any family-code change so
              the user can recover from accidental code regen / wrong "join
              family" / etc. Reads the localStorage key directly here just
              to decide whether to render; the actual restore goes through
              onRestoreBackup. */}
          {backupMode === null && onRestoreBackup && (() => {
            let snapshot = null;
            try {
              const raw = localStorage.getItem("ll:emergency-backup");
              if (raw) snapshot = JSON.parse(raw);
            } catch {}
            if (!snapshot || !snapshot.savedAt) return null;
            const savedDate = new Date(snapshot.savedAt);
            const ago = Math.round((Date.now() - savedDate.getTime()) / 60000);
            const agoLabel = ago < 60 ? `${ago}m ago`
              : ago < 1440 ? `${Math.round(ago / 60)}h ago`
              : `${Math.round(ago / 1440)}d ago`;
            const modeLabel = snapshot.mode === "generate" ? "code regen" : "joining a family";
            return (
              <div style={{
                marginTop: 10,
                background: `${C.gold}10`,
                border: `1px solid ${C.gold}55`,
                borderRadius: 10,
                padding: "10px 12px",
              }}>
                <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, fontWeight: 700, marginBottom: 4 }}>
                  ⏪ Emergency restore available
                </div>
                <div style={{ fontSize: 11, color: C.ink, lineHeight: 1.5, marginBottom: 8 }}>
                  Auto-snapshot saved <strong>{agoLabel}</strong> before {modeLabel}.
                  Restore puts your data back to that moment.
                </div>
                <button onClick={() => {
                  const ok = window.confirm(
                    `This will replace current data on this device with ` +
                    `the snapshot from ${savedDate.toLocaleString()}.\n\n` +
                    `Continue?`
                  );
                  if (!ok) return;
                  const result = onRestoreBackup();
                  if (result.ok) {
                    setImportResult({ ok: true, count: result.count, restore: true });
                    setTimeout(() => onClose(), 1200);
                  } else {
                    setImportResult({ ok: false, error: result.error });
                  }
                }} style={{
                  background: C.gold, color: "#fff", border: "none",
                  padding: "8px 12px", borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  Restore from snapshot
                </button>
                {importResult && importResult.restore && (
                  <div style={{ fontSize: 11, color: "#4D6B43", marginTop: 6 }}>
                    ✓ Restored {importResult.count} entries.
                  </div>
                )}
              </div>
            );
          })()}

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
                  fontSize: 11, lineHeight: 1.5,
                  background: importResult.ok ? "#5C8E5C15" : `${C.accent}15`,
                  color: importResult.ok ? "#3D6B3D" : C.accent,
                  border: `1px solid ${importResult.ok ? "#5C8E5C" : C.accent}33`,
                }}>
                  {importResult.ok ? (
                    <>
                      <div style={{ fontWeight: 600 }}>✓ {importResult.summary || `Imported ${importResult.count} entries`}</div>
                      {importResult.added && (
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.85 }}>
                          {[
                            importResult.added.events && `${importResult.added.events} events`,
                            importResult.added.meetings && `${importResult.added.meetings} meetings`,
                            importResult.added.inventory && `${importResult.added.inventory} bottles`,
                            importResult.added.notes && `${importResult.added.notes} notes`,
                            importResult.added.timeBank && `${importResult.added.timeBank} time-bank`,
                            importResult.added.noteArchive && `${importResult.added.noteArchive} archived notes`,
                          ].filter(Boolean).join(" · ") || "no new entries — already in sync"}
                        </div>
                      )}
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, fontStyle: "italic" }}>
                        Modal will close shortly.
                      </div>
                    </>
                  ) : (
                    `✗ ${importResult.error}`
                  )}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    if (!importText.trim() || !onImportData) return;
                    const result = onImportData(importText);
                    setImportResult(result);
                    if (result.ok) {
                      // Auto-close after a moment so the user sees the success
                      // summary (added per-type + skipped count). Slightly
                      // longer than before now that there's more to read.
                      setTimeout(() => onClose(), 2500);
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

      {/* DEV section — time-travel for previewing time-dependent UI.
          v05.05bt16. Hidden behind a quiet eyebrow so it doesn't clutter
          the normal user experience. Session-only — clears on reload. */}
      {setTimeTravelOffset !== undefined && (() => {
        const real = new Date();
        const effective = new Date(real.getTime() + (timeTravelOffset || 0));
        const hasOffset = (timeTravelOffset || 0) !== 0;
        // Compute jump targets — mostly relative to real now so demos are
        // intuitive ("jump to 9pm tonight" rather than "jump to 21:00 of
        // some absolute date"). All offsets in ms.
        const jumpTo = (hours, minutes = 0, dayDelta = 0) => {
          const target = new Date(real);
          target.setDate(target.getDate() + dayDelta);
          target.setHours(hours, minutes, 0, 0);
          return target.getTime() - real.getTime();
        };
        const presets = [
          { label: "9pm tonight", offset: jumpTo(21, 0) },
          { label: "10pm tonight", offset: jumpTo(22, 0) },
          { label: "11pm tonight", offset: jumpTo(23, 0) },
          { label: "+1h", offset: 3600000 },
          { label: "+6h", offset: 6 * 3600000 },
          { label: "+1 day", offset: 86400000 },
          { label: "8am tmrw", offset: jumpTo(8, 0, 1) },
        ];
        return (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}15` }}>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 6 }}>
              DEV · Time travel
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginBottom: 8, lineHeight: 1.4 }}>
              Demo time-dependent UI (bedtime check-in, day-plan now-line, wake-check). Session-only — page reload returns to real time.
            </div>
            <div style={{
              padding: "8px 10px", borderRadius: 8,
              background: hasOffset ? `${C.gold}18` : `${C.line}06`,
              border: `1px solid ${hasOffset ? C.gold + "55" : C.line + "22"}`,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, marginBottom: 8, lineHeight: 1.4,
            }}>
              <div style={{ color: C.muted }}>real now: <span style={{ color: C.ink }}>{real.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>
              <div style={{ color: hasOffset ? C.gold : C.muted, marginTop: 2 }}>
                app sees: <span style={{ color: C.ink, fontWeight: hasOffset ? 600 : 400 }}>
                  {effective.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                {hasOffset && <span style={{ marginLeft: 6, fontStyle: "italic", opacity: 0.8 }}>(simulated)</span>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
              {presets.map(p => (
                <button key={p.label} onClick={() => setTimeTravelOffset(p.offset)} style={{
                  background: C.bg, color: C.ink,
                  border: `1px solid ${C.line}33`,
                  borderRadius: 6, padding: "6px 10px",
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left",
                }}>{p.label}</button>
              ))}
            </div>
            <button onClick={() => setTimeTravelOffset(0)} disabled={!hasOffset} style={{
              width: "100%",
              background: hasOffset ? C.ink : "transparent",
              color: hasOffset ? C.paper : C.muted,
              border: `1px solid ${hasOffset ? C.ink : C.line + "33"}`,
              borderRadius: 6, padding: "8px",
              fontSize: 12, fontWeight: 600,
              cursor: hasOffset ? "pointer" : "default",
              fontFamily: "inherit",
            }}>
              {hasOffset ? "↺ Return to real time" : "Already at real time"}
            </button>
            {onResetBedtimeCheck && (
              <button onClick={() => {
                const result = onResetBedtimeCheck();
                if (result && result.cleared !== undefined) {
                  alert(`Cleared ${result.cleared} bath/bath_skipped event(s) from today. Bedtime banner can re-trigger.`);
                }
              }} style={{
                width: "100%", marginTop: 6,
                background: "transparent", color: C.muted,
                border: `1px dashed ${C.line}33`, borderRadius: 6, padding: "8px",
                fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>
                Reset today's bath/skip events (re-test bedtime banner)
              </button>
            )}
            {onClearStuckActivePump && (
              <button onClick={() => {
                onClearStuckActivePump();
                alert("Cleared activePump. If a pump session was actually running, you'll need to start it again.");
              }} style={{
                width: "100%", marginTop: 6,
                background: "transparent", color: C.muted,
                border: `1px dashed ${C.line}33`, borderRadius: 6, padding: "8px",
                fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>
                Clear stuck active pump (sync race recovery)
              </button>
            )}
          </div>
        );
      })()}

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
  // v05.05bg re-introduced subtle grain via CSS radial-dot pattern. Earlier
  // builds had SVG feTurbulence noise but that created a perceptual "box"
  // artifact: text-dense regions rendered slightly lighter than empty
  // regions because the rendered text covered the noise dots. The CSS
  // approach below uses mix-blend-mode: multiply on a fixed-position
  // overlay, so the blend is uniform across the viewport regardless of
  // foreground content density. Two layered dot grids at offset positions
  // give the grain texture without forming a visible repeating pattern.
  // Day mode: warm dark dots on cream paper (multiply darkens). Night mode:
  // skip the multiply (would be invisibly dark) and use screen blend with
  // a faint warm spot pattern instead.
  const isDark = mode === "dusk" || mode === "night";
  return (
    <>
      {/* Warm corner glow — large and very diffuse so it adds atmosphere
          without creating a perceptible boundary line. */}
      <div style={{
        position: "fixed",
        top: -700, right: -700,
        width: 1400, height: 1400,
        borderRadius: "50%",
        background: isDark
          ? "radial-gradient(circle, rgba(232, 168, 124, 0.05), transparent 95%)"
          : "radial-gradient(circle, rgba(184, 92, 46, 0.06), transparent 95%)",
        pointerEvents: "none", zIndex: 1,
      }} />
      {/* Paper grain — fixed overlay so it doesn't move on scroll, multiply
          blend so it darkens the paper imperceptibly. Two dot grids at
          slight offsets so the eye doesn't lock onto a pattern. */}
      {!isDark && (
        <div style={{
          position: "fixed", inset: 0,
          backgroundImage:
            "radial-gradient(rgba(31,27,22,0.030) 1px, transparent 1px), " +
            "radial-gradient(rgba(31,27,22,0.020) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 7px 7px",
          backgroundPosition: "0 0, 1px 1px",
          mixBlendMode: "multiply",
          pointerEvents: "none",
          zIndex: 1,
        }} />
      )}
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

function OnDutyCard({ C, mode, onDuty, next, lastFeed, lastDiaper, diaperWarnH, diaperUrgentH, lastSleep, lastWake, lastWakeConfirmed, events, now, totalSafeOz, rtSafeOz, fridgeOz, feedsRunway, onsite, handoffNote, onAckNote, onOpenNoteEditor, onOpenArchive, archiveCount, onLogSleepDown, onConfirmAwake, onOpenBathLog, onSkipBath, currentUser, rtItems, fridgeItems, freezerItems, nextPumpAt, lastPumpedItem, todayCalories, activePump, onStartPump, onEndActivePump, takeover, onStartTakeover, onEndTakeover, onPickBottle, activeCoveringCommitment, myActiveCommitment, onEndCommitmentEarly, onQuickLog }) {
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
    // v05.05bt7: belt-and-suspenders dismiss check. ANY recent (within last
    // hour) wake_confirmed or sleep_down should hide the banner. This catches
    // edge cases where lastFeed is stale-but-newer than the new wake/sleep
    // event, or where cloud sync is mid-flight. The banner is a check-in,
    // not a critical alert; bias to dismissing rather than persisting.
    const oneHourAgo = new Date(now.getTime() - 60 * 60000);
    const recentWakeOrSleep = events.find(e =>
      (e.type === "wake_confirmed" || e.type === "sleep_down") &&
      new Date(e.ts) >= oneHourAgo
    );
    if (recentWakeOrSleep) return null;
    // Original check: if a wake_confirmed exists since last feed (the user
    // already said "still awake")
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

  // Bedtime check-in: prompts the user during the late-evening window to
  // confirm whether a bath happened tonight. v05.05bt15+. Logs the answer
  // so the good-night insight feature can later correlate routine with
  // sleep stretches. Triggers when:
  //   - Current time is between 8:30pm and 11:30pm local
  //   - No bath has been logged today
  //   - No bath_skipped silent event for today (user already said "no bath")
  // The latest-feed-in-window check was removed in v05.05bt17 because it
  // was over-engineered: the feed timestamp is irrelevant to whether bath
  // happened. The eyebrow context line still mentions last feed time when
  // available so the parent has temporal grounding.
  const bedtimeInfo = (() => {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const promptStart = new Date(now);
    promptStart.setHours(20, 30, 0, 0);
    const promptEnd = new Date(now);
    promptEnd.setHours(23, 30, 0, 0);
    if (now < promptStart || now > promptEnd) return null;
    // Check whether a bath was already logged today
    const todayBath = events.find(e =>
      e.type === "bath" && new Date(e.ts) >= startOfDay
    );
    if (todayBath) return null;
    // Check whether user already dismissed with "no bath" today
    const todaySkip = events.find(e =>
      e.type === "bath_skipped" && new Date(e.ts) >= startOfDay
    );
    if (todaySkip) return null;
    // Find the latest feed today, if any, for eyebrow context
    const todayFeeds = events
      .filter(e => (e.type === "feed" || e.type === "breastfeed") &&
                   new Date(e.ts) >= startOfDay)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const latestFeed = todayFeeds[0];
    const latestFeedTimeStr = latestFeed
      ? new Date(latestFeed.ts).toLocaleTimeString(undefined, {
          hour: "numeric", minute: "2-digit", hour12: true,
        })
      : null;
    return { latestFeedTimeStr };
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
          {/* Take-back lives RIGHT HERE in the banner so the affordance is
              co-located with the status. Removed the duplicate card below
              the OnDuty quadrants in v05.05bb. */}
          {onEndTakeover && (
            <button
              onClick={onEndTakeover}
              style={{
                background: "transparent",
                color: takeoverWithMins.coveringParent === "Mommy" ? C.mommy : C.daddy,
                border: `1px solid ${takeoverWithMins.coveringParent === "Mommy" ? C.mommy : C.daddy}88`,
                borderRadius: 8, padding: "6px 10px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
                fontFamily: "inherit",
              }}>
              Take back
            </button>
          )}
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

      {/* Bedtime check-in — prompts during the 9-11:30pm window to confirm
          whether bath happened tonight. Logs the answer (or a bath_skipped
          silent event) so the good-night insight feature can later
          correlate routine with sleep stretches. v05.05bt15. */}
      {bedtimeInfo && (
        <div style={{
          marginTop: 14, padding: 12,
          background: `${C.gold}15`,
          border: `1.5px solid ${C.gold}55`,
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Bath size={12} color={C.gold} />
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
              color: C.gold,
            }}>
              bedtime check
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, marginBottom: 10 }}>
            {bedtimeInfo.latestFeedTimeStr
              ? <>Last feed was at {bedtimeInfo.latestFeedTimeStr}. Did Solène have a bath tonight?</>
              : <>It's bedtime time. Did Solène have a bath tonight?</>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={onOpenBathLog} style={{
              background: C.ink, color: C.paper, border: "none",
              padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <Bath size={12} /> Yes, log it
            </button>
            <button onClick={onSkipBath} style={{
              background: "transparent", color: C.ink,
              border: `1px solid ${C.line}33`, borderRadius: 8,
              padding: "8px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              No bath tonight
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
      ) : takeoverWithMins && takeoverWithMins.originalParent === currentUser ? (
        // Partner is covering for ME. The take-back affordance lives in the
        // top banner now (v05.05bb) — co-located with the "Daddy is covering"
        // status to avoid the redundancy of having the same info in two
        // places. Nothing to render here.
        null
      ) : takeoverWithMins ? (
        // Edge case: takeover exists but I'm neither covering nor original.
        // Shouldn't normally happen with a 2-parent setup but be safe.
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
        marginTop: 18, background: `${C.muted}22`, borderRadius: 10, overflow: "hidden",
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
              ? "#8A4A35"
              : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
              ? C.gold
              : "#7B9B6E"
          }
          value={lastDiaper ? fmtElapsed(minutesAgo(lastDiaper.ts)) : "—"}
          sub={
            lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= URGENT_H
              ? `${URGENT_H}h+ — change now even if asleep`
              : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
              ? `${WARN_H}h+ — peek at next feed`
              : (lastDiaper ? diaperLabel(lastDiaper.notes) : "")
          }
          subColor={
            lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= URGENT_H
              ? "#8A4A35"
              : lastDiaper && (now - new Date(lastDiaper.ts)) / 3600000 >= WARN_H
              ? C.gold
              : null
          }
          onTap={onQuickLog ? () => onQuickLog("diaper") : undefined} />
        {/* Label flips between asleep/awake states. The label IS the
            status — no separate sub needed. The big number reads as a
            duration ("5h 59m") so paired with "Awake for" or "Asleep
            for" it's a clean phrase: "Awake for · 5h 59m".
            v05.05bt: Added impossibility flag — for a young infant,
            awake >5h is unusual, >7h almost certainly a missed sleep_down
            log. Same suspicion for asleep >14h. Surface as a sub-line
            nudge so the user fixes the data, not the analytics later. */}
        <StatTile C={C}
          label={isAsleep ? "asleep for" : "awake for"}
          icon={isAsleep ? <Moon size={12} /> : <Sun size={12} />}
          iconColor={isAsleep ? "#5A6E8A" : C.gold}
          value={isAsleep ? fmtDuration(minutesAgo(lastSleep.ts)) : (lastWake ? fmtDuration(minutesAgo(lastWake.ts)) : "—")}
          sub={(() => {
            if (isAsleep) {
              const sleepHrs = (now - new Date(lastSleep.ts)) / 3600000;
              if (sleepHrs >= 14) return "↻ implausible — missed wake?";
              return null;
            }
            if (!lastWake) return null;
            const awakeHrs = (now - new Date(lastWake.ts)) / 3600000;
            if (awakeHrs >= 7) return "↻ implausible — missed sleep?";
            if (awakeHrs >= 5) return "longer than typical wake window";
            return null;
          })()}
          subColor={(() => {
            if (isAsleep) {
              const sleepHrs = (now - new Date(lastSleep.ts)) / 3600000;
              if (sleepHrs >= 14) return "#8A4A35";
              return null;
            }
            if (!lastWake) return null;
            const awakeHrs = (now - new Date(lastWake.ts)) / 3600000;
            if (awakeHrs >= 7) return "#8A4A35";
            if (awakeHrs >= 5) return C.gold;
            return null;
          })()}
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
        freezerItems={freezerItems}
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
function MilkPanel({ C, currentUser, onDutyParent, rtSafeOz, fridgeOz, totalSafeOz, feedsRunway, rtItems, fridgeItems, freezerItems, nextPumpAt, now, todayCalories, lastPumpedItem, activePump, onStartPump, onEndActivePump, onPickBottle }) {
  const isMom = currentUser === "Mommy";
  // Chrome that's not specifically about Mommy (lactation) but still inside
  // MilkPanel — bottle markers, "last bottle" tile, etc. — should follow
  // the viewer. Daddy seeing his own blue accents on shared content makes
  // the screen feel his when he's reading it.
  const viewerColor = isMom ? C.mommy : C.daddy;
  const lowSupply = feedsRunway < 2;
  const activePumpMins = activePump ? Math.floor((now - new Date(activePump.startedAt)) / 60000) : 0;
  const [timeFormat, setTimeFormat] = useState("absolute"); // 'duration' | 'absolute'
  // Power pump chooser modal state — opens when user taps the pump tile
  // and there's no active session yet. Skipped if user just wants standard
  // (tap → standard); we only show the chooser if they explicitly long-tap
  // OR tap the small "Power pump?" affordance below the main button.
  const [showPumpChooser, setShowPumpChooser] = useState(false);

  // 1-second tick local to this component, fires only when an active power
  // pump is running. The app's global `now` only updates every 15s for
  // performance, but the power-pump countdown wants smooth seconds. We use
  // a local Date and force re-render via a state counter; getPowerPumpPhase
  // reads from this localNow instead of the global `now`.
  const [tickCount, setTickCount] = useState(0);
  useEffect(() => {
    if (activePump?.type !== "power") return;
    const id = setInterval(() => setTickCount(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [activePump?.type]);
  const localNow = activePump?.type === "power" ? new Date() : now;

  // Live power-pump phase. null when no active pump or active is standard.
  const powerPhase = activePump?.type === "power" ? getPowerPumpPhase(activePump, localNow) : null;

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
      // Container always takes the viewer-color wash so the panel feels
      // owned by whoever's looking at it. Mommy view: rose tint. Daddy view:
      // blue tint. Alarm states (low supply, expiry urgent) are communicated
      // by content INSIDE the panel (runway number, color-coded text); the
      // chrome itself doesn't need to scream — the fine border is enough.
      background: `${viewerColor}10`,
      border: `1px solid ${viewerColor}33`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      {/* Prominent expiration banner — surfaces the soonest-to-expire RT
          bottle when it's past or near its preferred-use window. The panel
          body already shows this in bottle-row colors, but for Daddy who
          isn't watching closely, this banner is the cue he can't miss.
          Two trigger states:
            RISKY  → already past 4h preferred (in 4-6h grace window). Use
                     it before 6h or discard.
            URGENT → less than 30 min to 4h preferred. Use soon.
          Past 6h hard limit, the bottle is already filtered out as expired
          so it won't appear in sortedRT. */}
      {soonestExpiry && (soonestExpiry.risky || (soonestExpiry.remaining >= 0 && soonestExpiry.remaining < 0.5)) && (() => {
        const isRisky = soonestExpiry.risky;
        const bColor = isRisky ? "#8A4A35" : C.gold;
        const bandLabel = isRisky ? "Use now or discard" : "Use this bottle next";
        const subLabel = isRisky
          ? `Past 4h preferred — use within ${fmtHours(6 - soonestExpiry.ageHrs)} or discard`
          : `${fmtHours(soonestExpiry.remaining)} until 4h preferred (then discard at 6h)`;
        const labelText = soonestExpiry.bottleLabel
          ? `Bottle ${soonestExpiry.bottleLabel} (${soonestExpiry.oz}oz)`
          : `${soonestExpiry.oz}oz bottle`;
        return (
          <div style={{
            background: `${bColor}14`,
            border: `1.5px solid ${bColor}88`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <div style={{
              fontSize: 22, lineHeight: 1, color: bColor, flexShrink: 0, marginTop: 2,
            }}>{isRisky ? "⚠" : "⏰"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                color: bColor, fontWeight: 700, marginBottom: 2,
              }}>
                {bandLabel}
              </div>
              <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, lineHeight: 1.3 }}>
                {labelText}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                {subLabel}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Milk size={13} color={viewerColor} />
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
          title="Toggle between 'in 2h' and '4:30p' style"
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: `1px solid ${C.line}33`, borderRadius: 6,
            padding: "3px 8px", fontSize: 9, fontWeight: 600, cursor: "pointer",
            color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "inherit",
          }}>
          {timeFormat === "duration" ? "show clock" : "show duration"}
        </button>
      </div>

      {/* Prominent pump countdown — Mommy only, top of panel.
          State pip on the left clearly signals: green dot = comfortably ahead,
          amber dot = pump coming up soon, coral dot = past due.
          Three states handled below: (a) ACTIVE POWER PUMP — phase-aware
          tile with PUMP/REST label, phase countdown, and phase pip dots.
          (b) ACTIVE STANDARD PUMP — single timer (existing). (c) NOT ACTIVE
          — tap to start (opens chooser if user wants power, default tap
          starts standard). */}
      {isMom && (activePump || nextPumpAt) && (() => {
        // === Branch 1: Active power pump — phase-aware display ===
        if (powerPhase) {
          // Phase has either a live phase or is `complete: true` after 60min
          const isComplete = powerPhase.complete;
          const phaseRemainSec = isComplete ? 0 : Math.max(0, Math.ceil(powerPhase.phaseRemainingMs / 1000));
          const remMin = Math.floor(phaseRemainSec / 60);
          const remSec = phaseRemainSec % 60;
          const fmtRem = `${remMin}:${String(remSec).padStart(2, "0")}`;
          const totalMinIn = Math.floor(powerPhase.totalElapsedMs / 60000);
          // Phase color: pumping uses mommy rose (active doing-work);
          // rest uses gold (waiting); complete uses green.
          const phaseColor = isComplete ? "#7B9B6E"
            : powerPhase.phaseType === "pump" ? C.mommy
            : C.gold;
          const phaseLabel = isComplete ? "Power pump complete"
            : powerPhase.phaseType === "pump" ? "Pumping"
            : "Rest";
          // Phase progress within the current phase (0–1)
          const phaseProgress = isComplete ? 1
            : powerPhase.phaseElapsedMs / powerPhase.phaseDurationMs;

          return (
            <button
              onClick={onEndActivePump}
              style={{
                width: "100%",
                background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}DD)`,
                color: "#fff", border: "none",
                borderRadius: 10, padding: "14px 16px",
                marginBottom: 12,
                display: "flex", flexDirection: "column", gap: 10,
                boxShadow: `0 2px 10px ${phaseColor}55`,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                position: "relative",
                overflow: "hidden",
              }}>
              {/* Phase progress bar — subtle wash from left to right showing
                  how far through the current phase we are. Lives behind the
                  content as a low-opacity overlay. */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: 0,
                width: `${phaseProgress * 100}%`,
                background: "rgba(255,255,255,0.10)",
                pointerEvents: "none",
                transition: "width 0.6s ease",
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
                <Timer size={28} className={!isComplete && powerPhase.phaseType === "pump" ? "pulse-soft" : ""} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, opacity: 0.9 }}>
                    Power pump · {totalMinIn}/{POWER_PUMP_TOTAL_MIN} min
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600,
                    lineHeight: 1.05, marginTop: 2, fontStyle: "italic",
                  }}>
                    {phaseLabel}
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", opacity: 0.95, marginTop: 4, fontWeight: 600 }}>
                    {isComplete ? "tap to log oz" : `${fmtRem} left in this phase`}
                  </div>
                </div>
              </div>
              {/* Phase pip row — five dots showing where you are in the
                  60-min protocol. Filled = done. Ring = current. Empty = upcoming.
                  P = pump phase (rose color), R = rest phase (gold-ish). */}
              <div style={{ display: "flex", gap: 6, position: "relative" }}>
                {POWER_PUMP_PHASES.map((p, i) => {
                  const done = isComplete || i < powerPhase.phaseIndex;
                  const current = !isComplete && i === powerPhase.phaseIndex;
                  return (
                    <div key={i} style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: done ? "rgba(255,255,255,0.85)" : current ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      {current && (
                        <div style={{
                          position: "absolute", top: 0, bottom: 0, left: 0,
                          width: `${phaseProgress * 100}%`,
                          background: "rgba(255,255,255,0.85)",
                          transition: "width 0.6s ease",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, opacity: 0.75, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em", fontWeight: 600 }}>
                <span>PUMP 20</span>
                <span>REST 10</span>
                <span>PUMP 10</span>
                <span>REST 10</span>
                <span>PUMP 10</span>
              </div>
            </button>
          );
        }

        // === Branch 2 & 3: Active standard or not active — existing UI ===
        // State color palette tuned v05.05br to fit the warm muted palette
        // alongside mauve-violet. Saturated kelly-green and bright red read
        // as "alarm app" — this app is a ledger, so we use deeper, warmer
        // analogs that sit naturally next to mauve and gold:
        //   overdue     → #8A4A35  warm terracotta (old ledger red)
        //   soon        → C.gold   antique brass
        //   on schedule → #7B9B6E  sage (same tone the diaper tile uses)
        const stateColor = activePump
          ? C.mommy
          : pumpOverdue ? "#8A4A35"
          : pumpSoon ? C.gold
          : "#7B9B6E";
        const stateLabel = activePump
          ? "Pumping now"
          : pumpOverdue ? "Pump overdue"
          : pumpSoon ? "Pump soon"
          : "On schedule";
        return (
        <button
          onClick={activePump ? onEndActivePump : () => setShowPumpChooser(true)}
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

      {/* RT and Fridge side by side — tap to use a bottle (when bottles
          exist) or add one (when empty). Empty tiles are NOT disabled in
          v05.05bb; tapping an empty tile opens the bottle picker which
          surfaces an Add-bottle affordance.
          Each tile shows: oz total, then a row of bottle emojis (one per bottle, up to 3,
          then "+N" overflow), with each bottle's individual expiry time underneath. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <button
          onClick={() => onPickBottle && onPickBottle("rt")}
          style={{
            background: C.paper, borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${expiryUrgent || expiryRisky ? C.accent : expiryWarn ? C.gold : C.line + "22"}`,
            cursor: "pointer",
            textAlign: "left", fontFamily: "inherit",
            opacity: rtSafeOz > 0 ? 1 : 0.7,
          }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Room temp
            {rtSafeOz > 0 ? <span style={{ opacity: 0.6 }}> · tap to use or add</span> : <span style={{ opacity: 0.6 }}> · tap to add</span>}
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
                    const bColor = b.risky ? C.accent : bRem < 1 ? C.accent : bRem < 2 ? C.gold : "#7B9B6E";
                    return (
                      <div key={b.id} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                        <div style={{ fontSize: 18, lineHeight: 1, color: bColor, filter: bRem < 1 || b.risky ? "none" : "saturate(0.7)" }}>🍼</div>
                        {b.bottleLabel && (
                          <div style={{
                            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                            color: bColor, marginTop: 3, fontWeight: 700,
                            letterSpacing: "0.04em",
                          }}>
                            Bottle {b.bottleLabel}
                          </div>
                        )}
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
          style={{
            background: C.paper, borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${C.line}22`,
            cursor: "pointer",
            textAlign: "left", fontFamily: "inherit",
            opacity: fridgeOz > 0 ? 1 : 0.7,
          }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
            Fridge
            {fridgeOz > 0
              ? <span style={{ opacity: 0.6 }}> · tap to use or add</span>
              : <span style={{ opacity: 0.6 }}> · tap to add</span>}
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
                    const bColor = remHrs < 0 ? C.accent : remHrs < 24 ? C.gold : viewerColor;
                    return (
                      <div key={b.id} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                        <div style={{ fontSize: 18, lineHeight: 1, color: bColor }}>🍼</div>
                        {b.bottleLabel && (
                          <div style={{
                            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                            color: bColor, marginTop: 3, fontWeight: 700,
                            letterSpacing: "0.04em",
                          }}>
                            Bottle {b.bottleLabel}
                          </div>
                        )}
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

      {/* Freezer strip — appears below the RT/Fridge tiles. Slim full-width
          strip showing freezer total + bottle count. Tap to open picker
          filtered to freezer. Always rendered (even when empty) so users
          remember they can pick frozen milk OR add a frozen bottle
          retroactively. v05.05bt21. */}
      {(() => {
        const freezerBottles = freezerItems || [];
        const freezerOz = freezerBottles.reduce((s, b) => s + b.oz, 0);
        const hasFreezer = freezerBottles.length > 0;
        return (
          <button
            onClick={() => onPickBottle && onPickBottle("freezer")}
            style={{
              width: "100%",
              background: hasFreezer ? C.paper : "transparent",
              borderRadius: 8, padding: "8px 12px",
              border: hasFreezer
                ? `1px solid ${C.line}22`
                : `1px dashed ${C.line}33`,
              cursor: "pointer",
              textAlign: "left", fontFamily: "inherit",
              marginBottom: 10,
              display: "flex", alignItems: "center", gap: 12,
            }}>
            <span style={{ fontSize: 16 }}>🧊</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                color: C.muted, fontWeight: 600,
              }}>
                Freezer
                <span style={{ opacity: 0.6 }}>
                  {hasFreezer ? " · tap to use or add" : " · tap to add a frozen bottle"}
                </span>
              </div>
              {hasFreezer ? (
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                  fontWeight: 500, color: C.ink, marginTop: 1, lineHeight: 1.2,
                }}>
                  {freezerOz.toFixed(1)} oz
                  <span style={{ color: C.muted, fontSize: 11, fontStyle: "italic", marginLeft: 6 }}>
                    · {freezerBottles.length} bottle{freezerBottles.length === 1 ? "" : "s"}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2, fontStyle: "italic" }}>
                  empty
                </div>
              )}
            </div>
            <ChevronRight size={14} color={C.muted} />
          </button>
        );
      })()}

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
            background: `${viewerColor}22`, color: viewerColor,
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

      {/* Pump-type chooser modal — opens when user taps the inactive pump
          tile. Two options: standard (just track time) or power (60-min
          guided protocol with phase pip dots). Mounting here inside
          MilkPanel keeps the chooser state local to this component. */}
      {showPumpChooser && (
        <ModalShell C={C} onClose={() => setShowPumpChooser(false)} title="Start a pump session">
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
            Pick which kind of session. Both let you log oz and location at the end.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <button
              onClick={() => { onStartPump("standard"); setShowPumpChooser(false); }}
              style={{
                background: C.paper,
                border: `1.5px solid ${C.line}30`, borderLeft: `4px solid ${C.mommy}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", color: C.ink,
              }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500,
                fontStyle: "italic", color: C.mommy, lineHeight: 1.1,
              }}>
                Standard pump
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                Just track elapsed time. Tap to end whenever you're done.
              </div>
            </button>
            <button
              onClick={() => { onStartPump("power"); setShowPumpChooser(false); }}
              style={{
                background: C.paper,
                border: `1.5px solid ${C.line}30`, borderLeft: `4px solid ${C.gold}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", color: C.ink,
              }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500,
                fontStyle: "italic", color: C.gold, lineHeight: 1.1,
              }}>
                Power pump
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                60-min guided protocol: <strong>20 pump · 10 rest · 10 pump · 10 rest · 10 pump</strong>. The tile will tell you what to do at each phase.
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>
                Mimics cluster feeding to signal supply. Best done 1×/day for a few days when you want a boost.
              </div>
            </button>
          </div>
        </ModalShell>
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
      borderLeft: `4px solid ${blocked.length > 0 ? "#8A4A35" : C.accent}`,
      borderRadius: 12, padding: 14, marginTop: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: blocked.length > 0 ? "#8A4A35" : C.accent, fontWeight: 600, marginBottom: 8 }}>
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
            background: "#8A4A3510", borderRadius: 8,
            fontSize: 13, lineHeight: 1.5, color: "#8A4A35",
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

      {/* On-site / variable return — only the ACTIVE state shows on Now.
          When on-site is active, the live ETA card is essential context.
          When not active, the entry point lives in the LOG sheet so it
          doesn't clutter the landing page. */}
      {onsite && (
        <Section C={C} title={`On-site · ${onsite.parent} away`}>
          <ActiveOnsiteCard
            C={C} onsite={onsite} now={now}
            onUpdateEta={onUpdateEta}
            onArrived={onArrivedHome}
          />
        </Section>
      )}

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
          background: "#7C5C8422", color: "#7C5C84",
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
              <span style={{ color: confidence === "high" ? "#7B9B6E" : confidence === "moderate" ? C.gold : C.muted }}>
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

// v05.05bt27: ShiftListGrid — the two-column "Mommy | Daddy" shift list
// with annotation indicators (+/↔/↩/⚖/⏸) to the left of each adjusted
// shift and a pulsing dot for the currently-active block (today only).
// Extracted from TodaysPlanCard so the Schedule tab's DayPlanCard can
// use the same renderer instead of the bar-graphic strip it had before.
function ShiftListGrid({ C, shifts, swaps, isToday, now }) {
  const swappedKeys = useMemo(() => {
    const map = {};
    for (const s of swaps || []) {
      const k = `${s.shift.start}-${s.shift.end}`;
      map[k] = s;
    }
    return map;
  }, [swaps]);

  const currentMin = now ? now.getHours() * 60 + now.getMinutes() : -1;
  const isCurrentBlock = (s) => {
    if (!isToday || !now) return false;
    const a = toMin(s.start);
    const b = toMin(s.end);
    return a < b ? currentMin >= a && currentMin < b : currentMin >= a || currentMin < b;
  };

  return (
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
                  color: C.ink,
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
                    <span style={{ fontSize: 10, color: "#7B9B6E", flexShrink: 0 }} title={`Repaying ${s._takeoverDurationMin}m takeover`}>↩</span>
                  )}
                  {isAutoRepaymentShift && (
                    <span style={{ fontSize: 10, color: "#7B9B6E", flexShrink: 0 }} title={`Auto-repaying ${s._autoRepayDurationMin}m coverage from earlier`}>↩</span>
                  )}
                  {wasMoved && isBalance && (
                    <span style={{ fontSize: 10, color: color, flexShrink: 0 }}>⚖</span>
                  )}
                  {wasMoved && isAntiCluster && (
                    <span style={{ fontSize: 10, color: "#7B9B6E", flexShrink: 0 }} title="Breaking a 4h+ stretch for the other parent">⏸</span>
                  )}
                  <span>{fmtShiftRange(s)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TodaysPlanCard({ C, shifts, baseShifts, swaps, now, currentUser, onDispute }) {
  const hasSwaps = swaps && swaps.length > 0;
  const [adjExpanded, setAdjExpanded] = useState(false);
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
      <ShiftListGrid C={C} shifts={shifts} swaps={swaps} isToday={true} now={now} />

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
                      {isTakeover ? (
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong>{" "}
                          {s.active ? "is currently covering" : "covered"} for{" "}
                          <strong style={{ color: origColor }}>{s.originalParent}</strong>
                          {s.active ? " — time owed will log when it ends." : " — time owed went to the bank."}
                        </>
                      ) : s.blocked ? (
                        <>
                          Both blocked at this time. <strong style={{ color: origColor }}>{s.originalParent}</strong> has <em>{s.reason || "a commitment"}</em>; figure this one out manually.
                        </>
                      ) : isBalance ? (
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> takes this block to keep the day balanced. Pure fairness — no commitment forced it.
                        </>
                      ) : isRedemption ? (
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> covers — <strong style={{ color: origColor }}>{s.originalParent}</strong> cashed in time-bank credit. Already settled.
                        </>
                      ) : isRepayment ? (
                        // Auto-repayment: parent A owed parent B time, and the
                        // system handed B a shift from A to discharge that debt.
                        // The user-facing meaning is just "you're paying back
                        // what you owed" — the internal "Auto-repay Xm coverage"
                        // commitment label shouldn't be exposed.
                        <>
                          <strong style={{ color: coverColor }}>{s.coveringParent}</strong> covers — paying back {s.takeoverDurationMin ? `${s.takeoverDurationMin}m` : "time"} <strong style={{ color: origColor }}>{s.originalParent}</strong> owed.
                        </>
                      ) : (
                        // Generic commitment swap. New shorter phrasing:
                        // lead with WHO is covering (the actionable info)
                        // and tuck the reason in as the explanation.
                        // Defensive: if the reason text starts with
                        // "Auto-repay" (a synthetic commitment label that
                        // shouldn't have leaked here, but might), strip
                        // the internal jargon and use friendlier wording.
                        (() => {
                          const rawReason = s.reason || "a commitment";
                          const isLeakedRepayment = /^Auto-repay/i.test(rawReason);
                          if (isLeakedRepayment) {
                            return (
                              <>
                                <strong style={{ color: coverColor }}>{s.coveringParent}</strong> covers — paying back time <strong style={{ color: origColor }}>{s.originalParent}</strong> owed.
                              </>
                            );
                          }
                          return (
                            <>
                              <strong style={{ color: coverColor }}>{s.coveringParent}</strong> covers — <strong style={{ color: origColor }}>{s.originalParent}</strong> has <em>{rawReason}</em>.
                            </>
                          );
                        })()
                      )}
                    </div>

                    {/* Action row for the impacted user — only the dispute
                        button shows. The "you've picked this up" label was
                        redundant since the body already reads "[You] covers". */}
                    {impactsMe && !isRedemption && !isBalance && !s.blocked && onDispute && (
                      <div style={{ display: "flex", marginTop: 8 }}>
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
    sleep_down: "#7C5C84",    // warm plum (night/dusk in warm-palette terms)
    sleep_up: C.gold,      // gold (waking)
    bath: "#7B9B6E",          // sage green (water/clean in warm-palette terms)
    skincare: "#9C6BB0",      // soft purple
    activity: activityInfo?.color || C.gold,
    takeover: C.accent,
  }[ev.type] || C.ink;

  const label = {
    feed: `${ev.inventoryReconcileNeeded ? "⚠ " : ""}Feed${ev.oz ? ` · ${ev.oz}oz` : ""}${ev.source ? ` ${ev.source}` : ""}`,
    breastfeed: `Breastfed${ev.totalDurationMin ? ` · ${ev.totalDurationMin}m` : ""}${(ev.leftMin || ev.rightMin) ? ` (L${ev.leftMin || 0}/R${ev.rightMin || 0})` : ""}`,
    pump: `${ev.pumpType === "power" ? "⚡ Power pump" : "Pump"}${ev.oz ? ` · ${ev.oz}oz` : ""}${ev.durationMin ? ` · ${ev.durationMin}m` : ""}${ev.bottleLabel ? ` · Bottle ${ev.bottleLabel}` : ""}`,
    diaper: `Diaper${ev.notes ? ` · ${ev.notes}` : ""}`,
    sleep_down: "Down for sleep",
    sleep_up: "Awake",
    bath: `${BATH_TYPES[ev.bathType]?.icon || "🛁"} ${BATH_TYPES[ev.bathType]?.label || "Bath"}`,
    bath_skipped: "🛁 No bath tonight",
    skincare: `${ev.routine === "AM" ? "☀️ AM" : "🌙 PM"} routine done`,
    activity: activityInfo ? `${activityInfo.emoji} ${activityInfo.l}${ev.durationMin ? ` · ${ev.durationMin}m` : ""}` : `Activity${ev.durationMin ? ` · ${ev.durationMin}m` : ""}`,
    takeover: `Takeover · ${ev.coveringParent} covered ${ev.originalParent}${ev.durationMin ? ` for ${fmtBalance(ev.durationMin)}` : ""}`,
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
  const uvColor = uvNow == null ? C.muted : uvNow < 3 ? "#5C8E5C" : uvNow < 6 ? C.gold : C.accent;

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

function LogView({ C, events, removeEvent, updateEvent, now, onOpenBathLog }) {
  const [editing, setEditing] = useState(null); // event being edited
  // v05.05bt25 — show bath_skipped events in journal (even though silent)
  // so users can see + undo their "no bath tonight" decision. Other silent
  // events (wake_confirmed) stay hidden.
  const visibleEvents = events.filter(e => !e.silent || e.type === "bath_skipped");
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
              {evs.map((e, i) => {
                // v05.05bt25 — bath_skipped rows are special: tapping them
                // opens the bath logger (so the user can change their mind).
                // The Option-2 logic in addEvent will auto-remove this skip
                // event when the bath is logged.
                const isSkippedBath = e.type === "bath_skipped";
                const rowOnClick = isSkippedBath
                  ? () => onOpenBathLog && onOpenBathLog()
                  : () => setEditing(e);
                return (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  borderTop: i === 0 ? "none" : `1px solid ${C.line}10`,
                  opacity: isSkippedBath ? 0.7 : 1,
                  fontStyle: isSkippedBath ? "italic" : "normal",
                }}>
                  <button
                    onClick={rowOnClick}
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
                      {e.type === "feed" && `${e.inventoryReconcileNeeded ? "⚠ " : ""}Feed${e.oz ? ` · ${e.oz}oz` : ""}${e.source ? ` ${e.source}` : ""}`}
                      {e.type === "breastfeed" && `Breastfed${e.totalDurationMin ? ` · ${e.totalDurationMin}m` : ""}${(e.leftMin || e.rightMin) ? ` (L${e.leftMin || 0}/R${e.rightMin || 0})` : ""}`}
                      {e.type === "pump" && (() => {
                        const isPower = e.pumpType === "power";
                        const prefix = isPower ? "⚡ Power pump" : "Pump";
                        const labelStr = e.bottleLabel ? ` · Bottle ${e.bottleLabel}` : "";
                        const base = `${prefix}${e.oz ? ` · ${e.oz}oz` : ""}${e.durationMin ? ` · ${e.durationMin}m` : ""}${labelStr}`;
                        // Append start–end range if we have duration. mode
                        // tells us whether ts is the start or end of the
                        // session; we compute the missing edge from durationMin.
                        if (!e.durationMin) return base;
                        const ts = new Date(e.ts);
                        if (isNaN(ts.getTime())) return base;
                        const isEnd = e.mode === "end";
                        const start = isEnd ? new Date(ts.getTime() - e.durationMin * 60000) : ts;
                        const end = isEnd ? ts : new Date(ts.getTime() + e.durationMin * 60000);
                        return `${base} (${fmtTimeShort(start)}–${fmtTimeShort(end)})`;
                      })()}
                      {e.type === "diaper" && `Diaper · ${diaperLabel(e.notes)}`}
                      {e.type === "sleep_down" && `Down for sleep${e.estimated ? " (est.)" : ""}`}
                      {e.type === "sleep_up" && "Awake"}
                      {e.type === "bath" && `${BATH_TYPES[e.bathType]?.icon} ${BATH_TYPES[e.bathType]?.label}`}
                      {e.type === "bath_skipped" && "🛁 No bath tonight"}
                      {e.type === "skincare" && `${e.routine === "AM" ? "☀️" : "🌙"} ${e.routine} routine`}
                      {e.type === "activity" && (() => {
                        const a = ACTIVITIES.find(x => x.v === e.activityType);
                        return `${a?.emoji || "⭐"} ${a?.l || "Activity"}${e.durationMin ? ` · ${e.durationMin}m` : ""}`;
                      })()}
                      {e.type === "takeover" && `↔ ${e.coveringParent} covered ${e.originalParent}${e.durationMin ? ` · ${e.durationMin}m` : ""}`}
                    </span>
                    {isSkippedBath ? (
                      <span style={{
                        fontSize: 10, color: C.accent,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontStyle: "normal", fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        ↻ undo · log bath
                      </span>
                    ) : (
                      <Edit3 size={11} color={C.muted} style={{ opacity: 0.4 }} />
                    )}
                  </button>
                  <button onClick={(ev) => { ev.stopPropagation(); removeEvent(e.id); }} style={{
                    background: "transparent", border: "none", color: C.muted, cursor: "pointer",
                    padding: "10px 14px 10px 4px", opacity: 0.5,
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                );
              })}
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
  const [tsLocal, setTsLocal] = useState(() => safeDatetimeLocal(event.ts));
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
    return safeDatetimeLocal(end);
  });
  // v05.05bt22: bottle label editable on pump events. The label originally
  // gets set during the FinishPumpModal flow, but if it was missed (e.g.
  // backfilled pump, retroactive entry), users want to add/correct it here.
  // We persist BOTH on the pump event AND on the matching inventory bottle
  // (linked by ts ↔ pumpedAt) so the label propagates everywhere.
  const [bottleLabel, setBottleLabel] = useState(event.bottleLabel || "");

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
      // v05.05bt22: persist bottle label
      updated.bottleLabel = bottleLabel.trim() || null;
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
          {event.inventoryReconcileNeeded && (
            <div style={{
              marginBottom: 14, padding: 12,
              background: `${C.gold}15`,
              border: `1px solid ${C.gold}55`,
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                color: C.gold, fontWeight: 700, marginBottom: 4,
              }}>
                ⚠ Inventory mismatch
              </div>
              <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5, marginBottom: 8 }}>
                This feed was logged without picking a bottle from inventory. If you've since added the missing bottle, mark this resolved.
              </div>
              <button onClick={() => onSave({ ...event, inventoryReconcileNeeded: false })} style={{
                background: C.gold, color: "#1F1B16", border: "none",
                borderRadius: 6, padding: "6px 12px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}>
                Mark resolved (clear ⚠)
              </button>
            </div>
          )}
          <Field C={C} label="Volume (oz)">
            <BigOzPicker C={C} value={oz} onChange={setOz} />
          </Field>
          <Field C={C} label="Source">
            <SegControl C={C} value={source} onChange={setSource} options={[
              { v: "BM", l: "Breast milk" },
              { v: "BM-thawed", l: "BM (thawed)" },
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
          return safeDatetimeLocal(end);
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

            {/* v05.05bt22: bottle label editor. Useful when the label was
                missed during the original FinishPumpModal flow, or when
                backfilling pumps. Persisted on both the pump event and
                the matching inventory bottle. */}
            <Field C={C} label="Bottle label (optional)">
              <input
                type="text"
                value={bottleLabel}
                onChange={e => setBottleLabel(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="e.g. A"
                maxLength={3}
                style={{
                  width: "100%", padding: 10, fontSize: 16,
                  background: C.bg, border: `1px solid ${C.line}33`,
                  borderRadius: 8, color: C.ink, outline: "none",
                  fontFamily: "'Cormorant Garamond', serif",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}
              />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: "italic" }}>
                Sharpie label on the bottle, if any. Helps identify which bottle is which.
              </div>
            </Field>
          </>
        );
      })()}

      {event.type === "diaper" && (
        <Field C={C} label="Type">
          <SegControl C={C} value={diaperKind} onChange={setDiaperKind} options={[
            { v: "wet", l: "Pee" },
            { v: "dirty", l: "Poo" },
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
// ---- DayPlanShiftStrip --------------------------------------------------
// Renders the day's shift plan as a horizontal hour-block bar mirroring the
// landing-page ShiftStrip treatment. Unlike the landing-page strip (rolling
// next-24h), this strip shows midnight→midnight of a specific calendar day
// (today or tomorrow). Carve/cover/conflict annotations on the slices get
// layered on as visual indicators so changes pop without needing to read
// the auto-adjustments log.
function DayPlanShiftStrip({ C, shiftBlocks, commitments, isToday, now }) {
  // Build 24 hourly cells from 00:00 → 24:00 of the target calendar day.
  // Each cell asks: who's on duty for that hour, and is the slice they're
  // in carved or conflicting?
  const cells = [];
  for (let h = 0; h < 24; h++) {
    const cellMins = h * 60 + 30; // mid-hour for slot lookup
    let parent = null;
    let coveringFor = null;
    let isConflict = false;
    let isCarved = false;
    for (const p of ["Mommy", "Daddy"]) {
      for (const s of (shiftBlocks?.[p] || [])) {
        const a = toMin(s.start);
        const b = toMin(s.end);
        const inShift = a < b ? cellMins >= a && cellMins < b : cellMins >= a || cellMins < b;
        if (inShift) {
          parent = p;
          coveringFor = s._coveringFor || null;
          isConflict = !!s._conflict;
          isCarved = !!s._isCarvedSlice || !!s._isCarvedFree;
          break;
        }
      }
      if (parent) break;
    }
    cells.push({ hour: h, parent, coveringFor, isConflict, isCarved });
  }

  // Compute commitment marks — small ticks on top of the strip at the
  // start time of each commitment for the visible day. Time is in minutes
  // since midnight (0–1440).
  const commitmentMarks = (commitments || []).map(m => {
    const start = new Date(m.start);
    const end = new Date(m.end);
    // Use local time for the day — these meetings are stored as ISO UTC
    // but we display at the day's local-time scale.
    const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();
    return {
      startPct: (startMins / 1440) * 100,
      widthPct: Math.max(0.5, ((endMins - startMins) / 1440) * 100),
      parent: m.parent,
      level: m.level,
      label: m.label,
    };
  });

  const nowPct = isToday ? ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100 : null;

  return (
    <div style={{
      background: C.bg, borderRadius: 10, padding: 12,
      border: `1px solid ${C.line}12`, marginBottom: 10,
    }}>
      {/* Legend row — Mommy / Daddy / covering / now */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8, flexWrap: "wrap", gap: 6,
      }}>
        <div style={{
          display: "flex", gap: 10, fontSize: 10, color: C.muted,
          letterSpacing: "0.04em",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: C.mommy, borderRadius: 2 }} /> Mommy
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: C.daddy, borderRadius: 2 }} /> Daddy
          </span>
        </div>
        <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>
          ↻ = covered · ! = conflict
        </div>
      </div>

      {/* Commitment ticks above the strip — small lines at each meeting time */}
      {commitmentMarks.length > 0 && (
        <div style={{ position: "relative", height: 8, marginBottom: 2 }}>
          {commitmentMarks.map((m, i) => {
            const cColor = m.parent === "Mommy" ? C.mommy : C.daddy;
            const lvlBorder = m.level === "red" ? "#C44545" : m.level === "yellow" ? C.gold : "#5C8E5C";
            return (
              <div
                key={i}
                title={`${m.parent} · ${m.label}`}
                style={{
                  position: "absolute",
                  left: `${m.startPct}%`,
                  width: `${m.widthPct}%`,
                  bottom: 0,
                  height: 6,
                  background: cColor,
                  border: `1px solid ${lvlBorder}`,
                  borderRadius: 2,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Hour blocks */}
      <div style={{
        position: "relative",
        display: "flex", height: 32, borderRadius: 6, overflow: "hidden",
        border: `1px solid ${C.line}11`, marginBottom: 4,
      }}>
        {cells.map((c, i) => {
          // Determine block color and emphasis. Carved/covered slots get a
          // darker tint + outline so they pop against the regular slice color.
          const baseColor = c.parent === "Mommy" ? C.mommy : c.parent === "Daddy" ? C.daddy : C.muted;
          const isHighlighted = c.isCarved || c.coveringFor || c.isConflict;
          return (
            <div key={i} style={{
              flex: 1,
              background: baseColor,
              opacity: isHighlighted ? 1 : 0.8,
              position: "relative",
              borderRight: i < 23 ? `1px solid ${C.bg}55` : "none",
              outline: c.isConflict
                ? `2px solid ${C.accent}`
                : isHighlighted
                ? `1.5px solid ${C.ink}`
                : "none",
              outlineOffset: -2,
              zIndex: isHighlighted ? 2 : 1,
            }}>
              {/* Indicator letter on top of the block when carved/conflict */}
              {c.isConflict ? (
                <div style={{
                  position: "absolute", top: 2, left: 0, right: 0,
                  textAlign: "center", fontSize: 11, fontWeight: 700,
                  color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  pointerEvents: "none",
                }}>!</div>
              ) : isHighlighted ? (
                <div style={{
                  position: "absolute", top: 2, left: 0, right: 0,
                  textAlign: "center", fontSize: 10, fontWeight: 700,
                  color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  pointerEvents: "none",
                }}>↻</div>
              ) : null}
            </div>
          );
        })}
        {/* Now line — only on Today's strip */}
        {nowPct !== null && (
          <div style={{
            position: "absolute", top: -3, bottom: -3,
            left: `${nowPct}%`,
            width: 2,
            background: C.accent,
            boxShadow: `0 0 8px ${C.accent}`,
            zIndex: 3,
          }} />
        )}
      </div>

      {/* Hour labels every 3h */}
      <div style={{
        display: "flex", fontSize: 9, color: C.muted,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
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

      <div style={{ marginTop: 8, fontSize: 10, color: C.muted, fontStyle: "italic" }}>
        ↑ each block = 1 hour · highlighted blocks = adjusted shifts
        {isToday && <> · orange line marks <strong style={{ color: C.accent }}>now</strong></>}
        {commitmentMarks.length > 0 && <> · bars above show commitments</>}
      </div>
    </div>
  );
}

// ---- DayPlanCard -------------------------------------------------------
function DayPlanCard({
  C, label, subLabel, defaultOpen,
  shiftBlocks, daySwaps, commitments,
  onRemoveCommitment, onEditCommitment, onAddCommitment, showAddButton,
  isToday,
  now,
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
          {/* v05.05bt27: replaced the bar graphic (DayPlanShiftStrip) with
              the same two-column shift list rendering used on the landing
              page's Today's Plan card. Annotation indicators (+/↔/↩/⚖/⏸)
              appear to the left of each adjusted shift; bold weight
              indicates a moved/repayment/takeover shift. The pulsing
              current-block dot only renders for today, never tomorrow. */}
          <div style={{
            border: `1px solid ${C.line}15`,
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 12,
          }}>
            <ShiftListGrid
              C={C}
              shifts={shiftBlocks}
              swaps={daySwaps}
              isToday={isToday}
              now={now}
            />
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
                  <MeetingRow key={m.id} m={m} C={C}
                    onRemove={() => onRemoveCommitment(m.id)}
                    onEdit={onEditCommitment ? () => onEditCommitment(m) : undefined} />
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
function UpcomingSection({ C, allFuture, sevenDaysOut, thirtyDaysOut, onRemoveMeeting, onEditMeeting, externalOpen, externalFilter, onExternalOpenHandled }) {
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

  // Group filtered items by date for date-section headings. Within each
  // day's bucket, items are sorted by start time so the day reads
  // chronologically (9am → 11am → 4pm) rather than insertion order. The
  // outer Object.entries sort orders dates ascending.
  const sortedDateGroups = useMemo(() => {
    const byDate = {};
    for (const m of filtered) {
      const dt = new Date(m.start);
      const key = dt.toISOString().slice(0, 10);
      if (!byDate[key]) byDate[key] = { date: dt, items: [] };
      byDate[key].items.push(m);
    }
    // Sort items inside each day chronologically
    for (const key of Object.keys(byDate)) {
      byDate[key].items.sort((a, b) => new Date(a.start) - new Date(b.start));
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
    <details ref={detailsRef} id="upcoming-section" open style={{
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
                <MeetingRow key={m.id} m={m} C={C}
                  onRemove={() => onRemoveMeeting(m.id)}
                  onEdit={onEditMeeting ? () => onEditMeeting(m) : undefined} />
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
  const [editingMeeting, setEditingMeeting] = useState(null); // meeting object being edited

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
  // Update an existing meeting in place — preserves id and any side-channel
  // fields (gift redemption metadata, etc.) by spreading the original first
  // and only overlaying the editable form fields on top.
  const updateMeeting = (id, patch) => setMeetings(prev => {
    const next = prev.map(m => m.id === id ? { ...m, ...patch } : m);
    try {
      localStorage.setItem("solene:meetings", JSON.stringify(next));
    } catch (e) { console.warn("[updateMeeting] sync persist failed", e); }
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
          const todayCommitments = [...today].sort((a, b) => new Date(a.start) - new Date(b.start));

          // ---- Tomorrow
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dayAfter = new Date(tomorrow);
          dayAfter.setDate(dayAfter.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          dayAfter.setHours(0, 0, 0, 0);
          const tomorrowMeetings = (meetings || [])
            .filter(m => {
              const t = new Date(m.start);
              return t >= tomorrow && t < dayAfter;
            })
            .sort((a, b) => new Date(a.start) - new Date(b.start));
          const tomorrowLabel = tomorrow.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
          const tomProj = tomorrowProjection?.projected || { Mommy: shifts.Mommy || [], Daddy: shifts.Daddy || [] };
          const tomSwaps = tomorrowProjection?.swaps || [];

          return (
            <>
              <DayPlanCard
                key={`today-${todayCommitments.length}-${todayCommitments.map(m => m.start + m.end).join("|")}`}
                C={C}
                label="Today"
                subLabel={todayLabel}
                shiftBlocks={activeShifts}
                daySwaps={swaps || []}
                commitments={todayCommitments}
                onRemoveCommitment={removeMeeting}
                onEditCommitment={(m) => setEditingMeeting(m)}
                onAddCommitment={() => setShowAdd(true)}
                showAddButton={true}
                isToday={true}
                now={now}
                controlledOpen={todayOpen}
                setControlledOpen={setTodayOpen}
              />
              <DayPlanCard
                key={`tomorrow-${tomorrowMeetings.length}-${tomorrowMeetings.map(m => m.start + m.end).join("|")}`}
                C={C}
                label="Tomorrow"
                subLabel={tomorrowLabel}
                shiftBlocks={tomProj}
                daySwaps={tomSwaps}
                commitments={tomorrowMeetings}
                onRemoveCommitment={removeMeeting}
                onEditCommitment={(m) => setEditingMeeting(m)}
                onAddCommitment={() => setShowAdd(true)}
                showAddButton={true}
                isToday={false}
                now={now}
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
            onEditMeeting={(m) => setEditingMeeting(m)}
            externalOpen={upcomingTrigger?.open}
            externalFilter={upcomingTrigger?.filter}
            onExternalOpenHandled={() => setUpcomingTrigger(null)}
          />
        );
      })()}

      {showAdd && <AddMeetingModal C={C} onClose={() => setShowAdd(false)} onSubmit={addMeeting} currentUser={currentUser} />}

      {/* Edit meeting modal — pre-fills the same form used for adding,
          updates in place on submit. */}
      {editingMeeting && (
        <ModalShell C={C} onClose={() => setEditingMeeting(null)} title="Edit commitment">
          <InlineCommitmentForm
            C={C}
            currentUser={currentUser}
            initial={editingMeeting}
            onSubmit={(patch) => {
              updateMeeting(editingMeeting.id, patch);
              setEditingMeeting(null);
            }}
          />
        </ModalShell>
      )}
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
          background: "#7B9B6E18",
          border: "1px solid #7B9B6E55",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 12,
          fontSize: 13, color: "#4D6B43", lineHeight: 1.5,
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
                        background: "#7B9B6E25", color: "#4D6B43",
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
  // Maps action → addInitialMode (the form's `kind` field):
  //   "owed"    → "owed"   (log a debt — partner covered for me)
  //   "gift"    → "gift"   (gift time, no payback expected)
  //   "payback" → "paid"   (settle a debt)
  useEffect(() => {
    if (!pendingTimeBankAction) return;
    const modeMap = { owed: "owed", gift: "gift", payback: "paid" };
    setAddInitialMode(modeMap[pendingTimeBankAction] || "owed");
    setShowAddModal(true);
    clearPendingTimeBankAction && clearPendingTimeBankAction();
  }, [pendingTimeBankAction, clearPendingTimeBankAction]);

  const transactions = timeBank.transactions || [];
  // Always recompute from history. If the cached `balance` field drifted
  // (e.g. from an old build that mishandled a transaction kind, or a sync
  // race), the displayed number was wrong. Recomputing on each render
  // guarantees the displayed balance always reflects the visible ledger.
  const balance = computeTimeBankBalance(transactions);
  const partner = currentUser === "Mommy" ? "Daddy" : "Mommy";
  const partnerColor = currentUser === "Mommy" ? C.daddy : C.mommy;
  const youColor = currentUser === "Mommy" ? C.mommy : C.daddy;

  // Auto-heal the cached balance if it's drifted. This silently keeps the
  // stored state in sync with the ledger so other views (Now's pip, etc.)
  // also show the correct number on next render.
  useEffect(() => {
    if ((timeBank.balance || 0) !== balance) {
      setTimeBank({ ...timeBank, balance });
    }
  }, [balance, timeBank, setTimeBank]);

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
          <Check size={16} color={youColor} />
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

// ---- SwipeableRow ------------------------------------------------------
// Reusable wrapper that lets users swipe-left on a list item to reveal
// action buttons (typically Edit + Delete). Distinguishes horizontal swipe
// from vertical scroll by requiring dx > dy * 1.5 before locking to swipe
// gesture. Snaps back if released before 60px threshold. Tap-anywhere-else
// (on the page) closes any open swipe.
//
// Usage:
//   <SwipeableRow C={C} actions={[
//     { label: "Edit", icon: <Edit3 size={14} />, color: "#888", onClick: () => ... },
//     { label: "Delete", icon: <Trash2 size={14} />, color: "#C44545", onClick: () => ... },
//   ]}>
//     <YourRowContent />
//   </SwipeableRow>
//
// Props:
//   actions: array of { label, icon, color, onClick }
//   children: the row content
//   C: theme palette
//
// v05.05bt17.
function SwipeableRow({ C, actions, children, rowKey }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [snapped, setSnapped] = useState(false); // is the row currently held open?
  const startX = useRef(0);
  const startY = useRef(0);
  const didLockToSwipe = useRef(false);
  const containerRef = useRef(null);

  const ACTION_WIDTH = 64; // px per action button
  const totalActionWidth = actions.length * ACTION_WIDTH;
  const SNAP_THRESHOLD = ACTION_WIDTH; // half-way through one action width

  // Close on outside click
  useEffect(() => {
    if (!snapped) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSnapped(false);
        setDragX(0);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [snapped]);

  const onPointerDown = (clientX, clientY) => {
    startX.current = clientX;
    startY.current = clientY;
    didLockToSwipe.current = false;
    setIsDragging(true);
  };

  const onPointerMove = (clientX, clientY, e) => {
    if (!isDragging) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    // First few pixels — decide whether this is a horizontal swipe or
    // vertical scroll. Once locked, we ignore vertical movement.
    if (!didLockToSwipe.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          didLockToSwipe.current = true;
        } else {
          // Vertical scroll wins — release and don't drag
          setIsDragging(false);
          return;
        }
      } else {
        return;
      }
    }
    // Only swipes to the left reveal actions. Right swipes either close a
    // snapped row or do nothing.
    let nextDragX;
    if (snapped) {
      // Starting from open position: dx is delta from open
      nextDragX = Math.min(0, -totalActionWidth + dx);
    } else {
      nextDragX = Math.min(0, dx);
    }
    // Resist over-drag past full open
    if (nextDragX < -totalActionWidth - 20) {
      nextDragX = -totalActionWidth - 20 + (nextDragX + totalActionWidth + 20) * 0.2;
    }
    setDragX(nextDragX);
    if (e && e.preventDefault && didLockToSwipe.current) e.preventDefault();
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to nearest stable state
    if (dragX < -SNAP_THRESHOLD) {
      setDragX(-totalActionWidth);
      setSnapped(true);
    } else {
      setDragX(0);
      setSnapped(false);
    }
  };

  // Touch handlers
  const onTouchStart = (e) => {
    onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    if (didLockToSwipe.current && e.cancelable) e.preventDefault();
    onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
  };
  const onTouchEnd = () => onPointerUp();

  // Mouse handlers — useful for desktop demoing
  const onMouseDown = (e) => onPointerDown(e.clientX, e.clientY);
  const onMouseMove = (e) => isDragging && onPointerMove(e.clientX, e.clientY, e);
  const onMouseUp = () => onPointerUp();
  // Mouse needs document-level listeners since the cursor can leave the row
  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  });

  return (
    <div ref={containerRef} style={{
      position: "relative", overflow: "hidden", borderRadius: 10,
    }}>
      {/* Action buttons — sit BEHIND the content, revealed when content slides left */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        display: "flex",
      }}>
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              setDragX(0);
              setSnapped(false);
            }}
            style={{
              width: ACTION_WIDTH,
              background: action.color || C.muted,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3,
              fontFamily: "inherit", fontSize: 10, fontWeight: 600,
              letterSpacing: "0.04em",
            }}>
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      {/* Content — slides left to reveal actions */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
          background: C.paper,
          touchAction: "pan-y",
        }}>
        {children}
      </div>
    </div>
  );
}

function MeetingRow({ m, C, onRemove, onEdit }) {
  const colors = {
    red: { bg: "#C44545", fg: "#fff", label: "RED" },
    yellow: { bg: C.gold, fg: "#1F1B16", label: "YELLOW" },
    green: { bg: "#5C8E5C", fg: "#fff", label: "GREEN" },
  }[m.level];
  const start = new Date(m.start);
  const end = new Date(m.end);
  const parentColor = m.parent === "Mommy" ? C.mommy : C.daddy;

  // v05.05bt17: swipe-left to reveal Edit + Delete buttons. Tap on body
  // still opens edit modal. The old 2-step confirm trash button is gone
  // since the swipe gesture itself is intentional.
  const actions = [];
  if (onEdit) {
    actions.push({
      label: "Edit",
      icon: <Edit3 size={14} />,
      color: C.muted,
      onClick: onEdit,
    });
  }
  actions.push({
    label: "Delete",
    icon: <Trash2 size={14} />,
    color: "#C44545",
    onClick: onRemove,
  });

  return (
    <SwipeableRow C={C} actions={actions} rowKey={m.id}>
      <div style={{
        background: C.paper,
        border: `1px solid ${C.line}15`,
        borderRadius: 10,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: colors.bg, marginLeft: 12 }} />
        {/* Tappable body — clicks open edit modal */}
        <button
          onClick={onEdit}
          disabled={!onEdit}
          style={{
            flex: 1, minWidth: 0, textAlign: "left",
            background: "transparent", border: "none",
            padding: "10px 0", cursor: onEdit ? "pointer" : "default",
            fontFamily: "inherit", color: "inherit",
          }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{m.label || "(untitled)"}</div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            <span style={{ color: parentColor, fontWeight: 600 }}>{m.parent}</span>
            {" · "}{fmtTimeShort(start)}–{fmtTimeShort(end)}
          </div>
        </button>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
          background: colors.bg, color: colors.fg,
          padding: "3px 6px", borderRadius: 4,
        }}>
          {colors.label}
        </span>
        {/* v05.05bt29: visible inline edit + delete buttons as fallback
            for users who don't discover the swipe gesture. The swipe and
            the body tap still work as before; these are just an
            always-visible alternative. */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit"
            style={{
              background: "transparent", border: "none", color: C.muted,
              cursor: "pointer", padding: "8px 4px", opacity: 0.6,
              display: "flex", alignItems: "center",
            }}>
            <Edit3 size={13} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label="Delete"
            style={{
              background: "transparent", border: "none", color: C.muted,
              cursor: "pointer", padding: "8px 12px 8px 4px", opacity: 0.6,
              display: "flex", alignItems: "center",
            }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </SwipeableRow>
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


function InventoryView({ C, inventory, events, currentUser, moveToFridge, removeInventory, emptyLocation, editBottle, addBottle, totalSafeOz, rtSafeOz, fridgeOz, feedsRunway, hoursRunway, lastPump, nextPumpAt, now, todayCalories }) {
  // Viewer color for chrome that's about inventory management (which both
  // parents do) rather than active pumping or lactation calories (which
  // are Mommy-specific). Daddy adds bottles, picks bottles, manages the
  // fridge — those affordances should be his color.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;
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

      <Section C={C} title="In stock">
        {/* Add bottle button — always visible. Useful for: catching up after
            a missed pump log, or fixing inventory state if the app double-
            counted or lost a bottle. */}
        {addBottle && (
          <button onClick={addBottle} style={{
            width: "100%", marginBottom: 10,
            background: "transparent", color: viewerColor,
            border: `1.5px dashed ${viewerColor}66`, borderRadius: 8,
            padding: "10px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "inherit",
          }}>
            + Add a bottle (manual entry)
          </button>
        )}
        {valid.length === 0 ? (
          <div style={{ color: C.muted, fontStyle: "italic", padding: "8px 0", fontSize: 13, textAlign: "center" }}>
            No bottles in stock right now.
          </div>
        ) : (<>
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
        </>)}
      </Section>

      {/* Supply analytics — moved here from Wellness in v05.05ax. These
          sit better next to the bottle inventory than buried in Wellness:
            • BM vs Formula split: composition of feeds over the window
            • Pump output trend: supply trajectory across recent vs older
              halves of the window
          Both computed locally from `events` to keep this self-contained. */}
      {(() => {
        if (!events || events.length === 0) return null;
        const WINDOW_DAYS = 7;
        const winMs = WINDOW_DAYS * 86400 * 1000;
        const cutoff = new Date(now.getTime() - winMs);

        // ---- BM vs Formula
        let totalBmOz = 0, totalFormulaOz = 0;
        for (const e of events) {
          if (e.type !== "feed") continue;
          const ts = new Date(e.ts);
          if (ts < cutoff) continue;
          // Source classification: explicit `source` field if set, else
          // infer from the bottle (BM bottles are tagged) or assume BM
          // (most common case for this family).
          const norm = (e.source || "").toLowerCase();
          const isFormula = /formula/.test(norm) && !/bm|breast/.test(norm);
          const isMixed = /formula/.test(norm) && /bm|breast/.test(norm);
          if (isFormula) totalFormulaOz += e.oz || 0;
          else if (isMixed) {
            // Mixed feeds: split 50/50 as a rough heuristic since the
            // exact ratio isn't stored on the event. The user can refine
            // this by editing the event's source.
            totalFormulaOz += (e.oz || 0) / 2;
            totalBmOz += (e.oz || 0) / 2;
          } else {
            totalBmOz += e.oz || 0;
          }
        }
        const totalOz = totalBmOz + totalFormulaOz;
        const bmRatio = totalOz > 0 ? totalBmOz / totalOz : 0;

        // ---- Pump trend (recent half vs older half of window)
        const pumpsInWin = events
          .filter(e => e.type === "pump" && new Date(e.ts) >= cutoff)
          .map(e => ({ ts: new Date(e.ts), oz: e.oz || 0 }))
          .sort((a, b) => a.ts - b.ts);

        let olderPumpAvg = 0, newerPumpAvg = 0, pumpTrend = 0;
        if (pumpsInWin.length >= 4) {
          const mid = Math.floor(pumpsInWin.length / 2);
          const older = pumpsInWin.slice(0, mid);
          const newer = pumpsInWin.slice(mid);
          olderPumpAvg = older.reduce((s, p) => s + p.oz, 0) / older.length;
          newerPumpAvg = newer.reduce((s, p) => s + p.oz, 0) / newer.length;
          pumpTrend = olderPumpAvg > 0 ? ((newerPumpAvg - olderPumpAvg) / olderPumpAvg) * 100 : 0;
        }

        const hasBmFormula = totalOz > 0;
        const hasPumpTrend = olderPumpAvg > 0 && newerPumpAvg > 0;
        if (!hasBmFormula && !hasPumpTrend) return null;

        return (
          <Section C={C} title="Supply analytics">
            {hasBmFormula && (
              <div style={{
                background: C.paper, borderRadius: 12, padding: 14,
                border: `1px solid ${C.line}15`, marginBottom: 10,
              }}>
                <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600, marginBottom: 8 }}>
                  BM vs Formula · last {WINDOW_DAYS} days
                </div>
                <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}11` }}>
                  <div style={{
                    width: `${bmRatio * 100}%`,
                    background: C.mommy, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, minWidth: 0,
                  }}>
                    {bmRatio > 0.15 && `${(bmRatio * 100).toFixed(0)}% BM`}
                  </div>
                  <div style={{
                    width: `${(1 - bmRatio) * 100}%`,
                    background: "#8B6B4F", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, minWidth: 0,
                  }}>
                    {(1 - bmRatio) > 0.15 && `${((1 - bmRatio) * 100).toFixed(0)}% Formula`}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {totalBmOz.toFixed(1)}oz BM · {totalFormulaOz.toFixed(1)}oz Formula
                </div>
              </div>
            )}

            {hasPumpTrend && (
              <div style={{
                background: C.paper, borderRadius: 12, padding: 14,
                border: `1px solid ${C.line}15`,
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
                      {olderPumpAvg.toFixed(1)} oz
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                      Recent half
                    </div>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500,
                      marginTop: 2, lineHeight: 1.1,
                      color: pumpTrend > 5 ? "#7B9B6E" : pumpTrend < -5 ? C.accent : C.ink,
                    }}>
                      {newerPumpAvg.toFixed(1)} oz
                      <span style={{ fontSize: 14, marginLeft: 4 }}>
                        {pumpTrend > 5 ? "↑" : pumpTrend < -5 ? "↓" : "→"}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
                  {Math.abs(pumpTrend) < 5
                    ? "Output is steady — supply looks well-matched to demand."
                    : pumpTrend > 5
                    ? `Output is up ${pumpTrend.toFixed(0)}% — supply is increasing.`
                    : `Output is down ${Math.abs(pumpTrend).toFixed(0)}% — consider hydration, nursing frequency, or a power pump session.`}
                </div>
              </div>
            )}
          </Section>
        );
      })()}

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

// Extracted in v05.05bt18 so the same form body is used by both:
//   - BathLoggerModal (Care tab → "Log bath" button)
//   - LogPickerSheet (Now tab → bedtime check-in banner → "Yes, log it")
// Single source of truth for bath logging UX.
function BathForm({ C, onSubmit }) {
  const [bathType, setBathType] = useState("full_sudsy");
  const [withBook, setWithBook] = useState(false);
  // Only the 4 canonical bath types are selectable. Legacy keys (full,
  // partial, quickie, wipe) still resolve via BATH_TYPES lookup for
  // displaying historical entries, but they're not in the picker.
  const ACTIVE_BATH_KEYS = ["toe_dip", "full_sudsy", "full_with_hair", "quick_dunk"];
  return (
    <>
      <Field C={C} label="Which routine just happened?">
        <div style={{ display: "grid", gap: 8 }}>
          {ACTIVE_BATH_KEYS.map(key => {
            const info = BATH_TYPES[key];
            return (
            <button key={key} onClick={() => setBathType(key)} style={{
              background: bathType === key ? C.accent : C.bg,
              color: bathType === key ? "#fff" : C.ink,
              border: `1.5px solid ${bathType === key ? C.accent : C.line + "22"}`,
              borderRadius: 10, padding: "12px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 12, textAlign: "left",
              fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 24 }}>{info.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{info.label}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>{info.desc}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>{info.duration}</div>
            </button>
            );
          })}
        </div>
      </Field>
      <Field C={C} label="Did we read her a book?">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { v: true, l: "Yes 📖", desc: "stories or board book" },
            { v: false, l: "No", desc: "no book tonight" },
          ].map(opt => (
            <button key={String(opt.v)} onClick={() => setWithBook(opt.v)} style={{
              background: withBook === opt.v ? `${C.gold}30` : C.bg,
              color: C.ink,
              border: `1.5px solid ${withBook === opt.v ? C.gold : C.line + "22"}`,
              borderRadius: 10, padding: "10px 12px", cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.l}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </Field>
      <SubmitButton C={C} onClick={() => onSubmit({ type: "bath", bathType, withBook })}>
        Log bath
      </SubmitButton>
    </>
  );
}

function BathLoggerModal({ C, onClose, onSubmit }) {
  return (
    <ModalShell C={C} onClose={onClose} title="Log bath">
      <BathForm C={C} onSubmit={onSubmit} />
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
function CentralLogButton({ C, mode, onClick, currentUser }) {
  // Bottom UI zone (LOG button + tab bar) is owned by the viewer, in contrast
  // to page-level primary-action coral used elsewhere (Generate code, Use
  // code, etc). This is the strongest cross-room signal in the app — at a
  // glance the floating button color tells you whose view this is.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;
  // Darker tone for the gradient end stop. Slightly hand-tuned per color
  // so the button reads as having depth rather than flat fill.
  const viewerDarker = currentUser === "Daddy" ? "#4F6E96" : "#7B6177";
  return (
    <button onClick={onClick} style={{
      position: "fixed",
      bottom: 38, left: "50%", transform: "translateX(-50%)",
      zIndex: 7,
      width: 64, height: 64, borderRadius: "50%",
      background: `linear-gradient(135deg, ${viewerColor}, ${viewerDarker})`,
      color: "#fff",
      // Ring stays the page bg color so the button reads as floating above
      // the tab bar. Was viewer-color before; not needed now that the button
      // base IS viewer-color.
      border: `4px solid ${C.bg}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
      cursor: "pointer",
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
      // Soft shadow gives the button physical lift. Tint the shadow with
      // the viewer color so the underglow matches.
      boxShadow: `0 6px 20px ${viewerColor}66`,
    }}>
      <Plus size={22} strokeWidth={2.5} />
      <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
        LOG
      </span>
    </button>
  );
}

function TabBar({ C, tab, setTab, currentUser }) {
  // Bottom-nav zone uses viewer color for active state (label + indicator
  // bar) instead of the page-level coral accent. This makes the tab bar
  // unmistakably "yours" at a glance — paired with the viewer-color LOG
  // button it forms a coherent docked panel claimed by the viewer.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;
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
      // Use C.paper (warmer cream than page bg) so the bar visually separates
      // from the scrollable area above. Adds proper "this is a docked panel"
      // affordance instead of looking like transparent buttons over the page.
      background: C.paper,
      // Soft elevation shadow above (instead of a thin hairline border) gives
      // the bar physical presence — like it's resting in front of the page.
      // Lower alpha shadow to keep it subtle in day mode.
      boxShadow: `0 -8px 24px rgba(31, 27, 22, 0.06), 0 -1px 0 ${C.line}15`,
      zIndex: 6,
      // Extend background into the iOS home-indicator safe area so the
      // strip below the tab bar isn't bare white. The buttons stay above
      // the inset; only the bg color reaches into it.
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
            padding: "14px 2px 14px",
            color: tab === t.id ? viewerColor : C.muted,
            fontWeight: tab === t.id ? 600 : 500,
            fontSize: 11, cursor: "pointer",
            position: "relative",
            letterSpacing: "0.04em",
            fontFamily: "inherit",
          }}>
            {t.label}
            {tab === t.id && (
              <span style={{
                position: "absolute", top: 0, left: "25%", right: "25%",
                height: 2.5, background: viewerColor, borderRadius: 2,
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
    if (type === "diaper") return "#B8956A";
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
function LogPickerSheet({ C, onClose, onPick, loggerType, onSubmit, lastFeed, lastPump, activeBfTimer, setActiveBfTimer, activeActivity, setActiveActivity, addNote, addMeeting, liveInventory, onOpenTimeBank, onOpenBulkImport, onStartOnsite, currentUser, flaggedNotes, updateNote }) {
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
        : loggerType === "bath" ? "Log bath"
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
        {loggerType === "bath" && <BathForm C={C} onSubmit={onSubmit} />}
      </ModalShell>
    );
  }

  return (
    <ModalShell C={C} onClose={onClose} title="What just happened?">
      <div style={{ display: "grid", gap: 10 }}>
        <PickerOption C={C} icon={<Milk size={22} />} label="Bottle feed" sub="oz, BM or formula" onClick={() => onPick("feed")} color={C.accent} />
        <PickerOption C={C} icon={<Baby size={22} />} label="Diaper" sub="pee, poo, both" onClick={() => onPick("diaper")} color="#B8956A" />
        <PickerOption C={C} icon={<Droplet size={22} />} label="Pump" sub="standard or power pump" onClick={() => onPick("pump")} color={C.mommy} />
        <PickerOption C={C} icon={<Heart size={22} />} label="Breastfeed" sub="L/R timer" onClick={() => onPick("breastfeed")} color={C.mommy} />
        <PickerOption C={C} icon={<Moon size={22} />} label="Sleep" sub="down or awake" onClick={() => onPick("sleep")} color={C.ink} />
        <PickerOption C={C} icon={<Star size={22} />} label="Activity" sub="tummy time, reading, etc." onClick={() => onPick("activity")} color={C.gold} />
        <PickerOption C={C} icon={<MessageSquare size={22} />} label="Note / observation" sub="optional 🚩 to flag as concern" onClick={() => onPick("note")} color={C.accent} />
        <PickerOption C={C} icon={<Calendar size={22} />} label="Meeting / appointment" sub="auto-adjusts shifts · includes on-site" onClick={() => onPick("commitment")} color={C.ink} />
        {/* "Going on-site" used to be a separate picker option but it's
            really just a commitment flavor — moved into the commitment form
            as a preset in v05.05bb. */}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button
              onClick={() => onOpenTimeBank("owed")}
              style={{
                background: C.paper,
                border: `1px solid ${C.line}20`,
                borderRadius: 10,
                padding: "10px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                color: C.ink,
                textAlign: "center",
              }}>
              <Clock size={16} style={{ color: C.accent, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Log debt</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>covered shift</div>
              </div>
            </button>
            <button
              onClick={() => onOpenTimeBank("gift")}
              style={{
                background: C.paper,
                border: `1px solid ${C.line}20`,
                borderRadius: 10,
                padding: "10px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                color: C.ink,
                textAlign: "center",
              }}>
              <Gift size={16} style={{ color: C.gold, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Send gift</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>no payback</div>
              </div>
            </button>
            <button
              onClick={() => onOpenTimeBank("payback")}
              style={{
                background: C.paper,
                border: `1px solid ${C.line}20`,
                borderRadius: 10,
                padding: "10px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                color: C.ink,
                textAlign: "center",
              }}>
              <Check size={16} style={{ color: "#7B9B6E", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Pay back</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>settle debt</div>
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
function InlineCommitmentForm({ C, onSubmit, currentUser, initial }) {
  const PRESETS = [
    { id: "meeting_red",    label: "Work meeting",    emoji: "🔴", level: "red",    duration: 60 },
    { id: "meeting_yellow", label: "Work meeting",    emoji: "🟡", level: "yellow", duration: 60 },
    { id: "meeting_green",  label: "Work meeting",    emoji: "🟢", level: "green",  duration: 60 },
    { id: "doctor",         label: "Doctor visit",    emoji: "🩺", level: "red",    duration: 60 },
    { id: "personal",       label: "Personal appt",   emoji: "📅", level: "red",    duration: 120 },
    { id: "errand",         label: "Quick errand",    emoji: "🛒", level: "yellow", duration: 30 },
    { id: "friends",        label: "Friends / social", emoji: "🍷", level: "red",    duration: 180 },
    { id: "flex_out",       label: "Going on-site",   emoji: "📍", level: "red",    duration: 120, flex: true },
  ];
  const DURATIONS = [
    { v: 30,  l: "30m" },
    { v: 60,  l: "1h" },
    { v: 90,  l: "1.5h" },
    { v: 120, l: "2h" },
    { v: 180, l: "3h" },
  ];

  const isEdit = !!initial;
  // Edit mode pre-fills from initial; new mode uses defaults.
  // Format ISO datetime to "YYYY-MM-DDTHH:MM" for the datetime-local input.
  const toLocalIso = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const initialDuration = initial
    ? Math.round((new Date(initial.end) - new Date(initial.start)) / 60000)
    : 60;

  // Defaults: current user's calendar, red level, start = next half hour,
  // duration = 1 hour. These cover the most common case so most adds become
  // "tap preset → tap save."
  const [presetId, setPresetId] = useState(null);
  const [parent, setParent] = useState(initial?.parent || currentUser || "Mommy");
  const [level, setLevel] = useState(initial?.level || "red");
  const [isFlex, setIsFlex] = useState(initial?.flex || false);
  const [start, setStart] = useState(() => {
    if (initial?.start) return toLocalIso(initial.start);
    const d = new Date();
    if (d.getMinutes() > 30) { d.setHours(d.getHours() + 1); d.setMinutes(0); }
    else { d.setMinutes(30); }
    return d.toISOString().slice(0, 16);
  });
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [customDurationOpen, setCustomDurationOpen] = useState(
    // Auto-open custom input if the existing duration isn't a standard preset
    initial && ![30, 60, 90, 120, 180].includes(initialDuration)
  );
  const [label, setLabel] = useState(initial?.label || "");
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
              onChange={e => {
                // During typing, allow any number (including 0/empty) so the
                // user can backspace and re-enter without snapping to the
                // min. We only enforce min/max on blur. Number("") is NaN,
                // which we coerce to "" so the input stays empty visually.
                const raw = e.target.value;
                if (raw === "") { setDurationMin(""); return; }
                const n = Number(raw);
                if (Number.isNaN(n)) return;
                setDurationMin(Math.min(720, n));
              }}
              onBlur={() => {
                // On blur, snap to a valid value: empty/zero/low → 5
                const n = Number(durationMin);
                if (!n || n < 5) setDurationMin(5);
              }}
              style={{
                width: 90, padding: "8px 10px", fontSize: 14,
                background: C.bg, border: `1.5px solid ${C.accent}`,
                borderRadius: 8, color: C.ink, outline: "none",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              autoFocus
            />
            <span style={{ fontSize: 12, color: C.muted }}>
              minutes ({durationMin ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : "—"})
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
                { v: "yellow", l: "Yellow", c: C.gold, sub: "partial" },
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
        {!label.trim() ? "Add a label first" : isEdit ? `Save changes · ${parent} · ${durationMin}m` : `Save · ${parent} · ${durationMin}m`}
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
  // Swipe-down-to-dismiss tracking. The drag handle area listens to touches;
  // if the user moves their finger downward more than the threshold, we
  // close the modal. 80px threshold keeps small accidental drags from
  // dismissing. Only the top portion listens — we don't want vertical
  // scrolls inside long modal content to fire the handler.
  const touchStartY = useRef(null);
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 80) {
      touchStartY.current = null;
      onClose();
    }
  };
  const onTouchEnd = () => {
    touchStartY.current = null;
  };

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
        {/* Drag handle area — listens for swipe-down to close. */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ display: "flex", justifyContent: "center", marginBottom: 14, paddingBottom: 6, cursor: "grab" }}
        >
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
  // Multi-bottle allocations: Map<bottleId, ozUsed>. Replaces the old
  // single selectedBottleId. v05.05bb: BM feeds force a bottle-source
  // prompt unless the user explicitly chooses skip-inventory (e.g. a
  // bottle from outside our tracked inventory).
  const [allocations, setAllocations] = useState({}); // { bottleId: oz }
  const [skipInventory, setSkipInventory] = useState(false);
  const [dreamFeed, setDreamFeed] = useState(false);

  // Available BM bottles (RT first, then fridge, both ordered oldest first)
  const usesBM = source === "BM" || source === "BM+Formula";
  const availableBottles = useMemo(() => {
    if (!liveInventory) return [];
    const valid = liveInventory.filter(i => !i.expired);
    const rt = valid.filter(i => i.location === "rt").sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));
    const fr = valid.filter(i => i.location === "fridge").sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));
    // v05.05bt33: include freezer too. Order: RT first (most urgent expiry),
    // then fridge, then freezer last (longest life — typically only used
    // when nothing fresher is available).
    const fz = valid.filter(i => i.location === "freezer").sort((a, b) => new Date(a.pumpedAt) - new Date(b.pumpedAt));
    return [...rt, ...fr, ...fz];
  }, [liveInventory]);

  // Total currently allocated across all selected bottles
  const allocated = useMemo(
    () => Object.values(allocations).reduce((s, n) => s + (Number(n) || 0), 0),
    [allocations]
  );
  // Mix mode: only BM portion needs allocation. For "BM+Formula" we
  // assume half-and-half for the BM half (user can override per-bottle).
  // For pure BM, allocated should equal oz exactly.
  const targetBmOz = source === "BM" ? oz : source === "BM+Formula" ? oz / 2 : 0;
  const remaining = Math.max(0, targetBmOz - allocated);
  const overshoot = allocated > targetBmOz + 0.01;

  // Auto-allocate from oldest-first when feed oz changes and nothing is
  // allocated yet. This makes the common case (single bottle, feed it
  // all) one tap. User can adjust afterward.
  useEffect(() => {
    if (!usesBM) {
      setAllocations({});
      setSkipInventory(false);
      return;
    }
    if (Object.keys(allocations).length > 0) return; // user has touched it
    if (skipInventory) return;
    if (availableBottles.length === 0) return;
    // Auto-fill from oldest bottle until target met
    const auto = {};
    let need = targetBmOz;
    for (const b of availableBottles) {
      if (need <= 0.01) break;
      const take = Math.min(b.oz, need);
      auto[b.id] = Math.round(take * 10) / 10;
      need -= take;
    }
    setAllocations(auto);
  }, [usesBM, targetBmOz, availableBottles, allocations, skipInventory]);

  // Re-auto-fill when oz/source changes
  useEffect(() => {
    setAllocations({});
  }, [oz, source]);

  const setBottleOz = (bottleId, value) => {
    const bottle = availableBottles.find(b => b.id === bottleId);
    const max = bottle?.oz || 0;
    const clamped = Math.max(0, Math.min(max, Number(value) || 0));
    setAllocations(prev => {
      const next = { ...prev };
      if (clamped <= 0) delete next[bottleId];
      else next[bottleId] = Math.round(clamped * 10) / 10;
      return next;
    });
    setSkipInventory(false);
  };

  // canSubmit: BM feeds normally require allocation to match the BM oz total.
  // Three exceptions where we let it through:
  //   - source isn't BM (Formula / Mix-without-BM-portion)
  //   - user explicitly toggled skipInventory
  //   - there's literally no BM in inventory to allocate from (the empty-state
  //     message tells them this is fine; the submit handler already sends
  //     empty bottleAllocations and skips the drain)
  // v05.05bt32: previously the empty-inventory case wasn't in this list, so
  // the button was disabled despite the empty-state message saying "the feed
  // will be logged but nothing will be deducted." Classic UI lie. Fixed.
  const canSubmit = !usesBM
    || skipInventory
    || availableBottles.length === 0
    || (Math.abs(allocated - targetBmOz) < 0.05);

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

      {usesBM && (
        <Field C={C} label={
          source === "BM+Formula"
            ? `Which bottle(s) for the BM portion (${targetBmOz.toFixed(1)} oz)?`
            : "Which bottle(s) did you use?"
        }>
          {availableBottles.length === 0 ? (
            <div style={{
              background: `${C.gold}15`, border: `1px solid ${C.gold}55`,
              borderRadius: 10, padding: "10px 12px", fontSize: 12,
              color: C.ink, lineHeight: 1.5,
            }}>
              No BM bottles in inventory. The feed will be logged with a ⚠ flag — tap it later in the journal to reconcile (add the missing bottle and mark resolved).
            </div>
          ) : (
            <>
              {/* Running total bar */}
              <div style={{
                background: overshoot ? `${C.accent}18` : remaining < 0.05 ? `${"#5C8E5C"}18` : C.bg,
                border: `1px solid ${overshoot ? C.accent : remaining < 0.05 ? "#5C8E5C" : C.line + "22"}`,
                borderRadius: 8, padding: "8px 12px", marginBottom: 8,
                fontSize: 12, color: C.ink, fontFamily: "'JetBrains Mono', monospace",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span>
                  Allocated: <strong>{allocated.toFixed(1)}</strong> / {targetBmOz.toFixed(1)} oz
                </span>
                <span style={{ color: overshoot ? C.accent : remaining > 0.05 ? C.gold : "#5C8E5C", fontWeight: 600 }}>
                  {overshoot ? `${(allocated - targetBmOz).toFixed(1)} over` :
                   remaining > 0.05 ? `${remaining.toFixed(1)} short` :
                   "✓ matched"}
                </span>
              </div>

              {/* Per-bottle row with stepper */}
              <div style={{ display: "grid", gap: 6 }}>
                {availableBottles.map(b => {
                  const used = allocations[b.id] || 0;
                  const isUsed = used > 0;
                  const pumpedAt = new Date(b.pumpedAt);
                  const locColor = b.location === "rt" ? C.gold
                    : b.location === "freezer" ? "#5A7E9C"
                    : C.daddy;
                  const locBadge = b.location === "rt" ? "RT"
                    : b.location === "freezer" ? "Fz"
                    : "Fr";
                  return (
                    <div key={b.id} style={{
                      background: isUsed ? `${locColor}15` : C.bg,
                      border: `1.5px solid ${isUsed ? locColor : C.line + "22"}`,
                      borderRadius: 10, padding: "10px 12px",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: locColor, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>{locBadge}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>
                          {b.oz} oz
                          {b.bottleLabel && (
                            <span style={{
                              fontSize: 12, color: locColor, marginLeft: 6,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700, letterSpacing: "0.04em",
                            }}>· Bottle {b.bottleLabel}</span>
                          )}
                          <span style={{ color: C.muted, fontStyle: "italic", fontSize: 13, marginLeft: 6 }}>
                            · pumped {fmtTimeShort(pumpedAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                          {b.location === "rt"
                            ? `expires ${fmtTimeShort(new Date(pumpedAt.getTime() + BM_RT_HOURS_HARD * 3600000))}`
                            : b.location === "freezer"
                              ? `freezer · ${Math.round((Date.now() - pumpedAt.getTime()) / 86400000)}d frozen`
                              : `fridge · ${b.remaining.toFixed(0)}h left`}
                        </div>
                      </div>
                      {/* Stepper: − [oz] + */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => setBottleOz(b.id, used - 0.5)}
                          disabled={used <= 0}
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            border: `1px solid ${C.line}33`,
                            background: "transparent", color: C.ink,
                            fontSize: 16, fontWeight: 600,
                            cursor: used > 0 ? "pointer" : "not-allowed",
                            opacity: used > 0 ? 1 : 0.4,
                            fontFamily: "inherit", lineHeight: 1,
                          }}>−</button>
                        <input
                          type="number"
                          min={0}
                          max={b.oz}
                          step={0.5}
                          value={used || ""}
                          onChange={e => setBottleOz(b.id, e.target.value)}
                          placeholder="0"
                          style={{
                            width: 50, padding: "5px 6px",
                            border: `1px solid ${C.line}33`, borderRadius: 6,
                            fontSize: 13, textAlign: "center",
                            background: C.bg, color: C.ink,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        />
                        <button
                          onClick={() => setBottleOz(b.id, b.oz)}
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            border: `1px solid ${C.line}33`,
                            background: "transparent", color: C.ink,
                            fontSize: 16, fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit", lineHeight: 1,
                          }} title="Use all of this bottle">⤓</button>
                      </div>
                    </div>
                  );
                })}
                {/* Skip-inventory option */}
                <button
                  onClick={() => {
                    setAllocations({});
                    setSkipInventory(s => !s);
                  }}
                  style={{
                    background: skipInventory ? `${C.accent}15` : "transparent",
                    border: `1px ${skipInventory ? "solid" : "dashed"} ${skipInventory ? C.accent : C.line + "33"}`,
                    borderRadius: 10,
                    padding: "10px 12px", fontSize: 12, cursor: "pointer",
                    color: skipInventory ? C.accent : C.muted,
                    fontStyle: "italic",
                    fontWeight: skipInventory ? 600 : 400,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "inherit",
                  }}>
                  {skipInventory && <Check size={14} />}
                  {skipInventory ? "Skipping inventory deduction" : "None of these · don't deduct from inventory"}
                </button>
              </div>
            </>
          )}
        </Field>
      )}

      <WhenField C={C} mode={time} setMode={setTime} customLocal={customTime} setCustomLocal={setCustomTime} />

      {/* Dream-feed checkbox: a feed during sleep that doesn't actually wake the baby */}
      <button
        onClick={() => setDreamFeed(v => !v)}
        style={{
          width: "100%", marginBottom: 12,
          background: dreamFeed ? "#7C5C8415" : "transparent",
          border: `1px ${dreamFeed ? "solid" : "dashed"} ${dreamFeed ? "#7C5C84" : C.line + "33"}`,
          borderRadius: 10, padding: "10px 12px",
          color: dreamFeed ? "#7C5C84" : C.muted,
          fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
          fontFamily: "inherit",
        }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${dreamFeed ? "#7C5C84" : C.line + "55"}`,
          background: dreamFeed ? "#7C5C84" : "transparent",
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

      <SubmitButton C={C} disabled={!canSubmit} onClick={() => {
        // Build bottleAllocations array from the map. Skip-inventory and
        // empty-inventory paths leave it empty (consumer just adds the feed
        // event without deducting).
        const noBottlePicked = skipInventory || availableBottles.length === 0;
        const bottleAllocations = noBottlePicked
          ? []
          : Object.entries(allocations)
              .filter(([_, n]) => Number(n) > 0)
              .map(([bottleId, n]) => ({ bottleId, oz: Number(n) }));
        onSubmit({
          type: "feed", oz: Number(oz), source,
          ts: time === "now" ? new Date() : new Date(customTime),
          bottleAllocations,
          dreamFeed,
          // v05.05bt32: flag for reconciliation when logged without bottle
          // tracking. Surfaces ⚠ in journal so the user can later add the
          // missing bottle and mark the feed resolved.
          inventoryReconcileNeeded: noBottlePicked && usesBM,
        });
      }}>
        {!canSubmit
          ? (overshoot ? `Over by ${(allocated - targetBmOz).toFixed(1)} oz` : `${remaining.toFixed(1)} oz unallocated`)
          : "Log feed"}
      </SubmitButton>
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
          { v: "wet", l: "Pee 💧" },
          { v: "dirty", l: "Poo 💩" },
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
function DoctorView({ C, now, events, notes, appointments, removeNote, updateNote, addAppointment, removeAppointment, docSummary, setDocSummary, currentUser }) {
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  // Viewer color for chrome — section accents in DoctorView body that
  // aren't tied to a specific person should follow whoever's looking.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;

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

      // Compile stats for two periods so the model (and the fallback) can
      // describe period-over-period change. Last 7d = recent week. Prior
      // 7d = the week before that. v05.05bt: previously only single-period.
      const buildStats = (start, end, label) => {
        const inWindow = events.filter(e => {
          const t = new Date(e.ts);
          return t >= start && t < end;
        });
        const feeds = inWindow.filter(e => e.type === "feed" || e.type === "breastfeed");
        const bottleFeeds = feeds.filter(e => e.oz && e.type === "feed");
        const numDiapers = inWindow.filter(e => e.type === "diaper").length;
        const dirtyDiapers = inWindow.filter(e => e.type === "diaper" && (e.notes === "dirty" || e.notes === "both")).length;
        // Compute longest sleep stretch in window
        const downs = inWindow.filter(e => e.type === "sleep_down").sort((a, b) => new Date(a.ts) - new Date(b.ts));
        const ups = inWindow.filter(e => e.type === "sleep_up").sort((a, b) => new Date(a.ts) - new Date(b.ts));
        let longestSleepMin = 0;
        for (const d of downs) {
          const next = ups.find(u => new Date(u.ts) > new Date(d.ts));
          if (next) {
            const mins = (new Date(next.ts) - new Date(d.ts)) / 60000;
            if (mins > longestSleepMin && mins < 720) longestSleepMin = mins;
          }
        }
        return {
          label,
          totalFeeds: feeds.length,
          avgOzPerBottleFeed: bottleFeeds.length > 0
            ? Number((bottleFeeds.reduce((s, e) => s + e.oz, 0) / bottleFeeds.length).toFixed(1))
            : null,
          breastfeedSessions: feeds.filter(e => e.type === "breastfeed").length,
          diapersPerDay: Number((numDiapers / 7).toFixed(1)),
          dirtyPerDay: Number((dirtyDiapers / 7).toFixed(1)),
          sleepSessions: downs.length,
          longestSleepHours: longestSleepMin > 0 ? Number((longestSleepMin / 60).toFixed(1)) : null,
        };
      };

      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
      const stats = buildStats(sevenDaysAgo, now, "last 7 days");
      const priorStats = buildStats(fourteenDaysAgo, sevenDaysAgo, "prior 7 days (week before)");

      const ageStr = fmtAge(BIRTHDAY, now);

      const prompt = `You are helping prepare a structured summary for a pediatrician visit. Solène is ${ageStr} (born January 23, 2026). The parent has logged the following observations and stats over the period since the last doctor visit (or last 30 days if none).

OBSERVATIONS BY DATE:
${recentNotesData.map(n => `- ${n.date} ${n.time} [${n.category}]: ${n.text}`).join("\n") || "(no notes recorded)"}

FEEDING & CARE STATS — LAST 7 DAYS:
${JSON.stringify(stats, null, 2)}

FEEDING & CARE STATS — PRIOR 7 DAYS (the week before, for comparison):
${JSON.stringify(priorStats, null, 2)}

Please produce TWO outputs in JSON format:

1. "copyText": A concise plain-text summary suitable to paste into MyChart or email to the doctor before the visit. Group by topic (Feeding, Sleep, Skin, Development, Mood, Questions for doctor). Use bullets. Include only the most relevant observations — tighten and de-duplicate. WHERE NOTABLE, mention period-over-period changes (e.g. "feeds/day increased from X to Y", "longest sleep stretch grew from Xh to Yh"). End with 2-4 specific questions the parent might want to ask the doctor based on the patterns.

2. "htmlReport": A more detailed HTML report (no <html> or <body> wrapper, just inner content) organized by section with <h2>, <h3>, <ul>, <p> tags. Include all observations grouped by category, BOTH stats periods in a small table side-by-side for comparison, and a "Questions for the doctor" section. Style should be print-friendly. Use simple inline styles only where needed.

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
      // v05.05bt: build a structured local fallback from the stats we
      // already computed, rather than just alerting. Not as polished as
      // the LLM output but the parent walks into the appointment with
      // SOMETHING in hand. Period-over-period comparison is included.
      try {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
        const buildLocalStats = (start, end) => {
          const inWindow = events.filter(e => {
            const t = new Date(e.ts);
            return t >= start && t < end;
          });
          const feeds = inWindow.filter(e => e.type === "feed" || e.type === "breastfeed");
          const bottleFeeds = feeds.filter(e => e.oz && e.type === "feed");
          const numDiapers = inWindow.filter(e => e.type === "diaper").length;
          const dirtyDiapers = inWindow.filter(e => e.type === "diaper" && (e.notes === "dirty" || e.notes === "both")).length;
          const downs = inWindow.filter(e => e.type === "sleep_down").sort((a, b) => new Date(a.ts) - new Date(b.ts));
          const ups = inWindow.filter(e => e.type === "sleep_up").sort((a, b) => new Date(a.ts) - new Date(b.ts));
          let longestSleepMin = 0;
          for (const d of downs) {
            const next = ups.find(u => new Date(u.ts) > new Date(d.ts));
            if (next) {
              const mins = (new Date(next.ts) - new Date(d.ts)) / 60000;
              if (mins > longestSleepMin && mins < 720) longestSleepMin = mins;
            }
          }
          return {
            feedsPerDay: (feeds.length / 7).toFixed(1),
            bottleAvgOz: bottleFeeds.length > 0 ? (bottleFeeds.reduce((s, e) => s + e.oz, 0) / bottleFeeds.length).toFixed(1) : null,
            diapersPerDay: (numDiapers / 7).toFixed(1),
            dirtyPerDay: (dirtyDiapers / 7).toFixed(1),
            longestSleepHours: longestSleepMin > 0 ? (longestSleepMin / 60).toFixed(1) : null,
          };
        };
        const recent = buildLocalStats(sevenDaysAgo, now);
        const prior = buildLocalStats(fourteenDaysAgo, sevenDaysAgo);
        const arrow = (cur, p) => {
          if (cur == null || p == null) return "";
          const a = parseFloat(cur), b = parseFloat(p);
          if (Math.abs(a - b) / Math.max(0.1, b) < 0.05) return " (~no change)";
          return a > b ? ` (↑ from ${p})` : ` (↓ from ${p})`;
        };
        const recentNotesGrouped = {};
        for (const n of notes.filter(n => new Date(n.ts) >= cutoff)) {
          if (!recentNotesGrouped[n.category]) recentNotesGrouped[n.category] = [];
          recentNotesGrouped[n.category].push(n);
        }
        const noteSection = Object.keys(recentNotesGrouped).length === 0
          ? "(no notes recorded)"
          : Object.entries(recentNotesGrouped).map(([cat, ns]) =>
              `${cat.toUpperCase()}:\n${ns.slice(0, 5).map(n => `  • ${new Date(n.ts).toLocaleDateString()}: ${n.text}`).join("\n")}`
            ).join("\n\n");
        const ageStr = fmtAge(BIRTHDAY, now);
        const fallbackText = `SOLÈNE — visit prep summary
${ageStr} · prepared ${new Date().toLocaleDateString()}
(generated locally — AI summary unavailable)

==== FEEDING & CARE — LAST 7 DAYS ====
• Feeds/day: ${recent.feedsPerDay}${arrow(recent.feedsPerDay, prior.feedsPerDay)}
• Avg oz/bottle: ${recent.bottleAvgOz || "—"}${recent.bottleAvgOz && prior.bottleAvgOz ? arrow(recent.bottleAvgOz, prior.bottleAvgOz) : ""}
• Diapers/day: ${recent.diapersPerDay}${arrow(recent.diapersPerDay, prior.diapersPerDay)}
• Poo/day: ${recent.dirtyPerDay}${arrow(recent.dirtyPerDay, prior.dirtyPerDay)}
• Longest sleep stretch: ${recent.longestSleepHours ? recent.longestSleepHours + "h" : "—"}${recent.longestSleepHours && prior.longestSleepHours ? arrow(recent.longestSleepHours, prior.longestSleepHours) : ""}

==== OBSERVATIONS BY CATEGORY ====
${noteSection}

==== QUESTIONS FOR DOCTOR ====
(Ask the AI summary feature again later if you want refined questions — this fallback didn't have access to AI.)`;
        const fallbackHtml = `
<div style="font-family: serif; max-width: 700px;">
  <h2>Solène — visit prep summary</h2>
  <p><em>${ageStr} · prepared ${new Date().toLocaleDateString()}</em></p>
  <p style="background: #FFF8E1; padding: 8px; border-left: 3px solid #C49A3A; font-size: 13px;">
    ⚠ AI summary was unavailable; this report is generated locally from your stats. Try Generate again later for the polished version.
  </p>
  <h3>Feeding &amp; care · last 7 days vs prior 7 days</h3>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><th style="text-align: left; border-bottom: 1px solid #ccc; padding: 4px;">Metric</th>
        <th style="text-align: right; border-bottom: 1px solid #ccc; padding: 4px;">Last 7d</th>
        <th style="text-align: right; border-bottom: 1px solid #ccc; padding: 4px;">Prior 7d</th></tr>
    <tr><td style="padding: 4px;">Feeds/day</td><td style="text-align:right">${recent.feedsPerDay}</td><td style="text-align:right">${prior.feedsPerDay}</td></tr>
    <tr><td style="padding: 4px;">Avg oz/bottle</td><td style="text-align:right">${recent.bottleAvgOz || "—"}</td><td style="text-align:right">${prior.bottleAvgOz || "—"}</td></tr>
    <tr><td style="padding: 4px;">Diapers/day</td><td style="text-align:right">${recent.diapersPerDay}</td><td style="text-align:right">${prior.diapersPerDay}</td></tr>
    <tr><td style="padding: 4px;">Poo/day</td><td style="text-align:right">${recent.dirtyPerDay}</td><td style="text-align:right">${prior.dirtyPerDay}</td></tr>
    <tr><td style="padding: 4px;">Longest sleep</td><td style="text-align:right">${recent.longestSleepHours ? recent.longestSleepHours + "h" : "—"}</td><td style="text-align:right">${prior.longestSleepHours ? prior.longestSleepHours + "h" : "—"}</td></tr>
  </table>
  <h3>Observations</h3>
  ${Object.entries(recentNotesGrouped).map(([cat, ns]) =>
    `<h4>${cat}</h4><ul>${ns.slice(0, 8).map(n => `<li>${new Date(n.ts).toLocaleDateString()}: ${n.text.replace(/</g, "&lt;")}</li>`).join("")}</ul>`
  ).join("")}
</div>`;
        setDocSummary({
          generated: new Date().toISOString(),
          copyText: fallbackText,
          htmlReport: fallbackHtml,
          isFallback: true,
        });
        setShowSummary(true);
      } catch (fallbackErr) {
        console.error("Fallback summary build also failed:", fallbackErr);
        alert("Could not generate summary and the local fallback also failed. " + (err?.message || err));
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* Analytics & predictions */}
      <AnalyticsSection C={C} events={events} now={now} currentUser={currentUser} />

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
// ---- SleepWakeChart -----------------------------------------------------
// Renders sleep state as a binary signal over time:
//   y = 0 → asleep
//   y = 1 → awake
// Visualizes interruptions in sleep so the user can SEE how fragmented
// nights are. Default window is last 24h (single row); expandable to last
// 7 days (one row per day, stacked) for night-over-night comparison.
//
// Color follows the viewer (mauve for Mommy, blue for Daddy) so it harmonizes
// with the rest of the page chrome on each device.
//
// Inferred wakes (sleep_up with inferredFrom set) get a dotted edge marker
// so they're distinguishable from explicitly-logged wakes.
function SleepWakeChart({ C, events, now, currentUser }) {
  const [mode, setMode] = useState("24h"); // "24h" | "7d"
  // v05.05bt14: hover-to-inspect tooltip state. When the user hovers over
  // (or taps) a transition marker, we surface metadata: type, exact time,
  // duration of the resulting stretch, whether it was inferred. Stored as
  // { rowIdx, transitionIdx, x, y, content } so the popover knows where
  // to render.
  const [hovered, setHovered] = useState(null);
  // Global click-outside dismiss for taps on mobile. The marker's onClick
  // calls stopPropagation so this only fires when clicking elsewhere.
  useEffect(() => {
    if (!hovered) return;
    const handler = () => setHovered(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [hovered]);
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;

  // Build a chronological list of sleep transitions in the look-back window.
  // We'll pull a bit beyond the window so the trace at the left edge isn't
  // ambiguous about its starting state.
  const lookbackMs = mode === "24h" ? 24 * 3600000 : 7 * 86400000;
  const padMs = 6 * 3600000; // 6 hours of padding to find priorState
  const windowStart = new Date(now.getTime() - lookbackMs);
  const padStart = new Date(now.getTime() - lookbackMs - padMs);

  // All sleep events in [padStart, now], chronological.
  const sleepEvents = events
    .filter(e => (e.type === "sleep_down" || e.type === "sleep_up") &&
                 new Date(e.ts) >= padStart && new Date(e.ts) <= now)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));

  // Determine state at windowStart by looking at the latest event before it.
  const eventsBeforeWindow = sleepEvents.filter(e => new Date(e.ts) < windowStart);
  const startState = eventsBeforeWindow.length > 0
    ? (eventsBeforeWindow[eventsBeforeWindow.length - 1].type === "sleep_down" ? "asleep" : "awake")
    : "awake"; // assume awake if no recent prior state

  // Trace segments: list of { start, end, state, inferred }
  // We turn each sleep_down → sleep_up pair into an "asleep" segment, and
  // the gaps into "awake" segments. Pre-window state extends from windowStart.
  const segments = [];
  let cursorTime = windowStart;
  let cursorState = startState;
  let cursorInferred = false;

  const eventsInWindow = sleepEvents.filter(e => new Date(e.ts) >= windowStart);
  for (const e of eventsInWindow) {
    const t = new Date(e.ts);
    if (t > cursorTime) {
      segments.push({
        start: cursorTime,
        end: t,
        state: cursorState,
        inferred: cursorInferred,
      });
    }
    cursorTime = t;
    cursorState = e.type === "sleep_down" ? "asleep" : "awake";
    cursorInferred = !!e.inferredFrom;
  }
  // Final segment from last transition (or windowStart) to now
  if (cursorTime < now) {
    segments.push({
      start: cursorTime,
      end: now,
      state: cursorState,
      inferred: cursorInferred,
    });
  }

  // Mark transitions for ticks
  const transitions = eventsInWindow.map(e => ({
    ts: new Date(e.ts),
    type: e.type,
    inferred: !!e.inferredFrom,
    inferredFrom: e.inferredFrom || null,
  }));

  // Helper: given a date in [windowStart, now], return the X% along the strip.
  const xPct = (d) => {
    const ms = d.getTime() - windowStart.getTime();
    return Math.max(0, Math.min(100, (ms / lookbackMs) * 100));
  };

  // Stats for the eyebrow
  const totalAsleepMs = segments
    .filter(s => s.state === "asleep")
    .reduce((sum, s) => sum + (s.end.getTime() - s.start.getTime()), 0);
  const wakeInterruptions = segments
    .filter(s => s.state === "awake")
    .filter(s => {
      // Only count "real" interruptions inside what's clearly nighttime —
      // an awake gap surrounded by asleep on both sides. The first/last
      // awake gaps could be normal day-time waking.
      const idx = segments.indexOf(s);
      const before = segments[idx - 1];
      const after = segments[idx + 1];
      return before && before.state === "asleep" && after && after.state === "asleep";
    }).length;

  const fmtHours = (ms) => {
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // For 7d mode, split segments into per-day rows (each row = midnight→midnight
  // local). Easier to compare nights side by side.
  const renderRows = () => {
    if (mode === "24h") {
      return [{ label: "last 24h", segments, transitions, dayStart: windowStart }];
    }
    // 7d: 7 rows, one per day, each midnight→midnight local
    const rows = [];
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - dayOffset);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      // Clip to events within this day
      const daySegments = segments
        .filter(s => s.end > dayStart && s.start < dayEnd)
        .map(s => ({
          start: s.start < dayStart ? dayStart : s.start,
          end: s.end > dayEnd ? dayEnd : s.end,
          state: s.state,
          inferred: s.inferred,
        }));
      const dayTransitions = transitions.filter(t => t.ts >= dayStart && t.ts < dayEnd);
      const isToday = dayOffset === 0;
      const label = isToday ? "today"
        : dayOffset === 1 ? "yesterday"
        : dayStart.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      rows.push({ label, segments: daySegments, transitions: dayTransitions, dayStart, dayEnd, isToday });
    }
    return rows;
  };

  // Per-row x% calculation depends on mode (whole 24h vs day-anchored)
  const xPctForRow = (d, row) => {
    if (mode === "24h") return xPct(d);
    const rowStart = row.dayStart.getTime();
    const rowEnd = row.dayEnd.getTime();
    const ms = d.getTime() - rowStart;
    return Math.max(0, Math.min(100, (ms / (rowEnd - rowStart)) * 100));
  };

  const rows = renderRows();
  const nowPctIn24h = mode === "24h" ? 100 : null; // now is right edge in 24h mode
  // For 7d "today" row, place a now line at the actual position
  const nowPctTodayRow = mode === "7d" ? xPctForRow(now, rows[rows.length - 1]) : null;

  return (
    <div style={{
      background: C.paper, borderRadius: 12, padding: 14,
      border: `1px solid ${C.line}15`, marginBottom: 14,
    }}>
      {/* Header — title + window toggle */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 8, flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <div style={{
            fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
            color: C.muted, fontWeight: 600,
          }}>
            Sleep / wake trace
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 13, fontStyle: "italic", color: C.muted,
            marginTop: 2,
          }}>
            {mode === "24h" ? (
              <>
                {fmtHours(totalAsleepMs)} asleep · {wakeInterruptions} interruption{wakeInterruptions === 1 ? "" : "s"}
              </>
            ) : (
              <>night-over-night · 7 days</>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { v: "24h", l: "24h" },
            { v: "7d", l: "7d" },
          ].map(opt => (
            <button key={opt.v} onClick={() => setMode(opt.v)} style={{
              background: mode === opt.v ? C.ink : "transparent",
              color: mode === opt.v ? C.paper : C.ink,
              border: `1px solid ${C.line}33`,
              borderRadius: 16, padding: "4px 10px",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}>{opt.l}</button>
          ))}
        </div>
      </div>

      {/* Rows */}
      {rows.map((row, rowIdx) => {
        // Build the step-plot points for THIS row's segments. Each segment
        // contributes two points: (start, y) and (end, y) — the gap between
        // segments is the vertical transition. We'll render as an SVG path.
        const SVG_W = 1000; // viewBox width — actual rendered width is responsive
        const SVG_H = 80;
        const PAD_X = 4;
        const PAD_TOP = 10;
        const PAD_BOTTOM = 14;
        const yAt = (state) => state === "asleep"
          ? SVG_H - PAD_BOTTOM
          : PAD_TOP;
        const yAxisTop = PAD_TOP;
        const yAxisBottom = SVG_H - PAD_BOTTOM;
        const xAt = (d) => {
          const pct = xPctForRow(d, row);
          return PAD_X + (pct / 100) * (SVG_W - 2 * PAD_X);
        };

        // Build the path data
        let pathD = "";
        let areaD = "";
        if (row.segments.length > 0) {
          for (let i = 0; i < row.segments.length; i++) {
            const seg = row.segments[i];
            const x1 = xAt(seg.start);
            const x2 = xAt(seg.end);
            const y = yAt(seg.state);
            if (i === 0) {
              pathD += `M ${x1} ${y} `;
              areaD += `M ${x1} ${yAxisBottom} L ${x1} ${y} `;
            } else {
              const prevSeg = row.segments[i - 1];
              const prevY = yAt(prevSeg.state);
              // Vertical transition at this x
              pathD += `L ${x1} ${prevY} L ${x1} ${y} `;
              areaD += `L ${x1} ${prevY} L ${x1} ${y} `;
            }
            // Horizontal segment to the end of this segment
            pathD += `L ${x2} ${y} `;
            areaD += `L ${x2} ${y} `;
          }
          // Close the area shape
          areaD += `L ${xAt(row.segments[row.segments.length - 1].end)} ${yAxisBottom} Z`;
        }

        // Time gridlines — every 6h for 24h, every 6h within day for 7d
        const gridTimes = [];
        if (mode === "24h") {
          // Use rounded hours within the look-back window
          const tickStep = 6; // hours
          const startMs = windowStart.getTime();
          const startHour = new Date(startMs);
          startHour.setMinutes(0, 0, 0);
          // Round up to next 6h tick
          let curr = new Date(startHour);
          while (curr.getHours() % tickStep !== 0) curr.setHours(curr.getHours() + 1);
          while (curr <= now) {
            if (curr >= windowStart) gridTimes.push(new Date(curr));
            curr = new Date(curr.getTime() + tickStep * 3600000);
          }
        } else {
          // 7d: per-row, ticks at 6h, 12h, 18h
          const dayStart = row.dayStart;
          for (const h of [6, 12, 18]) {
            const t = new Date(dayStart);
            t.setHours(h, 0, 0, 0);
            gridTimes.push(t);
          }
        }

        return (
          <div key={rowIdx} style={{
            display: "flex", alignItems: "stretch", gap: 8,
            marginBottom: rowIdx === rows.length - 1 ? 0 : 6,
          }}>
            {/* Left label */}
            <div style={{
              width: mode === "7d" ? 76 : 60, flexShrink: 0,
              fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
              display: "flex", flexDirection: "column", justifyContent: "center",
              alignItems: "flex-end", paddingRight: 4,
            }}>
              {/* Y-axis ticks for this row */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "flex-end",
                fontSize: 9, color: C.muted, lineHeight: 1.2,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{ opacity: 0.7 }}>1 — awake</span>
                <span style={{ marginTop: 22, opacity: 0.7 }}>0 — asleep</span>
              </div>
              <div style={{
                fontSize: 10, color: C.ink, marginTop: 4, fontWeight: 500,
              }}>
                {row.label}
              </div>
            </div>
            {/* SVG step plot */}
            <div style={{
              flex: 1, position: "relative",
              background: `${C.line}05`,
              borderRadius: 4,
              border: `1px solid ${C.line}15`,
            }}>
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="none"
                style={{ width: "100%", height: 80, display: "block" }}>
                {/* Time gridlines */}
                {gridTimes.map((t, i) => {
                  const x = xAt(t);
                  return (
                    <line key={`grid-${i}`}
                      x1={x} y1={PAD_TOP - 2}
                      x2={x} y2={SVG_H - PAD_BOTTOM + 2}
                      stroke={C.line} strokeWidth={1} strokeOpacity={0.25}
                      strokeDasharray="2,2" />
                  );
                })}
                {/* Y-axis reference lines */}
                <line x1={PAD_X} y1={yAxisTop} x2={SVG_W - PAD_X} y2={yAxisTop}
                  stroke={C.line} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="2,3" />
                <line x1={PAD_X} y1={yAxisBottom} x2={SVG_W - PAD_X} y2={yAxisBottom}
                  stroke={C.line} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="2,3" />
                {/* Filled area under the trace */}
                {areaD && (
                  <path d={areaD} fill={viewerColor} fillOpacity={0.18} />
                )}
                {/* Trace line itself — sharp, viewer-colored */}
                {pathD && (
                  <path d={pathD} fill="none" stroke={viewerColor} strokeWidth={2.5}
                    strokeLinejoin="miter" strokeLinecap="square" />
                )}
                {/* Transition markers — small filled circles at each transition point.
                    v05.05bt14: each marker has a transparent larger hit-circle
                    on top for hover/tap tooltip support. Tooltip surfaces the
                    event time, type, duration of resulting stretch, and whether
                    the wake was inferred. */}
                {row.transitions.map((t, i) => {
                  const x = xAt(t.ts);
                  const isDown = t.type === "sleep_down";
                  const y = isDown ? yAxisBottom : yAxisTop;
                  const hoverKey = `${rowIdx}-${i}`;
                  const isHovered = hovered && hovered.key === hoverKey;
                  // Compute duration of the resulting stretch — find the
                  // next transition in the FULL events list (not just this
                  // row's slice) so the duration is correct even when the
                  // stretch crosses row boundaries (7d mode).
                  const tIdxFull = sleepEvents.findIndex(se =>
                    new Date(se.ts).getTime() === t.ts.getTime() && se.type === t.type
                  );
                  const nextEvent = tIdxFull >= 0 && tIdxFull < sleepEvents.length - 1
                    ? sleepEvents[tIdxFull + 1] : null;
                  const stretchEnd = nextEvent ? new Date(nextEvent.ts) : now;
                  const stretchMs = stretchEnd.getTime() - t.ts.getTime();
                  const stretchLabel = (() => {
                    const totalMin = Math.round(stretchMs / 60000);
                    const h = Math.floor(totalMin / 60);
                    const m = totalMin % 60;
                    if (h === 0) return `${m}m`;
                    if (m === 0) return `${h}h`;
                    return `${h}h ${m}m`;
                  })();
                  const ongoing = !nextEvent;
                  const tooltipContent = {
                    type: t.type,
                    inferred: t.inferred,
                    inferredFrom: t.inferredFrom,
                    timeStr: t.ts.toLocaleString(undefined, {
                      weekday: "short", hour: "numeric", minute: "2-digit",
                      hour12: true,
                    }),
                    stretchLabel,
                    ongoing,
                    isDown,
                  };
                  return (
                    <g key={`tick-${i}`}>
                      <circle cx={x} cy={y} r={isHovered ? 5 : 3.5}
                        fill={isDown ? viewerColor : C.gold}
                        stroke={C.paper} strokeWidth={1.5}
                        opacity={t.inferred ? 0.55 : 1}
                        style={{ transition: "r 0.15s" }} />
                      {t.inferred && (
                        <circle cx={x} cy={y} r={5}
                          fill="none" stroke={isDown ? viewerColor : C.gold}
                          strokeWidth={1} strokeDasharray="1.5,1.5" opacity={0.7} />
                      )}
                      {/* Invisible larger hit area for hover/tap */}
                      <circle cx={x} cy={y} r={12}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHovered({
                          key: hoverKey,
                          xPct: (x / SVG_W) * 100,
                          y: y,
                          isDown,
                          ...tooltipContent,
                        })}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          // On tap (mobile), toggle: if already showing this
                          // marker's tooltip, dismiss; else show it.
                          if (isHovered) setHovered(null);
                          else setHovered({
                            key: hoverKey,
                            xPct: (x / SVG_W) * 100,
                            y: y,
                            isDown,
                            ...tooltipContent,
                          });
                        }}
                      />
                    </g>
                  );
                })}
                {/* Now line — orange vertical with glow */}
                {mode === "24h" && rowIdx === 0 && (
                  <line x1={SVG_W - PAD_X} y1={2}
                    x2={SVG_W - PAD_X} y2={SVG_H - 2}
                    stroke={C.accent} strokeWidth={2.5} />
                )}
                {mode === "7d" && row.isToday && nowPctTodayRow !== null && (() => {
                  const x = PAD_X + (nowPctTodayRow / 100) * (SVG_W - 2 * PAD_X);
                  return (
                    <line x1={x} y1={2} x2={x} y2={SVG_H - 2}
                      stroke={C.accent} strokeWidth={2.5} />
                  );
                })()}
              </svg>
              {/* Hover/tap tooltip — renders only for this row when hovered.
                  Positioned at the marker's xPct, with a small offset and
                  arrow indicator. */}
              {hovered && hovered.key.startsWith(`${rowIdx}-`) && (() => {
                const placeAbove = !hovered.isDown; // wake markers at top → tooltip below; sleep markers at bottom → above
                const xPctClamped = Math.max(8, Math.min(92, hovered.xPct));
                return (
                  <div
                    style={{
                      position: "absolute",
                      left: `${xPctClamped}%`,
                      ...(placeAbove
                        ? { top: 8, transform: "translate(-50%, 100%)" }
                        : { bottom: 8, transform: "translate(-50%, -100%)" }),
                      background: C.ink,
                      color: C.paper,
                      padding: "6px 9px",
                      borderRadius: 6,
                      fontSize: 10,
                      lineHeight: 1.4,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      boxShadow: `0 2px 8px rgba(0,0,0,0.25)`,
                      zIndex: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                    <div style={{
                      fontWeight: 700, color: hovered.isDown ? viewerColor : C.gold,
                      letterSpacing: "0.04em", marginBottom: 2,
                    }}>
                      {hovered.isDown ? "↓ SLEEP DOWN" : "↑ WAKE UP"}
                      {hovered.inferred && (
                        <span style={{ marginLeft: 6, opacity: 0.7, fontStyle: "italic", fontWeight: 400 }}>
                          inferred
                        </span>
                      )}
                    </div>
                    <div style={{ opacity: 0.9 }}>
                      {hovered.timeStr}
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 2 }}>
                      {hovered.isDown ? "asleep for " : "awake for "}
                      <span style={{ fontWeight: 600 }}>{hovered.stretchLabel}</span>
                      {hovered.ongoing && <span style={{ opacity: 0.7 }}> · ongoing</span>}
                    </div>
                    {hovered.inferred && hovered.inferredFrom && (
                      <div style={{ opacity: 0.6, marginTop: 2, fontStyle: "italic" }}>
                        from {hovered.inferredFrom}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })}

      {/* Legend / explainer */}
      <div style={{
        marginTop: 10, fontSize: 10, color: C.muted, fontStyle: "italic",
        lineHeight: 1.5,
      }}>
        <span style={{ color: viewerColor, fontWeight: 600 }}>●</span> sleep down (drop to 0) ·
        <span style={{ color: C.gold, fontWeight: 600, marginLeft: 4 }}>●</span> wake up (rise to 1) ·
        dashed ring = inferred wake (not explicitly logged) ·
        <span style={{ color: C.accent, fontWeight: 600, marginLeft: 4 }}>|</span> now
      </div>
    </div>
  );
}

function AnalyticsSection({ C, events, now, currentUser }) {
  const [windowDays, setWindowDays] = useState(7);
  // Viewer color — used for chrome accents on cards that aren't tied to a
  // specific person (sleep prediction, sleep correlation, etc). On Mommy's
  // device this is rose; on Daddy's device it's blue. Per-person data
  // (Mommy's name, lactation flame, etc.) keeps its own color elsewhere.
  const viewerColor = currentUser === "Daddy" ? C.daddy : C.mommy;

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

    // === Per-session oz stats ===
    // Bottle/breast feeds with a usable oz value. Breastfeeds typically don't
    // have an oz directly; we estimate via duration × BF_OZ_PER_MIN_LOCAL
    // (the same 0.5 oz/min approximation used for daily totals; we redefine
    // it locally here since this scope can't see the chart's constant).
    // Skip any feed with zero oz so the median isn't pulled toward zero
    // by malformed events.
    const BF_OZ_PER_MIN_LOCAL = 1 / 5;
    const ozPerSession = allFeeds
      .map(f => {
        if (f.type === "breastfeed") {
          const m = f.totalDurationMin || 0;
          return m > 0 ? m * BF_OZ_PER_MIN_LOCAL : 0;
        }
        return f.oz || 0;
      })
      .filter(oz => oz > 0)
      .sort((a, b) => a - b);
    const medianOzPerSession = median(ozPerSession);
    const ozP25 = ozPerSession[Math.floor(ozPerSession.length * 0.25)] || 0;
    const ozP75 = ozPerSession[Math.floor(ozPerSession.length * 0.75)] || 0;
    const ozPerSessionCount = ozPerSession.length;
    // Age-norm comparison: status returns "below" / "in" / "above" the AAP
    // band so the wellness card can color-code at a glance.
    const ageMonthsForFeedNorm = (now - BIRTHDAY) / (1000 * 60 * 60 * 24 * 30.4375);
    const ageNormsForFeed = getAgeNorms(ageMonthsForFeedNorm);
    const ozPerSessionStatus = ageNormsForFeed?.ozPerFeed && medianOzPerSession > 0
      ? rangeStatus(medianOzPerSession, ageNormsForFeed.ozPerFeed)
      : null;
    const ozPerSessionNorm = ageNormsForFeed?.ozPerFeed || null;

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
      // Per-session oz stats — added v05.05bb
      medianOzPerSession,
      ozP25,
      ozP75,
      ozPerSessionCount,
      ozPerSessionStatus,
      ozPerSessionNorm,
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

      {/* Sleep / wake EKG-style trace — visualizes how fragmented sleep is.
          Asleep = bottom band (filled), awake = top region (subtle). Step
          transitions on each sleep_down/sleep_up. Toggle 24h / 7d.
          v05.05bt12: added per request — "kinda like an EKG so I can
          visually see how much interruptions in her sleep there are". */}
      <SleepWakeChart C={C} events={events} now={now} currentUser={currentUser} />

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
                  color: viewerColor, fontWeight: 700,
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
                  if (wet || dirty) return `${wet} pee · ${dirty} poo`;
                  return null;
                })()}
              />
              {/* Poo / day — separate metric from total diapers because
                  pediatric guidance treats stool frequency as a distinct
                  signal (lower bound is the concerning one — persistent
                  <1/day for FF babies is worth a pediatrician mention).
                  Only show if there's data and norm. */}
              {norms.pooPerDay && stats.dirtyPerDay != null && (() => {
                const pooStatus = rangeStatus(stats.dirtyPerDay, norms.pooPerDay);
                return (
                  <MetricCard
                    topic="Poo / day"
                    value={stats.dirtyPerDay.toFixed(1)}
                    numericValue={stats.dirtyPerDay}
                    range={norms.pooPerDay}
                    status={pooStatus}
                    note={`AAP norm ${norms.pooPerDay[0]}–${norms.pooPerDay[1]}/day`}
                  />
                );
              })()}
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
              {/* Oz per feed session vs age norm — added v05.05bb in
                  response to the user's specific ask. Median oz across
                  recent feed sessions, compared to AAP per-feed bands.
                  Status drives the color band (in / above / below). */}
              {stats.medianOzPerSession > 0 && stats.ozPerSessionNorm && (
                <MetricCard
                  topic="Oz per feed"
                  value={`${stats.medianOzPerSession.toFixed(1)} oz`}
                  numericValue={stats.medianOzPerSession}
                  range={stats.ozPerSessionNorm}
                  status={stats.ozPerSessionStatus}
                  note={
                    stats.ozP25 > 0 && stats.ozP75 > 0
                      ? `range ${stats.ozP25.toFixed(1)}–${stats.ozP75.toFixed(1)} oz · ${stats.ozPerSessionCount} sessions · AAP norm ${stats.ozPerSessionNorm[0]}–${stats.ozPerSessionNorm[1]} oz`
                      : `${stats.ozPerSessionCount} sessions · AAP norm ${stats.ozPerSessionNorm[0]}–${stats.ozPerSessionNorm[1]} oz`
                  }
                />
              )}
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

      {/* Predicted feed pattern — now includes amount in addition to interval.
          Displays median oz/session next to the median interval, with the
          IQR (P25–P75) range as soft secondary text. The next-feed line
          shows BOTH predicted time AND predicted amount, since Daddy
          needs to know how much to thaw/warm. */}
      {(stats.medianInterval > 0 || stats.medianOzPerSession > 0) && (
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
          {stats.medianInterval > 0 && (
            <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.55 }}>
              Solène typically feeds every <strong>{fmtDuration(stats.medianInterval)}</strong>
              <span style={{ color: C.muted, fontSize: 12 }}>
                {" "}(range {fmtDuration(stats.p25)}–{fmtDuration(stats.p75)})
              </span>
              {stats.medianOzPerSession > 0 && (
                <>
                  {", taking "}<strong>{stats.medianOzPerSession.toFixed(1)} oz</strong> per session
                  {stats.ozP25 > 0 && stats.ozP75 > 0 && (
                    <span style={{ color: C.muted, fontSize: 12 }}>
                      {" "}(range {stats.ozP25.toFixed(1)}–{stats.ozP75.toFixed(1)} oz)
                    </span>
                  )}
                </>
              )}
              .
            </div>
          )}
          {stats.predictedNextFeed && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              next feed predicted around {fmtTime12(stats.predictedNextFeed)}
              {stats.medianOzPerSession > 0 && (
                <> · ~{stats.medianOzPerSession.toFixed(1)} oz</>
              )}
            </div>
          )}
        </div>
      )}

      {/* Predicted sleep pattern — parallel to feed prediction. Uses the
          median wake window (time between waking and next sleep) plus the
          most recent wake event to estimate when she'll be ready for the
          next nap. Only shown when (a) we have wake-window data (≥3 samples)
          and (b) baby is currently awake (most recent sleep event is a
          sleep_up). If she's currently asleep we don't predict her next
          sleep — that's "next wake" territory which we cover via the
          on-duty card's "asleep for" tile. */}
      {stats.medianWakeWindow != null && stats.wakeWindowCount >= 3 && (() => {
        // Find most recent sleep event (down or up)
        const sleepEvents = events
          .filter(e => e.type === "sleep_down" || e.type === "sleep_up")
          .sort((a, b) => new Date(b.ts) - new Date(a.ts));
        const lastSleepEv = sleepEvents[0];
        // Only predict next sleep when she's currently AWAKE (last event is sleep_up)
        if (!lastSleepEv || lastSleepEv.type !== "sleep_up") return null;
        const wakeTs = new Date(lastSleepEv.ts);
        const predictedSleep = new Date(wakeTs.getTime() + stats.medianWakeWindow * 60000);
        const predictedSleepLow = new Date(wakeTs.getTime() + (stats.wakeWindowP25 || stats.medianWakeWindow) * 60000);
        const predictedSleepHigh = new Date(wakeTs.getTime() + (stats.wakeWindowP75 || stats.medianWakeWindow) * 60000);
        const minsUntil = Math.round((predictedSleep - now) / 60000);
        const overdue = minsUntil < -15;
        const dueSoon = minsUntil >= -15 && minsUntil <= 15;

        return (
          <div style={{
            background: `linear-gradient(135deg, ${viewerColor}15, ${C.paper})`,
            borderRadius: 12, padding: 14, marginBottom: 10,
            border: `1px solid ${viewerColor}33`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Moon size={13} color={viewerColor} />
              <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: viewerColor, fontWeight: 600 }}>
                Predicted sleep pattern
              </span>
            </div>
            <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.55 }}>
              Solène typically stays awake for <strong>{fmtDuration(stats.medianWakeWindow)}</strong>
              {stats.wakeWindowP25 != null && stats.wakeWindowP75 != null && (
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {" "}(range {fmtDuration(stats.wakeWindowP25)}–{fmtDuration(stats.wakeWindowP75)})
                </span>
              )}
              .
            </div>
            <div style={{
              fontSize: 12, marginTop: 6,
              fontFamily: "'JetBrains Mono', monospace",
              color: overdue ? C.accent : dueSoon ? C.gold : C.muted,
              fontWeight: overdue || dueSoon ? 600 : 400,
            }}>
              next sleep predicted around {fmtTime12(predictedSleep)}
              {(stats.wakeWindowP25 != null && stats.wakeWindowP75 != null) && (
                <span style={{ color: C.muted, fontWeight: 400 }}>
                  {" "}(window {fmtTime12(predictedSleepLow)}–{fmtTime12(predictedSleepHigh)})
                </span>
              )}
            </div>
            {overdue && (
              <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontStyle: "italic" }}>
                Past typical wake window — she may be overtired.
              </div>
            )}
            {dueSoon && (
              <div style={{ fontSize: 11, color: C.gold, marginTop: 4, fontStyle: "italic" }}>
                Approaching nap window — watch for sleep cues.
              </div>
            )}
          </div>
        );
      })()}

      {/* Sleep correlation analysis — added v05.05bd in response to user
          ask "what made her sleep the longest." Pulls features for each
          overnight stretch and compares the top-quartile longest against
          baseline. Filtered to ≥3h stretches starting 6pm-1am to keep
          naps out. Uses all-time data (not the 7-day stats window) since
          correlations need more sample.
          IMPORTANT: framed as DESCRIPTIVE associations, not causal claims.
          n is small, age is a confounder, reverse causality possible. */}
      {(() => {
        // Build feature-rich sleep stretches from full events history
        const sortedAll = events
          .filter(e => !e.silent)
          .sort((a, b) => new Date(a.ts) - new Date(b.ts));
        const allFeedsAll = sortedAll.filter(e => e.type === "feed" || e.type === "breastfeed");
        const allBaths = sortedAll.filter(e => e.type === "bath");
        const allSleepEvents = sortedAll.filter(e => e.type === "sleep_down" || e.type === "sleep_up");

        // Pair down→up
        const stretches = [];
        let openDown = null;
        let lastUp = null;
        for (const e of allSleepEvents) {
          if (e.type === "sleep_down") {
            openDown = e;
          } else if (e.type === "sleep_up" && openDown) {
            const downDate = new Date(openDown.ts);
            const upDate = new Date(e.ts);
            const mins = (upDate - downDate) / 60000;
            // Filter to plausible overnight stretches:
            //   ≥ 3 hours (180 min) → not a nap
            //   started 18:00–01:00 → bedtime, not a midday nap
            const downHour = downDate.getHours();
            const isOvernightWindow = downHour >= 18 || downHour < 2;
            if (mins >= 180 && mins < 720 && isOvernightWindow) {
              // Find last feed before sleep
              const lastFeedBefore = allFeedsAll
                .filter(f => new Date(f.ts) < downDate)
                .sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
              const lastFeedGapMin = lastFeedBefore
                ? (downDate - new Date(lastFeedBefore.ts)) / 60000
                : null;
              const feedType = lastFeedBefore
                ? (lastFeedBefore.type === "breastfeed" ? "breastfed direct"
                  : (lastFeedBefore.source || "").toLowerCase().includes("formula") &&
                    !(lastFeedBefore.source || "").toLowerCase().includes("bm")
                  ? "formula"
                  : (lastFeedBefore.source || "").toLowerCase().includes("formula") &&
                    (lastFeedBefore.source || "").toLowerCase().includes("bm")
                  ? "mixed"
                  : "BM bottle")
                : null;
              // Bath in the 90 min before sleep?
              const bathBefore = allBaths.some(b => {
                const bt = new Date(b.ts);
                return bt < downDate && (downDate - bt) / 60000 <= 90;
              });
              // Preceding wake window
              const lastUpBefore = lastUp;
              const wakeWindowMin = lastUpBefore
                ? (downDate - new Date(lastUpBefore.ts)) / 60000
                : null;
              // Bedtime clock — minutes-of-day, with overnight wrap so 11pm
              // and 12:30am sort together not at opposite ends
              const bedtimeMin = downHour * 60 + downDate.getMinutes();
              // For sorting we shift 0-2h to 24-26h so it reads correctly
              const bedtimeNorm = downHour < 6 ? bedtimeMin + 24 * 60 : bedtimeMin;
              stretches.push({
                downDate,
                upDate,
                mins,
                feedType,
                lastFeedGapMin,
                bathBefore,
                wakeWindowMin,
                bedtimeMin,
                bedtimeNorm,
              });
            }
            openDown = null;
          }
          if (e.type === "sleep_up") lastUp = e;
        }

        // Need at least 8 overnight stretches for the analysis to mean anything
        if (stretches.length < 8) {
          return (
            <div style={{
              background: C.paper, borderRadius: 12, padding: 14, marginBottom: 10,
              border: `1px solid ${C.line}15`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Search size={13} color={C.muted} />
                <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontWeight: 600 }}>
                  What helps her sleep longest
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", lineHeight: 1.55 }}>
                Need at least 8 overnight stretches to spot patterns. Currently {stretches.length} logged. Keep logging bedtimes (down + awake) and this card will fill in.
              </div>
            </div>
          );
        }

        // Sort by duration
        const byDuration = stretches.slice().sort((a, b) => b.mins - a.mins);
        // Top quartile: top 25% (rounded up to at least 3 for stability)
        const topN = Math.max(3, Math.ceil(byDuration.length * 0.25));
        const top = byDuration.slice(0, topN);
        const baseline = stretches; // compare top to ALL (top is included; that's fine)

        // Helper: rate of a categorical attribute in a sample
        const rateOf = (sample, predicate) => {
          if (sample.length === 0) return 0;
          return sample.filter(predicate).length / sample.length;
        };
        // Helper: median of a numeric attribute in a sample
        const medianOf = (sample, getter) => {
          const vals = sample.map(getter).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
          if (vals.length === 0) return null;
          return vals.length % 2 === 1
            ? vals[Math.floor(vals.length / 2)]
            : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2;
        };

        // === Feature comparisons ===
        // Categorical: feed type — compute distribution in top vs baseline
        const feedTypes = ["BM bottle", "breastfed direct", "formula", "mixed"];
        const feedTypeStats = feedTypes.map(ft => {
          const topRate = rateOf(top, s => s.feedType === ft);
          const baseRate = rateOf(baseline, s => s.feedType === ft);
          const lift = baseRate > 0 ? (topRate - baseRate) / baseRate : 0;
          const topCount = top.filter(s => s.feedType === ft).length;
          return { ft, topRate, baseRate, lift, topCount };
        }).filter(x => x.topCount > 0); // only show types that actually appear in top
        feedTypeStats.sort((a, b) => b.topRate - a.topRate);

        // Categorical: bath — was there a bath in 90m before sleep?
        const bathTopRate = rateOf(top, s => s.bathBefore);
        const bathBaseRate = rateOf(baseline, s => s.bathBefore);
        const bathLift = bathBaseRate > 0 ? (bathTopRate - bathBaseRate) / bathBaseRate : 0;
        const bathBaselineN = baseline.filter(s => s.bathBefore).length;

        // Continuous: feed → sleep gap (minutes)
        const topMedFeedGap = medianOf(top, s => s.lastFeedGapMin);
        const baseMedFeedGap = medianOf(baseline, s => s.lastFeedGapMin);
        // Continuous: bedtime clock
        const topMedBedtime = medianOf(top, s => s.bedtimeNorm);
        const baseMedBedtime = medianOf(baseline, s => s.bedtimeNorm);
        // Continuous: wake window before sleep
        const topMedWakeWin = medianOf(top, s => s.wakeWindowMin);
        const baseMedWakeWin = medianOf(baseline, s => s.wakeWindowMin);

        // Format mins-of-day → clock string, handling overnight overflow
        const fmtClockMin = (m) => {
          if (m == null) return "—";
          const wrapped = m % (24 * 60);
          const h = Math.floor(wrapped / 60);
          const min = Math.round(wrapped % 60);
          const ap = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${String(min).padStart(2, "0")} ${ap}`;
        };
        const fmtMinsHM = (m) => {
          if (m == null) return "—";
          const h = Math.floor(m / 60);
          const min = Math.round(m % 60);
          return h > 0 ? `${h}h ${min}m` : `${min}m`;
        };

        // === Auto-generated insights ===
        // Pull a few takeaway bullets — we want the user to walk away with
        // 1-3 things that look meaningfully different in the top quartile.
        const insights = [];

        // Feed type — which feed type appears at higher rate in top vs base?
        const topFeedType = feedTypeStats[0];
        if (topFeedType && topFeedType.lift > 0.2 && topFeedType.topCount >= 3) {
          insights.push({
            label: `${topFeedType.ft} before sleep`,
            detail: `${(topFeedType.topRate * 100).toFixed(0)}% of longest stretches followed ${topFeedType.ft}, vs ${(topFeedType.baseRate * 100).toFixed(0)}% on average.`,
            lift: topFeedType.lift,
          });
        }

        // Bath
        if (bathLift > 0.3 && bathBaselineN >= 3 && bathTopRate > 0.3) {
          insights.push({
            label: "bath before bed",
            detail: `${(bathTopRate * 100).toFixed(0)}% of longest stretches were preceded by a bath in the prior 90 min, vs ${(bathBaseRate * 100).toFixed(0)}% on average.`,
            lift: bathLift,
          });
        }

        // Feed gap
        if (topMedFeedGap != null && baseMedFeedGap != null) {
          const diff = topMedFeedGap - baseMedFeedGap;
          if (Math.abs(diff) >= 15) {
            insights.push({
              label: diff > 0 ? "longer gap from feed → sleep" : "shorter gap from feed → sleep",
              detail: `Top stretches: ${fmtMinsHM(topMedFeedGap)} between last feed and sleep. Average: ${fmtMinsHM(baseMedFeedGap)}.`,
              lift: diff > 0 ? 0.5 : -0.5,
            });
          }
        }

        // Bedtime
        if (topMedBedtime != null && baseMedBedtime != null) {
          const diff = topMedBedtime - baseMedBedtime;
          if (Math.abs(diff) >= 20) {
            insights.push({
              label: diff > 0 ? "later bedtime" : "earlier bedtime",
              detail: `Top stretches went down around ${fmtClockMin(topMedBedtime)}. Average bedtime: ${fmtClockMin(baseMedBedtime)}.`,
              lift: diff > 0 ? 0.5 : -0.5,
            });
          }
        }

        // Wake window
        if (topMedWakeWin != null && baseMedWakeWin != null) {
          const diff = topMedWakeWin - baseMedWakeWin;
          if (Math.abs(diff) >= 15) {
            insights.push({
              label: diff > 0 ? "longer last wake window" : "shorter last wake window",
              detail: `Top stretches were preceded by ${fmtMinsHM(topMedWakeWin)} of awake time. Average: ${fmtMinsHM(baseMedWakeWin)}.`,
              lift: diff > 0 ? 0.5 : -0.5,
            });
          }
        }

        const topMedDuration = medianOf(top, s => s.mins);
        const baseMedDuration = medianOf(baseline, s => s.mins);

        return (
          <div style={{
            background: `linear-gradient(135deg, ${viewerColor}10, ${C.paper})`,
            borderRadius: 12, padding: 14, marginBottom: 10,
            border: `1px solid ${viewerColor}33`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Search size={13} color={viewerColor} />
              <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: viewerColor, fontWeight: 600 }}>
                What helps her sleep longest
              </span>
            </div>

            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 12 }}>
              Looking at her top {topN} longest overnight stretches{" "}
              ({fmtMinsHM(topMedDuration)} median) vs all {baseline.length} overnight stretches{" "}
              ({fmtMinsHM(baseMedDuration)} median). Patterns that show up disproportionately in the top group:
            </div>

            {insights.length === 0 ? (
              <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.55, fontStyle: "italic" }}>
                Nothing stands out yet. Her best nights and average nights look similar across feed type, timing, bath, and wake window. That's actually a good sign — the routine is consistent.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{
                    background: C.paper, borderRadius: 8, padding: "10px 12px",
                    borderLeft: `3px solid ${ins.lift > 0 ? "#5C8E5C" : C.gold}`,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: ins.lift > 0 ? "#5C8E5C" : C.gold,
                      letterSpacing: "0.04em", textTransform: "lowercase",
                      marginBottom: 4,
                    }}>
                      {ins.lift > 0 ? "↑ " : "↓ "}{ins.label}
                    </div>
                    <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                      {ins.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detail breakdown — collapsed by default. Power-user view. */}
            <details style={{ marginTop: 12 }}>
              <summary style={{
                cursor: "pointer", fontSize: 10,
                color: C.muted, letterSpacing: "0.18em",
                textTransform: "uppercase", fontWeight: 600,
              }}>
                show all features
              </summary>
              <div style={{
                fontSize: 11, color: C.ink, lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 10, paddingLeft: 10,
                borderLeft: `2px solid ${C.line}15`,
              }}>
                {feedTypeStats.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ color: C.muted, marginBottom: 2 }}>feed type before sleep:</div>
                    {feedTypeStats.map(f => (
                      <div key={f.ft} style={{ paddingLeft: 8 }}>
                        {f.ft}: top {(f.topRate * 100).toFixed(0)}% / base {(f.baseRate * 100).toFixed(0)}%
                      </div>
                    ))}
                  </div>
                )}
                <div>feed → sleep gap: top {fmtMinsHM(topMedFeedGap)} / base {fmtMinsHM(baseMedFeedGap)}</div>
                <div>bedtime clock: top {fmtClockMin(topMedBedtime)} / base {fmtClockMin(baseMedBedtime)}</div>
                <div>preceding wake window: top {fmtMinsHM(topMedWakeWin)} / base {fmtMinsHM(baseMedWakeWin)}</div>
                <div>bath in 90m before: top {(bathTopRate * 100).toFixed(0)}% / base {(bathBaseRate * 100).toFixed(0)}%</div>
              </div>
            </details>

            {/* Honesty caveat — small but clear. */}
            <div style={{
              fontSize: 10, color: C.muted, fontStyle: "italic",
              marginTop: 12, lineHeight: 1.5,
            }}>
              Descriptive associations only — small sample (n={baseline.length}), and Solène's age is changing throughout. These point toward things to try, not what's <em>causing</em> the difference.
            </div>
          </div>
        );
      })()}

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
          { label: "morning", start: 6, end: 11, color: C.gold },
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

      {/* BM vs Formula split and Pump output trend moved to the Milk tab
          in v05.05ax — both are about supply/intake composition and feel
          more at home next to the bottle inventory than under "wellness."
          The DoctorView still computes the underlying stats (used in the
          doctor visit summary text), it just no longer renders the
          standalone cards here. */}

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

            {/* Insights row — drops 'longest' since the Longest stretch
                MetricCard at the top of the page already shows it with
                fuller context (AAP range, status). What stays is unique
                to this card: median stretch length and how many we have. */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8,
              padding: "10px 0",
              borderTop: `1px solid ${C.line}10`,
              borderBottom: `1px solid ${C.line}10`,
              marginBottom: 10,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  median stretch
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: C.ink, lineHeight: 1.2, marginTop: 2 }}>
                  {fmtDuration(stats.medianSleep)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 500 }}>
                  stretches logged
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: C.ink, lineHeight: 1.2, marginTop: 2 }}>
                  {stats.sleepCount}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", lineHeight: 1.5 }}>
              {stats.mainSleepDays} {stats.mainSleepDays === 1 ? "day" : "days"} of data — accuracy depends on logging both 'down' and 'awake'.
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
                background: "#D6BC85", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, minWidth: 0,
              }}>
                {(stats.diaperKinds.wet / total) > 0.18 && `pee ${stats.diaperKinds.wet}`}
              </div>
              <div style={{
                width: `${(stats.diaperKinds.dirty / total) * 100}%`,
                background: "#B8956A", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, minWidth: 0,
              }}>
                {(stats.diaperKinds.dirty / total) > 0.18 && `poo ${stats.diaperKinds.dirty}`}
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
              <strong>{stats.dirtyPerDay.toFixed(1)}</strong> poo diapers/day (counting both pee+poo) · about {(stats.dirtyRatio * 100).toFixed(0)}% of changes.
              {stats.dirtyPerDay >= 1 && stats.dirtyPerDay < 4 && " Within typical newborn range (1–4/day)."}
              {stats.dirtyPerDay < 1 && " Below typical — mention to pediatrician if persistent."}
            </div>
          </div>
        );
      })()}

      {/* Pump output trend was here — moved to the Milk tab in v05.05ax
          alongside BM vs Formula split. */}
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
      background: `linear-gradient(135deg, ${C.gold}22, ${C.paper})`,
      borderRadius: 14, padding: 18,
      border: `1px solid ${C.gold}55`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: C.gold, display: "flex", alignItems: "center", justifyContent: "center",
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
      {summary.isFallback && (
        <div style={{
          background: `${C.gold}15`,
          border: `1px solid ${C.gold}55`,
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          fontSize: 12, color: C.ink, lineHeight: 1.5,
        }}>
          <strong style={{ color: C.gold }}>⚠ Local fallback</strong> — AI summary was unavailable.
          This was built from your stats only. Try Generate again later for the polished version.
        </div>
      )}
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
