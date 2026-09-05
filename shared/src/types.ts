export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  SUPPORT = 'SUPPORT',
  MANAGER = 'MANAGER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum HistoryEventType {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_REASSIGNED = 'TICKET_REASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  TICKET_REOPENED = 'TICKET_REOPENED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  TICKET_CLOSED = 'TICKET_CLOSED',
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CategorySummary {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface TicketHistoryItem {
  id: string;
  ticketId: string;
  actorId: string;
  actor: UserSummary;
  eventType: HistoryEventType;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  categoryId: string;
  category: CategorySummary;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  requester: UserSummary;
  assigneeId?: string | null;
  assignee?: UserSummary | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  history?: TicketHistoryItem[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
