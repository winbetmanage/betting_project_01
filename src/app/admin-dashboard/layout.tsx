'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Home, Swords, WalletCards, Ticket, Users, UserCircle, LogOut, Eye } from 'lucide-react';

const adminLinks = [
  { href: '/admin-dashboard', label: 'Home', icon: Home },
  { href: '/admin-dashboard/matches', label: 'Matches', icon: Swords },
  { href: '/admin-dashboard/markets', label: 'Markets', icon: WalletCards },
  { href: '/admin-dashboard/bets', label: 'Bets', icon: Ticket },
  { href: '/admin-dashboard/users', label: 'Users', icon: Users },
  { href: '/admin-dashboard/profile', label: 'Profile', icon: UserCircle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.role !== 'ADMIN') {
          router.push('/login');
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!authorized) return null;

  return (
    <SidebarProvider>
      <Sidebar
          className="sidebar-dark-orange"
          style={{
            '--sidebar': '#451b4a',
            '--sidebar-foreground': '#e5e7eb',
            '--sidebar-accent': '#672d6e',
            '--sidebar-accent-foreground': '#ffffff',
            '--sidebar-border': '#311335',
            '--sidebar-ring': '#672d6e',
            '--sidebar-primary': '#ffffff',
            '--sidebar-primary-foreground': '#451b4a',
          } as React.CSSProperties}
        >
        <SidebarHeader className="px-4 py-3">
          <span className="text-base font-bold tracking-tight text-gray-300">
            WinBet Admin
          </span>
        </SidebarHeader>

        <SidebarSeparator className="bg-orange-700" />

        <SidebarContent>
          <SidebarMenu>
            {adminLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  render={<Link href={link.href} />}
                  isActive={pathname === link.href}
                  className="text-gray-200 data-active:text-white"
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarSeparator className="bg-orange-700" />

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/user-dashboard" />}
                className="text-gray-200 data-active:text-white"
              >
                <Eye />
                <span>User View</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="text-gray-200 data-active:text-white"
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-gray-200">
        <header className="flex h-14 items-center gap-3 border-b border-zinc-300 bg-gray-200 px-4">
          <SidebarTrigger className="text-zinc-600 hover:text-zinc-900" />
          <span className="text-sm font-medium text-zinc-600">
            {adminLinks.find((l) => l.href === pathname)?.label || 'Home'}
          </span>
        </header>
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
