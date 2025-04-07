'use client';

import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react';
import Image from 'next/image'; // Import next/image for optimized images
import ReactMarkdown from 'react-markdown'; // Import react-markdown

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CodeIcon } from '@/components/icons';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

// Update the model type based on the new API structure
interface OpenRouterModel {
  slug: string; // Use slug as the primary identifier
  name: string;
  short_name: string;
  description: string;
  created_at: string; // ISO date string
  context_length: number;
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

// Original component function
function PureModelSelector({
  selectedModelId, // Keep this prop name, but it refers to the slug now
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [models, setModels] = useState<OpenRouterModel[]>([]); // Start empty
  const [isLoadingModels, setIsLoadingModels] = useState(true); // Start loading
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredModel, setHoveredModel] = useState<OpenRouterModel | null>(
    null,
  );
  const [hoveredItemRect, setHoveredItemRect] = useState<DOMRect | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchModels() {
      setIsLoadingModels(true); // Ensure loading state is set
      try {
        // Use the new endpoint
        // const response = await fetch(
        //   'https://openrouter.ai/api/frontend/models',
        // );
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

  // Find the selected model using the slug
  const selectedModel = useMemo(
    () => models.find((model) => model.slug === optimisticModelId),
    [optimisticModelId, models],
  );

  // Filter models based on the new structure
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;

    const query = searchQuery.toLowerCase();
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.short_name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.slug.toLowerCase().includes(query) ||
        model.endpoint?.provider_info.displayName.toLowerCase().includes(query),
    );
  }, [models, searchQuery]);

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
          unoptimized // Use if icons are SVGs or external and optimization causes issues
          onError={(e) => {
            // Hide broken image and show fallback (requires fallback logic)
            e.currentTarget.style.display = 'none';
            // You might need a sibling element with the fallback to show it here
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
      model?.endpoint?.provider_info.displayName ||
      model?.endpoint?.provider_name ||
      ''
    );
  };

  const handleMouseEnter = (model: OpenRouterModel, slug: string) => {
    setHoveredModel(model);
    const element = itemRefs.current.get(slug);
    if (element) {
      setHoveredItemRect(element.getBoundingClientRect());
    }
  };

  const handleMouseLeave = () => {
    setHoveredModel(null);
    setHoveredItemRect(null);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            data-testid="model-selector"
            variant="outline"
            className={cn(
              'md:px-2 md:h-[34px] justify-between gap-2',
              className,
            )}
            disabled={isLoadingModels || models.length === 0} // Disable if loading or no models
          >
            {isLoadingModels ? (
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
            ) : models.length > 0 ? (
              'Select model' // Only show if models are loaded
            ) : (
              'No models' // Indicate if loading finished but no models found
            )}
            <ChevronDownIcon size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 overflow-hidden shadow-xl" // Added shadow
          align="start"
          ref={dropdownRef}
        >
          <Command className="border-0">
            <CommandInput
              placeholder="Search Models..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9 border-0 focus:ring-0 text-xs"
            />
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto overflow-x-hidden border-0">
              {isLoadingModels ? (
                <CommandItem
                  disabled
                  className="text-xs text-muted-foreground justify-center py-4"
                >
                  Loading models...
                </CommandItem>
              ) : filteredModels.length === 0 && !isLoadingModels ? (
                <CommandItem
                  disabled
                  className="text-xs text-muted-foreground justify-center py-4"
                >
                  No models match your search.
                </CommandItem>
              ) : (
                filteredModels.map((model) => {
                  const { slug } = model;
                  if (!slug || !model.endpoint) return null; // Skip if slug or endpoint missing

                  const isNew = isNewModel(model.created_at);
                  const isPro = Number(model.endpoint.pricing?.prompt) > 0;

                  return (
                    <CommandItem
                      key={slug}
                      value={slug}
                      ref={(el) => {
                        if (el) itemRefs.current.set(slug, el);
                      }}
                      onSelect={() => {
                        setOpen(false);
                        startTransition(() => {
                          setOptimisticModelId(slug);
                          saveChatModelAsCookie(slug);
                        });
                      }}
                      onMouseEnter={() => handleMouseEnter(model, slug)}
                      onMouseLeave={handleMouseLeave}
                      className="flex items-center justify-between py-2 px-2 cursor-pointer text-xs hover:bg-accent"
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
                            {/* Indicate Tool Support subtly */}
                            {model.endpoint.supports_tool_parameters && (
                              <CodeIcon size={10} />
                            )}
                          </div>
                        </div>
                      </div>

                      {slug === optimisticModelId && (
                        <span className="ml-2 text-primary flex-shrink-0">
                          <CheckCircleFillIcon size={14} />
                        </span>
                      )}
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Model details card that appears on hover */}
      {hoveredModel?.endpoint &&
        open &&
        hoveredItemRect &&
        dropdownRef.current && (
          <div
            className="fixed w-[350px] bg-background border rounded-md shadow-lg p-4 z-50 animate-in fade-in duration-100 text-xs"
            style={{
              // Position relative to the dropdown
              left: `${dropdownRef.current.getBoundingClientRect().right + 8}px`,
              // Align top with the dropdown content, not the hovered item
              top: `${dropdownRef.current.getBoundingClientRect().top}px`,
              maxHeight: `calc(100vh - ${dropdownRef.current.getBoundingClientRect().top}px - 20px)`,
              overflowY: 'auto',
            }}
            // Prevent hover card from triggering parent leave event
            onMouseEnter={() =>
              handleMouseEnter(hoveredModel, hoveredModel.slug)
            }
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center flex-shrink-0">
                {renderProviderIcon(hoveredModel)}
              </span>
              <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {getProviderName(hoveredModel)} /{' '}
                <span className="text-foreground font-semibold">
                  {getCleanModelName(hoveredModel)}
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
                      Number.parseFloat(hoveredModel.endpoint.pricing.prompt) *
                      1_000_000
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
                        hoveredModel.endpoint.pricing.completion,
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
    prevProps.className === nextProps.className
  );
});
