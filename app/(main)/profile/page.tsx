'use client';

import { Settings } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProfileTab from './tabs/profile-tab';
import ShortcutsTab from './tabs/shortcuts-tab';
import MyDataTab from './tabs/my-data-tab';
import WorkspaceSettingsTab from './tabs/workspace-settings-tab';
import TeamTab from './tabs/team-tab';
import BillingTab from './tabs/billing-tab';
import AppsSettingsTab from './tabs/apps-settings-tab';
import ApiKeysTab from './tabs/api-keys-tab';
import PluginsTab from './tabs/plugins-tab';
import ModelsTab from './tabs/models-tab';
import { SidebarToggle } from '@/components/sidebar-toggle';

// Metadata can't be used in client components, so we'll need to move this
// to a separate layout file if needed
// export const metadata: Metadata = {
//   title: 'Settings',
//   description: 'Manage your profile settings and preferences',
// };

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'profile';

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 items-center shrink-0 gap-4 border-b bg-background px-2 sticky top-0 z-10">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <SidebarToggle />
          <Settings size={20} />
          Settings
        </h1>
      </header>
      <div className="flex flex-1">
        <nav className="w-64 border-r bg-muted/40">
          <div className="flex flex-col gap-2 p-2">
            <Link
              href="?tab=profile"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'profile'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Profile Settings
            </Link>
            <Link
              href="?tab=models"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'models'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Model Selection
            </Link>
            <Link
              href="?tab=shortcuts"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'shortcuts'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Shortcuts
            </Link>
            <Link
              href="?tab=my-data"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'my-data'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              My Data
            </Link>
            <Link
              href="?tab=workspace"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'workspace'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Workspace Settings
            </Link>
            <Link
              href="?tab=team"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'team'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Team
            </Link>
            <Link
              href="?tab=billing"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'billing'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Billing and Plan
            </Link>
            <Link
              href="?tab=apps"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'apps'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Apps Settings
            </Link>
            <Link
              href="?tab=api-keys"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'api-keys'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              API Keys
            </Link>
            <Link
              href="?tab=plugins"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === 'plugins'
                  ? 'bg-background'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
              prefetch={false}
              scroll={false}
              replace
            >
              Plugins
            </Link>
          </div>
        </nav>
        <main className="flex-1 overflow-auto p-6">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'models' && <ModelsTab />}
          {tab === 'shortcuts' && <ShortcutsTab />}
          {tab === 'my-data' && <MyDataTab />}
          {tab === 'workspace' && <WorkspaceSettingsTab />}
          {tab === 'team' && <TeamTab />}
          {tab === 'billing' && <BillingTab />}
          {tab === 'apps' && <AppsSettingsTab />}
          {tab === 'api-keys' && <ApiKeysTab />}
          {tab === 'plugins' && <PluginsTab />}
        </main>
      </div>
    </div>
  );
}
