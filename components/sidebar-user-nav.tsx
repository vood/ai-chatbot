'use client';
import { ChevronUp, User } from 'lucide-react';
import Image from 'next/image';
import type { User as AuthUser } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

// Use a local default avatar
const DEFAULT_AVATAR = '/default-avatar.png';

export function SidebarUserNav({ user }: { user: AuthUser }) {
  const { setTheme, theme } = useTheme();
  const [profile, setProfile] = useState<{ display_name: string; image_url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, image_url')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user.id]);

  const avatarUrl = profile?.image_url || DEFAULT_AVATAR;
  const displayName = profile?.display_name || user.email || 'User';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
              <Image
                src={avatarUrl}
                alt={displayName}
                width={24}
                height={24}
                className="rounded-full"
                onError={(e) => {
                  // If the image fails to load, fall back to the default avatar
                  const target = e.target as HTMLImageElement;
                  target.src = DEFAULT_AVATAR;
                }}
              />
              <span className="truncate">{displayName}</span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer flex items-center gap-2">
                <User size={16} />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  signOut({
                    redirectTo: '/',
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
