'use client';

import Link from 'next/link';
import {
  Inbox,
  ClipboardList,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { useSupportDashboard } from '@/lib/api-hooks';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-card';
import { TicketList, TicketListSkeleton } from '@/components/tickets/ticket-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SupportDashboard() {
  const { data, isPending, isError, refetch } = useSupportDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Overview"
        description="Monitor the incoming queue and your assigned workload."
        action={
          <Link href="/support">
            <Button variant="outline">
              <ArrowUpRight aria-hidden="true" />
              Open Queue
            </Button>
          </Link>
        }
      />

      {!isPending && data && data.metrics.urgentCount > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Urgent tickets pending</AlertTitle>
          <AlertDescription>
            {data.metrics.urgentCount} urgent ticket{data.metrics.urgentCount > 1 ? 's' : ''}{' '}
            still require attention. Head to the queue to review them.
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <StatCardSkeleton />
      ) : isError ? (
        <ErrorCard onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Unassigned Queue"
            value={data.metrics.unassignedQueue}
            icon={Inbox}
            hint="Tickets awaiting a handler"
          />
          <StatCard
            label="My Active"
            value={data.metrics.myAssigned}
            icon={ClipboardList}
            accent="info"
            hint="In progress or waiting"
          />
          <StatCard
            label="My Waiting"
            value={data.metrics.myWaiting}
            icon={Hourglass}
            accent="warning"
          />
          <StatCard
            label="My Resolved"
            value={data.metrics.myResolved}
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Urgent Open"
            value={data.metrics.urgentCount}
            icon={AlertTriangle}
            accent="danger"
          />
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Active Queue</CardTitle>
          <Link href="/support" className="text-sm font-medium text-primary hover:underline">
            View queue
          </Link>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <TicketListSkeleton count={3} />
          ) : isError ? (
            <ErrorCard onRetry={() => refetch()} />
          ) : (
            <TicketList
              tickets={data.recentQueue}
              emptyTitle="Queue is clear"
              emptyDescription="There are no unassigned or active tickets right now."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}