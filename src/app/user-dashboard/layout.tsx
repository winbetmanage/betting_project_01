'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.role === 'ADMIN') {
          router.push('/admin-dashboard');
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, [router]);

  if (!ready) return null;

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1a1a2e', color: '#e4e4e7', border: '1px solid #27272a' },
        }}
      />
    </>
  );
}
