"use client"

import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BillingTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Current Subscription Plan</h2>
      </div>

      <div>
        <h3 className="text-3xl font-semibold mb-4">Pro</h3>
        <p className="text-base mb-6">Upgrade to Ultimate to get access to OpenAI o1-preview and Claude 3 Opus</p>

        <Button
          className="flex items-center gap-2"
          onClick={() => window.open("#", "_blank")}
        >
          Manage Subscription
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

