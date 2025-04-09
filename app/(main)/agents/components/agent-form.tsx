'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, X, Plus, Upload, File, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/button';
import { ImageUploader } from '@/components/image-uploader';
import type { OpenRouterModel } from '@/types';
import { Slider } from '@/components/ui/slider';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { Tables, TablesInsert } from '@/supabase/types';
import { ModelSelector } from '@/components/model-selector';

// Define a simple interface without the problematic fields
interface AgentFormValues {
  name: string;
  description?: string;
  prompt: string;
  model: string;
  temperature: number;
  context_length: number;
  image_path?: string | null;
  conversation_starters?: string[];
  files?: File[];
}

// Define Zod schema for Agent form validation
const agentSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  prompt: z.string().min(1, { message: 'Prompt is required' }),
  model: z.string().min(1, { message: 'Model is required' }),
  temperature: z.coerce
    .number()
    .min(0, { message: 'Temperature must be >= 0' })
    .max(2, { message: 'Temperature must be <= 2' }),
  context_length: z.coerce
    .number()
    .int({ message: 'Context length must be an integer' })
    .min(1, { message: 'Context length must be positive' }),
  image_path: z.string().url().optional().or(z.literal('')),
  conversation_starters: z.array(z.string()).optional(),
  files: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string(),
        file_path: z.string(),
        size: z.number(),
        type: z.string(),
      }),
    )
    .optional(),
});

// Use Zod's inference for the form data type
type AgentFormData = z.infer<typeof agentSchema>;

export type KnowledgeFile = TablesInsert<'files'>;

// Update the KnowledgeFile type definition to match what we're using

