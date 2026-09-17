import { redirect } from 'next/navigation';
import { adminTabPath, DEFAULT_ADMIN_TAB } from '@/lib/admin-tabs';

export default function AdminIndexPage() {
  redirect(adminTabPath(DEFAULT_ADMIN_TAB));
}
