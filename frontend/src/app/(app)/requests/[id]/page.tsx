'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  User,
  UserCheck,
  Tag,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';
import { Role, TicketStatus } from '@helpdesk/shared';
import { useAuth } from '@/lib/auth-context';
import { useTicket, useTicketHistory } from '@/lib/api-hooks';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FullPageLoader, Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/tickets/status-badge';
import { PriorityBadge } from '@/components/tickets/priority-badge';
import { HistoryTimeline } from '@/components/tickets/history-timeline';
import { StatusTransitionForm } from '@/components/tickets/status-transition-form';
import { AssignForm } from '@/components/tickets/assign-form';
import { ReopenForm } from '@/components/tickets/reopen-form';
import { formatDate } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const ticketQuery = useTicket(id);
  const historyQuery = useTicketHistory(id);

  if (ticketQuery.isPending) {
    return <FullPageLoader label="Loading ticket" />;
  }

  if (ticketQuery.isError) {
    const message = ticketQuery.error instanceof Error ? ticketQuery.error.message : 'Ticket not found.';
    return (
      <Alert variant="destructive">
        <AlertOctagon className="mr-2" aria-hidden="true" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  }

  const ticket = ticketQuery.data;
  const canManage = user?.role === Role.SUPPORT || user?.role === Role.MANAGER;
  const isEmployeeReopenAvailable =
    user?.role === Role.EMPLOYEE && ticket.status === TicketStatus.RESOLVED;

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title={ticket.title}
          description={`${ticket.ticketNumber} · Requested ${formatDate(ticket.createdAt)}`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <Badge variant="secondary">{ticket.category.name}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>Complete audit trail of every change on this ticket.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyQuery.isPending ? (
                <Spinner className="py-10" />
              ) : historyQuery.isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Could not load history.
                </p>
              ) : (
                <HistoryTimeline entries={historyQuery.data} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <DetailRow icon={User} label="Requester" value={ticket.requester.name} />
              <DetailRow
                icon={UserCheck}
                label="Assignee"
                value={ticket.assignee ? ticket.assignee.name : 'Unassigned'}
              />
              <DetailRow icon={Tag} label="Category" value={ticket.category.name} />
              <DetailRow icon={CalendarDays} label="Created" value={formatDate(ticket.createdAt)} />
              <DetailRow icon={CalendarDays} label="Last updated" value={formatDate(ticket.updatedAt)} />
              <DetailRow icon={Clock} label="Resolved" value={formatDate(ticket.resolvedAt)} />
              <DetailRow icon={Clock} label="Closed" value={formatDate(ticket.closedAt)} />
            </CardContent>
          </Card>

          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Manage Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <AssignForm
                  ticketId={ticket.id}
                  ticketNumber={ticket.ticketNumber}
                  currentAssigneeId={ticket.assigneeId}
                />
                <div className="border-t pt-5">
                  <StatusTransitionForm ticketId={ticket.id} currentStatus={ticket.status} />
                </div>
              </CardContent>
            </Card>
          ) : isEmployeeReopenAvailable ? (
            <Card>
              <CardHeader>
                <CardTitle>Reopen</CardTitle>
              </CardHeader>
              <CardContent>
                <ReopenForm ticketId={ticket.id} />
              </CardContent>
            </Card>
          ) : user?.role === Role.EMPLOYEE ? (
            <Card>
              <CardContent className="py-5 text-sm text-muted-foreground">
                Our support team manages the status of this ticket. You&apos;ll receive a
                notification whenever it changes.
              </CardContent>
            </Card>
          ) : null}

          <Link
            href="/requests"
            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
          >
            Back to list
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
  );
}