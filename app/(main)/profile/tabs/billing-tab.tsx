"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function BillingTab() {
  const [currentPlan, setCurrentPlan] = useState<string>("free")
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error("User not found")
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("plan, stripe_customer_id")
          .eq("user_id", user.id)
          .single()

        if (error) {
          throw error
        }

        setCurrentPlan(profile.plan)
        setStripeCustomerId(profile.stripe_customer_id)
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Failed to load your subscription information")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleManageSubscription = () => {
    if (!stripeCustomerId) {
      toast.error("No subscription found")
      return
    }
    // Replace with your Stripe customer portal URL
    window.open(`https://billing.stripe.com/p/login/${stripeCustomerId}`, "_blank")
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Current Subscription Plan</h2>
      </div>

      <div>
        <h3 className="text-3xl font-semibold mb-4 capitalize">{currentPlan}</h3>
        {currentPlan === "free" && (
          <p className="text-base mb-6">Upgrade to Pro to get access to more features and higher usage limits</p>
        )}
        {currentPlan === "pro" && (
          <p className="text-base mb-6">You are currently on the Pro plan. Upgrade to Ultimate for even more features.</p>
        )}
        {currentPlan === "ultimate" && (
          <p className="text-base mb-6">You are on our highest tier plan with access to all features.</p>
        )}

        <Button
          className="flex items-center gap-2"
          onClick={handleManageSubscription}
          disabled={!stripeCustomerId || isLoading}
        >
          {isLoading ? "Loading..." : "Manage Subscription"}
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

