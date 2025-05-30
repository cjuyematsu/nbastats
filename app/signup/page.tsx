// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if needed
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isErrorMessage, setIsErrorMessage] = useState(false); // New state for message type
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsErrorMessage(false); // Reset message type

    const { data, error: signUpError } = await supabase.auth.signUp({ // Renamed error to signUpError
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`, 
      },
    });

    setIsLoading(false);
    if (signUpError) {
      setMessage(`Error: ${signUpError.message}`);
      setIsErrorMessage(true);
    } else if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        setMessage(
          'User may already exist with an unconfirmed email. Please check your inbox to confirm, or try signing in.'
        );
        setIsErrorMessage(true); // This is more of a warning/error state for UI
      } 
      else if (data.session) { 
        setMessage('Sign up successful! Redirecting...');
        setIsErrorMessage(false);
        router.push('/'); 
      }
      else {
        setMessage(
          'Sign up successful! Please check your email to confirm your account.'
        );
        setIsErrorMessage(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white">
          Create Your Account
        </h1>
        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password (min. 6 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>
        {message && (
          <p className={`mt-4 text-center text-sm ${isErrorMessage ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {message}
          </p>
        )}
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/signin" className="font-medium text-sky-600 hover:text-sky-500 dark:hover:text-sky-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}