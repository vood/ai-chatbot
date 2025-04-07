"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const commandsFormSchema = z.object({
  assistant_command: z.string().optional(),
  files_command: z.string().optional(),
  prompt_command: z.string().optional(),
  tools_command: z.string().optional(),
})

type CommandsFormValues = z.infer<typeof commandsFormSchema>

export default function CommandsTab() {
  const [isLoading, setIsLoading] = useState(false)

  // This would normally be populated from your API/database
  const defaultValues: Partial<CommandsFormValues> = {
    assistant_command: "/assistant",
    files_command: "/files",
    prompt_command: "/prompt",
    tools_command: "/tools",
  }

  const form = useForm<CommandsFormValues>({
    resolver: zodResolver(commandsFormSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: CommandsFormValues) {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsLoading(false)
      toast.success("Commands updated", {
        description: "Your command settings have been updated successfully.",
      })
    }, 1000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Command Settings</CardTitle>
        <CardDescription>Configure your command shortcuts for quick access to features.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="assistant_command"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Command</FormLabel>
                    <FormControl>
                      <Input placeholder="/assistant" {...field} />
                    </FormControl>
                    <FormDescription>Command to access the assistant features.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="files_command"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Files Command</FormLabel>
                    <FormControl>
                      <Input placeholder="/files" {...field} />
                    </FormControl>
                    <FormDescription>Command to access file management features.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prompt_command"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt Command</FormLabel>
                    <FormControl>
                      <Input placeholder="/prompt" {...field} />
                    </FormControl>
                    <FormDescription>Command to access prompt management features.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tools_command"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tools Command</FormLabel>
                    <FormControl>
                      <Input placeholder="/tools" {...field} />
                    </FormControl>
                    <FormDescription>Command to access tools and integrations.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Commands"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

