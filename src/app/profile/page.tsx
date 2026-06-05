'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/common_components/Navbar';

type User = { id: string; email: string; username: string };

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
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
                $0.00
              </span>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Link
              href="/user-dashboard"
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              Back to Games
            </Link>
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
