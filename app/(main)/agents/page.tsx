'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SparklesIcon, TrashIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarToggle } from '@/components/sidebar-toggle';
import type { Tables } from '@/supabase/types';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useAgents } from '@/hooks/use-agents';

// Define Zod schema for Agent form validation
const agentSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  prompt: z.string().min(1, { message: 'Prompt is required' }),
  model: z.string().min(1, { message: 'Model is required' }),
  temperature: z.coerce // Coerce input to number
    .number()
    .min(0, { message: 'Temperature must be >= 0' })
    .max(2, { message: 'Temperature must be <= 2' }),
  context_length: z.coerce // Coerce input to number
    .number()
    .int({ message: 'Context length must be an integer' })
    .min(1, { message: 'Context length must be positive' }),
  image_path: z.string().optional(),
  include_profile_context: z.boolean(),
  include_workspace_instructions: z.boolean(),
  conversation_starters: z.array(z.string()).optional(),
  embeddings_provider: z
    .string()
    .min(1, { message: 'Embeddings provider is required' }),
  sharing: z.string().min(1, { message: 'Sharing status is required' }),
});

// Use Zod's inference for the form data type
type AgentFormData = z.infer<typeof agentSchema>;

// Define Agent type based on assistants table
type Agent = Tables<'assistants'>;

// Remove sample prompts
// const samplePrompts = [...];

