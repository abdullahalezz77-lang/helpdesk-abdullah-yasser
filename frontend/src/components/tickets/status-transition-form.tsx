'use client';

import { useState } from 'react';
import { getValidNextStatuses, TicketStatus } from '@helpdesk/shared';
import { useUpdateStatus } from '@/lib/api-hooks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatStatusLabel } from '@/lib/utils';

export function StatusTransitionForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
}) {
  const updateStatus = useUpdateStatus();
  const nextStatuses = getValidNextStatuses(currentStatus);
  const [status, setStatus] = useState<string>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = status && !updateStatus.isPending;
  const transitionCopy: Record<string, string> = {
    [TicketStatus.IN_PROGRESS]: 'Start working on this ticket',
    [TicketStatus.WAITING]: 'Mark as waiting on requester',
    [TicketStatus.RESOLVED]: 'Mark as resolved',
    [TicketStatus.CLOSED]: 'Close this ticket',
  };

  if (nextStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This ticket is {formatStatusLabel(currentStatus).toLowerCase()} and has no further status changes.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateStatus.mutateAsync({ id: ticketId, status, reason: reason || undefined });
      setReason('');
      setStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="next-status">Move status to</Label>
        <Select id="next-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Choose next status…</option>
          {nextStatuses.map((next) => (
            <option key={next} value={next}>
              {formatStatusLabel(next)} — {transitionCopy[next] ?? ''}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status-reason">Reason / note (optional)</Label>
        <Textarea
          id="status-reason"
          rows={2}
          placeholder="Explain the change for the audit trail…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={!canSubmit} className="w-full">
        {updateStatus.isPending ? 'Updating…' : 'Update status'}
      </Button>
    </form>
  );
}