"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2 } from "lucide-react"

const deleteDataFormSchema = z.object({
  deleteChats: z.boolean().default(false),
  deletePrompts: z.boolean().default(false),
  deleteFiles: z.boolean().default(false),
  deleteAssistants: z.boolean().default(false),
})

type DeleteDataFormValues = z.infer<typeof deleteDataFormSchema>

export default function MyDataTab() {
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<DeleteDataFormValues>({
    resolver: zodResolver(deleteDataFormSchema),
    defaultValues: {
      deleteChats: false,
      deletePrompts: false,
      deleteFiles: false,
      deleteAssistants: false,
    },
    mode: "onChange",
  })

  function onSubmit(data: DeleteDataFormValues) {
    // Check if at least one option is selected
    if (!data.deleteChats && !data.deletePrompts && !data.deleteFiles && !data.deleteAssistants) {
      toast.error("No data selected", {
        description: "Please select at least one data type to delete.",
      })
      return
    }

    setIsDeleting(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsDeleting(false)
      form.reset()
      toast.success("Data deleted", {
        description: "Your selected data has been permanently deleted.",
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-red-500 dark:text-red-400 mb-4">Delete My Data</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select the data types you wish to permanently delete across all your workspaces. This action cannot be undone.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="deleteChats"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">All Chats</FormLabel>
                    <FormDescription className="dark:text-gray-400">Permanently removes all conversation messages and history.</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deletePrompts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">All Prompts</FormLabel>
                    <FormDescription className="dark:text-gray-400">Permanently removes all saved custom prompts.</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deleteFiles"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">All Files</FormLabel>
                    <FormDescription className="dark:text-gray-400">Permanently removes all uploaded files and associated data.</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deleteAssistants"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-medium dark:text-gray-200">All Assistants</FormLabel>
                    <FormDescription className="dark:text-gray-400">
                      Permanently removes all created assistants and their configurations, including associated chats.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" variant="destructive" disabled={isDeleting} className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Selected Data"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}