export default function AgentsPage() {
  const { agents, loading, refetchAgents } = useAgents();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Initialize react-hook-form
  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      description: '',
      prompt: '',
      model: '',
      temperature: 1,
      context_length: 4096,
      image_path: '',
      include_profile_context: true,
      include_workspace_instructions: true,
      conversation_starters: [],
      embeddings_provider: 'openai',
      sharing: 'private',
    },
  });

  // Combined submit handler
  const onSubmit: SubmitHandler<AgentFormData> = async (data) => {
    if (selectedAgentId) {
      // Update existing agent
      await saveEditedAgent(data);
    } else {
      // Create new agent
      await handleAddAgent(data);
    }
  };

  const handleAddAgent = async (formData: AgentFormData) => {
    try {
      // TODO: Update API endpoint when created
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add agent');
      }

      toast.success('Agent added successfully');
      setShowAddDialog(false);
      form.reset(); // Reset form state
      refetchAgents();
    } catch (error) {
      toast.error('Failed to add agent');
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    // Reset form with the selected agent's data
    form.reset({
      name: agent.name,
      description: agent.description ?? '', // Handle null description
      prompt: agent.prompt,
      model: agent.model,
      temperature: agent.temperature,
      context_length: agent.context_length,
      image_path: agent.image_path ?? '', // Handle null image_path
      include_profile_context: agent.include_profile_context,
      include_workspace_instructions: agent.include_workspace_instructions,
      // Ensure conversation_starters is an array, handle null/undefined
      conversation_starters: Array.isArray(agent.conversation_starters)
        ? agent.conversation_starters
        : [],
      embeddings_provider: agent.embeddings_provider,
      sharing: agent.sharing,
    });
    setShowEditDialog(true);
  };

  const saveEditedAgent = async (formData: AgentFormData) => {
    if (!selectedAgentId) return;

    try {
      // TODO: Update API endpoint when created
      const response = await fetch(`/api/agents?id=${selectedAgentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      toast.success('Agent updated successfully');
      setShowEditDialog(false);
      form.reset(); // Reset form state
      setSelectedAgentId(null); // Clear selected ID after successful edit
      refetchAgents();
    } catch (error) {
      toast.error('Failed to update agent');
    }
  };

  const confirmDeleteAgent = (id: string) => {
    setSelectedAgentId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgentId) return;

    try {
      // TODO: Update API endpoint when created
      const response = await fetch(`/api/agents?id=${selectedAgentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      toast.success('Agent deleted successfully');
      setShowDeleteDialog(false);
      setSelectedAgentId(null);
      refetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  // No longer need manual resetForm, use form.reset()

  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center justify-between w-full">
          <h1 className="font-semibold text-lg flex items-center gap-2">
            <SidebarToggle />
            <SparklesIcon size={20} />
            Agents
          </h1>
          <Button
            size="sm"
            onClick={() => {
              setSelectedAgentId(null); // Ensure we are in "add" mode
              form.reset(); // Reset form to default values
              setShowAddDialog(true);
            }}
          >
            <PlusIcon size={14} />
            <span>New Agent</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 sm:px-6 sm:py-0">
        <div className="max-w-5xl mx-auto">
          <div className="text-sm text-muted-foreground mb-6">
            Create agents with template variables like {'{variable}'} and use
            them quickly by typing / in the chat.
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  // biome-ignore lint: TODO: fix this
                  key={`skeleton-${index}`} // Use a more specific key
                  className="flex flex-col items-center text-center p-4 rounded-lg border bg-card/50"
                >
                  <Skeleton className="w-10 h-10 rounded-full mb-2" />
                  <Skeleton className="h-5 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-5/6 mb-3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleEditAgent(agent)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleEditAgent(agent);
                    }
                  }}
                  className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="mb-2 p-2 rounded-full bg-primary/10 text-primary">
                    <SparklesIcon size={20} />
                  </div>
                  <h3
                    className="font-semibold mb-1 truncate w-full"
                    title={agent.name}
                  >
                    {agent.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-grow">
                    {agent.description || agent.prompt}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-10 border border-dashed rounded-lg">
              <div className="mb-4 p-3 rounded-full bg-secondary/20 text-secondary-foreground">
                <SparklesIcon size={48} />
              </div>
              <h3 className="font-medium mb-2">No agents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first agent to quickly reuse in chats.
              </p>
              <Button
                onClick={() => {
                  form.reset();
                  setShowAddDialog(true);
                }}
              >
                Create an Agent
              </Button>
            </div>
          )}
          {/* Add/Edit Dialog - Use the same dialog, title changes based on selectedAgentId */}
          <Dialog
            open={showAddDialog || showEditDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowAddDialog(false);
                setShowEditDialog(false);
                form.reset(); // Reset form on close
                setSelectedAgentId(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedAgentId ? 'Edit Agent' : 'Create New Agent'}
                </DialogTitle>
                <DialogDescription>
                  {selectedAgentId
                    ? 'Update the agent configuration.'
                    : 'Configure a new agent. Use {variable} in the prompt for template variables.'}
                </DialogDescription>
              </DialogHeader>
              {/* Form managed by react-hook-form */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 max-h-[70vh] overflow-y-auto pr-3"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Name
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <Input placeholder="My Custom Agent" {...field} />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-start gap-4">
                        <FormLabel className="text-right col-span-1 pt-2">
                          Description
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <Textarea
                            placeholder="Describe what this agent does..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-start gap-4">
                        <FormLabel className="text-right col-span-1 pt-2">
                          Prompt
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <Textarea
                            placeholder="You are a helpful assistant... Use {variable} for inputs."
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Model
                        </FormLabel>
                        <FormControl className="col-span-3">
                          {/* TODO: Replace with Select component */}
                          <Input
                            placeholder="E.g., gpt-4, claude-3-opus..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Temperature
                        </FormLabel>
                        <FormControl className="col-span-3">
                          {/* TODO: Consider Slider component */}
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="context_length"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Context Length
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <Input
                            type="number"
                            placeholder="E.g., 4096, 8192..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image_path"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Image Path
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <Input
                            placeholder="Optional: path/to/agent/image.png"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conversation_starters"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-start gap-4">
                        <FormLabel className="text-right col-span-1 pt-2">
                          Conv. Starters
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <Textarea
                            placeholder="Enter one starter per line (optional)"
                            rows={3}
                            {...field}
                            value={
                              Array.isArray(field.value)
                                ? field.value.join('\n')
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  .split('\n')
                                  .filter((s) => s.trim() !== ''),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="embeddings_provider"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Embeddings
                        </FormLabel>
                        <FormControl className="col-span-3">
                          {/* TODO: Replace with Select: openai, local */}
                          <Input placeholder="openai or local" {...field} />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sharing"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Sharing
                        </FormLabel>
                        <FormControl className="col-span-3">
                          {/* TODO: Replace with Select: private, public, organization */}
                          <Input
                            placeholder="private, public, organization"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right col-span-1"></span>{' '}
                    {/* Placeholder */}{' '}
                    <div className="col-span-3 flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="include_profile_context"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Include Profile Context
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="include_workspace_instructions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Include Workspace Instructions
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Keep DialogFooter outside the form element but inside DialogContent */}
                </form>
              </Form>
              <DialogFooter className="pt-4 justify-between">
                <div>
                  {' '}
                  {/* Left side - Delete Button (only in edit mode) */}{' '}
                  {selectedAgentId && (
                    <Button
                      type="button" // Prevent form submission
                      variant="destructive"
                      onClick={() => {
                        setShowEditDialog(false); // Close edit dialog first
                        confirmDeleteAgent(selectedAgentId);
                      }}
                    >
                      <TrashIcon size={14} /> Delete
                    </Button>
                  )}
                </div>
                <div>
                  {' '}
                  {/* Right side - Cancel/Submit Buttons */}{' '}
                  <Button
                    type="button" // Prevent form submission
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setShowEditDialog(false);
                      form.reset();
                      setSelectedAgentId(null);
                    }}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" form="agent-form">
                    {' '}
                    {/* Associate with form */}{' '}
                    {form.formState.isSubmitting
                      ? 'Saving...'
                      : selectedAgentId
                        ? 'Save Changes'
                        : 'Create Agent'}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Delete Confirmation Dialog */}{' '}
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  selected agent and its associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAgent}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Agent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
