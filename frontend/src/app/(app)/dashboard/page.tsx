'use client';

import { Role } from '@helpdesk/shared';
import { useAuth } from '@/lib/auth-context';
import { EmployeeDashboard } from '@/components/dashboard/employee-dashboard';
import { SupportDashboard } from '@/components/dashboard/support-dashboard';
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === Role.SUPPORT) {
    return <SupportDashboard />;
  }
  if (user?.role === Role.MANAGER) {
    return <ManagerDashboard />;
  }
  return <EmployeeDashboard />;
}