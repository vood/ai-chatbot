'use client';

import { useState } from 'react';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

const preferencesFormSchema = z.object({
  send_message_on_enter: z.boolean().default(true),
  experimental_code_editor: z.boolean().default(false),
  workspace_migration_enabled: z.boolean().default(false),
  system_prompt_template: z.string().optional(),
  large_text_paste_threshold: z.number().min(0).max(100000).default(5000),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export default function PreferencesTab() {
  const [isLoading, setIsLoading] = useState(false);

  // This would normally be populated from your API/database
  const defaultValues: Partial<PreferencesFormValues> = {
    send_message_on_enter: true,
    experimental_code_editor: false,
    workspace_migration_enabled: false,
    system_prompt_template: 'You are a helpful assistant.',
    large_text_paste_threshold: 5000,
  };

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  function onSubmit(data: PreferencesFormValues) {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Preferences updated', {
        description: 'Your preferences have been updated successfully.',
      });
    }, 1000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Customize your experience with these preference settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="send_message_on_enter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Send Message on Enter
                      </FormLabel>
                      <FormDescription>
                        Press Enter to send messages instead of using
                        Shift+Enter.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="experimental_code_editor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Experimental Code Editor
                      </FormLabel>
                      <FormDescription>
                        Enable experimental code editor features.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workspace_migration_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Workspace Migration
                      </FormLabel>
                      <FormDescription>
                        Enable workspace migration features.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="system_prompt_template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt Template</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your default system prompt template"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Default system prompt template to use for new conversations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="large_text_paste_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Large Text Paste Threshold ({field.value} characters)
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={1000}
                      max={20000}
                      step={1000}
                      defaultValue={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Character threshold for showing the large text paste
                    warning.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
