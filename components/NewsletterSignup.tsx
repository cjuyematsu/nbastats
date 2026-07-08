// components/NewsletterSignup.tsx
//
// Email-capture form for the article newsletter (double opt-in). Posts to
// /api/newsletter/subscribe, which emails a confirm link. Two variants: a dashed
// sky "card" (matches the "Next article drops…" callout on /articles) and a slim
// "compact" row for the site footer.

'use client';

import { useState } from 'react';

type Variant = 'card' | 'compact';

export default function NewsletterSignup({ variant = 'card' }: { variant?: Variant }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Try again.');
        return;
      }
      setStatus('ok');
      setEmail('');
      setMessage(
        data.alreadySubscribed
          ? "You're already subscribed."
          : 'Check your inbox to confirm your subscription.',
      );
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Try again.');
    }
  };

  const input = (
    <input
      type="email"
      inputMode="email"
      autoComplete="email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="you@example.com"
      aria-label="Email address"
      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
    />
  );

  const button = (
    <button
      type="submit"
      disabled={status === 'loading'}
      className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
    </button>
  );

  const messageEl = message && (
    <p
      className={`mt-2 text-sm ${
        status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
      }`}
    >
      {message}
    </p>
  );

  if (variant === 'compact') {
    return (
      <form onSubmit={submit}>
        <div className="flex gap-2">
          <div className="flex-1">{input}</div>
          {button}
        </div>
        {messageEl}
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 px-4 py-4">
      <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
        Get an email when a new article drops
      </p>
      <p className="mt-0.5 mb-3 text-sm text-sky-700 dark:text-sky-300">
        A short summary and a link, straight to your inbox. No spam, unsubscribe anytime.
      </p>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:max-w-md">
        <div className="flex-1">{input}</div>
        {button}
      </form>
      {messageEl}
    </div>
  );
}
