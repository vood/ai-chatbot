"use client";

import { useEffect, ReactNode } from "react";
import * as amplitude from "@amplitude/analytics-browser";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/lib/supabase/client";

// Define analytics events for different providers
export const ANALYTICS_EVENTS = {
  // Acquisition & Authentication
  PURCHASE: "Purchase", // Amplitude, GTM, Facebook use this format
  LOGIN_SCREEN_VIEW: "Login Screen View",
  LOGIN_ATTEMPT: "Login Attempt",
  LOGIN_SUCCESS: "Login Success",
  LOGIN_ERROR: "Login Error",

  // Onboarding
  ONBOARDING_START: "Onboarding Start",
  ONBOARDING_STEP_VIEW: "Onboarding Step View",
  ONBOARDING_STEP_COMPLETE: "Onboarding Step Complete",
  ONBOARDING_COMPLETE: "Onboarding Complete",
  ONBOARDING_REDIRECT: "Onboarding Redirect",
  ONBOARDING_ERROR: "Onboarding Error",
  ONBOARDING_SETTINGS_SAVED: "Onboarding Settings Saved",

  // Core Actions
  MESSAGE_SEND: "Message Send",
  MESSAGE_RESPONSE_START: "Message Response Start",
  MESSAGE_STOP: "Message Stop",
  CHAT_START: "Chat Start",
  CHAT_COMPLETE: "Chat Complete",

  // Settings & Navigation
  SETTINGS_OPEN: "Settings Open",
  SETTINGS_TAB_VIEW: "Settings Tab View",
  SETTINGS_UPDATE: "Settings Update",
  SETTINGS_EXIT: "Settings Exit",
  SIDEBAR_ITEM_CLICK: "Sidebar Item Click",

  // Upgrade & Subscription
  UPGRADE_VIEW: "Upgrade View",
  UPGRADE_CLICK: "Upgrade Click",
  BILLING_CYCLE_CHANGE: "Billing Cycle Change",
  SUBSCRIPTION_CHECKOUT_INIT: "Subscription Checkout Init",
  SUBSCRIPTION_CHECKOUT_SUCCESS: "Subscription Checkout Success",
  SUBSCRIPTION_ERROR: "Subscription Error",
  SUBSCRIPTION_MANAGE: "Subscription Manage",

  // Checkout
  CHECKOUT_SUBMIT_ATTEMPT: "Checkout Submit Attempt",
  CHECKOUT_PAYMENT_SUCCESS: "Checkout Payment Success",
  CHECKOUT_PAYMENT_ERROR: "Checkout Payment Error",
  CHECKOUT_ERROR: "Checkout Error",

  // Pricing
  PRICING_PAGE_VIEW: "Pricing Page View",
  PRICING_PLAN_SELECT: "Pricing Plan Select",
  PRICING_BILLING_CHANGE: "Pricing Billing Change",
  PRICING_CHECKOUT_INIT: "Pricing Checkout Init",
  PRICING_CHECKOUT_REDIRECT: "Pricing Checkout Redirect",
  PRICING_CHECKOUT_ERROR: "Pricing Checkout Error",
  DISCOUNT_SHEET_APPLIED: "Discount Sheet Applied",

  // Account Management
  ACCOUNT_DELETE_ATTEMPT: "Account Delete Attempt",
  ACCOUNT_DELETE_SUCCESS: "Account Delete Success",
  ACCOUNT_DELETE_ERROR: "Account Delete Error",

  // Agent Events
  AGENT_LIST_VIEW: "Agent List View",
  AGENT_LIST_LOADED: "Agent List Loaded",
  AGENT_CREATE_VIEW: "Agent Create View",
  AGENT_CREATE_ATTEMPT: "Agent Create Attempt",
  AGENT_CREATE_SUCCESS: "Agent Create Success",
  AGENT_CREATE_ERROR: "Agent Create Error",
  AGENT_EDIT_VIEW: "Agent Edit View",
  AGENT_UPDATE_ATTEMPT: "Agent Update Attempt",
  AGENT_UPDATE_SUCCESS: "Agent Update Success",
  AGENT_UPDATE_ERROR: "Agent Update Error",
  AGENT_DELETE_CONFIRM_VIEW: "Agent Delete Confirm View",
  AGENT_DELETE_ATTEMPT: "Agent Delete Attempt",
  AGENT_DELETE_SUCCESS: "Agent Delete Success",
  AGENT_DELETE_ERROR: "Agent Delete Error",
  AGENT_IMAGE_DELETE_ERROR: "Agent Image Delete Error",
  AGENT_SELECT: "Agent Select",

  // Features & Tools
  TOOL_USE: "Tool Use",
  FILE_UPLOAD: "File Upload",
  PROMPT_USE: "Prompt Use",
  PROMPT_CREATE: "Prompt Create",
  PROMPT_EDIT: "Prompt Edit",
  PROMPT_DELETE: "Prompt Delete",

  // Errors & System
  API_ERROR: "API Error",
  SYSTEM_ERROR: "System Error",

  // Webhooks
  WEBHOOK_USER_ACCOUNT_UPDATED: "Webhook User Account Updated",
  WEBHOOK_USER_CREATED_FROM_CHECKOUT: "Webhook User Created From Checkout",
  WEBHOOK_USER_CREATION_ERROR: "Webhook User Creation Error",

  // Page Views
  PAGE_VIEW: "Page View",
} as const;

