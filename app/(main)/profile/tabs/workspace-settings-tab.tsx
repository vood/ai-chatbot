'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormDescription, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/avatar-upload';
import { Loader2, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const workspaceFormSchema = z.object({
  name: z.string().min(1, {
    message: 'Workspace name is required.',
  }),
  default_context_length: z.number().min(1).max(100000).optional(),
  default_model: z.string().optional(),
  default_prompt: z.string().optional(),
  default_temperature: z.number().min(0).max(2).optional(),
  google_analytics_id: z.string().optional(),
  disable_banner: z.boolean(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

const inviteFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface TeamMember {
  email: string;
  role: "Owner" | "Member";
  status: "ACTIVE" | "PENDING" | "INVITED";
}

interface OpenRouterModel {
  slug: string;
  short_name?: string;
  endpoint?: string;
}

export default function WorkspaceSettingsTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [workspaceImage, setWorkspaceImage] = useState<string | undefined>();
  
  // Team state
  const [isInviting, setIsInviting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Add state for models
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  // Default values for workspace form
  const defaultValues: WorkspaceFormValues = {
    name: '',
    default_context_length: 4000,
    default_model: '',
    default_prompt: '',
    default_temperature: 0.7,
    google_analytics_id: '',
    disable_banner: false,
  };

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Load workspace data and members when component mounts
  useEffect(() => {
    const loadWorkspace = async () => {
      setIsInitializing(true);
      try {
        // Load workspace data
        const workspaceResponse = await fetch('/api/workspace');
        if (!workspaceResponse.ok) {
          throw new Error('Failed to load workspace data');
        }
        const workspaceData = await workspaceResponse.json();

        // Load workspace members
        const membersResponse = await fetch('/api/workspace/members');
        if (!membersResponse.ok) {
          throw new Error('Failed to load workspace members');
        }
        const membersData = await membersResponse.json();

        // Reset the form with the loaded values, falling back to defaults if needed
        workspaceForm.reset({
          name: workspaceData.name || defaultValues.name,
          default_context_length: workspaceData.default_context_length || defaultValues.default_context_length,
          default_model: workspaceData.default_model || defaultValues.default_model,
          default_prompt: workspaceData.default_prompt || defaultValues.default_prompt,
          default_temperature: workspaceData.default_temperature || defaultValues.default_temperature,
          google_analytics_id: workspaceData.google_analytics_id || defaultValues.google_analytics_id,
          disable_banner: workspaceData.disable_banner || defaultValues.disable_banner,
        });

        // Set workspace image if it exists
        if (workspaceData.image_path) {
          setWorkspaceImage(workspaceData.image_path);
        }

        // Set team members
        setTeamMembers(membersData);
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
  }, [workspaceForm]);

  // Fetch available models
  useEffect(() => {
    async function fetchModels() {
      setIsLoadingModels(true);
      try {
        const response = await fetch('/api/models');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        // Filter out models without an endpoint as they can't be used for chat
        const validModels = data.data.filter((m: OpenRouterModel) => m.endpoint);
        setModels(validModels);
      } catch (error) {
        console.error('Error fetching models:', error);
        toast.error('Failed to load available models.');
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  async function onWorkspaceSubmit(data: WorkspaceFormValues) {
    setIsLoading(true);
    try {
      console.log('Submitting workspace data:', data);
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
        throw new Error('Failed to save workspace data');
      }

      toast.success('Workspace settings saved', {
        description: 'Your workspace settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving workspace data:', error);
      toast.error('Failed to save workspace settings', {
        description: 'Please try again or contact support if the issue persists.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onInviteSubmit(data: InviteFormValues) {
    setIsInviting(true);

    try {
      const response = await fetch('/api/workspace/members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const newMember = await response.json();
      
      // Add the new member to the list
      setTeamMembers((prevMembers) => [...prevMembers, newMember]);
      
      toast.success("Invitation sent", {
        description: `An invitation has been sent to ${data.email}.`,
      });
      
      // Reset the form
      inviteForm.reset();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation', {
        description: 'Please try again or contact support if the issue persists.',
      });
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(email: string, newRole: "Owner" | "Member") {
    try {
      const response = await fetch('/api/workspace/members/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      setTeamMembers((members) =>
        members.map((member) => (member.email === email ? { ...member, role: newRole } : member)),
      );
      
      toast.success("Role updated", {
        description: `${email}'s role has been updated to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role', {
        description: 'Please try again or contact support if the issue persists.',
      });
    }
  }

  async function handleRemoveMember(email: string) {
    if (email === "artem.vysotsky@gmail.com") {
      toast.error("Cannot remove owner", {
        description: "You cannot remove the workspace owner.",
      });
      return;
    }

    try {
      const response = await fetch('/api/workspace/members/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      setTeamMembers((members) => members.filter((member) => member.email !== email));
      toast.success("Team member removed", {
        description: `${email} has been removed from the team.`,
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member', {
        description: 'Please try again or contact support if the issue persists.',
      });
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
        <h2 className="text-2xl font-bold mb-6">Workspace Settings</h2>
        <Form {...workspaceForm}>
          <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-6">
            <FormField
              control={workspaceForm.control}
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
                  <FormDescription className="mt-2">
                    This name will be visible to all team members and in shared content.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="default_context_length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Context Length</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100000}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    The default maximum number of tokens to use for context.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="default_model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingModels}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a default model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.slug} value={model.slug}>
                          {model.short_name || model.slug.split('/')[1] || model.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The default model to use for new conversations.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="default_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a default prompt"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The default prompt to use for new conversations.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={workspaceForm.control}
              name="default_temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Temperature</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0}
                        max={2}
                        step={0.1}
                        value={[field.value || 0.7]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {field.value?.toFixed(1) || '0.7'}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Controls randomness in the model's responses. Higher values make the output more random.
                  </FormDescription>
                </FormItem>
              )}
            />
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-muted/50 p-2 rounded-md transition-colors">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-medium">Advanced Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure additional workspace settings.
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-6">
                <FormField
                  control={workspaceForm.control}
                  name="google_analytics_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Analytics Measurement ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="G-XXXXXXXXXX"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This ID will be used to track visitors to your shared content in addition to our analytics.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={workspaceForm.control}
                  name="disable_banner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Disable "Built with ChatLabs" Banner</FormLabel>
                        <FormDescription>
                          Banner enabled
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
              </CollapsibleContent>
            </Collapsible>
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

      <Separator className="my-8" />

      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Workspace Members</h2>
        <div className="space-y-6">
          <div className="space-y-4">
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="flex gap-2">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Enter email address" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    'Invite'
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Current Workspace Members</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage members of your workspace and their access levels.
            </p>
            <div className="border rounded-md">
              <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium">
                <div>Email</div>
                <div>Role</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {teamMembers.map((member) => (
                <div key={member.email} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0 items-center">
                  <div className="truncate">{member.email}</div>
                  <div>
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.email, value as "Owner" | "Member")}
                      disabled={member.email === "artem.vysotsky@gmail.com"}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      member.status === "ACTIVE" 
                        ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400" 
                        : member.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400"
                    }`}>
                      {member.status}
                    </span>
                  </div>
                  <div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveMember(member.email)}
                      disabled={member.email === "artem.vysotsky@gmail.com"}
                      className={member.email === "artem.vysotsky@gmail.com" ? "opacity-0" : ""}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove team member</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
