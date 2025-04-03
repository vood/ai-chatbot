import { Settings } from "lucide-react"
import type { Metadata } from "next"
import ProfileTab from "./tabs/profile-tab"
import ShortcutsTab from "./tabs/shortcuts-tab"
import MyDataTab from "./tabs/my-data-tab"
import WorkspaceSettingsTab from "./tabs/workspace-settings-tab"
import TeamTab from "./tabs/team-tab"
import BillingTab from "./tabs/billing-tab"
import AppsSettingsTab from "./tabs/apps-settings-tab"
import ApiKeysTab from "./tabs/api-keys-tab"
import PluginsTab from "./tabs/plugins-tab"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile settings and preferences",
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const tab = (await searchParams).tab || "profile"

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center shrink-0 gap-4 border-b bg-background px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>
      <div className="flex flex-1">
        <nav className="w-64 border-r bg-muted/40">
          <div className="flex flex-col gap-2 p-2">
            <a
              href="?tab=profile"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "profile" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Profile Settings
            </a>
            <a
              href="?tab=shortcuts"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "shortcuts" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Shortcuts
            </a>
            <a
              href="?tab=my-data"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "my-data" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              My Data
            </a>
            <a
              href="?tab=workspace"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "workspace" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Workspace Settings
            </a>
            <a
              href="?tab=team"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "team" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Team
            </a>
            <a
              href="?tab=billing"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "billing" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Billing and Plan
            </a>
            <a
              href="?tab=apps"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "apps" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Apps Settings
            </a>
            <a
              href="?tab=api-keys"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "api-keys" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              API Keys
            </a>
            <a
              href="?tab=plugins"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                tab === "plugins" ? "bg-background" : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              Plugins
            </a>
          </div>
        </nav>
        <main className="flex-1 overflow-auto p-6">
          {tab === "profile" && <ProfileTab />}
          {tab === "shortcuts" && <ShortcutsTab />}
          {tab === "my-data" && <MyDataTab />}
          {tab === "workspace" && <WorkspaceSettingsTab />}
          {tab === "team" && <TeamTab />}
          {tab === "billing" && <BillingTab />}
          {tab === "apps" && <AppsSettingsTab />}
          {tab === "api-keys" && <ApiKeysTab />}
          {tab === "plugins" && <PluginsTab />}
        </main>
      </div>
    </div>
  )
}

