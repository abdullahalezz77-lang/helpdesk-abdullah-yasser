import type { TicketPriority } from '@helpdesk/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { getPriorityBadgeClass } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function PriorityBadge({
  priority,
  className,
  ...props
}: { priority: TicketPriority } & BadgeProps) {
  return (
    <Badge variant="outline" className={cn(getPriorityBadgeClass(priority), className)} {...props}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </Badge>
  );
}