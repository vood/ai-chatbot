"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, InfoIcon as InfoCircle } from "lucide-react"
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
  profileContext: z.string().max(1500).optional(),
  systemPromptTemplate: z.string().max(3000).optional(),
  largeTextThreshold: z.coerce.number().min(1000).max(50000).default(8000),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfileTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [profileImage, setProfileImage] = useState<string | undefined>(
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-FprAmFzcfN5UuMoSan7zmdZxCEe71z.png",
  )

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "Artem",
      email: "artem.vysotsky@gmail.com",
      profileContext: "",
      systemPromptTemplate: `Today is {local_date}.

User info: "{profile_context}"

{assistant}.

{prompt}`,
      largeTextThreshold: 8000,
    },
    mode: "onChange",
  })

  function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsLoading(false)
      toast.success("Profile updated", {
        description: "Your profile has been updated successfully.",
      })
    }, 1000)
  }

  function handleDeleteAccount() {
    setIsDeleting(true)

    // Simulate API call
    setTimeout(() => {
      setIsDeleting(false)
      toast.success("Account deleted", {
        description: "Your account has been permanently deleted.",
      })
    }, 1000)
  }

  const profileContextLength = form.watch("profileContext")?.length || 0
  const systemPromptLength = form.watch("systemPromptTemplate")?.length || 0

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
                  {form.getValues("email")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="profileContext"
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
              name="systemPromptTemplate"
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
              name="largeTextThreshold"
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
            Save Profile
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
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete My Account Permanently"}
        </Button>
      </div>
    </div>
  )
}

