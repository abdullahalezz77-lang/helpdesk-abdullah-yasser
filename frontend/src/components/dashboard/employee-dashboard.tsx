'use client';

import Link from 'next/link';
import { PlusCircle, ClipboardList, Inbox, Hourglass, CheckCircle2 } from 'lucide-react';
import { useEmployeeDashboard } from '@/lib/api-hooks';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-card';
import { TicketList, TicketListSkeleton } from '@/components/tickets/ticket-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export function EmployeeDashboard() {
  const { data, isPending, isError, refetch } = useEmployeeDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        description="Track your support requests and their progress."
        action={
          <Link href="/requests/new">
            <Button>
              <PlusCircle aria-hidden="true" />
              New Request
            </Button>
          </Link>
        }
      />

      {isPending ? (
        <StatCardSkeleton />
      ) : isError ? (
        <ErrorCard onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Requests" value={data.metrics.total} icon={ClipboardList} />
          <StatCard label="Open" value={data.metrics.open} icon={Inbox} accent="info" />
          <StatCard label="Waiting" value={data.metrics.waiting} icon={Hourglass} accent="warning" />
          <StatCard label="Resolved" value={data.metrics.resolved} icon={CheckCircle2} accent="success" />
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Requests</CardTitle>
          <Link
            href="/requests"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <TicketListSkeleton count={3} />
          ) : isError ? (
            <ErrorCard onRetry={() => refetch()} />
          ) : data.recentTickets.length === 0 ? (
            <EmptyTickets />
          ) : (
            <TicketList
              tickets={data.recentTickets}
              emptyTitle="No requests yet"
              emptyDescription="Create your first support request."
              emptyAction={
                <Link href="/requests/new">
                  <Button size="sm" variant="outline">
                    <PlusCircle aria-hidden="true" />
                    New Request
                  </Button>
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyTickets() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <p className="text-sm font-medium">No requests yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Create your first support request and it will appear here.
      </p>
      <Link href="/requests/new">
        <Button size="sm" variant="outline">
          <PlusCircle aria-hidden="true" />
          New Request
        </Button>
      </Link>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t reach the server. Check your connection and try again.
        </p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}