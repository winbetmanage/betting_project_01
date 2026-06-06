'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Toggle } from '@/components/ui/toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [adminLogin, setAdminLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (adminLogin && !password2) {
      setError('Second password is required for admin login');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, password2, adminLogin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.errors?.form?.[0] || 'Invalid credentials');
        return;
      }

      router.push(data.role === 'ADMIN' ? '/admin-dashboard' : '/user-dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link
            href="/user-dashboard"
            className="mb-8 block text-xl font-bold tracking-tight text-white"
          >
            WinBet
          </Link>

          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Access your account to place bets
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
            </div>

            <Toggle
              pressed={adminLogin}
              onPressedChange={setAdminLogin}
              label="Turn on Second password"
            />

            {adminLogin && (
              <div>
                <label
                  htmlFor="password2"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Second password
                </label>
                <input
                  id="password2"
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Enter second password"
                  className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primarycolor px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primarycolor hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden flex-1 items-center justify-center p-12 lg:flex">
        <img
          src="/images/winbetting.png"
          alt=""
          className="max-h-[70vh] w-full max-w-md rounded-xl object-contain"
        />
      </div>
    </div>
  );
}
