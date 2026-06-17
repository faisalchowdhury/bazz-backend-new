/**
 * Bulk-import promo codes from a pipe-delimited file straight into MongoDB.
 *
 * Each non-empty line must look like:
 *   P2PW-BLGT-4985 | Website | $19.99 | 2 Months
 *   └ code            └ type     └ price   └ duration
 *
 * Price and duration are read PER LINE (dynamic) — nothing is hardcoded.
 * Duration units understood: Day(s), Week(s), Month(s), Year(s).
 *   Months → ×30, Weeks → ×7, Years → ×365, Days → ×1.
 *
 * Usage:
 *   npm run import:promo -- ./promo-codes.txt website_2026_06
 *      arg1 = path to the codes file (default ./promo-codes.txt)
 *      arg2 = batchId tag for reporting (optional)
 *
 * Duplicates (by unique `code` index) are skipped; the rest still insert.
 */

import fs from "fs";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { PromoCodeModel } from "../modules/promoCode/promoCode.model";

// Same workaround as server.ts — the default system resolver can't look up
// the Atlas mongodb+srv SRV record (querySrv ECONNREFUSED). Use Cloudflare DNS.
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const CHUNK_SIZE = 5000;

type ParsedCode = {
  code: string;
  type: "website" | "affiliate";
  priceCents: number;
  durationDays: number;
  label: string;
};

const UNIT_TO_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

const parseDuration = (raw: string): { days: number; label: string } => {
  // e.g. "2 Months", "30 Days", "1 Year"
  const m = raw.trim().match(/^(\d+)\s*([a-zA-Z]+)/);
  if (!m) throw new Error(`Cannot parse duration: "${raw}"`);
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase().replace(/s$/, ""); // months → month
  const perUnit = UNIT_TO_DAYS[unit];
  if (!perUnit) throw new Error(`Unknown duration unit: "${m[2]}"`);
  const unitLabel = unit.charAt(0).toUpperCase() + unit.slice(1); // Month
  return { days: n * perUnit, label: `${n}-${unitLabel} Plan` };
};

const parsePrice = (raw: string): number => {
  const cleaned = raw.replace(/[^0-9.]/g, ""); // "$19.99" → "19.99"
  const dollars = parseFloat(cleaned);
  if (Number.isNaN(dollars)) throw new Error(`Cannot parse price: "${raw}"`);
  return Math.round(dollars * 100); // → cents
};

const parseType = (raw: string): "website" | "affiliate" => {
  const t = raw.trim().toLowerCase();
  if (t === "website" || t === "affiliate") return t;
  throw new Error(`Unknown type: "${raw}" (expected Website or Affiliate)`);
};

const parseLine = (line: string): ParsedCode => {
  const parts = line.split("|").map((p) => p.trim());
  if (parts.length < 4) {
    throw new Error(`Expected 4 columns, got ${parts.length}: "${line}"`);
  }
  const [codeRaw, typeRaw, priceRaw, durationRaw] = parts;
  const type = parseType(typeRaw);
  const priceCents = parsePrice(priceRaw);
  const { days, label } = parseDuration(durationRaw);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1); // Website
  return {
    code: codeRaw.toUpperCase(),
    type,
    priceCents,
    durationDays: days,
    label: `${typeLabel} ${label}`, // e.g. "Website 2-Month Plan"
  };
};

async function main() {
  const filePath = path.resolve(process.argv[2] || "./promo-codes.txt");
  const batchId = process.argv[3] || undefined;

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`📄 Read ${lines.length} lines from ${filePath}`);

  // Parse + dedupe within the file
  const seen = new Set<string>();
  const docs: any[] = [];
  let parseErrors = 0;
  for (const [i, line] of lines.entries()) {
    try {
      const p = parseLine(line);
      if (seen.has(p.code)) continue;
      seen.add(p.code);
      docs.push({
        ...p,
        maxUses: 1,
        usedCount: 0,
        status: "active",
        batchId,
      });
    } catch (err: any) {
      parseErrors++;
      if (parseErrors <= 10) console.warn(`⚠️  line ${i + 1}: ${err.message}`);
    }
  }

  console.log(
    `✅ Parsed ${docs.length} unique codes (${parseErrors} parse errors)`,
  );
  if (!docs.length) throw new Error("Nothing to import.");

  await mongoose.connect(DATABASE_URL as string, { connectTimeoutMS: 10000 });
  console.log("🔌 Connected to MongoDB");

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    try {
      const res = await PromoCodeModel.insertMany(chunk, { ordered: false });
      inserted += res.length;
    } catch (err: any) {
      const ok = err?.result?.insertedCount ?? err?.insertedDocs?.length ?? 0;
      inserted += ok;
      skipped += chunk.length - ok; // duplicates / validation failures
    }
    console.log(
      `  …${Math.min(i + CHUNK_SIZE, docs.length)}/${docs.length} processed`,
    );
  }

  console.log("─────────────────────────────────────");
  console.log(`🎟️  Inserted: ${inserted}`);
  console.log(`↩️  Skipped (duplicates): ${skipped}`);
  if (batchId) console.log(`🏷️  batchId: ${batchId}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("☠️  Import failed:", err.message);
  process.exit(1);
});
