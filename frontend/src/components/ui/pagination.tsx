import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  let visiblePages: (number | string)[] = pages;
  if (totalPages > 7) {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    visiblePages = [1, ...(start > 2 ? ['…' as const] : []), ...Array.from({ length: 5 }, (_, i) => start + i), ...(start + 4 < totalPages - 1 ? ['…' as const] : []), totalPages];
  }

  return (
    <nav
      className={cn('flex items-center justify-between gap-2', className)}
      aria-label="Pagination"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <div className="flex items-center gap-1" aria-label="Page numbers">
        {visiblePages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="hidden h-8 w-8 sm:inline-flex"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}