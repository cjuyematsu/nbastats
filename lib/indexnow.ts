// lib/indexnow.ts
//
// IndexNow ping helper. The key is PUBLIC by design: engines verify domain
// ownership by fetching it at INDEXNOW_KEY_LOCATION, so it is not a secret and is
// safe to hardcode. Runs server-side (article publish, submit script); submissions
// never throw into the caller, so a failed ping can't fail a publish.

export const INDEXNOW_KEY = '9d0496adf3d4715b6a3fea3b5e478d79';
export const INDEXNOW_HOST = 'hoopsdata.net';
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10000;

async function postBatch(urlList: string[]): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList,
    }),
  });
  if (!res.ok) {
    console.error(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} urls`);
  }
}

export async function submitToIndexNow(urls: string[]): Promise<void> {
  const urlList = [...new Set(urls)].filter(Boolean);
  if (urlList.length === 0) return;
  try {
    for (let i = 0; i < urlList.length; i += MAX_URLS_PER_REQUEST) {
      await postBatch(urlList.slice(i, i + MAX_URLS_PER_REQUEST));
    }
  } catch (err) {
    console.error('IndexNow submission failed:', err);
  }
}
