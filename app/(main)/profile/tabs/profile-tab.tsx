'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, InfoIcon as InfoCircle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AvatarUpload } from '@/components/avatar-upload';
import { createClient } from '@/lib/supabase/client';

const profileFormSchema = z.object({
  name: z.string().min(1, {
    message: 'Name is required.',
  }),
  profile_context: z.string().max(1500).optional(),
  system_prompt_template: z.string().max(3000).refine(
    (value) => {
      if (!value) return true; // Allow empty values
      const requiredVariables = ['{local_date}', '{profile_context}', '{assistant}', '{prompt}'];
      return requiredVariables.every(variable => value.includes(variable));
    },
    {
      message: 'System prompt template must include all required variables: {local_date}, {profile_context}, {assistant}, {prompt}',
    }
  ).optional(),
  large_text_paste_threshold: z.coerce.number().min(1000).max(50000),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string | undefined>();

  // Default values
  const defaultValues: ProfileFormValues = {
    name: '',
    profile_context: '',
    system_prompt_template: `Today is {local_date}.

User info: "{profile_context}"

{assistant}.

{prompt}`,
    large_text_paste_threshold: 2000,
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Log any input changes to debug issues
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log(
        `Form field changed - Name: ${name}, Type: ${type}, Value:`,
        value,
      );
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Log form errors whenever they change
  useEffect(() => {
    const subscription = form.watch(() => {
      const errors = form.formState.errors;
      if (Object.keys(errors).length > 0) {
        console.log('Form validation errors:', errors);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Load profile data when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      setIsInitializing(true);
      try {
        const response = await fetch('/api/profile');

        if (!response.ok) {
          throw new Error('Failed to load profile data');
        }

        const data = await response.json();

        // Reset the form with the loaded values, falling back to defaults if needed
        form.reset({
          ...defaultValues,
          name: data.display_name || defaultValues.name,
          profile_context:
            data.profile_context || defaultValues.profile_context,
          system_prompt_template:
            data.system_prompt_template || defaultValues.system_prompt_template,
          large_text_paste_threshold:
            data.large_text_paste_threshold ||
            defaultValues.large_text_paste_threshold,
        });

        // Set profile image and path if they exist
        if (data.image_url) {
          setProfileImage(data.image_url);
        }

        if (data.image_path) {
          setImagePath(data.image_path);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast.error('Failed to load profile data', {
          description:
            'Please try again or contact support if the issue persists.',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    loadProfile();
  }, [form]);

  // Advanced validation logging
  useEffect(() => {
    // Log validation status whenever form state changes
    const subscription = form.formState.isSubmitSuccessful;
    console.log('Form validation state:', {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting,
      isSubmitted: form.formState.isSubmitted,
      isSubmitSuccessful: form.formState.isSubmitSuccessful,
    });

    return () => {};
  }, [form.formState]);

  // Create a wrapper for onSubmit to catch validation errors
  const handleSubmit = form.handleSubmit(
    (data) => {
      console.log('Form validation passed, submitting data:', data);
      onSubmit(data);
    },
    (errors) => {
      console.log('Form validation failed:', errors);
      toast.error('Form validation failed', {
        description: 'Please check the form for errors and try again.',
      });
    },
  );

  async function onSubmit(data: ProfileFormValues) {
    console.log('Form submission data:', data);
    setIsLoading(true);

    try {
      // If there's a new image file, upload it first
      let uploadedImageUrl = profileImage;
      let uploadedImagePath = imagePath;

      if (imageFile) {
        try {
          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getSession();

          if (!sessionData?.session?.user) {
            throw new Error('User not authenticated');
          }

          // Generate a unique filename
          const timestamp = Date.now();
          const fileExt = imageFile.name.split('.').pop() || 'png';
          const fileName = `${timestamp}.${fileExt}`;
          const filePath = `${sessionData.session.user.id}/${fileName}`;

          // Upload the file
          const { error: uploadError } = await supabase.storage
            .from('profile_images')
            .upload(filePath, imageFile, {
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Error uploading image: ${uploadError.message}`);
          }

          // Get the public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('profile_images').getPublicUrl(filePath);

          // Delete the old image if exists and not the default one
          if (
            imagePath &&
            imagePath !== 'default.png' &&
            !imagePath.includes('vercel-storage')
          ) {
            await supabase.storage
              .from('profile_images')
              .remove([imagePath])
              .then(({ error }) => {
                if (error) {
                  console.warn('Failed to remove old profile image:', error);
                }
              });
          }

          uploadedImageUrl = publicUrl;
          uploadedImagePath = filePath;

          // Update the state with new values
          setProfileImage(publicUrl);
          setImagePath(filePath);

          // Clear the image file after successful upload
          setImageFile(null);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload profile image', {
            description:
              'Your profile info will be saved, but the image upload failed.',
          });
        }
      }

      // Now save the profile data with the image URL
      const requestBody: Record<string, any> = {};

      // Only include fields that have changed
      requestBody.display_name = data.name;

      if (data.profile_context !== undefined) {
        requestBody.profile_context = data.profile_context;
      }

      if (data.system_prompt_template !== undefined) {
        requestBody.system_prompt_template = data.system_prompt_template;
      }

      if (data.large_text_paste_threshold !== undefined) {
        requestBody.large_text_paste_threshold =
          data.large_text_paste_threshold;
      }

      // Only add image fields if they were changed
      if (imageFile !== null || uploadedImageUrl !== profileImage) {
        requestBody.image_url = uploadedImageUrl;
        requestBody.image_path = uploadedImagePath;
      }

      console.log('Sending profile update request:', requestBody);

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update response error:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const responseData = await response.json();
      console.log('Profile update response:', responseData);

      toast.success('Profile updated', {
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile', {
        description:
          'Please try again or contact support if the issue persists.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const profileContextLength = form.watch('profile_context')?.length || 0;
  const systemPromptLength = form.watch('system_prompt_template')?.length || 0;

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center gap-4">
            <AvatarUpload
              initialImage={profileImage}
              name={form.getValues('name')}
              size="lg"
              onImageChange={(file) => {
                if (file) {
                  console.log('Profile image changed:', file.name);
                  // Store the file for later upload
                  setImageFile(file);

                  // Preview the image
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setProfileImage(event.target.result as string);
                      // Move toast outside the render cycle
                      setTimeout(() => {
                        toast.info('Image selected', {
                          description:
                            'Your new profile picture will be uploaded when you save your profile.',
                        });
                      }, 0);
                    }
                  };
                  reader.readAsDataURL(file);
                } else {
                  // Handle image removal - we'll use a default image
                  const defaultImage =
                    'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-FprAmFzcfN5UuMoSan7zmdZxCEe71z.png';
                  setProfileImage(defaultImage);
                  setImageFile(null);
                  setImagePath('default.png');
                  // Move toast outside the render cycle
                  setTimeout(() => {
                    toast.info('Profile picture removed', {
                      description:
                        'Your profile picture has been reset to default. Save to apply changes.',
                    });
                  }, 0);
                }
              }}
            />
            <div className="space-y-1 flex-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input className="text-lg font-medium" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="profile_context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    What would you like the AI to know about you to provide
                    better responses?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Profile context... (optional)"
                      className="min-h-[150px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">
                    {profileContextLength}/1500
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="system_prompt_template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt Template</FormLabel>
                  <FormControl>
                    <Textarea
                      className="font-mono text-sm min-h-[150px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">
                    {systemPromptLength}/3000
                  </div>
                  <FormDescription>
                    System prompt must include these variables:
                  </FormDescription>
                  {/* Move the list outside of FormDescription */}
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-[0.8rem] text-muted-foreground">
                    <li>{'{local_date}'} - Inserts current date</li>
                    <li>
                      {'{profile_context}'} - Inserts your profile information
                    </li>
                    <li>{'{assistant}'} - Inserts assistant instructions</li>
                    <li>{'{prompt}'} - Inserts the specific chat prompt</li>
                  </ul>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="large_text_paste_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Large Text Paste Threshold (characters)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Text larger than this will be automatically converted to a
                    file when pasted.<br/>
                    Should be between 1000 and 50000 characters.
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
