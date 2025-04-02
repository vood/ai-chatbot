"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { AvatarUpload } from "@/components/avatar-upload"

const workspaceFormSchema = z.object({
  name: z.string().min(1, {
    message: "Workspace name is required.",
  }),
})

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>

export default function WorkspaceSettingsTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [workspaceImage, setWorkspaceImage] = useState<string | undefined>()

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: "ChatLabs Official",
    },
    mode: "onChange",
  })

  function onSubmit(data: WorkspaceFormValues) {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsLoading(false)
      toast.success("Workspace updated", {
        description: "Your workspace settings have been updated successfully.",
      })
    }, 1000)
  }

  function handleDeleteWorkspace() {
    setIsDeleting(true)

    // Simulate API call
    setTimeout(() => {
      setIsDeleting(false)
      toast.success("Workspace deleted", {
        description: "Your workspace has been deleted successfully.",
      })
    }, 1000)
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
                            console.log("Workspace image changed:", file.name)
                            // Here you would typically upload the file to your server/storage
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setWorkspaceImage(event.target.result as string)
                              }
                            }
                            reader.readAsDataURL(file)

                            toast.success("Workspace picture updated", {
                              description: "Your workspace picture has been updated.",
                            })
                          } else {
                            setWorkspaceImage(undefined)
                            toast.success("Workspace picture removed", {
                              description: "Your workspace picture has been removed.",
                            })
                          }
                        }}
                      />
                      <Input className="flex-1" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="bg-[#18181b] hover:bg-[#18181b]/90">
              Save Workspace
            </Button>
          </form>
        </Form>
      </div>

      <div className="border-t pt-8">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
          <h3 className="text-xl font-medium text-red-500 dark:text-red-400 mb-2">Danger Zone</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Once you delete a workspace, there is no going back. Please be certain.</p>
          <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Workspace"}
          </Button>
        </div>
      </div>
    </div>
  )
}

