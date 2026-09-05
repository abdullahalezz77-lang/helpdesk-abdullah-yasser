import { describe, it, expect } from 'vitest';
import { TicketStatus, TicketPriority } from '@helpdesk/shared';
import {
  cn,
  formatDate,
  formatStatusLabel,
  getPriorityBadgeClass,
  getStatusBadgeClass,
} from '../src/lib/utils';

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('px-2', 'py-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false && 'text-lg', null, undefined)).toBe('text-sm');
  });
});

describe('formatStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(formatStatusLabel(TicketStatus.NEW)).toBe('New');
    expect(formatStatusLabel(TicketStatus.IN_PROGRESS)).toBe('In Progress');
    expect(formatStatusLabel(TicketStatus.WAITING)).toBe('Waiting');
    expect(formatStatusLabel(TicketStatus.RESOLVED)).toBe('Resolved');
    expect(formatStatusLabel(TicketStatus.CLOSED)).toBe('Closed');
  });

  it('falls back to the raw value for unknown statuses', () => {
    expect(formatStatusLabel('MYSTERY' as TicketStatus)).toBe('MYSTERY');
  });
});

describe('getStatusBadgeClass', () => {
  it('returns a non-empty tailwind class for every status', () => {
    Object.values(TicketStatus).forEach((status) => {
      const cls = getStatusBadgeClass(status);
      expect(cls).toBeTruthy();
      expect(cls).toMatch(/bg-/);
    });
  });
});

describe('getPriorityBadgeClass', () => {
  it('marks URGENT as emphasized over base classes', () => {
    const urgent = getPriorityBadgeClass(TicketPriority.URGENT);
    expect(urgent).toContain('font-semibold');
    expect(urgent).toContain('rose');
  });

  it('returns a non-empty tailwind class for every priority', () => {
    Object.values(TicketPriority).forEach((priority) => {
      expect(getPriorityBadgeClass(priority)).toMatch(/bg-/);
    });
  });
});

describe('formatDate', () => {
  it('returns an em dash for missing dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('formats valid ISO dates', () => {
    const out = formatDate('2025-01-05T10:30:00.000Z');
    expect(out).toMatch(/Jan 5, 2025/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});