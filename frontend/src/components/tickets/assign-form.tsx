'use client';

import { useState, useEffect } from 'react';
import { useAssignTicket, useReassignTicket, useSupportStaff } from '@/lib/api-hooks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AssignForm({
  ticketId,
  currentAssigneeId,
  ticketNumber,
}: {
  ticketId: string;
  currentAssigneeId?: string | null;
  ticketNumber: string;
}) {
  const assign = useAssignTicket();
  const reassign = useReassignTicket();
  const { data: staff, isPending } = useSupportStaff();
  const isAlreadyAssigned = Boolean(currentAssigneeId);

  const [assigneeId, setAssigneeId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAlreadyAssigned && currentAssigneeId) setAssigneeId(currentAssigneeId);
  }, [currentAssigneeId, isAlreadyAssigned]);

  const isPendingAction = assign.isPending || reassign.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isAlreadyAssigned) {
        await reassign.mutateAsync({ id: ticketId, assigneeId, reason: reason || undefined });
      } else if (assigneeId) {
        await assign.mutateAsync({ id: ticketId, assigneeId, reason: reason || undefined });
      } else {
        await assign.mutateAsync({ id: ticketId, reason: 'Claimed from the queue' });
      }
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update assignment.');
    }
  };

  if (isPending) {
    return <Spinner className="py-4" />;
  }

  const staffList = staff ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="assignee">Assign to</Label>
        {isAlreadyAssigned ? (
          <Select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            {(staffList ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        ) : (
          <Select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Claim it myself</option>
            {(staffList ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="assign-reason">Reason / note (optional)</Label>
        <Textarea
          id="assign-reason"
          rows={2}
          placeholder={isAlreadyAssigned ? 'Why is it being reassigned?' : 'Any notes about this assignment…'}
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
      <Button type="submit" disabled={isPendingAction || staffList.length === 0} className="w-full">
        {isPendingAction
          ? 'Updating…'
          : isAlreadyAssigned
            ? `Reassign ${ticketNumber}`
            : assigneeId
              ? `Assign ${ticketNumber}`
              : 'Claim ticket'}
      </Button>
    </form>
  );
}