'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, SearchX } from 'lucide-react';
import { Role, TicketStatus, TicketPriority } from '@helpdesk/shared';
import { useAuth } from '@/lib/auth-context';
import { useTickets } from '@/lib/api-hooks';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TicketList, TicketListSkeleton } from '@/components/tickets/ticket-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

const PAGE_SIZE = 8;

export default function RequestsPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === Role.EMPLOYEE;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');

  const { data, isPending, isError, refetch } = useTickets({
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    priority: priority || undefined,
    search: search || undefined,
  });

  const appliedFilters = Boolean(status || priority || search);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEmployee ? 'My Requests' : 'Requests'}
        description={
          isEmployee
            ? 'Every request you have submitted, with live status updates.'
            : 'Review and manage tickets across the organization.'
        }
        action={
          <Link href="/requests/new">
            <Button>
              <PlusCircle aria-hidden="true" />
              New Request
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
          <div className="sm:col-span-3 lg:col-span-1">
            <Label htmlFor="search" className="mb-1.5 block">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="search"
                placeholder="Search title, number, or description…"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status" className="mb-1.5 block">
              Status
            </Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {Object.values(TicketStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority" className="mb-1.5 block">
              Priority
            </Label>
            <Select
              id="priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by priority"
            >
              <option value="">All priorities</option>
              {Object.values(TicketPriority).map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load requests.{' '}
            <button type="button" className="font-medium underline underline-offset-2" onClick={() => refetch()}>
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
                emptyTitle="No requests found"
                emptyDescription="Try adjusting your filters or create a new request."
              />
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
              {appliedFilters ? (
                <>
                  <SearchX className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
                  <p className="text-sm font-medium">No requests match your filters</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Clear the filters to see all requests.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStatus('');
                      setPriority('');
                      setSearch('');
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">No requests yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Create your first support request to get started.
                  </p>
                  <Link href="/requests/new">
                    <Button size="sm" variant="outline">
                      <PlusCircle aria-hidden="true" />
                      New Request
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}