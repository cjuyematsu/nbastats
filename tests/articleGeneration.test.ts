import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleSources,
  deriveGrounding,
  estimateCostUsd,
  extractArticleJson,
  KAGGLE_DATASET_SOURCE,
  slugify,
  validateArticleDraft,
  type ArticleDraft,
  type ToolLogEntry,
} from '../lib/articleGeneration';

const toolLog: ToolLogEntry[] = [
  {
    name: 'search_players',
    input: { query: 'kevin durant' },
    output: [{ personId: 201142, name: 'Kevin Durant', startYear: 2008, endYear: 2026, active: true }],
  },
  {
    name: 'get_player_career_stats',
    input: { person_id: 201142, scope: 'regular' },
    output: [{ person_id: 201142, pts_per_g: 27.2 }],
  },
];

function makeDraft(overrides: Partial<ArticleDraft> = {}): ArticleDraft {
  const paragraph =
    'Kevin Durant averaged 27.2 points per game across his career, a number that holds up in any era. '.repeat(
      12,
    );
  return {
    title: 'Kevin Durant Changes Teams Again',
    dek: 'What the database says about the latest move.',
    summary: 'Career numbers behind the latest Kevin Durant trade.',
    slug: 'kevin-durant-changes-teams-again',
    body_markdown: `${paragraph}\n\n## The numbers\n\n${paragraph}\n\nSee [his page](/player/201142).\n\nAll stats from the Hoops Data database, current through the 2026 Finals.`,
    web_sources: [{ label: 'ESPN, trade report', url: 'https://www.espn.com/nba/story' }],
    ...overrides,
  };
}

test('slugify strips punctuation, lowercases, caps length', () => {
  assert.equal(slugify("Shaquille O'Neal's Big Year!"), 'shaquille-oneals-big-year');
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
  assert.ok(slugify('x'.repeat(200)).length <= 60);
  assert.equal(slugify('Luka Dončić rises'), 'luka-doncic-rises');
});

test('extractArticleJson handles fenced, bare, and garbage input', () => {
  const obj = { title: 'T', dek: 'd', summary: 's', slug: 't', body_markdown: 'b', web_sources: [] };
  const fenced = 'Here you go:\n```json\n' + JSON.stringify(obj) + '\n```';
  assert.equal(extractArticleJson(fenced)?.title, 'T');
  assert.equal(extractArticleJson(JSON.stringify(obj))?.title, 'T');
  assert.equal(extractArticleJson('no json here at all'), null);
  const missingSlug = { title: 'My Title', body_markdown: 'b' };
  assert.equal(extractArticleJson(JSON.stringify(missingSlug))?.slug, 'my-title');
});

test('validateArticleDraft passes a clean draft', () => {
  const result = validateArticleDraft(makeDraft(), toolLog, ['other-slug']);
  assert.deepEqual(result.errors, []);
  assert.ok(result.ok);
});

test('validateArticleDraft rejects style violations', () => {
  const emoji = validateArticleDraft(
    makeDraft({ body_markdown: makeDraft().body_markdown + ' 🏀' }),
    toolLog,
    [],
  );
  assert.ok(emoji.errors.some((e) => e.includes('emoji')));

  const dash = validateArticleDraft(makeDraft({ dek: 'A move – and a big one.' }), toolLog, []);
  assert.ok(dash.errors.some((e) => e.includes('dash')));

  const short = validateArticleDraft(makeDraft({ body_markdown: 'Too short.' }), toolLog, []);
  assert.ok(short.errors.some((e) => e.includes('too short')));

  const collision = validateArticleDraft(makeDraft(), toolLog, ['kevin-durant-changes-teams-again']);
  assert.ok(collision.errors.some((e) => e.includes('collision')));
});

test('validateArticleDraft rejects ungrounded and disallowed links', () => {
  const ungrounded = validateArticleDraft(
    makeDraft({
      body_markdown: makeDraft().body_markdown.replace('/player/201142', '/player/999999'),
    }),
    toolLog,
    [],
  );
  assert.ok(ungrounded.errors.some((e) => e.includes('ungrounded')));

  const disallowed = validateArticleDraft(
    makeDraft({ body_markdown: makeDraft().body_markdown + '\n[admin](/articles/review-x)\n[bad](/signin)' }),
    toolLog,
    [],
  );
  assert.ok(disallowed.errors.some((e) => e.includes('/signin')));
});

test('validateArticleDraft flags legend language near active players only', () => {
  const flagged = validateArticleDraft(
    makeDraft({
      body_markdown: makeDraft().body_markdown + '\n\nDurant is a legend of the modern game.',
    }),
    toolLog,
    [],
  );
  assert.ok(flagged.errors.some((e) => e.includes('legend language')));

  const retiredLog: ToolLogEntry[] = [
    {
      name: 'search_players',
      input: { query: 'dirk' },
      output: [{ personId: 1717, name: 'Dirk Nowitzki', startYear: 1999, endYear: 2019, active: false }],
    },
    { name: 'get_player_career_stats', input: { person_id: 201142, scope: 'regular' }, output: [] },
  ];
  const retired = validateArticleDraft(
    makeDraft({
      body_markdown: makeDraft().body_markdown + '\n\nDirk Nowitzki is a legend in Dallas.',
    }),
    retiredLog,
    [],
  );
  assert.ok(!retired.errors.some((e) => e.includes('legend language')));
});

test('deriveGrounding collects ids from inputs and outputs', () => {
  const grounding = deriveGrounding(toolLog);
  assert.ok(grounding.playerIds.has(201142));
  assert.deepEqual(grounding.activePlayers, ['Kevin Durant']);
});

test('assembleSources prepends fixed entries, dedupes hosts, caps', () => {
  const sources = assembleSources([
    { label: 'ESPN one', url: 'https://www.espn.com/a' },
    { label: 'ESPN two', url: 'https://espn.com/b' },
    { label: 'Athletic', url: 'https://theathletic.com/x' },
    { label: 'broken', url: 'not a url' },
  ]);
  assert.equal(sources[0], KAGGLE_DATASET_SOURCE);
  assert.equal(sources.length, 4);
  assert.ok(sources.some((s) => s.label === 'ESPN one'));
  assert.ok(!sources.some((s) => s.label === 'ESPN two'));
});

test('estimateCostUsd applies opus pricing', () => {
  const cost = estimateCostUsd([
    { input_tokens: 1_000_000, output_tokens: 0 },
    { input_tokens: 0, output_tokens: 100_000 },
  ]);
  assert.equal(cost, 7.5);
});
