'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  CategorySummary,
  NotificationItem,
  PaginatedResult,
  TicketDetail,
} from '@helpdesk/shared';

export type TicketListItem = Omit<TicketDetail, 'history'>;

export interface TicketQueryFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  categoryId?: string;
  ownerId?: string;
  search?: string;
  unassignedOnly?: boolean;
}

export interface EmployeeDashboard {
  metrics: { total: number; open: number; waiting: number; resolved: number };
  recentTickets: TicketListItem[];
}

export interface SupportDashboard {
  metrics: {
    unassignedQueue: number;
    myAssigned: number;
    myWaiting: number;
    myResolved: number;
    urgentCount: number;
  };
  recentQueue: TicketListItem[];
}

export interface SupportStaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ManagerDashboard {
  overview: { total: number; open: number; waiting: number; resolved: number; closed: number };
  workload: Array<{
    id: string;
    name: string;
    email: string;
    activeTicketsCount: number;
    resolvedCount: number;
    totalAssigned: number;
  }>;
  byCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
}

// ---- Categories ----
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get<CategorySummary[]>('/categories'),
  });
}

// ---- Tickets ----
export function useTickets(filters: TicketQueryFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const qs = params.toString();

  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => apiClient.get<PaginatedResult<TicketListItem>>(`/tickets${qs ? `?${qs}` : ''}`),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiClient.get<TicketDetail>(`/tickets/${id}`),
    enabled: Boolean(id),
  });
}

export function useTicketHistory(id: string) {
  return useQuery({
    queryKey: ['ticket-history', id],
    queryFn: () =>
      apiClient.get<
        Array<{
          id: string;
          eventType: string;
          oldValue?: string | null;
          newValue?: string | null;
          reason?: string | null;
          createdAt: string;
          actor: { id: string; name: string; email: string; role: string };
        }>
      >(`/tickets/${id}/history`),
    enabled: Boolean(id),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description: string; categoryId: string; priority?: string }) =>
      apiClient.post<TicketDetail>('/tickets', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiClient.patch<TicketDetail>(`/tickets/${id}/status`, { status, reason }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', data.id] });
      qc.invalidateQueries({ queryKey: ['ticket-history', data.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId, reason }: { id: string; assigneeId?: string; reason?: string }) =>
      apiClient.post<TicketDetail>(`/tickets/${id}/assign`, { assigneeId, reason }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', data.id] });
      qc.invalidateQueries({ queryKey: ['ticket-history', data.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReassignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId, reason }: { id: string; assigneeId: string; reason?: string }) =>
      apiClient.post<TicketDetail>(`/tickets/${id}/reassign`, { assigneeId, reason }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', data.id] });
      qc.invalidateQueries({ queryKey: ['ticket-history', data.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReopenTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<TicketDetail>(`/tickets/${id}/reopen`, { reason }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', data.id] });
      qc.invalidateQueries({ queryKey: ['ticket-history', data.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Dashboards ----
export function useEmployeeDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: () => apiClient.get<EmployeeDashboard>('/dashboard/employee'),
  });
}

export function useSupportDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'support'],
    queryFn: () => apiClient.get<SupportDashboard>('/dashboard/support'),
  });
}

export function useManagerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: () => apiClient.get<ManagerDashboard>('/dashboard/manager'),
  });
}

// ---- Respective lists ----
export function useSupportStaff() {
  return useQuery({
    queryKey: ['support-staff'],
    queryFn: () => apiClient.get<SupportStaffMember[]>('/users/support-handlers'),
  });
}

// ---- Notifications ----
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<NotificationItem[]>('/notifications'),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

