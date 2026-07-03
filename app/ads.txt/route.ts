// app/ads.txt/route.ts

export function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) {
    return new Response('Not found', { status: 404 });
  }
  const publisherId = clientId.replace(/^ca-/, '');
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
