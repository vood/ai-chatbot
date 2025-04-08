'use client';

import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useCallback,
} from 'react';
import Image from 'next/image';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CodeIcon } from '@/components/icons';
import { CheckCircleFillIcon, ChevronDownIcon } from '@/components/icons';

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
}

// Type for the visibility dictionary
type ModelVisibility = Record<string, boolean>;

// Default visible models if no settings are available yet
const DEFAULT_VISIBLE_MODELS = {
  'openai/gpt-4o': true,
  'anthropic/claude-3-opus-20240229': true,
  'anthropic/claude-3-sonnet-20240229': true,
  'anthropic/claude-3-haiku-20240307': true,
  'google/gemini-1.5-pro-latest': true,
};

// --- Helper Functions ---

// Generic Fallback Icon Component
function FallbackIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-50"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}

// Get provider icon URL or render fallback
const renderProviderIcon = (model?: OpenRouterModel) => {
  const iconUrl = model?.endpoint?.provider_info.icon?.url;
  if (iconUrl) {
    const absoluteIconUrl = iconUrl.startsWith('/')
      ? `https://openrouter.ai${iconUrl}` // Prepend base URL for relative paths
      : iconUrl;
    return (
      <Image
        key={model?.slug || 'icon'} // Add key for React
        src={absoluteIconUrl}
        alt={`${getProviderName(model) || 'Provider'} logo`}
        width={18}
        height={18}
        className="rounded-sm object-contain" // Added object-contain
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  return <FallbackIcon size={18} />;
};

// Function to determine if model is new
const isNewModel = (createdAtString?: string) => {
  if (!createdAtString) return false;
  try {
    const createdAt = new Date(createdAtString);
    if (Number.isNaN(createdAt.getTime())) return false;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return createdAt.getTime() > thirtyDaysAgo;
  } catch (e) {
    return false;
  }
};

// Get clean model name (use short_name preferably)
const getCleanModelName = (model?: OpenRouterModel) => {
  return model?.short_name || model?.name || 'Unknown Model';
};

// Get provider name
const getProviderName = (model?: OpenRouterModel) => {
  return (
    model?.author ||
    model?.endpoint?.provider_info.displayName ||
    model?.endpoint?.provider_name ||
    ''
  );
};

// --- End Helper Functions ---

// --- ModelListItem Component ---

interface ModelListItemProps {
  model: OpenRouterModel;
  isSelected: boolean;
  onSelect: (model: OpenRouterModel) => void;
}

const ModelListItem = memo(
  ({ model, isSelected, onSelect }: ModelListItemProps) => {
    const { slug } = model;
    if (!slug || !model.endpoint) return null;

    const isNew = isNewModel(model.created_at);
    const isPro = Number(model.endpoint.pricing?.prompt) > 0;

    return (
      <CommandItem
        key={slug}
        value={`${getProviderName(model)} ${getCleanModelName(model)} ${slug}`}
        onSelect={() => onSelect(model)}
        className="flex items-center justify-between py-3 px-4 cursor-pointer text-sm hover:bg-accent w-full"
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <span className="flex h-6 w-6 items-center justify-center flex-shrink-0">
            {renderProviderIcon(model)}
          </span>
          <div className="flex-1 overflow-hidden">
            <span className="font-medium block">
              {getCleanModelName(model)}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{getProviderName(model)}</span>
              {isNew && (
                <span className="rounded-sm bg-green-500/10 px-1 py-0.5 leading-none text-green-600 dark:text-green-400">
                  New
                </span>
              )}
              {model.endpoint.supports_tool_parameters && (
                <span className="flex items-center gap-0.5">
                  <CodeIcon size={12} />
                  <span className="hidden sm:inline">Tools</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {isSelected && (
          <span className="ml-2 text-primary flex-shrink-0">
            <CheckCircleFillIcon size={16} />
          </span>
        )}
      </CommandItem>
    );
  },
);

ModelListItem.displayName = 'ModelListItem';

// --- End ModelListItem Component ---

interface AgentModelSelectorProps extends React.ComponentProps<typeof Button> {
  selectedModelId: string;
  onSelectModel: (model: OpenRouterModel) => void;
}

function PureAgentModelSelector({
  selectedModelId,
  className,
  onSelectModel,
  ...buttonProps
}: AgentModelSelectorProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelVisibility, setModelVisibility] = useState<ModelVisibility>(
    DEFAULT_VISIBLE_MODELS,
  );
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New effect to fetch user's model visibility settings
  useEffect(() => {
    async function fetchProfileVisibility() {
      setIsLoadingProfile(true);
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const profileData = await response.json();

        // If no visibility settings or empty object, use defaults
        if (
          !profileData.model_visibility ||
          Object.keys(profileData.model_visibility).length === 0
        ) {
          setModelVisibility(DEFAULT_VISIBLE_MODELS);
        } else {
          setModelVisibility(profileData.model_visibility);
        }
      } catch (error) {
        console.error('Error fetching profile visibility:', error);
        setModelVisibility(DEFAULT_VISIBLE_MODELS);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchProfileVisibility();
  }, []);

  // Effect to fetch all models
  useEffect(() => {
    async function fetchModels() {
      setIsLoadingModels(true);
      try {
        const response = await fetch('/api/models');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to fetch models via proxy: ${response.statusText} ${errorData.error || ''}`,
          );
        }
        const data = await response.json();
        const validModels = data.data.filter(
          (m: OpenRouterModel) => m.endpoint,
        );
        setModels(validModels);
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    }

    fetchModels();
  }, []);

  // Filter models based on visibility
  const visibleModels = useMemo(() => {
    return models
      .filter((model) => modelVisibility[model.slug])
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [models, modelVisibility]);

  const handleSelect = useCallback(
    (model: OpenRouterModel) => {
      startTransition(() => {
        setOptimisticModelId(model.slug);
      });
      onSelectModel(model);
      setOpen(false);
      setSearchQuery('');
    },
    [onSelectModel, setOptimisticModelId],
  );

  const selectedModel = useMemo(() => {
    return models.find((model) => model.slug === optimisticModelId) || null;
  }, [models, optimisticModelId]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return visibleModels;

    const query = searchQuery.toLowerCase();
    return visibleModels.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.short_name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.slug.toLowerCase().includes(query) ||
        model.endpoint?.provider_info.displayName.toLowerCase().includes(query),
    );
  }, [visibleModels, searchQuery]);

  // Overall loading state
  const isLoading = isLoadingModels || isLoadingProfile;

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex items-center gap-2 justify-between text-sm px-4 h-10 w-full',
              className,
            )}
            disabled={isLoading}
            {...buttonProps}
          >
            {isLoading ? (
              'Loading models...'
            ) : selectedModel ? (
              <>
                <div className="flex items-center gap-2 truncate">
                  <span className="flex h-5 w-5 items-center justify-center truncate flex-shrink-0">
                    {renderProviderIcon(selectedModel)}
                  </span>
                  <span className="truncate">
                    {getCleanModelName(selectedModel)}
                  </span>
                </div>
                <ChevronDownIcon size={18} />
              </>
            ) : visibleModels.length > 0 ? (
              <>
                <span>Select a model</span>
                <ChevronDownIcon size={18} />
              </>
            ) : (
              'No models available'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[350px] p-0 shadow-xl z-50"
          side="bottom"
          align="start"
          sideOffset={8}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search models..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-sm"
            />
            <CommandList className="max-h-[350px] overflow-y-auto">
              {isLoading ? (
                <CommandEmpty className="py-6 text-center text-sm">
                  Loading models...
                </CommandEmpty>
              ) : filteredModels.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery !== '' ? (
                    'No models match your search.'
                  ) : (
                    <div className="space-y-2">
                      <p>No models available to select.</p>
                      <p className="text-xs">
                        You can add models in your{' '}
                        <a
                          href="/profile?tab=models"
                          className="text-primary hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Profile Settings
                        </a>
                      </p>
                    </div>
                  )}
                </CommandEmpty>
              ) : (
                <CommandGroup heading="Available Models">
                  {filteredModels.map((model) => (
                    <ModelListItem
                      key={model.slug}
                      model={model}
                      isSelected={model.slug === optimisticModelId}
                      onSelect={handleSelect}
                    />
                  ))}
                </CommandGroup>
              )}
              {/* Settings link footer */}
              {!isLoading && (
                <div className="border-t p-2 flex justify-start">
                  <a
                    href="/profile?tab=models"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2"
                    onClick={() => setOpen(false)}
                  >
                    <Settings className="h-3 w-3" />
                    Manage Available Models
                  </a>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const AgentModelSelector = memo(
  PureAgentModelSelector,
  (prevProps, nextProps) => {
    return (
      prevProps.selectedModelId === nextProps.selectedModelId &&
      prevProps.className === nextProps.className &&
      prevProps.onSelectModel === nextProps.onSelectModel
    );
  },
);

AgentModelSelector.displayName = 'AgentModelSelector';