// Google Analytics 4 (GA4) specific event mappings
// Following GA4 naming conventions: lowercase, snake_case, max 40 chars
// Using official GA4 recommended events when available
export const GA_EVENT_MAPPINGS: Record<keyof typeof ANALYTICS_EVENTS, string> =
  {
    // Acquisition & Authentication (GA4 recommended events)
    PURCHASE: "purchase", // GA4 recommended ecommerce event
    LOGIN_SCREEN_VIEW: "login_screen_view", // GA4 recommended event
    LOGIN_ATTEMPT: "login_attempt", // GA4 recommended event (attempt)
    LOGIN_SUCCESS: "login", // GA4 recommended event (success)
    LOGIN_ERROR: "exception", // GA4 recommended for errors

    // Onboarding (custom events following GA4 conventions)
    ONBOARDING_START: "tutorial_begin", // GA4 recommended event
    ONBOARDING_STEP_VIEW: "tutorial_step", // GA4 recommended event
    ONBOARDING_STEP_COMPLETE: "tutorial_complete", // GA4 recommended event
    ONBOARDING_COMPLETE: "tutorial_complete",
    ONBOARDING_REDIRECT: "onboarding_redirect",
    ONBOARDING_ERROR: "exception", // GA4 recommended for errors
    ONBOARDING_SETTINGS_SAVED: "settings_save",

    // Core Actions (custom events following GA4 conventions)
    MESSAGE_SEND: "message_send",
    MESSAGE_RESPONSE_START: "message_start",
    MESSAGE_STOP: "message_stop",
    CHAT_START: "chat_start", // Similar to GA4 automatic event
    CHAT_COMPLETE: "chat_complete",

    // Settings & Navigation
    SETTINGS_OPEN: "settings_open",
    SETTINGS_TAB_VIEW: "settings_tab_view",
    SETTINGS_UPDATE: "settings_update",
    SETTINGS_EXIT: "settings_exit",
    SIDEBAR_ITEM_CLICK: "sidebar_item_click",

    // Upgrade & Subscription (ecommerce events)
    UPGRADE_VIEW: "view_promotion", // GA4 recommended event
    UPGRADE_CLICK: "select_promotion", // GA4 recommended event
    BILLING_CYCLE_CHANGE: "billing_change",
    SUBSCRIPTION_CHECKOUT_INIT: "begin_checkout", // GA4 recommended event
    SUBSCRIPTION_CHECKOUT_SUCCESS: "purchase", // GA4 recommended event
    SUBSCRIPTION_ERROR: "exception", // GA4 recommended for errors
    SUBSCRIPTION_MANAGE: "subscription_manage",

    // Checkout (GA4 ecommerce events)
    CHECKOUT_SUBMIT_ATTEMPT: "add_payment_info", // GA4 recommended event
    CHECKOUT_PAYMENT_SUCCESS: "purchase", // GA4 recommended event
    CHECKOUT_PAYMENT_ERROR: "exception", // GA4 recommended for errors
    CHECKOUT_ERROR: "exception", // GA4 recommended for errors

    // Pricing (ecommerce and navigation events)
    PRICING_PAGE_VIEW: "view_item_list", // GA4 recommended event
    PRICING_PLAN_SELECT: "select_item", // GA4 recommended event
    PRICING_BILLING_CHANGE: "billing_change",
    PRICING_CHECKOUT_INIT: "begin_checkout", // GA4 recommended event
    PRICING_CHECKOUT_REDIRECT: "checkout_redirect",
    PRICING_CHECKOUT_ERROR: "exception", // GA4 recommended for errors
    DISCOUNT_SHEET_APPLIED: "view_promotion", // GA4 recommended event

    // Account Management
    ACCOUNT_DELETE_ATTEMPT: "account_delete_attempt",
    ACCOUNT_DELETE_SUCCESS: "account_delete_success",
    ACCOUNT_DELETE_ERROR: "account_delete_error",

    // Agent Events
    AGENT_LIST_VIEW: "agent_list_view",
    AGENT_LIST_LOADED: "agent_list_loaded",
    AGENT_CREATE_VIEW: "agent_create_view",
    AGENT_CREATE_ATTEMPT: "agent_create_attempt",
    AGENT_CREATE_SUCCESS: "agent_create_success",
    AGENT_CREATE_ERROR: "agent_create_error",
    AGENT_EDIT_VIEW: "agent_edit_view",
    AGENT_UPDATE_ATTEMPT: "agent_update_attempt",
    AGENT_UPDATE_SUCCESS: "agent_update_success",
    AGENT_UPDATE_ERROR: "agent_update_error",
    AGENT_DELETE_CONFIRM_VIEW: "agent_delete_confirm_view",
    AGENT_DELETE_ATTEMPT: "agent_delete_attempt",
    AGENT_DELETE_SUCCESS: "agent_delete_success",
    AGENT_DELETE_ERROR: "agent_delete_error",
    AGENT_IMAGE_DELETE_ERROR: "agent_image_delete_error",
    AGENT_SELECT: "agent_select",

    // Features & Tools (user engagement events)
    TOOL_USE: "tool_use", // GA4 recommended event
    FILE_UPLOAD: "file_upload",
    PROMPT_USE: "prompt_use", // GA4 recommended event
    PROMPT_CREATE: "prompt_create", // GA4 recommended event
    PROMPT_EDIT: "prompt_edit",
    PROMPT_DELETE: "prompt_delete",

    // Errors & System (GA4 recommended events)
    API_ERROR: "exception", // GA4 recommended for errors
    SYSTEM_ERROR: "exception", // GA4 recommended for errors

    // Webhooks (server-side events)
    WEBHOOK_USER_ACCOUNT_UPDATED: "user_update",
    WEBHOOK_USER_CREATED_FROM_CHECKOUT: "sign_up", // GA4 recommended event
    WEBHOOK_USER_CREATION_ERROR: "exception", // GA4 recommended for errors

    // Page Views (GA4 automatic event)
    PAGE_VIEW: "page_view", // GA4 automatic event
  };

