import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TicketStatus } from './types';
import {
  canTransitionStatus,
  getValidNextStatuses,
  validateStatusTransition,
  InvalidStatusTransitionError,
} from './state-machine';

describe('Ticket State Machine', () => {
  it('allows NEW -> IN_PROGRESS transition', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.NEW, TicketStatus.IN_PROGRESS), true);
    assert.doesNotThrow(() => validateStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS));
  });

  it('rejects invalid transitions from NEW (e.g. NEW -> RESOLVED, NEW -> WAITING, NEW -> CLOSED)', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.NEW, TicketStatus.RESOLVED), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.NEW, TicketStatus.WAITING), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.NEW, TicketStatus.CLOSED), false);
    assert.throws(
      () => validateStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED),
      InvalidStatusTransitionError
    );
  });

  it('allows IN_PROGRESS -> WAITING and IN_PROGRESS -> RESOLVED', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.WAITING), true);
    assert.strictEqual(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED), true);
    assert.strictEqual(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.NEW), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED), false);
  });

  it('allows WAITING -> IN_PROGRESS only', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.WAITING, TicketStatus.IN_PROGRESS), true);
    assert.strictEqual(canTransitionStatus(TicketStatus.WAITING, TicketStatus.RESOLVED), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.WAITING, TicketStatus.CLOSED), false);
  });

  it('allows RESOLVED -> CLOSED and RESOLVED -> IN_PROGRESS (reopening)', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.RESOLVED, TicketStatus.CLOSED), true);
    assert.strictEqual(canTransitionStatus(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS), true);
    assert.strictEqual(canTransitionStatus(TicketStatus.RESOLVED, TicketStatus.NEW), false);
  });

  it('prohibits any transitions from CLOSED', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.CLOSED, TicketStatus.NEW), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.CLOSED, TicketStatus.RESOLVED), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.CLOSED, TicketStatus.WAITING), false);
    assert.strictEqual(getValidNextStatuses(TicketStatus.CLOSED).length, 0);
  });

  it('does not allow transitioning to the same status', () => {
    assert.strictEqual(canTransitionStatus(TicketStatus.NEW, TicketStatus.NEW), false);
    assert.strictEqual(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.IN_PROGRESS), false);
  });
});
