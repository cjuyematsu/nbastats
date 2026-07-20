// lib/articleSources.ts
//
// Shared shape and defensive parser for the articles.sources jsonb payload,
// rendered by app/articles/_components/ArticleSources.tsx.

export interface SourceLink {
  label: string;
  url: string;
}

// Rows seeded before this component shipped store the display text under
// "title", so both keys are accepted.
export function parseSources(json: unknown): SourceLink[] {
  if (!Array.isArray(json)) return [];
  const out: SourceLink[] = [];
  for (const entry of json) {
    if (!entry || typeof entry !== 'object') continue;
    const { label, title, url } = entry as Record<string, unknown>;
    const text = typeof label === 'string' ? label : typeof title === 'string' ? title : null;
    if (!text || typeof url !== 'string' || !/^https?:\/\//.test(url)) continue;
    out.push({ label: text, url });
  }
  return out;
}
