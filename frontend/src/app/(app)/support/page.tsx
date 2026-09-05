'use client';

import { useState } from 'react';
import { Inbox, ClipboardList, Layers } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTickets, type TicketQueryFilters } from '@/lib/api-hooks';
import { PageHeader } from '@/components/layout/page-header';
import { Pagination } from '@/components/ui/pagination';
import { TicketList, TicketListSkeleton } from '@/components/tickets/ticket-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

type TabKey = 'unassigned' | 'mine' | 'all';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Inbox; description: string }> = [
  { key: 'unassigned', label: 'Unassigned', icon: Inbox, description: 'Tickets waiting to be claimed' },
  { key: 'mine', label: 'Assigned to me', icon: ClipboardList, description: 'Tickets currently in your workload' },
  { key: 'all', label: 'All tickets', icon: Layers, description: 'Every ticket in the system' },
];

const PAGE_SIZE = 8;

export default function SupportQueuePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('unassigned');
  const [page, setPage] = useState(1);

  const filters: TicketQueryFilters = { page, limit: PAGE_SIZE };
  if (tab === 'unassigned') filters.unassignedOnly = true;
  if (tab === 'mine') filters.ownerId = user?.id;

  const { data, isPending, isError, refetch } = useTickets(filters);

  const switchTab = (key: TabKey) => {
    setTab(key);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Queue"
        description="Claim tickets, move them forward, and keep the queue healthy."
      />

      <div
        className="inline-flex w-full max-w-full overflow-x-auto rounded-lg border bg-card p-1 sm:w-auto"
        role="tablist"
        aria-label="Queue views"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent',
              )}
              onClick={() => switchTab(t.key)}
            >
              <t.icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="-mt-3 text-sm text-muted-foreground">
        {TABS.find((t) => t.key === tab)?.description}
      </p>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load the queue.{' '}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {isPending ? (
            <TicketListSkeleton count={5} />
          ) : data && data.items.length > 0 ? (
            <>
              <TicketList
                tickets={data.items}
                emptyTitle="Nothing here"
                emptyDescription="No tickets match this view."
              />
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </>
          ) : tab === 'unassigned' ? (
            <EmptyState
              title="Queue is clear"
              description="There are no unassigned tickets waiting right now. Great job!"
            />
          ) : (
            <EmptyState
              title="No tickets in this view"
              description="Try switching to another view."
            />
          )}
        </>
      )}
    </div>
  );
}