interface AgentFormProps {
  initialData?: {
    id?: string;
    name?: string;
    description?: string;
    prompt?: string;
    model?: string;
    temperature?: number;
    context_length?: number;
    image_path?: string | null;
    conversation_starters?: string[] | null;
    files?: []; // Add this field to match what's being used in the form
  };
  onSubmit: (data: AgentFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AgentForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting: formSubmitting,
  setIsSubmitting: setFormSubmitting,
}: AgentFormProps) {
  const router = useRouter();
  const [agentImagePreview, setAgentImagePreview] = useState<
    string | undefined
  >(initialData?.image_path || undefined);
  const [agentImageFile, setAgentImageFile] = useState<File | null>(null);
  const [agentStoragePath, setAgentStoragePath] = useState<
    string | undefined
  >();
  const [selectedModel, setSelectedModel] = useState<OpenRouterModel | null>(
    null,
  );
  // Add state for dynamic model limits
  const [maxContextLength, setMaxContextLength] = useState(32000);
  const [tempRange, setTempRange] = useState({ min: 0, max: 2 });
  const [files, setFiles] = useState<(File | KnowledgeFile)[]>(
    initialData?.files || [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(
    formSubmitting || false,
  );

  // Initialize form with default or provided values
  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      prompt: initialData?.prompt || '',
      model: initialData?.model || '',
      temperature: initialData?.temperature || 1,
      context_length: initialData?.context_length || 4096,
      image_path: initialData?.image_path || '',
      conversation_starters: initialData?.conversation_starters || [],
      files: initialData?.files || [],
    },
  });

  useEffect(() => {
    console.log('Form values:', form.getValues());
    console.log('Initial data:', initialData);
    console.log('Files state:', files);
    console.log('Form errors:', form.formState.errors);
  }, [form, initialData, form.formState.errors, files]);

  // Function to extract storage path from public URL
  const getStoragePathFromUrl = (
    url: string | null | undefined,
  ): string | undefined => {
    if (!url) return undefined;
    try {
      const urlParts = new URL(url);
      const pathPrefix = `/storage/v1/object/public/assistant_images/`;
      if (urlParts.pathname.startsWith(pathPrefix)) {
        return urlParts.pathname.substring(pathPrefix.length);
      }
    } catch (e) {
      console.error('Error parsing image URL for storage path:', e);
    }
    return undefined;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    toast.success(`Added ${newFiles.length} file(s)`, {
      description: 'Files will be uploaded when you save the agent',
    });
  };

  // Handle file removal
  const handleFileRemove = (index: number) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  };

  // Handle form submission
  const handleFormSubmit: SubmitHandler<AgentFormData> = async (data) => {
    // Check if image_path is null or empty and we have initialData with image_path
    if (
      (!data.image_path || data.image_path === '') &&
      initialData?.image_path
    ) {
      // Keep the original image_path if no new image was selected
      data.image_path = initialData.image_path;
    } else if (data.image_path === null) {
      data.image_path = ''; // Use empty string instead of null
    }

    setIsSubmitting(true);
    if (setFormSubmitting) setFormSubmitting(true);

    try {
      const filesData: KnowledgeFile[] = [];
      const supabaseClient = createClient();

      // Get the current user ID for file uploads
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        toast.error('Authentication error', {
          description: 'You must be logged in to upload files',
        });
        throw new Error('Authentication failed');
      }

      for (const file of files) {
        try {
          if (isFileObject(file)) {
            // Upload to storage if it's a File object
            const fileName = file.name;
            // Create a path with user ID as first folder
            const filePath = `${user.id}/${uuidv4()}-${fileName.replace(/\s+/g, '_')}`;

            const { error: uploadError } = await supabaseClient.storage
              .from('files') // Use 'files' bucket instead of 'agents'
              .upload(filePath, file);

            if (uploadError) {
              console.error('Error uploading file:', uploadError);
              toast.error(`Failed to upload ${fileName}`, {
                description: 'Please try again later',
              });
              continue;
            }

            // Get the public URL
            const {
              data: { publicUrl },
            } = supabaseClient.storage.from('files').getPublicUrl(filePath);

            filesData.push({
              name: fileName,
              file_path: filePath,
              description: '',
              size: file.size,
              type: file.type,
              tokens: 0,
              sharing: 'private',
              user_id: user.id,
            });
          } else {
            // Add existing knowledge file
            filesData.push(file);
          }
        } catch (error) {
          console.error('Error processing file:', error);
        }
      }

      console.log('Files data:', filesData);

      // Submit with proper fields
      await onSubmit({
        ...data,
        files: filesData,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to save agent', {
        description: 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
      if (setFormSubmitting) setFormSubmitting(false);
    }
  };

  // Add a type guard function to check if an object is a File
  function isFileObject(obj: any): obj is File {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'name' in obj &&
      'size' in obj &&
      'type' in obj &&
      !('storage_path' in obj)
    );
  }

  // Handle model selection
  const handleModelSelect = (model: OpenRouterModel) => {
    setSelectedModel(model);
    form.setValue('model', model.slug);

    // Update context length limit based on model
    const modelContextLength =
      model.endpoint?.context_length || model.context_length;
    if (modelContextLength) {
      setMaxContextLength(modelContextLength);

      // Optional: Adjust context length if current value exceeds the model's limit
      const currentContextLength = form.getValues('context_length');
      if (currentContextLength > modelContextLength) {
        form.setValue('context_length', modelContextLength);
      }
    }

    // Check temperature if current value exceeds the recommended range
    // Most models use 0-2 range but some like Claude might prefer different ranges
    const currentTemp = form.getValues('temperature');
    if (currentTemp > tempRange.max) {
      form.setValue('temperature', tempRange.max);
    }
  };

  // Watch agent name for AvatarUpload fallback
  const agentName = form.watch('name');

  return (
    <Form {...form}>
      <form
        id="agent-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6 max-h-[70vh] overflow-y-auto pr-3 p-3"
      >
        {/* Agent Image */}
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <ImageUploader
              initialImage={agentImagePreview}
              name={agentName || 'Agent'}
              size="lg"
              bucket="assistant_images"
              onImageChange={(file) => {
                if (file) {
                  console.log('Agent image selected:', file.name);
                  setAgentImageFile(file);
                  // Don't modify form.image_path here - let upload handle it
                } else {
                  console.log('Agent image removed');
                  setAgentImagePreview(undefined);
                  setAgentImageFile(null);

                  // Only clear image_path if user explicitly removed the image
                  if (initialData?.image_path) {
                    // Keep track that the user wants to remove the image
                    form.setValue('image_path', '');
                    toast.info('Image will be removed on save');
                  }
                }
              }}
              onImageUploaded={(url, path) => {
                console.log('Image uploaded to:', url);
                setAgentImagePreview(url);
                form.setValue('image_path', url);
                setAgentStoragePath(path);
              }}
              circular={true}
              showPencilIcon={false}
            />
          </div>
        </div>

        {/* Name and Model rows */}
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Custom Agent" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <ModelSelector
                    selectedModelId={field.value}
                    onSelectModel={handleModelSelect}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this agent does..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prompt field */}
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="You are a helpful assistant... Use {variable} for inputs."
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Temperature and Context Length row */}
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Slider
                      min={tempRange.min}
                      max={tempRange.max}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={(vals) =>
                        field.onChange(Number.parseFloat(vals[0].toFixed(2)))
                      }
                      className="mt-3"
                    />
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        Precise {tempRange.min}
                      </span>
                      <span className="text-sm font-medium">
                        {field.value.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Creative {tempRange.max}
                      </span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="context_length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Context Length</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Slider
                      min={1000}
                      max={maxContextLength}
                      step={1000}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="mt-3"
                    />
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">0</span>
                      <span className="text-sm font-medium">
                        {field.value.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {maxContextLength.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </FormControl>
                <FormDescription className="mt-1">
                  Maximum tokens to consider when responding
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Knowledge Files */}
        <div>
          <FormLabel className="block mb-2">Knowledge Files</FormLabel>
          <div className="space-y-3">
            <div className="flex">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
            </div>

            {files.length > 0 ? (
              <div className="border rounded-md overflow-hidden divide-y">
                {files.map((file, index) => {
                  // Skip rendering invalid files
                  const name = isFileObject(file)
                    ? file.name
                    : (file as KnowledgeFile).name;
                  const size = isFileObject(file)
                    ? file.size
                    : (file as KnowledgeFile).size;

                  // If we can't get name or size, it's likely an invalid file object
                  if (!name) return null;

                  return (
                    <div
                      key={`file-${index}-${name}`}
                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <div className="grid gap-0.5">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeof size === 'number'
                              ? `${(size / 1024).toFixed(1)} KB`
                              : 'Unknown size'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileRemove(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
                No files added yet. Upload files to give your agent additional
                knowledge.
              </p>
            )}

            <FormDescription>
              Add PDF, TXT, or other document files that your agent can
              reference during conversations.
            </FormDescription>
          </div>
        </div>

        {/* Conversation Starters */}
        <FormField
          control={form.control}
          name="conversation_starters"
          render={({ field }) => {
            const [currentStarter, setCurrentStarter] = useState('');

            const addStarter = () => {
              if (currentStarter.trim() === '') return;

              // Create a new array with the current starters plus the new one
              const updatedStarters = [
                ...(Array.isArray(field.value) ? field.value : []),
                currentStarter.trim(),
              ];

              // Update the form field
              field.onChange(updatedStarters);

              // Clear the input
              setCurrentStarter('');
            };

            const removeStarter = (index: number) => {
              if (!Array.isArray(field.value)) return;
              const updatedStarters = [...field.value];
              updatedStarters.splice(index, 1);
              field.onChange(updatedStarters);
            };

            const handleKeyDown = (
              e: React.KeyboardEvent<HTMLInputElement>,
            ) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                addStarter();
              }
            };

            // Ensure field.value is always an array
            const starters = Array.isArray(field.value) ? field.value : [];

            return (
              <FormItem>
                <FormLabel>Conversation Starters</FormLabel>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a conversation starter..."
                      value={currentStarter}
                      onChange={(e) => setCurrentStarter(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addStarter}
                      disabled={!currentStarter.trim()}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add</span>
                    </Button>
                  </div>

                  {starters.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {starters.map((starter, index) => (
                        <Button
                          key={`starter-${index}-${starter}`}
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => removeStarter(index)}
                        >
                          {starter}
                          <X className="h-4 w-4 pl-1 hover:cursor-pointer" />
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
                      No conversation starters added yet.
                    </p>
                  )}
                </div>
              </FormItem>
            );
          }}
        />
      </form>
    </Form>
  );
}
