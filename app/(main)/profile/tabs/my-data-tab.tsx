'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const deleteDataFormSchema = z.object({
  deleteChats: z.boolean(),
  deletePrompts: z.boolean(),
  deleteFiles: z.boolean(),
  deleteAssistants: z.boolean(),
});

type DeleteDataFormValues = z.infer<typeof deleteDataFormSchema>;

export default function MyDataTab() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  const form = useForm<DeleteDataFormValues>({
    resolver: zodResolver(deleteDataFormSchema),
    defaultValues: {
      deleteChats: false,
      deletePrompts: false,
      deleteFiles: false,
      deleteAssistants: false,
    },
    mode: 'onChange',
  });

  function onSubmit(data: DeleteDataFormValues) {
    // Check if at least one option is selected
    if (
      !data.deleteChats &&
      !data.deletePrompts &&
      !data.deleteFiles &&
      !data.deleteAssistants
    ) {
      toast.error('No data selected', {
        description: 'Please select at least one data type to delete.',
      });
      return;
    }

    setIsDeleting(true);

    // Simulate API call
    setTimeout(() => {
      console.log(data);
      setIsDeleting(false);
      form.reset();
      toast.success('Data deleted', {
        description: 'Your selected data has been permanently deleted.',
      });
    }, 1000);
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        'Are you sure you want to delete your account? This action cannot be undone.',
      )
    ) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      toast.success('Account deleted', {
        description: 'Your account has been permanently deleted.',
      });

      // Redirect to sign-in page after account deletion
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account', {
        description:
          'Please try again or contact support if the issue persists.',
      });
      setIsDeletingAccount(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (
      !confirm(
        'Are you sure you want to delete this workspace? This action cannot be undone.',
      )
    ) {
      return;
    }

    setIsDeletingWorkspace(true);

    try {
      const response = await fetch('/api/workspace', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }

      toast.success('Workspace deleted', {
        description: 'Your workspace has been deleted successfully.',
      });

      // Redirect to workspaces page after deletion
      window.location.href = '/workspaces';
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error('Failed to delete workspace', {
        description:
          'Please try again or contact support if the issue persists.',
      });
      setIsDeletingWorkspace(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-red-500 dark:text-red-400 mb-4">
          Delete My Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select the data types you wish to permanently delete across all your
          workspaces. This action cannot be undone.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="deleteChats"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">
                      All Chats
                    </FormLabel>
                    <FormDescription className="dark:text-gray-400">
                      Permanently removes all conversation messages and history.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deletePrompts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">
                      All Prompts
                    </FormLabel>
                    <FormDescription className="dark:text-gray-400">
                      Permanently removes all saved custom prompts.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deleteFiles"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">
                      All Files
                    </FormLabel>
                    <FormDescription className="dark:text-gray-400">
                      Permanently removes all uploaded files and associated
                      data.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deleteAssistants"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">
                      All Assistants
                    </FormLabel>
                    <FormDescription className="dark:text-gray-400">
                      Permanently removes all created assistants and their
                      configurations, including associated chats.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Selected Data'}
            </Button>
          </form>
        </Form>
      </div>

      <Separator className="my-8" />

      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-red-500 dark:text-red-400 mb-4">
          Delete Workspace
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This action will permanently delete your current workspace, including all
          workspace-specific settings, shared content, and team memberships. This action is irreversible.
        </p>
        <Button
          variant="destructive"
          onClick={handleDeleteWorkspace}
          disabled={isDeletingWorkspace}
          className="flex items-center gap-2"
        >
          {isDeletingWorkspace ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Delete Workspace Permanently
            </>
          )}
        </Button>
      </div>

      <Separator className="my-8" />

      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-red-500 dark:text-red-400 mb-4">
          Delete Account
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This action will permanently delete your entire account, including all
          associated data like profile settings, workspaces, chats, prompts,
          files, and API keys. This action is irreversible.
        </p>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={isDeletingAccount}
          className="flex items-center gap-2"
        >
          {isDeletingAccount ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Delete My Account Permanently
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
