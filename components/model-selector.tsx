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
import Image from 'next/image'; // Import next/image for optimized images
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import { Settings } from 'lucide-react'; // Import Settings icon
// import { useVirtualizer } from '@tanstack/react-virtual'; // REMOVE virtualizer import

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

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

// Removed ModelCategory enum
// export enum ModelCategory {
//   Chat = 'chat',
//   Image = 'image',
// }

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

// --- Helper Functions (Moved Outside) ---

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
          // Hide broken image and show fallback
          const parent = e.currentTarget.parentElement;
          if (parent) {
            // Attempt to find or create a fallback container
            let fallback = parent.querySelector('.fallback-icon-container');
            if (!fallback) {
              fallback = document.createElement('span');
              fallback.className = 'fallback-icon-container'; // Add class for potential styling
              // Render FallbackIcon manually here or adjust logic
              // For simplicity, just hiding the image for now
            }
            // Show fallback if needed
          }
          e.currentTarget.style.display = 'none';
        }}
      />
      // Optionally, include a sibling span for the fallback icon that can be shown onError
      // <span className="fallback-icon-container" style={{ display: 'none' }}><FallbackIcon size={18} /></span>
    );
  }
  return <FallbackIcon size={18} />;
};

// Function to determine if model is new
const isNewModel = (createdAtString?: string) => {
  if (!createdAtString) return false;
  try {
    const createdAt = new Date(createdAtString);
    // Check if date is valid before proceeding using Number.isNaN
    if (Number.isNaN(createdAt.getTime())) return false;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return createdAt.getTime() > thirtyDaysAgo;
  } catch (e) {
    return false; // Catch potential errors during date parsing
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
  onMouseEnter: (model: OpenRouterModel, slug: string) => void;
  onMouseLeave: () => void;
  setItemRef: (slug: string, element: HTMLDivElement | null) => void;
}

const ModelListItem = memo(
  ({
    model,
    isSelected,
    onSelect,
    onMouseEnter,
    onMouseLeave,
    setItemRef,
  }: ModelListItemProps) => {
    const { slug } = model;
    if (!slug || !model.endpoint) return null;

    const isNew = isNewModel(model.created_at);
    const isPro = Number(model.endpoint.pricing?.prompt) > 0;

    return (
      <CommandItem
        key={slug}
        value={`${getProviderName(model)} ${getCleanModelName(model)} ${slug}`}
        ref={(el) => setItemRef(slug, el)}
        onSelect={() => onSelect(model)}
        onMouseEnter={() => onMouseEnter(model, slug)}
        onMouseLeave={onMouseLeave}
        className="flex items-center justify-between py-2 px-2 cursor-pointer text-xs hover:bg-accent w-full h-full"
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="flex h-5 w-5 items-center justify-center flex-shrink-0">
            {renderProviderIcon(model)}
          </span>
          <div className="flex-1 overflow-hidden">
            <span className="font-medium truncate block">
              {getCleanModelName(model)}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isNew && (
                <span className="rounded-sm bg-green-500/10 px-1 py-0.5 leading-none text-green-600 dark:text-green-400">
                  New
                </span>
              )}
              {isPro && (
                <span className="rounded-sm bg-blue-500/10 px-1 py-0.5 leading-none text-blue-600 dark:text-blue-400">
                  Pro
                </span>
              )}
              {model.endpoint.supports_tool_parameters && (
                <CodeIcon size={10} />
              )}
            </div>
          </div>
        </div>

        {isSelected && (
          <span className="ml-2 text-primary flex-shrink-0">
            <CheckCircleFillIcon size={14} />
          </span>
        )}
      </CommandItem>
    );
  },
);

ModelListItem.displayName = 'ModelListItem';

// --- End ModelListItem Component ---

// Updated Props Interface
interface PureModelSelectorProps extends React.ComponentProps<typeof Button> {
  selectedModelId: string;
  onSelectModel: (model: OpenRouterModel) => void; // Accept the full model object
}

