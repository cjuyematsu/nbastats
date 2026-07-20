// lib/articleMethodology.ts
//
// Which articles carry the "How this article was made" disclosure.
//
// The three former /analysis/* pages were hand built before the drafting workflow
// existed, so the disclosure would misdescribe them. Everything else (the weekly
// articles and anything published from here on) is workflow drafted.

const HAND_BUILT_COMPONENT_KEYS = new Set([
  'growth-of-nba',
  'draft-points',
  'salary-vs-points',
]);

export function isWorkflowDrafted(componentKey: string | null | undefined): boolean {
  return !componentKey || !HAND_BUILT_COMPONENT_KEYS.has(componentKey);
}
