// lib/newsletterTemplates.ts
//
// Pure builders for the newsletter emails. No I/O and no Resend import, so they
// stay unit-testable (tests/newsletter.test.ts). The HTML is intentionally
// inline/simple (no @react-email) to keep the dependency surface minimal.

export const NEWSLETTER_HOST = 'hoopsdata.net';
const BASE_URL = `https://${NEWSLETTER_HOST}`;

// CAN-SPAM: every commercial email needs an unsubscribe path and an
// identifying line. Keep this in one place so both templates share it.
const SENDER_NAME = 'HoopsData';
const SENDER_LINE = 'HoopsData &middot; NBA stats, comparisons, and trivia. Not affiliated with the NBA.';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface NewsletterArticle {
  title: string;
  dek: string | null;
  summary: string | null;
  slug: string;
}

export function confirmUrl(token: string): string {
  return `${BASE_URL}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

export function unsubscribeUrl(token: string): string {
  return `${BASE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(bodyHtml: string, footerHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:24px 32px;">
          <a href="${BASE_URL}" style="font-size:18px;font-weight:700;color:#0284c7;text-decoration:none;">
            <img src="${BASE_URL}/logo2.png" width="32" height="32" alt="" style="vertical-align:middle;border:0;" />
            <span style="vertical-align:middle;margin-left:8px;">HoopsData</span>
          </a>
        </td></tr>
        <tr><td style="padding:0 32px 28px;color:#0f172a;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
          ${footerHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:11px 22px;border-radius:8px;">${label}</a>`;
}

export function buildConfirmationEmail(token: string): EmailContent {
  const url = confirmUrl(token);
  const subject = 'Confirm your HoopsData subscription';
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;">Confirm your subscription</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
      Tap the button below to start getting an email whenever a new HoopsData article drops.
      If you didn't request this, you can ignore this message.
    </p>
    <p style="margin:0 0 8px;">${button(url, 'Confirm subscription')}</p>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;word-break:break-all;">
      Or paste this link into your browser: ${url}
    </p>`;
  const footer = SENDER_LINE;
  const text = `Confirm your ${SENDER_NAME} subscription\n\nConfirm here: ${url}\n\nIf you didn't request this, ignore this email.`;
  return { subject, html: shell(body, footer), text };
}

export function buildArticleEmail(
  article: NewsletterArticle,
  unsubToken: string,
): EmailContent {
  const url = `${BASE_URL}/articles/${encodeURIComponent(article.slug)}`;
  const unsub = unsubscribeUrl(unsubToken);
  const teaser = (article.dek || article.summary || '').trim();
  const subject = `New on HoopsData: ${article.title}`;
  const body = `
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#0284c7;">New article</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${escapeHtml(article.title)}</h1>
    ${teaser ? `<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(teaser)}</p>` : ''}
    <p style="margin:0;">${button(url, 'Read on HoopsData')}</p>`;
  const footer = `${SENDER_LINE}<br/>
    You're getting this because you subscribed to HoopsData article updates.
    <a href="${unsub}" style="color:#64748b;">Unsubscribe</a>.`;
  const text = `New on ${SENDER_NAME}: ${article.title}\n\n${teaser ? teaser + '\n\n' : ''}Read it: ${url}\n\nUnsubscribe: ${unsub}`;
  return { subject, html: shell(body, footer), text };
}
