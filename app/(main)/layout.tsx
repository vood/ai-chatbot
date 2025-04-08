import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/lib/supabase/server';
import Script from 'next/script';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const user = await auth();

  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={user ?? undefined} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
