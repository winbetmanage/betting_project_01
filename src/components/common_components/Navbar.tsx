'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type User = { id: string; email: string; username: string; role: string };

const navLinks = [
  { href: '/user-dashboard', label: 'Home' },
  { href: '/user-dashboard', label: 'Games' },
  { href: '/user-dashboard/balance', label: 'Balance' },
  { href: '/profile', label: 'Profile' },
];

const sidebar = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  exit: { x: '-100%', transition: { duration: 0.2 } },
};

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 sm:hidden"
              aria-label="Open menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 5h14" />
                <path d="M3 10h14" />
                <path d="M3 15h14" />
              </svg>
            </button>
          )}

          <Link href="/user-dashboard">
            <img
              src="/images/winbetlogo.png"
              alt="WinBet"
              className="h-8 w-auto"
            />
          </Link>
        </div>

        {user && (
          <nav className="hidden items-center gap-6 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition ${
                  pathname === link.href
                    ? 'text-primarycolor'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {!loading && !user && (
          <Link
            href="/login"
            className="rounded-lg bg-primarycolor px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-90"
          >
            Login
          </Link>
        )}

        {user && (
          <span className="hidden text-sm text-zinc-500 sm:block">
            {user.username}
          </span>
        )}
      </div>

      <AnimatePresence>
        {menuOpen && user && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black sm:hidden"
            />

            <motion.nav
              variants={sidebar}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-zinc-200 bg-white sm:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-4">
                <img
                  src="/images/winbetlogo.png"
                  alt="WinBet"
                  className="h-7 w-auto"
                />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
                  aria-label="Close menu"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M5 5l10 10" />
                    <path d="M15 5l-10 10" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition ${
                      pathname === link.href
                        ? 'bg-primarycolor/10 text-primarycolor'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-zinc-100 px-4 py-4">
                <span className="text-sm text-zinc-500">{user.username}</span>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
