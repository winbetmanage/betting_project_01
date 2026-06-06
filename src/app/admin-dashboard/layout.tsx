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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Home, Swords, WalletCards, Ticket, Users, UserCircle, LogOut, Eye, ChevronDown, ArrowLeftRight } from 'lucide-react';

const adminLinks = [
  { href: '/admin-dashboard', label: 'Home', icon: Home },
  { href: '/admin-dashboard/matches', label: 'Matches', icon: Swords },
  { href: '/admin-dashboard/markets', label: 'Markets', icon: WalletCards },
  { href: '/admin-dashboard/bets', label: 'Bets', icon: Ticket },
  { href: '/admin-dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
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
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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

  useEffect(() => {
    if (!authorized) return;
    fetch('/api/admin/pending-count')
      .then((r) => r.json())
      .then((data) => setPendingCount(data.count ?? 0))
      .catch(() => {});
    const interval = setInterval(() => {
      fetch('/api/admin/pending-count')
        .then((r) => r.json())
        .then((data) => setPendingCount(data.count ?? 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [authorized]);

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
            {adminLinks.map((link) =>
              link.label === 'Matches' ? (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    onClick={() => setMatchesOpen(!matchesOpen)}
                    className="text-gray-200 data-active:text-white"
                  >
                    <link.icon />
                    <span>{link.label}</span>
                    <ChevronDown
                      className={`ml-auto transition-transform ${matchesOpen ? 'rotate-180' : ''}`}
                    />
                  </SidebarMenuButton>
                  {matchesOpen && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link href="/admin-dashboard/matches-list" />}
                          isActive={pathname === '/admin-dashboard/matches-list'}
                          className="text-gray-200 data-active:text-white"
                        >
                          Matches List
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link href="/admin-dashboard/game-schema" />}
                          isActive={pathname === '/admin-dashboard/game-schema'}
                          className="text-gray-200 data-active:text-white"
                        >
                          Game Schema
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link href="/admin-dashboard/manage-odds" />}
                          isActive={pathname === '/admin-dashboard/manage-odds'}
                          className="text-gray-200 data-active:text-white"
                        >
                          Manage Odds
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    render={<Link href={link.href} />}
                    isActive={pathname === link.href}
                    className="text-gray-200 data-active:text-white"
                  >
                    <link.icon />
                    <span>{link.label}</span>
                    {link.label === 'Transactions' && pendingCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ backgroundColor: '#451b4a' }}>
                        {pendingCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
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