// Original component function
function PureModelSelector({
  selectedModelId, // Keep this prop name, but it refers to the slug now
  className,
  onSelectModel, // Add the callback prop
  ...buttonProps // Spread rest of button props
}: PureModelSelectorProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [models, setModels] = useState<OpenRouterModel[]>([]); // Start empty
  const [modelVisibility, setModelVisibility] = useState<ModelVisibility>(
    DEFAULT_VISIBLE_MODELS,
  ); // Model visibility settings
  const [isLoadingModels, setIsLoadingModels] = useState(true); // Start loading
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); // Loading profile state
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredModel, setHoveredModel] = useState<OpenRouterModel | null>(
    null,
  );
  const [hoveredItemRect, setHoveredItemRect] = useState<DOMRect | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        // Silently fall back to defaults on error (no toast)
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
      setIsLoadingModels(true); // Ensure loading state is set
      try {
        // Fetch from our internal proxy API route
        const response = await fetch('/api/models');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to parse error body
          throw new Error(
            `Failed to fetch models via proxy: ${response.statusText} ${errorData.error || ''}`,
          );
        }
        const data = await response.json();
        // Filter out models without an endpoint as they can't be used for chat
        const validModels = data.data.filter(
          (m: OpenRouterModel) => m.endpoint,
        );
        setModels(validModels);
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]); // Clear models on error
      } finally {
        setIsLoadingModels(false);
      }
    }

    fetchModels();
  }, []);

  // Filter models based on visibility
  const visibleModels = useMemo(() => {
    return models
      .filter((model) => modelVisibility[model.slug]) // Only filter by visibility
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [models, modelVisibility]); // Removed category dependency

  // Wrap handlers in useCallback
  const handleSelect = useCallback(
    (model: OpenRouterModel) => {
      startTransition(() => {
        setOptimisticModelId(model.slug);
      });
      onSelectModel(model);
      setOpen(false);
      setSearchQuery('');
      setHoveredModel(null);
    },
    [onSelectModel, setOptimisticModelId], // Add dependencies
  );

  const handleMouseEnter = useCallback(
    (model: OpenRouterModel, slug: string) => {
      setHoveredModel(model);
      const element = itemRefs.current.get(slug);
      if (element) {
        setHoveredItemRect(element.getBoundingClientRect());
      }
    },
    [], // Dependency array remains empty
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredModel(null);
    setHoveredItemRect(null);
  }, []);

  const setItemRef = useCallback(
    (slug: string, element: HTMLDivElement | null) => {
      if (element) {
        itemRefs.current.set(slug, element);
      } else {
        itemRefs.current.delete(slug);
      }
    },
    [],
  );

  const selectedModel = useMemo(() => {
    return models.find((model) => model.slug === optimisticModelId) || null;
  }, [models, optimisticModelId]);

  // Filter models based on the new structure and visibility
  const filteredModels = useMemo(() => {
    // Start with models that are visible according to settings
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
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'flex items-center gap-1.5 justify-start text-xs px-2 h-8 w-full',
              className,
            )}
            disabled={isLoading}
            {...buttonProps}
          >
            {isLoading ? (
              'Loading...'
            ) : selectedModel ? (
              <>
                <span className="flex h-5 w-5 items-center justify-center flex-shrink-0">
                  {renderProviderIcon(selectedModel)}
                </span>
                <span className="truncate text-xs">
                  {getCleanModelName(selectedModel)}
                </span>
              </>
            ) : visibleModels.length > 0 ? (
              'Models'
            ) : (
              'No models available'
            )}
            <ChevronDownIcon size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={dropdownRef}
          className="w-[300px] p-0 shadow-xl z-50"
          side="top"
          align="start"
          onMouseLeave={handleMouseLeave}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search models..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-xs"
            />
            <CommandList className="max-h-[300px] overflow-y-auto text-xs">
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
                <CommandGroup heading="Models">
                  {filteredModels.map((model) => (
                    <ModelListItem
                      key={model.slug}
                      model={model}
                      isSelected={model.slug === optimisticModelId}
                      onSelect={handleSelect}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      setItemRef={setItemRef}
                    />
                  ))}
                </CommandGroup>
              )}
              {/* Add settings link footer when dropdown is open */}
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

      {/* Model details card that appears on hover */}
      {hoveredModel?.endpoint &&
        open &&
        hoveredItemRect &&
        dropdownRef.current && (
          <div
            role="group"
            className="fixed w-[350px] bg-background border rounded-md shadow-lg p-4 z-50 animate-in fade-in duration-100 text-xs"
            style={{
              // Position relative to the dropdown/item
              left: `${dropdownRef.current?.getBoundingClientRect().right + 8}px`,
              top: `${dropdownRef.current?.getBoundingClientRect().top}px`,
              maxHeight: `calc(100vh - ${dropdownRef.current?.getBoundingClientRect().top}px - 20px)`,
              overflowY: 'auto',
            }}
            // Prevent hover card from triggering parent leave event
            onMouseEnter={() =>
              hoveredModel && handleMouseEnter(hoveredModel, hoveredModel.slug)
            }
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center flex-shrink-0">
                {hoveredModel && renderProviderIcon(hoveredModel)}
              </span>
              <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {hoveredModel && getProviderName(hoveredModel)} /{' '}
                <span className="text-foreground font-semibold">
                  {hoveredModel && getCleanModelName(hoveredModel)}
                </span>
              </div>
            </div>

            {/* Render description as Markdown */}
            <div className="prose prose-sm dark:prose-invert text-muted-foreground mb-3 leading-relaxed max-h-32 overflow-y-auto text-xs">
              <ReactMarkdown className="line-clamp-6">
                {hoveredModel.description || 'No description available.'}
              </ReactMarkdown>
            </div>

            <table className="w-full text-xs border-t">
              <tbody>
                <tr>
                  <td className="py-1.5 text-muted-foreground">Context</td>
                  <td className="py-1.5 text-right font-medium">
                    {(
                      hoveredModel.endpoint?.context_length ||
                      hoveredModel.context_length
                    )?.toLocaleString()}{' '}
                    tokens
                  </td>
                </tr>

                {/* Tool Support Row */}
                <tr className="border-t">
                  <td className="py-1.5 text-muted-foreground flex items-center gap-1">
                    <CodeIcon size={12} /> Tools
                  </td>
                  <td
                    className={`py-1.5 text-right font-medium ${hoveredModel.endpoint.supports_tool_parameters ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {hoveredModel.endpoint.supports_tool_parameters
                      ? 'Supported'
                      : 'Not Supported'}
                  </td>
                </tr>

                <tr className="border-t">
                  <td className="py-1.5 text-muted-foreground">Input</td>
                  <td className="py-1.5 text-right font-medium">
                    $
                    {(
                      Number.parseFloat(
                        hoveredModel.endpoint?.pricing.prompt ?? '0',
                      ) * 1_000_000
                    ).toFixed(2)}{' '}
                    <span className="text-muted-foreground">/ 1M</span>
                  </td>
                </tr>

                <tr className="border-t">
                  <td className="py-1.5 text-muted-foreground">Output</td>
                  <td className="py-1.5 text-right font-medium">
                    $
                    {(
                      Number.parseFloat(
                        hoveredModel.endpoint?.pricing.completion ?? '0',
                      ) * 1_000_000
                    ).toFixed(2)}{' '}
                    <span className="text-muted-foreground">/ 1M</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// Memoized component (keep existing comparison logic)
export const ModelSelector = memo(PureModelSelector, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.className === nextProps.className &&
    prevProps.onSelectModel === nextProps.onSelectModel
    // Removed category check
    // Add checks for other props if necessary
  );
});

// Add displayName for the main component as well
PureModelSelector.displayName = 'PureModelSelector';
