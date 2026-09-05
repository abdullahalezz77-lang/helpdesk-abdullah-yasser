import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TicketStatus, TicketPriority } from '@helpdesk/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.NEW:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case TicketStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case TicketStatus.WAITING:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case TicketStatus.RESOLVED:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case TicketStatus.CLOSED:
      return 'bg-slate-100 text-slate-800 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getPriorityBadgeClass(priority: TicketPriority): string {
  switch (priority) {
    case TicketPriority.LOW:
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case TicketPriority.MEDIUM:
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case TicketPriority.HIGH:
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case TicketPriority.URGENT:
      return 'bg-rose-100 text-rose-800 border-rose-200 font-semibold';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function formatStatusLabel(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.NEW:
      return 'New';
    case TicketStatus.IN_PROGRESS:
      return 'In Progress';
    case TicketStatus.WAITING:
      return 'Waiting';
    case TicketStatus.RESOLVED:
      return 'Resolved';
    case TicketStatus.CLOSED:
      return 'Closed';
    default:
      return status;
  }
}
