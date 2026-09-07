// One-off maintenance script: repair image URLs stored by the upload endpoint
// while the API ran behind Render's TLS proxy without `trust proxy`.
//
// The bug: uploadController built URLs with `req.protocol`, which reported
// "http" behind the proxy, so DB rows hold URLs like
//   http://fast-food-xxxx.onrender.com/uploads/<file>.jpg
// Those are mixed content on the HTTPS frontend (PageSpeed: "Does not use
// HTTPS") — and once Render's ephemeral disk wipes /uploads on a redeploy they
// also 404 (PageSpeed: "Browser errors were logged to the console").
//
// Usage (from backend/):
//   node scripts/fix-upload-urls.mjs              # DRY RUN — prints planned changes
//   node scripts/fix-upload-urls.mjs --apply      # upgrade stored http:// → https://
//   node scripts/fix-upload-urls.mjs --apply --drop-dead
//       additionally HEAD-checks every stored /uploads/ URL against the live
//       API (retrying through Render cold starts) and CLEARS references to
//       files that no longer exist, so the frontend shows its normal
//       fallbacks and the console 404s go away.
//
// Requires MONGODB_URI in backend/.env (the same connection the API uses).

import "dotenv/config";
import mongoose from "mongoose";
import Restaurant from "../src/models/Restaurant.js";
import MenuItem from "../src/models/MenuItem.js";
import User from "../src/models/User.js";
import Review from "../src/models/Review.js";

const APPLY = process.argv.includes("--apply");
const DROP_DEAD = process.argv.includes("--drop-dead");

if (!process.env.MONGODB_URI) {
  console.error("✗ MONGODB_URI is required — set it in backend/.env");
  process.exit(1);
}

/** http://…/uploads/… → https://…/uploads/… (leaves everything else untouched) */
const toHttps = (url) =>
  typeof url === "string" && url.startsWith("http://") && url.includes("/uploads/")
    ? `https://${url.slice("http://".length)}`
    : url;

const LOCATIONS = [
  { model: Restaurant, fields: [{ field: "banner", type: "string" }, { field: "photos", type: "array" }] },
  { model: MenuItem, fields: [{ field: "image", type: "string" }] },
  { model: User, fields: [{ field: "avatar", type: "string" }] },
  { model: Review, fields: [{ field: "photos", type: "array" }] },
];

let upgradedCount = 0;

async function upgradeHttps() {
  for (const { model, fields } of LOCATIONS) {
    for (const { field, type } of fields) {
      // Matches docs where the string — or any array element — starts with http://
      const docs = await model.find({ [field]: /^http:\/\//i });
      for (const doc of docs) {
        const before = doc[field];
        const after = type === "array" ? before.map(toHttps) : toHttps(before);
        const changed = type === "array" ? after.some((v, i) => v !== before[i]) : after !== before;
        if (!changed) continue;
        upgradedCount += 1;
        console.log(`  ${model.modelName} ${doc._id} · ${field}\n    ${before}  →  ${after}`);
        if (APPLY) {
          doc[field] = after;
          await doc.save();
        }
      }
    }
  }
}

/** HEAD the URL with retries — Render free-tier instances cold-start (~30-60s). */
async function urlExists(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return true;
    } catch {
      /* network hiccup — retry */
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 4000));
  }
  return false;
}

async function checkDeadFiles() {
  // Collect every stored /uploads/ URL and where it is referenced.
  const byUrl = new Map();
  for (const { model, fields } of LOCATIONS) {
    const query = { $or: fields.map(({ field }) => ({ [field]: /\/uploads\// })) };
    for (const doc of await model.find(query)) {
      for (const { field, type } of fields) {
        const values = type === "array" ? doc[field] || [] : [doc[field]];
        for (const value of values) {
          if (typeof value !== "string" || !value.includes("/uploads/")) continue;
          const url = toHttps(value);
          if (!byUrl.has(url)) byUrl.set(url, []);
          byUrl.get(url).push({ model, id: doc._id, field, type });
        }
      }
    }
  }

  if (byUrl.size === 0) return console.log("\nNo /uploads/ URLs stored — nothing to check.");

  console.log(`\nChecking ${byUrl.size} stored uploads URL(s) for dead files…`);
  for (const [url, refs] of byUrl) {
    const exists = await urlExists(url);
    console.log(`  ${exists ? "✓ ok " : "✗ DEAD"} ${url}${exists ? "" : ` (${refs.length} reference(s))`}`);
    if (!exists && APPLY && DROP_DEAD) {
      for (const ref of refs) {
        const doc = await ref.model.findById(ref.id);
        if (!doc) continue;
        if (ref.type === "string") doc[ref.field] = "";
        else doc[ref.field] = (doc[ref.field] || []).filter((v) => toHttps(v) !== url);
        await doc.save();
      }
      console.log(`    → cleared ${refs.length} stale reference(s); the frontend shows its fallback image instead`);
    }
  }
}

await mongoose.connect(process.env.MONGODB_URI);
console.log(`✓ Connected — mode: ${APPLY ? "APPLY" : "DRY RUN (pass --apply to write changes)"}\n`);

await upgradeHttps();
console.log(`\nhttps upgrades ${APPLY ? "applied" : "planned"}: ${upgradedCount}`);

if (process.argv.includes("--check-dead") || DROP_DEAD) await checkDeadFiles();

await mongoose.disconnect();
console.log("\n✓ Done");
