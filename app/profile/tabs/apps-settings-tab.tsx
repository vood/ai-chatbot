"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { InfoIcon as InfoCircle } from "lucide-react"

const appsSettingsFormSchema = z.object({
  google_analytics_id: z.string().optional(),
  disable_banner: z.boolean().default(false),
  artifacts_enabled: z.boolean().default(true),
})

type AppsSettingsFormValues = z.infer<typeof appsSettingsFormSchema>

export default function AppsSettingsTab() {
  const [isLoading, setIsLoading] = useState(false)

  // This would normally be populated from your API/database
  const defaultValues: AppsSettingsFormValues = {
    google_analytics_id: "",
    disable_banner: false,
    artifacts_enabled: true,
  }

  const form = useForm<AppsSettingsFormValues>({
    resolver: zodResolver(appsSettingsFormSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: AppsSettingsFormValues) {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      setIsLoading(false)
      toast.success("Settings saved", {
        description: "Your apps settings have been saved successfully.",
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Apps Settings</h2>
        <p className="text-muted-foreground">Configure settings for your shared applications and content.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-8">
            <div className="border-b pb-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Google Analytics Measurement ID</h3>
                <InfoCircle className="h-5 w-5 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="google_analytics_id"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="G-XXXXXXXXX" className="max-w-xl" {...field} />
                    </FormControl>
                    <FormDescription>
                      This ID will be used to track visitors to your shared content in addition to our analytics.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <div className="border-b pb-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Disable "Built with ChatLabs" Banner</h3>
                <InfoCircle className="h-5 w-5 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="disable_banner"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <span>{field.value ? "Banner disabled" : "Banner enabled"}</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="pb-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Artifacts</h3>
                <InfoCircle className="h-5 w-5 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="artifacts_enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="bg-black data-[state=checked]:bg-black"
                        />
                        <span>{field.value ? "Enabled" : "Disabled"}</span>
                      </div>
                    </FormControl>
                    <FormDescription className="mt-2">
                      Artifacts make it easy to work with significant pieces of content that you may want to modify,
                      build upon, or reference later.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </Form>
    </div>
  )
}

