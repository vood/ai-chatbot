"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

const shortcutsFormSchema = z.object({
  send_message_on_enter: z.boolean().default(true),
  assistant_command: z.string().default("@"),
  plugins_command: z.string().default("!"),
  prompt_command: z.string().default("/"),
  files_command: z.string().default("#"),
})

type ShortcutsFormValues = z.infer<typeof shortcutsFormSchema>

export default function ShortcutsTab() {
  const [isLoading, setIsLoading] = useState(false)

  // This would normally be populated from your API/database
  const defaultValues: ShortcutsFormValues = {
    send_message_on_enter: true,
    assistant_command: "@",
    plugins_command: "!",
    prompt_command: "/",
    files_command: "#",
  }

  const form = useForm<ShortcutsFormValues>({
    resolver: zodResolver(shortcutsFormSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: ShortcutsFormValues) {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsLoading(false)
      toast.success("Shortcuts updated", {
        description: "Your shortcuts have been updated successfully.",
      })
    }, 1000)
  }

  function resetToDefaults() {
    form.reset(defaultValues)
    toast.success("Shortcuts reset", {
      description: "Your shortcuts have been reset to defaults.",
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between border-b pb-6">
          <FormField
            control={form.control}
            name="send_message_on_enter"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-y-0">
                <FormLabel className="text-base">Send message on ⌘+Enter</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <FormField
            control={form.control}
            name="assistant_command"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel className="text-base font-normal">Assistant command</FormLabel>
                <FormControl>
                  <Input className="w-[300px] text-base" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plugins_command"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel className="text-base font-normal">Plugins command</FormLabel>
                <FormControl>
                  <Input className="w-[300px] text-base" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prompt_command"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel className="text-base font-normal">Prompt command</FormLabel>
                <FormControl>
                  <Input className="w-[300px] text-base" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="files_command"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel className="text-base font-normal">Files command</FormLabel>
                <FormControl>
                  <Input className="w-[300px] text-base" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={resetToDefaults}
            className="w-[200px] bg-muted hover:bg-muted/80"
          >
            Reset to defaults
          </Button>
          <Button type="submit" disabled={isLoading} className="w-[200px] bg-[#18181b] hover:bg-[#18181b]/90">
            {isLoading ? "Saving..." : "Save Shortcuts"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

