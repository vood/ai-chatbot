"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, InfoIcon as InfoCircle, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { AvatarUpload } from "@/components/avatar-upload"

const profileFormSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required.",
  }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(),
  profile_context: z.string().max(1500).optional(),
  system_prompt_template: z.string().max(3000).optional(),
  large_text_threshold: z.coerce.number().min(1000).max(50000).default(8000),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfileTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [profileImage, setProfileImage] = useState<string | undefined>(
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-FprAmFzcfN5UuMoSan7zmdZxCEe71z.png",
  )

  // Default values
  const defaultValues: ProfileFormValues = {
    name: "",
    email: "",
    profile_context: "",
    system_prompt_template: `Today is {local_date}.

User info: "{profile_context}"

{assistant}.

{prompt}`,
    large_text_threshold: 8000,
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  })

  // Load profile data when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      setIsInitializing(true)
      try {
        const response = await fetch("/api/profile")
        
        if (!response.ok) {
          throw new Error("Failed to load profile data")
        }
        
        const data = await response.json()
        
        // Reset the form with the loaded values, falling back to defaults if needed
        form.reset({
          ...defaultValues,
          name: data.name || defaultValues.name,
          email: data.email || defaultValues.email,
          profile_context: data.profile_context || defaultValues.profile_context,
          system_prompt_template: data.system_prompt_template || defaultValues.system_prompt_template,
          large_text_threshold: data.large_text_threshold || defaultValues.large_text_threshold,
        })

        // Set profile image if it exists
        if (data.avatar_url) {
          setProfileImage(data.avatar_url)
        }
      } catch (error) {
        console.error("Error loading profile data:", error)
        toast.error("Failed to load profile data", {
          description: "Please try again or contact support if the issue persists."
        })
      } finally {
        setIsInitializing(false)
      }
    }
    
    loadProfile()
  }, [form])

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          avatar_url: profileImage,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile")
      }
      
      toast.success("Profile updated", {
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to update profile", {
        description: "Please try again or contact support if the issue persists."
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }
    
    setIsDeleting(true)

    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete account")
      }
      
      toast.success("Account deleted", {
        description: "Your account has been permanently deleted.",
      })
      
      // Redirect to sign-in page after account deletion
      window.location.href = "/signin"
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account", {
        description: "Please try again or contact support if the issue persists."
      })
      setIsDeleting(false)
    }
  }

  const profileContextLength = form.watch("profile_context")?.length || 0
  const systemPromptLength = form.watch("system_prompt_template")?.length || 0

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex items-center gap-4">
            <AvatarUpload
              initialImage={profileImage}
              name={form.getValues("name")}
              size="lg"
              onImageChange={(file) => {
                if (file) {
                  console.log("Profile image changed:", file.name)
                  // Here you would typically upload the file to your server/storage
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setProfileImage(event.target.result as string)
                    }
                  }
                  reader.readAsDataURL(file)

                  toast.success("Profile picture updated", {
                    description: "Your new profile picture has been uploaded.",
                  })
                } else {
                  setProfileImage(undefined)
                  toast.success("Profile picture removed", {
                    description: "Your profile picture has been removed.",
                  })
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
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 mr-1"
                  >
                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                  </svg>
                  {form.watch("email")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="profile_context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What would you like the AI to know about you to provide better responses?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Profile context... (optional)"
                      className="min-h-[150px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">{profileContextLength}/1500</div>
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
                  <div className="flex items-center gap-2">
                    <FormLabel>System Prompt Template</FormLabel>
                    <InfoCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <FormControl>
                    <Textarea className="font-mono text-sm min-h-[150px] resize-none" {...field} />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">{systemPromptLength}/3000</div>
                  <FormDescription>System prompt must include these variables:</FormDescription>
                  {/* Move the list outside of FormDescription */}
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-[0.8rem] text-muted-foreground">
                    <li>{"{local_date}"} - Inserts current date</li>
                    <li>{"{profile_context}"} - Inserts your profile information</li>
                    <li>{"{assistant}"} - Inserts assistant instructions</li>
                    <li>{"{prompt}"} - Inserts the specific chat prompt</li>
                  </ul>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="large_text_threshold"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Large Text Paste Threshold (characters)</FormLabel>
                    <InfoCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Text larger than this will be automatically converted to a file when pasted.
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="bg-[#18181b] hover:bg-[#18181b]/90">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </form>
      </Form>

      <Separator className="my-8" />

      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
        <h3 className="text-2xl font-semibold text-red-500 dark:text-red-400 mb-4">Delete Account</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This action will permanently delete your entire account, including all associated data like profile settings,
          workspaces, chats, prompts, files, and API keys. This action is irreversible.
        </p>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="flex items-center gap-2"
        >
          {isDeleting ? (
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
  )
}

