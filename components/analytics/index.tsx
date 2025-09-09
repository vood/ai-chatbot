"use client";

import { useEffect } from "react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import WorkspaceAnalytics from "./workspace-analytics";
import { GoogleTagManager, trackGTMEvent } from "./google-tag-manager";
import {
  AmplitudeAnalytics,
  ANALYTICS_EVENTS,
  GA_EVENT_MAPPINGS,
  EventName,
  trackEvent as trackAmplitudeEvent,
} from "./amplitude";
import { useWorkspace } from "@/hooks/use-workspace";
import router from "next/router";
import { FacebookPixel, trackFacebookEvent } from "./facebook-pixel";

// Default API keys - replace with actual keys in production
const DEFAULT_GTM_ID =
  process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "GTM-XXXXXXX";
const DEFAULT_AMPLITUDE_API_KEY =
  process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || "your-default-api-key";
const DEFAULT_GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

interface AnalyticsProps {
  gtmId?: string;
  amplitudeApiKey?: string;
  googleAnalyticsId?: string;
}

export function Analytics({
  gtmId = DEFAULT_GTM_ID,
  amplitudeApiKey = DEFAULT_AMPLITUDE_API_KEY,
  googleAnalyticsId = DEFAULT_GOOGLE_ANALYTICS_ID,
}: AnalyticsProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceGoogleAnalyticsId = currentWorkspace?.google_analytics_id;

  useEffect(() => {
    // listen to route change
    const handleRouteChange = () => {
      trackEvent("PAGE_VIEW", {
        page_path: window.location.pathname,
        page_title: document.title,
      });
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, []);

  return (
    <>
      {/* Vercel Analytics */}
      <VercelAnalytics />

      {/* Workspace-specific Google Analytics */}
      {googleAnalyticsId && (
        <WorkspaceAnalytics googleAnalyticsId={googleAnalyticsId} />
      )}

      {workspaceGoogleAnalyticsId && (
        <WorkspaceAnalytics googleAnalyticsId={workspaceGoogleAnalyticsId} />
      )}

      {/* Google Tag Manager */}
      <GoogleTagManager gtmId={gtmId} />

      {/* Amplitude Analytics */}
      <AmplitudeAnalytics apiKey={amplitudeApiKey} />

      {/* Facebook Pixel */}
      <FacebookPixel />
    </>
  );
}

// Re-export helpers for easier imports
export { trackEvent as trackAmplitudeEvent } from "./amplitude";
export { trackGTMEvent } from "./google-tag-manager";
export { ANALYTICS_EVENTS, GA_EVENT_MAPPINGS } from "./amplitude";
export type { EventName } from "./amplitude";

export const trackEvent = (
  event: EventName,
  properties?: Record<string, any>
) => {
  // Get provider-specific event names
  const amplitudeEventName =
    ANALYTICS_EVENTS[event as keyof typeof ANALYTICS_EVENTS];
  const gaEventName =
    GA_EVENT_MAPPINGS[event as keyof typeof GA_EVENT_MAPPINGS];

  // Track in Amplitude (uses title case)
  trackAmplitudeEvent(amplitudeEventName, properties);

  // Track in GTM (uses title case)
  trackGTMEvent(amplitudeEventName, properties, "dataLayer");

  // Track in Facebook Pixel (uses title case, skip page views)
  if (event !== "PAGE_VIEW") {
    trackFacebookEvent(amplitudeEventName, properties);
  }

  // Track in Google Analytics (uses lowercase/snake_case)
  if (typeof window !== "undefined") {
    window.gtag?.("event", gaEventName, properties);
  }
};
