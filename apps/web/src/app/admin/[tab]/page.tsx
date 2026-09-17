import { redirect } from 'next/navigation';
import { AdminDashboard } from '../admin-dashboard';
import {
  ADMIN_TAB_IDS,
  DEFAULT_ADMIN_TAB,
  adminTabPath,
  isAdminTabId,
} from '@/lib/admin-tabs';

export function generateStaticParams() {
  return ADMIN_TAB_IDS.map((tab) => ({ tab }));
}

export default async function AdminTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!isAdminTabId(tab)) {
    redirect(adminTabPath(DEFAULT_ADMIN_TAB));
  }
  return <AdminDashboard tab={tab} />;
}
