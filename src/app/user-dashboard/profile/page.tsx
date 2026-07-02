'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/common_components/Navbar';

type User = { id: string; email: string; username: string; affiliate_link?: string };

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data) {
          router.push('/login');
          return;
        }
        setUser(data);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetch('/api/user/balance')
      .then((r) => r.json())
      .then((data) => setBalance(Number(data.balance)))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleCopy() {
    if (!user?.username) return;
    const link = `${process.env.NEXT_PUBLIC_HOME_LINK}/signup?ref=${user.username}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-zinc-400">Loading...</p>
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primarycolor text-lg font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.username}</h1>
              <p className="text-sm text-zinc-400">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Email</span>
              <span className="text-sm text-white">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Username</span>
              <span className="text-sm text-white">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Balance</span>
              <span className="text-sm font-semibold text-primarycolor">
                ETB {balance?.toFixed(2) ?? '0.00'}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-sm font-medium text-zinc-300">Invite Friends</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Share this link and earn a bonus when they sign up and deposit
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={`${process.env.NEXT_PUBLIC_HOME_LINK}/signup?ref=${user.username}`}
                className="flex-1 truncate rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg bg-primarycolor px-3 py-2 text-xs font-medium text-white transition hover:brightness-90"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => router.push('/user-dashboard')}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              Back to Home
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
