'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  SparklesIcon,
  TrashIcon,
  PlusIcon,
  LockIcon,
  GlobeIcon,
  UserIcon,
  ChevronDownIcon,
  CheckCircleFillIcon,
} from '@/components/icons';
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
import { PageHeader } from '@/components/ui/page-header';
import { ModelSelector } from '@/components/model-selector';
import type { OpenRouterModel } from '@/components/model-selector';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { AvatarUpload } from '@/components/avatar-upload';
import { createClient } from '@/lib/supabase/client';

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
  // Use image_path (assuming it exists in the table) for the public URL
  image_path: z.string().url().optional().nullable(), // Public URL
  include_profile_context: z.boolean(),
  include_workspace_instructions: z.boolean(),
  conversation_starters: z.array(z.string()).optional(),
  sharing: z.string().min(1, { message: 'Sharing status is required' }),
});

// Use Zod's inference for the form data type
type AgentFormData = z.infer<typeof agentSchema>;

// Revert Agent type to use base assistants type (assuming image_path exists there)
type Agent = Tables<'assistants'>; // Assuming image_path: string | null

// Remove sample prompts
// const samplePrompts = [...];

// Define sharing options for agents
const sharingOptions: Array<{
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can access this agent',
    icon: <LockIcon size={16} />,
  },
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone with the link can access this agent',
    icon: <GlobeIcon size={16} />,
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'Anyone in your organization can access this agent',
    icon: <UserIcon />,
  },
];

