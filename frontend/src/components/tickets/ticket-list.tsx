import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/tickets/status-badge';
import { PriorityBadge } from '@/components/tickets/priority-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import type { TicketListItem } from '@/lib/api-hooks';

export function TicketCard({ ticket }: { ticket: TicketListItem }) {
  return (
    <Link
      href={`/requests/${ticket.id}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-medium text-muted-foreground">
          {ticket.ticketNumber}
        </span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {ticket.category.name}
        </span>
      </div>
      <h3 className="mt-2 font-medium leading-snug">{ticket.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        {ticket.assignee ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">→</span> {ticket.assignee.name}
          </span>
        ) : null}
        <span className="ml-auto">{formatDate(ticket.createdAt)}</span>
      </div>
    </Link>
  );
}

export function TicketListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-5 w-1/2" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TicketList({
  tickets,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  tickets: TicketListItem[];
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  if (tickets.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}