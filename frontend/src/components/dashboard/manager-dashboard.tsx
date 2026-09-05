'use client';

import {
  ClipboardList,
  Inbox,
  Hourglass,
  CheckCircle2,
  Archive,
  Users,
} from 'lucide-react';
import { useManagerDashboard } from '@/lib/api-hooks';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-sky-500',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-rose-500',
};

export function ManagerDashboard() {
  const { data, isPending, isError, refetch } = useManagerDashboard();

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="Organization-wide support metrics." />
        <StatCardSkeleton />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm font-medium">Failed to load overview</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, workload, byCategory, byPriority } = data;
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.count));
  const maxPriority = Math.max(1, ...byPriority.map((p) => p.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Organization-wide support metrics and workload distribution."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Requests" value={overview.total} icon={ClipboardList} />
        <StatCard label="Open" value={overview.open} icon={Inbox} accent="info" />
        <StatCard label="Waiting" value={overview.waiting} icon={Hourglass} accent="warning" />
        <StatCard label="Resolved" value={overview.resolved} icon={CheckCircle2} accent="success" />
        <StatCard label="Closed" value={overview.closed} icon={Archive} accent="default" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            Support Staff Workload
          </CardTitle>
          <CardDescription>Distribution of active and resolved tickets per handler.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Staff member
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Active
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Resolved
                </th>
                <th scope="col" className="py-2 font-medium">
                  Total assigned
                </th>
              </tr>
            </thead>
            <tbody>
              {workload.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No support staff found.
                  </td>
                </tr>
              ) : (
                workload.map((staff) => (
                  <tr key={staff.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">{staff.email}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={cn(
                          'inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                          staff.activeTicketsCount > 0
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {staff.activeTicketsCount}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{staff.resolvedCount}</td>
                    <td className="py-2.5 font-medium">{staff.totalAssigned}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
            <CardDescription>Volume of requests grouped by category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {byCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              byCategory.map((c) => (
                <div key={c.categoryId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.categoryName}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
                    role="img"
                    aria-label={`${c.categoryName}: ${c.count} tickets`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(4, (c.count / maxCategory) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Priority</CardTitle>
            <CardDescription>Volume of requests grouped by priority.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {byPriority.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              byPriority.map((p) => (
                <div key={p.priority}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {p.priority.charAt(0) + p.priority.slice(1).toLowerCase()}
                    </span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full transition-all', PRIORITY_COLORS[p.priority] ?? 'bg-primary')}
                      style={{ width: `${Math.max(4, (p.count / maxPriority) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}