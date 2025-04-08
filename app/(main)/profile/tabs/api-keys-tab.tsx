'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// Schema that matches both profiles and workspaces API key fields
const apiKeysFormSchema = z.object({
  openai_api_key: z.string().nullable().optional(),
  openai_organization_id: z.string().nullable().optional(),
  openrouter_api_key: z.string().nullable().optional(),
});

type ApiKeysFormValues = z.infer<typeof apiKeysFormSchema>;

export default function ApiKeysTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [keyScope, setKeyScope] = useState<'profile' | 'workspace'>('workspace');

  // Default values matching the schema
  const defaultValues = {
    openai_api_key: null,
    openai_organization_id: null,
    openrouter_api_key: null,
  };

  const form = useForm<ApiKeysFormValues>({
    resolver: zodResolver(apiKeysFormSchema),
    defaultValues,
  });

  // Load existing settings when component mounts or key scope changes
  useEffect(() => {
    const loadSettings = async () => {
      setIsInitializing(true);
      try {
        // Determine which endpoint to call based on key scope
        const endpoint =
          keyScope === 'profile'
            ? '/api/settings/profile'
            : '/api/settings/workspace';

        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Failed to load ${keyScope} settings`);
        }

        const data = await response.json();

        // Reset the form with the loaded values, falling back to defaults if needed
        form.reset({
          ...defaultValues,
          ...data,
        });
      } catch (error) {
        console.error(`Error loading ${keyScope} settings:`, error);
        toast.error(`Failed to load ${keyScope} settings`, {
          description:
            'Please try again or contact support if the issue persists.',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    loadSettings();
  }, [keyScope, form]);

  async function onSubmit(values: ApiKeysFormValues) {
    setIsLoading(true);

    try {
      // Determine which endpoint to call based on key scope
      const endpoint =
        keyScope === 'profile'
          ? '/api/settings/profile'
          : '/api/settings/workspace';

      // Convert empty strings to null
      const processedValues = {
        openai_api_key: values.openai_api_key || null,
        openai_organization_id: values.openai_organization_id || null,
        openrouter_api_key: values.openrouter_api_key || null,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedValues),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to save ${keyScope} settings`,
        );
      }

      toast.success('API Keys updated', {
        description: `Your ${keyScope}-level API keys have been updated successfully.`,
      });
    } catch (error) {
      console.error(`Error saving ${keyScope} settings:`, error);
      toast.error(`Failed to save ${keyScope} settings`, {
        description:
          'Please try again or contact support if the issue persists.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Simplified form rendering without Form context components
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Bring Your Own API Keys</CardTitle>
            <CardDescription>
              Configure your API keys for OpenAI and OpenRouter services.
            </CardDescription>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              keyScope === 'workspace'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            }`}
          >
            {keyScope === 'workspace' ? 'Workspace' : 'Profile'} Level
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isInitializing ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading settings...
            </span>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="text-sm font-medium" htmlFor="api-key-scope">
                API Key Scope
              </label>
              <Select
                value={keyScope}
                onValueChange={(value: 'profile' | 'workspace') =>
                  setKeyScope(value)
                }
              >
                <SelectTrigger className="w-[240px] mt-2">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">
                    Workspace Level (Current Workspace)
                  </SelectItem>
                  <SelectItem value="profile">
                    Profile Level (All Workspaces)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                {keyScope === 'workspace'
                  ? 'Workspace-level keys will only be used within the current workspace.'
                  : 'Profile-level keys will be used as fallbacks across all workspaces.'}
              </p>
            </div>

            <div
              className={`p-4 mb-6 rounded-md border ${
                keyScope === 'workspace'
                  ? 'bg-purple-50 border-purple-200 dark:bg-purple-950/10 dark:border-purple-900/50'
                  : 'bg-blue-50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/50'
              }`}
            >
              <h3
                className={`text-base font-medium mb-2 ${
                  keyScope === 'workspace'
                    ? 'text-purple-800 dark:text-purple-300'
                    : 'text-blue-800 dark:text-blue-300'
                }`}
              >
                {keyScope === 'workspace'
                  ? 'Workspace-Level Keys'
                  : 'Profile-Level Keys'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {keyScope === 'workspace'
                  ? 'These keys apply only to the current workspace and override any profile-level keys.'
                  : 'These keys are used as fallbacks when workspace-level keys are not provided.'}
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">OpenAI</h3>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="openai_api_key"
                    >
                      OpenAI API Key
                    </label>
                    <Input
                      id="openai_api_key"
                      type="password"
                      placeholder="sk-..."
                      {...form.register('openai_api_key')}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your OpenAI API key for accessing GPT models.
                    </p>
                    {form.formState.errors.openai_api_key && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.openai_api_key.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="openai_organization_id"
                    >
                      OpenAI Organization ID
                    </label>
                    <Input
                      id="openai_organization_id"
                      placeholder="org-..."
                      {...form.register('openai_organization_id')}
                    />
                    <p className="text-sm text-muted-foreground">
                      Optional: Your OpenAI organization ID.
                    </p>
                    {form.formState.errors.openai_organization_id && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.openai_organization_id.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">OpenRouter</h3>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="openrouter_api_key"
                    >
                      OpenRouter API Key
                    </label>
                    <Input
                      id="openrouter_api_key"
                      type="password"
                      placeholder="Your OpenRouter API key"
                      {...form.register('openrouter_api_key')}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your OpenRouter API key for accessing multiple AI models.
                    </p>
                    {form.formState.errors.openrouter_api_key && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.openrouter_api_key.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={`${
                  keyScope === 'workspace'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save ${keyScope === 'workspace' ? 'Workspace' : 'Profile'} API Keys`
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
