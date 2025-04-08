'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/avatar-upload';
import { Loader2 } from 'lucide-react';

const workspaceFormSchema = z.object({
  name: z.string().min(1, {
    message: 'Workspace name is required.',
  }),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export default function WorkspaceSettingsTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [workspaceImage, setWorkspaceImage] = useState<string | undefined>();

  // Default values
  const defaultValues: WorkspaceFormValues = {
    name: '',
  };

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Load workspace data when component mounts
  useEffect(() => {
    const loadWorkspace = async () => {
      setIsInitializing(true);
      try {
        const response = await fetch('/api/workspace');

        if (!response.ok) {
          throw new Error('Failed to load workspace data');
        }

        const data = await response.json();

        // Reset the form with the loaded values, falling back to defaults if needed
        form.reset({
          name: data.name || defaultValues.name,
        });

        // Set workspace image if it exists
        if (data.image_path) {
          setWorkspaceImage(data.image_path);
        }
      } catch (error) {
        console.error('Error loading workspace data:', error);
        toast.error('Failed to load workspace data', {
          description:
            'Please try again or contact support if the issue persists.',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    loadWorkspace();
  }, [form]);

  async function onSubmit(data: WorkspaceFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          image_path: workspaceImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workspace');
      }

      toast.success('Workspace updated', {
        description: 'Your workspace settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving workspace:', error);
      toast.error('Failed to update workspace', {
        description:
          'Please try again or contact support if the issue persists.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading workspace settings...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium mb-6">Workspace Name</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <AvatarUpload
                        initialImage={workspaceImage}
                        name={field.value}
                        bgColor="bg-purple-500"
                        onImageChange={(file) => {
                          if (file) {
                            console.log('Workspace image changed:', file.name);
                            // Here you would typically upload the file to your server/storage
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setWorkspaceImage(
                                  event.target.result as string,
                                );
                              }
                            };
                            reader.readAsDataURL(file);

                            toast.success('Workspace picture updated', {
                              description:
                                'Your workspace picture has been updated.',
                            });
                          } else {
                            setWorkspaceImage(undefined);
                            toast.success('Workspace picture removed', {
                              description:
                                'Your workspace picture has been removed.',
                            });
                          }
                        }}
                      />
                      <Input className="flex-1" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Workspace'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
