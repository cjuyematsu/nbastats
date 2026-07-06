// scripts/indexnow-submit.ts
//
// One-time / occasional full-site IndexNow push. Fetches the deployed sitemap
// (single source of truth, so it never drifts from app/sitemap.ts), extracts every
// <loc> URL, and submits them to IndexNow. Re-run after shipping a large batch of
// new pages.
//
//   npx tsx scripts/indexnow-submit.ts
//   SITEMAP_URL=https://hoopsdata.net/sitemap.xml npx tsx scripts/indexnow-submit.ts

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { submitToIndexNow } from '../lib/indexnow';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SITEMAP_URL = process.env.SITEMAP_URL ?? 'https://hoopsdata.net/sitemap.xml';

async function main() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) {
    throw new Error('No <loc> URLs found in sitemap.');
  }

  console.log(`Submitting ${urls.length} URLs from ${SITEMAP_URL} to IndexNow...`);
  await submitToIndexNow(urls);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
