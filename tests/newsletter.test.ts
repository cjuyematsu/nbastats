// tests/newsletter.test.ts
//
// Covers the pure pieces of the newsletter: the email template builders (subject
// shape, article link, unsubscribe link presence, HTML escaping) and the
// one-shot send guard (published-only, already-sent unless forced).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfirmationEmail,
  buildArticleEmail,
  confirmUrl,
  unsubscribeUrl,
} from '@/lib/newsletterTemplates';
import { planNewsletterSend } from '@/lib/newsletter';

test('confirmation email carries the confirm link', () => {
  const { subject, html, text } = buildConfirmationEmail('tok-123');
  assert.match(subject, /confirm/i);
  const url = confirmUrl('tok-123');
  assert.ok(html.includes(url), 'html has confirm url');
  assert.ok(text.includes(url), 'text has confirm url');
});

test('article email has title, article link, and unsubscribe link', () => {
  const article = { title: 'The Best Duos', dek: 'A data deep-dive.', summary: null, slug: 'best-duos' };
  const { subject, html, text } = buildArticleEmail(article, 'unsub-abc');
  assert.match(subject, /The Best Duos/);
  assert.ok(html.includes('https://hoopsdata.net/articles/best-duos'), 'links to article');
  assert.ok(html.includes(unsubscribeUrl('unsub-abc')), 'html has unsubscribe url');
  assert.ok(text.includes('best-duos'), 'text links to article');
  assert.ok(text.includes(unsubscribeUrl('unsub-abc')), 'text has unsubscribe url');
});

test('article email falls back to summary when dek is missing and escapes HTML', () => {
  const article = { title: 'A & B <win>', dek: null, summary: 'Sum & body', slug: 's' };
  const { html } = buildArticleEmail(article, 'u');
  assert.ok(html.includes('A &amp; B &lt;win&gt;'), 'title escaped');
  assert.ok(html.includes('Sum &amp; body'), 'summary used and escaped');
});

test('send guard: only published articles may send', () => {
  const gate = planNewsletterSend({ status: 'draft', newsletter_sent_at: null });
  assert.equal(gate.ok, false);
  assert.ok(gate.ok === false && gate.status === 400);
});

test('send guard: refuses a second send unless forced', () => {
  const already = { status: 'published', newsletter_sent_at: '2026-07-08T00:00:00.000Z' };
  const blocked = planNewsletterSend(already);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.ok === false && blocked.status === 409);

  const forced = planNewsletterSend({ ...already, force: true });
  assert.equal(forced.ok, true);
});

test('send guard: first send on a published article is allowed', () => {
  const gate = planNewsletterSend({ status: 'published', newsletter_sent_at: null });
  assert.equal(gate.ok, true);
});
