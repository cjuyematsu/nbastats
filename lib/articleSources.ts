// lib/articleSources.ts
//
// Shared shape and defensive parser for the articles.sources jsonb payload,
// rendered by app/articles/_components/ArticleSources.tsx.

export interface SourceLink {
  label: string;
  url: string;
}

export function parseSources(json: unknown): SourceLink[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (s): s is SourceLink =>
      !!s &&
      typeof s === 'object' &&
      typeof (s as SourceLink).label === 'string' &&
      typeof (s as SourceLink).url === 'string' &&
      /^https?:\/\//.test((s as SourceLink).url),
  );
}
