import { LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Brand({
  className,
  link = true,
}: {
  className?: string;
  link?: boolean;
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <LifeBuoy className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight">HelpDesk Lite</span>
        <span className="text-xs text-muted-foreground">Internal IT Support</span>
      </span>
    </span>
  );

  if (!link) return content;

  return (
    <Link href="/dashboard" aria-label="HelpDesk Lite home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}