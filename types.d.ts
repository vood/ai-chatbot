// Export the model type so it can be used in the profile tab
export interface OpenRouterModel {
  slug: string; // Use slug as the primary identifier
  name: string;
  short_name: string;
  description: string;
  created_at: string; // ISO date string
  context_length: number;
  author: string;
  endpoint?: {
    // Endpoint can be optional or null
    provider_info: {
      name: string;
      displayName: string;
      isPrimaryProvider: boolean;
      icon?: {
        url?: string; // Icon URL might be optional
      };
    };
    provider_display_name: string;
    provider_name: string;
    pricing: {
      prompt: string;
      completion: string;
    };
    supports_tool_parameters: boolean;
    context_length: number; // Context length might also be here
  };
  is_agent?: boolean;
}

type ModelVisibility = Record<string, boolean>;
