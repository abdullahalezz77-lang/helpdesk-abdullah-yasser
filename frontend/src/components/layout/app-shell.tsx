'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Inbox,
  Menu,
  X,
  LogOut,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Role } from '@helpdesk/shared';
import { useAuth } from '@/lib/auth-context';
import { Brand } from '@/components/layout/brand';
import { NotificationBell } from '@/components/layout/notification-bell';
import { FullPageLoader } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'My Requests', icon: Ticket, roles: [Role.EMPLOYEE] },
  { href: '/requests', label: 'Requests', icon: Ticket, roles: [Role.SUPPORT, Role.MANAGER] },
  { href: '/requests/new', label: 'New Request', icon: PlusCircle, roles: [Role.EMPLOYEE, Role.MANAGER] },
  { href: '/support', label: 'Support Queue', icon: Inbox, roles: [Role.SUPPORT] },
];

const ROLE_LABEL: Record<Role, string> = {
  [Role.EMPLOYEE]: 'Employee',
  [Role.SUPPORT]: 'Support Staff',
  [Role.MANAGER]: 'Manager',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <FullPageLoader label="Loading application" />;
  }

  if (!user) {
    return null;
  }

  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  const NavLinks = (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main navigation">
      {visibleNav.map((item) => {
        const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={`${user.role}-${item.href}`}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Brand link={false} />
      </div>
      {NavLinks}
      <div className="border-t p-3">
        <div className="px-3 pb-3">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
        {Sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-card">
            <button
              type="button"
              className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {Sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Link href="/profile">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {ROLE_LABEL[user.role]}
                </span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}