export type EventName = keyof typeof ANALYTICS_EVENTS;

interface AmplitudeProps {
  apiKey: string;
  children?: ReactNode;
}

/**
 * AmplitudeAnalytics component for initializing Amplitude
 *
 * This component initializes Amplitude with the provided API key
 */
export function AmplitudeAnalytics({ apiKey, children }: AmplitudeProps) {
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!apiKey) return;

    // Initialize Amplitude with the API key
    amplitude.init(apiKey, {
      logLevel: process.env.NODE_ENV === "production" ? 0 : 4,
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        amplitude.setUserId(user.email || user.id);
      }

      const identify = new amplitude.Identify();

      if (currentWorkspace) {
        if (currentWorkspace.id) {
          identify.set("workspace_id", currentWorkspace.id);
        }

        if (currentWorkspace.name) {
          identify.set("workspace_name", currentWorkspace.name);
        }

        identify.set("plan", currentWorkspace.plan || "free");
      }

      amplitude.identify(identify);
    });

    // Set user properties if workspace exists

    return () => {
      // Cleanup on unmount
    };
  }, [apiKey, currentWorkspace]);

  return children || null;
}

/**
 * Helper function to track events in Amplitude
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Amplitude] ${eventName}`, properties);
    return;
  }

  try {
    // Track in Amplitude
    amplitude.track(eventName, properties);
  } catch (error) {
    console.error(`Error tracking event ${eventName}:`, error);
  }
}
