// Aggregates request_logs to show what is burning Vercel Fluid CPU.
// Usage: node scripts/log-stats.mjs [sinceISO]   (default: last 24h)

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const f of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(path.join(root, f), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {}
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const since = process.argv[2] || new Date(Date.now() - 24 * 3600 * 1000).toISOString();

const rows = [];
let offset = 0;
while (true) {
  const r = await fetch(
    `${url}/rest/v1/request_logs?select=path,ua,is_bot,bot_name,blocked,created_at&created_at=gte.${since}&order=created_at.asc&limit=1000&offset=${offset}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!r.ok) { console.error('HTTP', r.status, await r.text()); process.exit(1); }
  const batch = await r.json();
  rows.push(...batch);
  if (batch.length < 1000) break;
  offset += 1000;
}

console.log(`rows since ${since}: ${rows.length}`);
const unblocked = rows.filter(r => !r.blocked);
const blocked = rows.filter(r => r.blocked);
console.log(`unblocked (paid renders): ${unblocked.length}, blocked (403, middleware-only cost): ${blocked.length}`);

function top(list, fn, n = 15) {
  const c = {};
  for (const r of list) { const k = fn(r) || '(none)'; c[k] = (c[k] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n);
}
const seg = p => '/' + (p || '').split('/')[1];
const KNOWN = /(googlebot|google-inspectiontool|googleother|adsbot|mediapartners|bingbot|applebot|duckduck|perplexitybot|oai-searchbot|chatgpt-user|gptbot|claudebot|claude-user|amzn-searchbot|amazonbot|meta-webindexer|meta-externalagent|bytespider|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|yandex|headlesschrome|facebookexternalhit)/i;
const uaShort = u => {
  if (!u) return '(none)';
  const hit = u.match(KNOWN);
  return hit ? hit[1].toLowerCase() : (/(bot|crawl|spider|scrape)/i.test(u) ? 'other-bot:' + u.slice(0, 60) : 'human/other');
};

console.log('\n== UNBLOCKED by UA class ==');
for (const [k, v] of top(unblocked, r => uaShort(r.ua))) console.log(String(v).padStart(6), k);
console.log('\n== UNBLOCKED by route segment ==');
for (const [k, v] of top(unblocked, r => seg(r.path))) console.log(String(v).padStart(6), k);
console.log('\n== UNBLOCKED BOT ua x segment (top 20) ==');
for (const [k, v] of top(unblocked.filter(r => r.is_bot), r => uaShort(r.ua) + '  ' + seg(r.path), 20)) console.log(String(v).padStart(6), k);
console.log('\n== BLOCKED by UA ==');
for (const [k, v] of top(blocked, r => uaShort(r.ua), 10)) console.log(String(v).padStart(6), k);
console.log('\n== per-hour volume (unblocked / blocked) ==');
const byHour = {};
for (const r of rows) { const h = r.created_at.slice(0, 13); byHour[h] ??= [0, 0]; byHour[h][r.blocked ? 1 : 0]++; }
for (const h of Object.keys(byHour).sort()) console.log(h, String(byHour[h][0]).padStart(6), String(byHour[h][1]).padStart(6));
