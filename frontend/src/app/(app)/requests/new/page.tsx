'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TicketPriority } from '@helpdesk/shared';
import { useCategories, useCreateTicket } from '@/lib/api-hooks';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  categoryId: z.string().min(1, 'Please choose a category'),
  priority: z.nativeEnum(TicketPriority),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

export default function NewRequestPage() {
  const router = useRouter();
  const { data: categories, isPending: categoriesLoading } = useCategories();
  const createTicket = useCreateTicket();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      priority: TicketPriority.MEDIUM,
      title: '',
      description: '',
      categoryId: '',
    },
  });

  const onSubmit = async (values: CreateTicketValues) => {
    setError(null);
    try {
      const ticket = await createTicket.mutateAsync(values);
      router.push(`/requests/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Request"
        description="Describe the issue and our support team will pick it up."
      />

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <Spinner className="py-12" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Summary of the issue"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                  {...register('title')}
                />
                {errors.title ? (
                  <p id="title-error" className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={6}
                  placeholder="Provide as much detail as possible…"
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? 'description-error' : undefined}
                  {...register('description')}
                />
                {errors.description ? (
                  <p id="description-error" className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    error={Boolean(errors.categoryId)}
                    aria-invalid={Boolean(errors.categoryId)}
                    aria-describedby={errors.categoryId ? 'category-error' : undefined}
                    {...register('categoryId')}
                  >
                    <option value="">Choose a category…</option>
                    {(categories ?? []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                  {errors.categoryId ? (
                    <p id="category-error" className="text-sm text-destructive">
                      {errors.categoryId.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select id="priority" {...register('priority')}>
                    {Object.values(TicketPriority).map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={createTicket.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTicket.isPending}>
                  {createTicket.isPending ? 'Submitting…' : 'Submit request'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}