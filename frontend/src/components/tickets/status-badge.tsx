import type { TicketStatus } from '@helpdesk/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatStatusLabel, getStatusBadgeClass } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function StatusBadge({
  status,
  className,
  ...props
}: { status: TicketStatus } & BadgeProps) {
  return (
    <Badge variant="outline" className={cn(getStatusBadgeClass(status), className)} {...props}>
      {formatStatusLabel(status)}
    </Badge>
  );
}