import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

export default async function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const user = await auth();
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={user ?? undefined} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
} 