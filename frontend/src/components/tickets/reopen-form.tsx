'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useReopenTicket } from '@/lib/api-hooks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

const reopenSchema = z.object({
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

type ReopenValues = z.infer<typeof reopenSchema>;

export function ReopenForm({ ticketId }: { ticketId: string }) {
  const reopen = useReopenTicket();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReopenValues>({ resolver: zodResolver(reopenSchema) });

  const onSubmit = async (values: ReopenValues) => {
    setError(null);
    try {
      await reopen.mutateAsync({ id: ticketId, reason: values.reason });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reopen the ticket.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <p className="text-sm text-muted-foreground">
        This ticket was resolved. If the issue persists, reopen it so support can take another look.
      </p>
      <div className="space-y-2">
        <Label htmlFor="reopen-reason">Reason for reopening</Label>
        <Textarea
          id="reopen-reason"
          rows={3}
          placeholder="Tell support what is still wrong…"
          aria-invalid={Boolean(errors.reason)}
          aria-describedby={errors.reason ? 'reopen-reason-error' : undefined}
          {...register('reason')}
        />
        {errors.reason ? (
          <p id="reopen-reason-error" className="text-sm text-destructive">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" variant="outline" disabled={reopen.isPending} className="w-full">
        {reopen.isPending ? 'Reopening…' : 'Reopen ticket'}
      </Button>
    </form>
  );
}