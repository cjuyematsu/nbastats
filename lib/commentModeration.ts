// lib/commentModeration.ts
//
// Pure, server-side content check for article comments. Uses the `obscenity`
// word-list matcher (handles leetspeak/obfuscation, low false-positive rate) to
// gate comments before they are written. Keep this importable and side-effect
// free so it stays unit-testable; it holds no secrets but is only wired into the
// server route so the word list is not shipped to the browser.

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const MAX_COMMENT_LENGTH = 2000;

// Returns null if the comment is acceptable, or a short user-facing reason to block it.
export function checkComment(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return 'Comment is empty.';
  if (trimmed.length > MAX_COMMENT_LENGTH) return 'Comment is too long.';
  if (matcher.hasMatch(trimmed)) return 'Please keep it civil. That comment was blocked.';
  return null;
}
