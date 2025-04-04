'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import type { User } from 'next-auth';

import {
  MoreHorizontalIcon,
  SparklesIcon,
  TrashIcon,
} from '@/components/icons';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetcher } from '@/lib/utils';

// Define a type for Prompt based on the existing database schema
type Prompt = {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
  sharing: string;
  folder_id: string | null;
};

type PromptItemProps = {
  prompt: Prompt;
  onSelect: (prompt: Prompt) => void;
  onDelete: (promptId: string) => void;
  setOpenMobile: (open: boolean) => void;
};

function PromptItem({
  prompt,
  onSelect,
  onDelete,
  setOpenMobile,
}: PromptItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          onSelect(prompt);
          setOpenMobile(false);
        }}
      >
        <span>{prompt.name}</span>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
            showOnHover={true}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(prompt.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function SidebarPrompts({
  user,
  onSelectPrompt,
}: {
  user: User | undefined;
  onSelectPrompt: (prompt: Prompt) => void;
}) {
  const { setOpenMobile } = useSidebar();
  const {
    data: prompts,
    isLoading,
    mutate,
  } = useSWR<Array<Prompt>>(user ? '/api/prompts' : null, fetcher, {
    fallbackData: [],
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/prompts?id=${deleteId}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting prompt...',
      success: () => {
        mutate();
        return 'Prompt deleted successfully';
      },
      error: 'Failed to delete prompt',
    });

    setShowDeleteDialog(false);
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Saved Prompts
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 flex items-center">
          Saved Prompts
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {prompts && prompts.length > 0 ? (
              prompts.map((prompt) => (
                <PromptItem
                  key={prompt.id}
                  prompt={prompt}
                  onSelect={onSelectPrompt}
                  onDelete={(promptId) => {
                    setDeleteId(promptId);
                    setShowDeleteDialog(true);
                  }}
                  setOpenMobile={setOpenMobile}
                />
              ))
            ) : (
              <div className="px-2 text-zinc-500 w-full flex flex-row items-center text-xs gap-2">
                <SparklesIcon size={12} />
                <span>Save prompts to quickly reuse them</span>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              prompt and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
