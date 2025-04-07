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

import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  LogoOpenAI,
  LogoAnthropic,
  LogoGoogle,
} from './icons';

// SearchIcon component
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// Meta logo component
function LogoMeta({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36.2145 21.404C36.2145 14.0592 31.1475 9.5 24.1378 9.5C17.0803 9.5 12 14.0676 12 21.4396C12 28.0247 16.1756 32.7437 22.0334 32.7437V25.3253H19.0551V21.4396H22.0334V18.4548C22.0334 14.8889 24.1237 13.0435 27.3635 13.0435C28.9133 13.0435 30.5358 13.3 30.5358 13.3V16.1731H28.7644C27.0262 16.1731 26.2422 17.3024 26.2422 18.4632V21.404H30.3555L29.8685 25.2896H26.2422V32.7081C31.1899 32.5124 36.2145 27.9847 36.2145 21.404Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Mistral logo component
function LogoMistral({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
      <path d="M2 17L12 22L22 17" fill="currentColor" />
      <path d="M2 12L12 17L22 12" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

// Default logo component
function LogoDefault({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 16.5C9.51 16.5 7.5 14.49 7.5 12C7.5 9.51 9.51 7.5 12 7.5C14.49 7.5 16.5 9.51 16.5 12C16.5 14.49 14.49 16.5 12 16.5Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
      <path
        d="M12 9.5C10.62 9.5 9.5 10.62 9.5 12C9.5 13.38 10.62 14.5 12 14.5C13.38 14.5 14.5 13.38 14.5 12C14.5 10.62 13.38 9.5 12 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Define the OpenRouter model type
interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  created: number;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

// Original component function
function PureModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredModel, setHoveredModel] = useState<OpenRouterModel | null>(
    null,
  );
  const [hoveredItemRect, setHoveredItemRect] = useState<DOMRect | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        setModels(data.data);
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    }

    fetchModels();
  }, []);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === optimisticModelId) || models[0],
    [optimisticModelId, models],
  );

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;

    const query = searchQuery.toLowerCase();
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query),
    );
  }, [models, searchQuery]);

  // Function to determine which provider icon to show
  const getProviderIcon = (modelId: string) => {
    if (modelId.includes('openai') || modelId.includes('gpt')) {
      return <LogoOpenAI size={18} />;
    } else if (modelId.includes('anthropic') || modelId.includes('claude')) {
      return <LogoAnthropic />;
    } else if (
      modelId.includes('google') ||
      modelId.includes('gemini') ||
      modelId.includes('palm')
    ) {
      return <LogoGoogle size={18} />;
    } else if (modelId.includes('meta') || modelId.includes('llama')) {
      return <LogoMeta size={18} />;
    } else if (modelId.includes('mistral')) {
      return <LogoMistral size={18} />;
    }
    // Default icon for other providers
    return <LogoDefault size={18} />;
  };

  // Function to determine if model is new (created in the last 30 days)
  const isNewModel = (createdTimestamp: number) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return createdTimestamp > thirtyDaysAgo / 1000;
  };

  // Clean model name to remove provider prefix
  const getCleanModelName = (name: string) => {
    return name.split(':').pop()?.trim() || name;
  };

  // Get provider name from model ID
  const getProviderName = (modelId: string) => {
    if (modelId.includes('openai')) return 'OpenAI';
    if (modelId.includes('anthropic')) return 'Anthropic';
    if (modelId.includes('google')) return 'Google';
    if (modelId.includes('meta') || modelId.includes('llama')) return 'Meta';
    if (modelId.includes('mistral')) return 'Mistral';

    // Extract provider from ID format like 'provider/model-name'
    const parts = modelId.split('/');
    if (parts.length > 1) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return '';
  };

  const handleMouseEnter = (model: OpenRouterModel, id: string) => {
    setHoveredModel(model);
    const element = itemRefs.current.get(id);
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
          >
            {isLoadingModels ? (
              'Loading models...'
            ) : (
              <>
                {selectedModel && getProviderIcon(selectedModel.id)}
                <span className="truncate">
                  {selectedModel
                    ? getCleanModelName(selectedModel.name)
                    : 'Select model'}
                </span>
              </>
            )}
            <ChevronDownIcon size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 overflow-hidden"
          align="start"
          ref={dropdownRef}
        >
          <Command className="border-0">
            <div className="flex items-center border-b px-3">
              <CommandInput
                placeholder="Search Models..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-9 border-0 focus:ring-0"
              />
            </div>
            <CommandEmpty>No models found</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto border-0">
              {isLoadingModels ? (
                <CommandItem disabled>Loading models...</CommandItem>
              ) : (
                filteredModels.map((model) => {
                  const { id } = model;
                  const isNew = isNewModel(model.created);

                  return (
                    <CommandItem
                      key={id}
                      value={id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(id, el);
                      }}
                      onSelect={() => {
                        setOpen(false);
                        startTransition(() => {
                          setOptimisticModelId(id);
                          saveChatModelAsCookie(id);
                        });
                      }}
                      onMouseEnter={() => handleMouseEnter(model, id)}
                      onMouseLeave={handleMouseLeave}
                      className="flex items-center py-2 px-2"
                    >
                      <div className="mr-2 flex h-5 w-5 items-center justify-center">
                        {getProviderIcon(id)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-xs">
                            {getCleanModelName(model.name)}
                          </span>
                          {isNew && (
                            <span className="ml-2 rounded-sm bg-green-500/10 px-1.5 py-0.5 text-xs text-green-500">
                              New
                            </span>
                          )}
                          {Number(model.pricing.prompt) > 0.00001 && (
                            <span className="ml-2 rounded-sm bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-600">
                              Pro
                            </span>
                          )}
                        </div>
                      </div>
                      {id === optimisticModelId && (
                        <span className="ml-2 text-primary">
                          <CheckCircleFillIcon size={16} />
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
      {hoveredModel && open && hoveredItemRect && dropdownRef.current && (
        <div
          className="fixed w-[350px] bg-background border rounded-md shadow-md p-4 z-50"
          style={{
            left: `${dropdownRef.current.getBoundingClientRect().right + 10}px`,
            top: `${dropdownRef.current.getBoundingClientRect().top}px`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {getProviderIcon(hoveredModel.id)}
            <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              {getProviderName(hoveredModel.id)} /{' '}
              <span className="text-foreground">
                {getCleanModelName(hoveredModel.name)}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed overflow-hidden line-clamp-4">
            {hoveredModel.description}
          </p>

          <table className="w-full text-xs">
            <tbody>
              <tr className="border-t">
                <td className="py-2 text-muted-foreground">Context</td>
                <td className="py-2 text-right">
                  {hoveredModel.context_length.toLocaleString()} tokens
                </td>
              </tr>

              <tr className="border-t">
                <td className="py-2 text-muted-foreground">Input Pricing</td>
                <td className="py-2 text-right">
                  $
                  {(
                    Number.parseFloat(hoveredModel.pricing.prompt) * 1000000
                  ).toFixed(2)}{' '}
                  / million tokens
                </td>
              </tr>

              <tr className="border-t">
                <td className="py-2 text-muted-foreground">Output Pricing</td>
                <td className="py-2 text-right">
                  $
                  {(
                    Number.parseFloat(hoveredModel.pricing.completion) * 1000000
                  ).toFixed(2)}{' '}
                  / million tokens
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Memoized component
export const ModelSelector = memo(PureModelSelector, (prevProps, nextProps) => {
  // Only re-render if selectedModelId or className changes
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.className === nextProps.className
  );
});
