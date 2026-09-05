'use client';

import Link from 'next/link';
import { CheckCheck } from 'lucide-react';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/lib/api-hooks';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@helpdesk/shared';

export default function NotificationsPage() {
  const { data, isPending, isError, refetch } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const unreadCount = data?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your requests and assignments."
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck aria-hidden="true" />
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load notifications.{' '}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : isPending ? (
        <ListSkeleton count={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="When something happens on your requests, updates will show up here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y" aria-label="Notification list">
              {data.map((notification) => (
                <li key={notification.id}>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => {
                        if (!notification.isRead) markOne.mutate({ id: notification.id });
                      }}
                      className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/60"
                    >
                      <NotificationRow notification={notification} onMarkRead={() => markOne.mutate({ id: notification.id })} />
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-5 py-4">
                      <NotificationRow
                        notification={notification}
                        onMarkRead={() => markOne.mutate({ id: notification.id })}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: () => void;
}) {
  return (
    <>
      <span
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          notification.isRead ? 'bg-transparent' : 'bg-primary',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-medium',
            notification.isRead && 'font-normal text-muted-foreground',
          )}
        >
          {notification.title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{notification.message}</span>
        <span className="mt-1 block text-xs text-muted-foreground/70">
          {formatDate(notification.createdAt)}
        </span>
      </span>
      {!notification.isRead ? (
        <button
          type="button"
          className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Mark "${notification.title}" as read`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead();
          }}
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
}