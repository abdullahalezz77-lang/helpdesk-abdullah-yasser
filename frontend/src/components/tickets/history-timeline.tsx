import { FilePlus2, UserCheck, UserCog, Repeat, RotateCcw, CheckCircle2, Archive, Tag } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const EVENT_META: Record<string, { label: string; icon: typeof Tag; className: string }> = {
  TICKET_CREATED: { label: 'Created', icon: FilePlus2, className: 'bg-primary/10 text-primary' },
  TICKET_ASSIGNED: { label: 'Assigned', icon: UserCheck, className: 'bg-sky-100 text-sky-700' },
  TICKET_REASSIGNED: { label: 'Reassigned', icon: Repeat, className: 'bg-violet-100 text-violet-700' },
  STATUS_CHANGED: { label: 'Status changed', icon: Tag, className: 'bg-secondary text-secondary-foreground' },
  TICKET_REOPENED: { label: 'Reopened', icon: RotateCcw, className: 'bg-amber-100 text-amber-700' },
  TICKET_RESOLVED: { label: 'Resolved', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  TICKET_CLOSED: { label: 'Closed', icon: Archive, className: 'bg-slate-100 text-slate-700' },
};

interface HistoryEntry {
  id: string;
  eventType: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  createdAt: string;
  actor: { name: string; email: string };
}

export function HistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {entries.map((entry) => {
        const meta = EVENT_META[entry.eventType] ?? { label: entry.eventType, icon: Tag, className: 'bg-secondary text-secondary-foreground' };
        const Icon = meta.icon;
        return (
          <li key={entry.id} className="relative">
            <span
              className={cn(
                'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background',
                meta.className,
              )}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-medium">{meta.label}</p>
              {entry.oldValue && entry.newValue ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{entry.oldValue}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="font-mono text-xs font-semibold text-foreground">{entry.newValue}</span>
                </p>
              ) : null}
            </div>
            {entry.reason ? <p className="mt-0.5 text-sm text-muted-foreground">{entry.reason}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground/80">
              {entry.actor.name} · {formatDate(entry.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}