export default function AgentsPage() {
  const { agents, loading, refetchAgents } = useAgents();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModel | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

  // State for image upload (using image_path)
  const [agentImagePreview, setAgentImagePreview] = useState<
    string | undefined
  >();
  const [agentImageFile, setAgentImageFile] = useState<File | null>(null);
  // State to track the *storage path* for deletion purposes
  const [agentStoragePath, setAgentStoragePath] = useState<
    string | undefined
  >();

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
      image_path: '', // Initialize image_path
      include_profile_context: true,
      include_workspace_instructions: true,
      conversation_starters: [],
      sharing: 'private',
    },
  });

  // Function to reset image state
  const resetImageState = () => {
    setAgentImagePreview(undefined);
    setAgentImageFile(null);
    setAgentStoragePath(undefined);
  };

  // Function to extract storage path from public URL (basic example)
  // This might need adjustment based on your actual Supabase URL structure
  const getStoragePathFromUrl = (
    url: string | null | undefined,
  ): string | undefined => {
    if (!url) return undefined;
    try {
      const urlParts = new URL(url);
      // Example: https://<project_ref>.supabase.co/storage/v1/object/public/assistant_images/user_id/agent_id/file.png
      // Needs to extract the part after the bucket name
      const pathPrefix = `/storage/v1/object/public/assistant_images/`;
      if (urlParts.pathname.startsWith(pathPrefix)) {
        return urlParts.pathname.substring(pathPrefix.length);
      }
    } catch (e) {
      console.error('Error parsing image URL for storage path:', e);
    }
    return undefined;
  };

  // Combined submit handler
  const onSubmit: SubmitHandler<AgentFormData> = async (data) => {
    setIsSubmitting(true);
    let imageChanged = false;
    let newImageUrl: string | null | undefined = data.image_path; // Start with existing value
    let newStoragePath: string | undefined = agentStoragePath; // Start with existing path
    const oldImageUrl = form.getValues('image_path'); // URL before potential changes
    const oldStoragePath = agentStoragePath; // Path before potential changes

    try {
      const supabase = createClient();

      // --- Image Upload/Removal Logic ---
      if (agentImageFile) {
        // Case 1: New file selected for upload
        imageChanged = true;
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          throw new Error('User not authenticated for image upload');
        }

        const userId = sessionData.session.user.id;
        const timestamp = Date.now();
        const fileExt = agentImageFile.name.split('.').pop() || 'png';
        const agentIdPart = selectedAgentId || `new_${timestamp}`;
        const fileName = `${timestamp}.${fileExt}`;
        // Store in assistant_images bucket
        const filePath = `${userId}/${agentIdPart}/${fileName}`;

        console.log(`Uploading agent image to: assistant_images/${filePath}`);

        // Upload the new file
        const { error: uploadError } = await supabase.storage
          .from('assistant_images') // Use specified bucket
          .upload(filePath, agentImageFile, {
            upsert: true, // Overwrite if same path somehow exists
          });

        if (uploadError) {
          throw new Error(
            `Error uploading agent image: ${uploadError.message}`,
          );
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('assistant_images')
          .getPublicUrl(filePath);

        newImageUrl = urlData.publicUrl;
        newStoragePath = filePath;
        console.log(`Image uploaded: ${newImageUrl}`);

        // Delete the old image *after* successful upload if path exists and differs
        if (oldStoragePath && oldStoragePath !== newStoragePath) {
          console.log(`Removing old agent image: ${oldStoragePath}`);
          await supabase.storage
            .from('assistant_images')
            .remove([oldStoragePath])
            .then(({ error: deleteError }) => {
              if (deleteError) {
                console.warn('Failed to remove old agent image:', deleteError);
              }
            });
        }
        // Update state after successful upload
        setAgentImagePreview(newImageUrl); // Update preview URL
        setAgentStoragePath(newStoragePath); // Update storage path state
        setAgentImageFile(null); // Clear the file state
      } else if (agentImagePreview === undefined && oldImageUrl) {
        // Case 2: Image explicitly removed (preview cleared, but there was an old URL)
        imageChanged = true;
        newImageUrl = null;
        newStoragePath = undefined;

        // Delete the old image from storage if path exists
        if (oldStoragePath) {
          console.log(
            `Removing agent image due to removal action: ${oldStoragePath}`,
          );
          await supabase.storage
            .from('assistant_images')
            .remove([oldStoragePath])
            .then(({ error: deleteError }) => {
              if (deleteError) {
                console.warn(
                  'Failed to remove old agent image on removal:',
                  deleteError,
                );
              }
            });
        }
        // Update state
        setAgentImagePreview(undefined);
        setAgentStoragePath(undefined);
      }
      // Case 3: No file selected, preview not cleared -> no change to image needed
      // --- End Image Logic ---

      // Prepare payload for API
      const payload = { ...data };
      if (imageChanged) {
        payload.image_path = newImageUrl; // Update image_path in payload
      }

      console.log('Submitting agent data:', payload);

      if (selectedAgentId) {
        // Update existing agent
        await saveEditedAgent(payload);
      } else {
        // Create new agent
        await handleAddAgent(payload);
      }
    } catch (error) {
      console.error('Error during agent submission:', error);
      toast.error('Failed to save agent', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAgent = async (formData: AgentFormData) => {
    // API call remains similar, sending formData which includes image_path
    console.log('Calling API to add agent:', formData);
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Graceful error parsing
      throw new Error(errorData.error || 'Failed to add agent from API');
    }

    toast.success('Agent added successfully');
    setShowAddDialog(false);
    form.reset(); // Reset form state
    resetImageState(); // Reset image state
    refetchAgents();
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    const imageUrl = agent.image_path; // Get the image URL from agent data
    const storagePath = getStoragePathFromUrl(imageUrl); // Derive storage path

    // Reset form with the selected agent's data
    form.reset({
      name: agent.name,
      description: agent.description ?? '', // Handle null description
      prompt: agent.prompt,
      model: agent.model,
      temperature: agent.temperature,
      context_length: agent.context_length,
      image_path: imageUrl ?? '', // Set image_path field
      include_profile_context: agent.include_profile_context,
      include_workspace_instructions: agent.include_workspace_instructions,
      // Ensure conversation_starters is an array, handle null/undefined
      conversation_starters: Array.isArray(agent.conversation_starters)
        ? agent.conversation_starters
        : [],
      sharing: agent.sharing,
    });

    // Set image state for the AvatarUpload component
    setAgentImagePreview(imageUrl ?? undefined);
    setAgentStoragePath(storagePath);
    setAgentImageFile(null); // Ensure no stale file is kept

    // Set the selected model ID for the ModelSelector
    setSelectedModel(null); // Reset the model object, it will be populated when selected

    setShowEditDialog(true);
  };

  const saveEditedAgent = async (formData: AgentFormData) => {
    if (!selectedAgentId) return;
    // API call remains similar, sending formData with image_path
    console.log(`Calling API to update agent ${selectedAgentId}:`, formData);
    const response = await fetch(`/api/agents?id=${selectedAgentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Graceful error parsing
      throw new Error(errorData.error || 'Failed to update agent from API');
    }

    toast.success('Agent updated successfully');
    setShowEditDialog(false);
    form.reset(); // Reset form state
    resetImageState(); // Reset image state
    setSelectedAgentId(null); // Clear selected ID after successful edit
    refetchAgents();
  };

  const confirmDeleteAgent = (id: string) => {
    setSelectedAgentId(id);
    // Find the agent to potentially get the storage path for deletion
    const agentToDelete = agents.find((a) => a.id === id);
    const storagePathToDelete = getStoragePathFromUrl(
      agentToDelete?.image_path,
    );
    setAgentStoragePath(storagePathToDelete); // Store path for potential delete
    setShowDeleteDialog(true);
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgentId) return;
    setIsSubmitting(true);
    const storagePathToDelete = agentStoragePath; // Get path stored in confirmDeleteAgent

    try {
      // Attempt to delete from DB first
      const response = await fetch(`/api/agents?id=${selectedAgentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete agent from API');
      }

      // If DB deletion successful, attempt to delete image from storage
      if (storagePathToDelete) {
        console.log(
          `Deleting agent image from storage: ${storagePathToDelete}`,
        );
        const supabase = createClient();
        await supabase.storage
          .from('assistant_images')
          .remove([storagePathToDelete])
          .then(({ error: deleteError }) => {
            if (deleteError) {
              // Log warning, but don't fail the whole operation
              console.warn(
                `Failed to delete agent image from storage: ${deleteError.message}`,
              );
              toast.warning(
                'Agent deleted, but failed to remove image from storage.',
              );
            } else {
              console.log('Agent image successfully deleted from storage.');
            }
          });
      }

      toast.success('Agent deleted successfully');
      setShowDeleteDialog(false);
      setSelectedAgentId(null);
      setAgentStoragePath(undefined); // Clear stored path
      refetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle model selection
  const handleModelSelect = (model: OpenRouterModel) => {
    setSelectedModel(model);
    form.setValue('model', model.slug);
  };

  // Watch agent name for AvatarUpload fallback
  const agentName = form.watch('name');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader
        title="Agents"
        description="Create and manage your AI agents."
        actions={[
          {
            label: 'Add Agent',
            onClick: () => {
              form.reset(); // Reset form for add
              resetImageState(); // Reset image state for add
              setShowAddDialog(true);
            },
            icon: <PlusIcon size={16} />,
          },
        ]}
      />
      <main className="flex-1 overflow-auto p-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  // biome-ignore lint: TODO: fix this
                  key={`skeleton-${index}`}
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
                  {/* Display Agent Image (from image_path) or Fallback Icon */}
                  <div className="mb-2 flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary overflow-hidden">
                    {agent.image_path ? (
                      <img
                        src={agent.image_path}
                        alt={`${agent.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <SparklesIcon size={20} />
                    )}
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
                  resetImageState();
                  setShowAddDialog(true);
                }}
              >
                Create an Agent
              </Button>
            </div>
          )}
          {/* Add/Edit Dialog */}
          <Dialog
            open={showAddDialog || showEditDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowAddDialog(false);
                setShowEditDialog(false);
                form.reset(); // Reset form on close
                resetImageState(); // Reset image state on close
                setSelectedAgentId(null);
                setSelectedModel(null); // Reset selected model
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
                    : 'Configure a new agent.'}
                </DialogDescription>
              </DialogHeader>
              {/* Form managed by react-hook-form */}
              <Form {...form}>
                <form
                  id="agent-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 max-h-[70vh] overflow-y-auto pr-3"
                >
                  {/* Agent Image Upload Field (using image_path state) */}
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right col-span-1">
                      Image
                    </FormLabel>
                    <FormControl className="col-span-3">
                      <AvatarUpload
                        initialImage={agentImagePreview} // Use image preview state
                        name={agentName || 'Agent'} // Use watched name
                        size="lg"
                        onImageChange={(file) => {
                          if (file) {
                            console.log('Agent image selected:', file.name);
                            setAgentImageFile(file); // Store the file
                            // Generate preview
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setAgentImagePreview(
                                  event.target.result as string,
                                ); // Update preview
                              }
                            };
                            reader.readAsDataURL(file);
                            setTimeout(() => {
                              toast.info('Image selected', {
                                description:
                                  'New image will be uploaded on save.',
                              });
                            }, 0);
                          } else {
                            console.log('Agent image removed');
                            // Handle image removal
                            setAgentImagePreview(undefined); // Clear preview
                            setAgentImageFile(null); // Clear file
                            // Keep agentStoragePath until submit to handle deletion
                            setTimeout(() => {
                              toast.info('Image removed', {
                                description:
                                  'Agent image will be removed on save.',
                              });
                            }, 0);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>

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
                            value={field.value ?? ''} // Ensure value is never null
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
                          <ModelSelector
                            selectedModelId={field.value}
                            onSelectModel={handleModelSelect}
                            className="w-full"
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
                          <div className="flex items-center gap-4">
                            <Slider
                              min={0}
                              max={2}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {field.value}
                            </span>
                          </div>
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
                          <div className="flex items-center gap-4">
                            <Slider
                              min={1000}
                              max={32000} // Consider making this dynamic based on selected model
                              step={1000}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-16 text-right">
                              {field.value.toLocaleString()}
                            </span>
                          </div>
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
                    name="sharing"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right col-span-1">
                          Sharing
                        </FormLabel>
                        <FormControl className="col-span-3">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between"
                                >
                                  {sharingOptions.find(
                                    (option) => option.id === field.value,
                                  )?.label || 'Select visibility'}
                                  <ChevronDownIcon size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="w-[300px]"
                              >
                                {sharingOptions.map((option) => (
                                  <DropdownMenuItem
                                    key={option.id}
                                    onSelect={() => field.onChange(option.id)}
                                    className="gap-4 group/item flex flex-row justify-between items-center"
                                    data-active={option.id === field.value}
                                  >
                                    <div className="flex flex-col gap-1 items-start">
                                      <div className="flex items-center gap-2">
                                        {option.icon}
                                        {option.label}
                                      </div>
                                      {option.description && (
                                        <div className="text-xs text-muted-foreground">
                                          {option.description}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                                      <CheckCircleFillIcon size={16} />
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                      disabled={isSubmitting} // Disable while any submission is happening
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
                      resetImageState(); // Also reset image state on cancel
                      setSelectedAgentId(null);
                    }}
                    disabled={isSubmitting}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit" // Submit the form with the ID "agent-form"
                    form="agent-form"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : selectedAgentId ? (
                      'Save Changes'
                    ) : (
                      'Create Agent'
                    )}
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
                <AlertDialogCancel disabled={isSubmitting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAgent}
                  disabled={isSubmitting} // Disable while deleting
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Agent'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
