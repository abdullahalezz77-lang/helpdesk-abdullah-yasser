import { TicketStatus } from './types';

export const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  [TicketStatus.NEW]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING, TicketStatus.RESOLVED],
  [TicketStatus.WAITING]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

export function canTransitionStatus(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function getValidNextStatuses(currentStatus: TicketStatus): readonly TicketStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
}

export class InvalidStatusTransitionError extends Error {
  constructor(public readonly fromStatus: TicketStatus, public readonly toStatus: TicketStatus) {
    super(`Cannot transition ticket status from '${fromStatus}' to '${toStatus}'. Allowed transitions: [${getValidNextStatuses(fromStatus).join(', ')}]`);
    this.name = 'InvalidStatusTransitionError';
  }
}

export function validateStatusTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransitionStatus(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}
