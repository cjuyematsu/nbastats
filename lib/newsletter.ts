// lib/newsletter.ts
//
// Resend sending layer for the newsletter. Server-only (reads RESEND_API_KEY).
// Confirmation sends surface their failure to the caller (the subscribe route
// needs to tell the user their confirm email didn't go out); the article
// broadcast logs-and-continues per batch so one bad batch can't abort the rest.

import { Resend } from 'resend';
import {
  buildArticleEmail,
  buildConfirmationEmail,
  unsubscribeUrl,
  NEWSLETTER_HOST,
  type NewsletterArticle,
} from '@/lib/newsletterTemplates';

// Verified sending domain (see plan step 2). Swap once the domain is live.
const FROM = `HoopsData <newsletter@${NEWSLETTER_HOST}>`;
const BATCH_SIZE = 100; // Resend batch endpoint cap.

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is required to send email.');
  return new Resend(key);
}

/** Send the double opt-in confirmation. Throws on failure so the route can report it. */
export async function sendConfirmationEmail(email: string, confirmToken: string): Promise<void> {
  const { subject, html, text } = buildConfirmationEmail(confirmToken);
  const { error } = await client().emails.send({ from: FROM, to: email, subject, html, text });
  if (error) throw new Error(error.message);
}

export interface Recipient {
  email: string;
  unsubscribe_token: string;
}

export interface SendGateInput {
  status: string;
  newsletter_sent_at: string | null;
  force?: boolean;
}

export type SendGate =
  | { ok: true }
  | { ok: false; status: number; message: string };

/** Pure guard: only broadcast a published article once, unless forced. */
export function planNewsletterSend(input: SendGateInput): SendGate {
  if (input.status !== 'published') {
    return { ok: false, status: 400, message: 'Article is not published.' };
  }
  if (input.newsletter_sent_at && !input.force) {
    return { ok: false, status: 409, message: 'Newsletter already sent for this article.' };
  }
  return { ok: true };
}

/** Broadcast the article teaser to confirmed subscribers. Returns how many were sent. */
export async function sendArticleNewsletter(
  recipients: Recipient[],
  article: NewsletterArticle,
): Promise<number> {
  if (recipients.length === 0) return 0;
  const resend = client();
  let sent = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE).map((r) => {
      const { subject, html, text } = buildArticleEmail(article, r.unsubscribe_token);
      const unsub = unsubscribeUrl(r.unsubscribe_token);
      return {
        from: FROM,
        to: r.email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });
    try {
      const { error } = await resend.batch.send(batch);
      if (error) {
        console.error('Newsletter batch failed:', error.message);
        continue;
      }
      sent += batch.length;
    } catch (err) {
      console.error('Newsletter batch threw:', err);
    }
  }
  return sent;
}
