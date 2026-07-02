'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    referrerUsername: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setForm((f) => ({ ...f, referrerUsername: ref }));
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string[]> = {};

    if (!form.email) fieldErrors.email = ['Email is required'];
    if (!form.username) fieldErrors.username = ['Username is required'];
    if (!form.password) fieldErrors.password = ['Password is required'];
    if (form.password.length > 0 && form.password.length < 8)
      fieldErrors.password = ['Password must be at least 8 characters'];
    if (form.password !== form.confirmPassword)
      fieldErrors.confirmPassword = ['Passwords do not match'];

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          password: form.password,
          ...(form.referrerUsername.trim()
            ? { referrerUsername: form.referrerUsername.trim() }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors || { form: ['Something went wrong'] });
        return;
      }

      router.push('/login');
    } catch {
      setErrors({ form: ['Network error. Please try again.'] });
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

          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Join WinBet and start betting
          </p>

          {errors.form && (
            <div className="mt-4 rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">
              {errors.form[0]}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.username[0]}
                </p>
              )}
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
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.password[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-300"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword[0]}
                </p>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <label
                htmlFor="referrerUsername"
                className="block text-sm font-medium text-zinc-400"
              >
                Referral username (optional)
              </label>
              <input
                id="referrerUsername"
                type="text"
                placeholder="Who referred you?"
                value={form.referrerUsername}
                onChange={(e) =>
                  setForm({ ...form, referrerUsername: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primarycolor focus:outline-none focus:ring-1 focus:ring-primarycolor"
              />
              {errors.referrerUsername && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.referrerUsername[0]}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primarycolor px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primarycolor hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden flex-1 lg:block">
        <img
          src="/images/winbetting.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
