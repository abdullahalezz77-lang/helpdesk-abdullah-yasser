'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAllNotificationsRead } from '@/lib/api-hooks';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications, isLoading } = useNotifications();
  const markAll = useMarkAllNotificationsRead();

  const unread = notifications?.filter((n) => !n.isRead).length ?? 0;

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-card shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <Spinner className="py-10" />
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              <ul className="divide-y">
                {notifications.slice(0, 8).map((n) => (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="block px-4 py-3 transition-colors hover:bg-accent/60"
                        onClick={() => setOpen(false)}
                      >
                        <NotificationContent title={n.title} message={n.message} createdAt={n.createdAt} isRead={n.isRead} />
                      </Link>
                    ) : (
                      <div className="px-4 py-3">
                        <NotificationContent title={n.title} message={n.message} createdAt={n.createdAt} isRead={n.isRead} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t p-2">
            <Link href="/notifications" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-center text-xs">
                View all notifications
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationContent({
  title,
  message,
  createdAt,
  isRead,
}: {
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {!isRead ? (
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-transparent" aria-hidden="true" />
        )}
        <p className={cn('truncate text-sm font-medium', isRead && 'font-normal text-muted-foreground')}>
          {title}
        </p>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{message}</p>
      <p className="text-[11px] text-muted-foreground/80">{formatDate(createdAt)}</p>
    </div>
  );
}