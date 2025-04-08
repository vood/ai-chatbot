'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Search,
  CalendarDays,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OpenRouterModel, ModelVisibility } from '@/types';

// Type for the visibility dictionary

// Helper function to extract author from slug
const getAuthorFromSlug = (slug: string): string => {
  const parts = slug.split('/');
  return parts.length > 1 ? parts[0] : 'Other';
};

// Helper function to get formatted month and year from date string
const getMonthYear = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Unknown Date';

    // Get month name and year
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch (error) {
    return 'Unknown Date';
  }
};

// Helper function to sort dates in reverse order (newest first)
const sortByDate = (a: OpenRouterModel, b: OpenRouterModel): number => {
  try {
    const dateA = new Date(a.created_at || '').getTime();
    const dateB = new Date(b.created_at || '').getTime();

    // Handle invalid dates by placing them at the end
    if (Number.isNaN(dateA)) return 1;
    if (Number.isNaN(dateB)) return -1;

    return dateB - dateA; // Reverse order (newest first)
  } catch (error) {
    return 0;
  }
};

// Helper to format price per million tokens
const formatPrice = (priceStr?: string): string => {
  if (!priceStr) return 'n/a';
  const price = Number.parseFloat(priceStr);
  return `$${(price * 1_000_000).toFixed(2)}`;
};

export default function ModelsTab() {
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [visibility, setVisibility] = useState<ModelVisibility>({});
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMonthYear, setActiveMonthYear] = useState<string>('all');
  const [selectAllInMonth, setSelectAllInMonth] = useState<
    boolean | 'indeterminate'
  >(false);
  // Track expanded sections - rename for clarity since we'll use for orgs
  const [expandedOrgs, setExpandedOrgs] = useState<Record<string, boolean>>({});

  // Add sorting state
  type SortColumn =
    | 'name'
    | 'created_at'
    | 'context_length'
    | 'input_price'
    | 'output_price';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Add compact filter state
  const [showFilters, setShowFilters] = useState(false);

  // Modify initialization to expand all organizations by default
  useEffect(() => {
    if (allModels.length && Object.keys(expandedOrgs).length === 0) {
      const orgs: Record<string, boolean> = {};
      allModels.forEach((model) => {
        const org = getAuthorFromSlug(model.slug);
        orgs[org] = true; // Start with all expanded
      });
      setExpandedOrgs(orgs);
    }
  }, [allModels, expandedOrgs]);

  // Toggle organization expansion
  const toggleOrg = useCallback((org: string) => {
    setExpandedOrgs((prev) => ({
      ...prev,
      [org]: !prev[org],
    }));
  }, []);

  // Fetch all available models
  useEffect(() => {
    async function fetchAllModels() {
      setIsLoadingModels(true);
      try {
        const response = await fetch('/api/models');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        // Filter out models without an endpoint as they can't be used for chat
        const validModels = data.data.filter(
          (m: OpenRouterModel) => m.endpoint,
        );
        setAllModels(validModels);
      } catch (error) {
        console.error('Error fetching all models:', error);
        toast.error('Failed to load available models.');
        setAllModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchAllModels();
  }, []);

  // Fetch user's current visibility settings
  useEffect(() => {
    async function fetchProfileVisibility() {
      setIsLoadingProfile(true);
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const profileData = await response.json();

        // Initialize model_visibility with some defaults if empty
        if (
          !profileData.model_visibility ||
          Object.keys(profileData.model_visibility).length === 0
        ) {
          // Set models to visible based on isPrimaryProvider flag
          const defaultVisibility = allModels.reduce(
            (acc, model) => {
              // If the model has an endpoint and is marked as primary provider, make it visible
              if (model.endpoint?.provider_info?.isPrimaryProvider) {
                acc[model.slug] = true;
              }
              return acc;
            },
            {} as Record<string, boolean>,
          );

          // If no primary providers were found, fall back to some popular models
          if (Object.keys(defaultVisibility).length === 0) {
            defaultVisibility['openai/gpt-4o'] = true;
            defaultVisibility['anthropic/claude-3-opus-20240229'] = true;
            defaultVisibility['anthropic/claude-3-sonnet-20240229'] = true;
            defaultVisibility['anthropic/claude-3-haiku-20240307'] = true;
            defaultVisibility['google/gemini-1.5-pro-latest'] = true;
          }

          setVisibility(defaultVisibility);

          // Optional: Save these defaults to the profile right away
          try {
            await fetch('/api/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model_visibility: defaultVisibility }),
            });
          } catch (saveError) {
            console.error('Error saving default visibility:', saveError);
            // Don't show a toast for this initial setup
          }
        } else {
          setVisibility(profileData.model_visibility || {});
        }
      } catch (error) {
        console.error('Error fetching profile visibility:', error);
        toast.error('Failed to load your current model settings.');
        // Set some reasonable defaults even on error
        setVisibility({
          'openai/gpt-4o': true,
          'anthropic/claude-3-sonnet-20240229': true,
        });
      } finally {
        setIsLoadingProfile(false);
      }
    }
    fetchProfileVisibility();
  }, [allModels]);

  // Calculate unique months from models
  const monthsAndYears = useMemo(() => {
    if (!allModels.length) return [];

    // Get unique month/year combinations
    const monthYearSet = new Set<string>();
    allModels.forEach((model) => {
      if (model.created_at) {
        const monthYear = getMonthYear(model.created_at);
        monthYearSet.add(monthYear);
      }
    });

    // Convert to array and sort reverse-chronologically
    const sorted = Array.from(monthYearSet).sort((a, b) => {
      // Try to parse as dates for proper chronological sorting
      try {
        // Extract month and year from the strings
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');

        // Compare years first
        if (yearA !== yearB) {
          return Number.parseInt(yearB, 10) - Number.parseInt(yearA, 10); // Reverse order
        }

        // If years are the same, compare months
        const months = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        return months.indexOf(monthB) - months.indexOf(monthA); // Reverse order
      } catch {
        return 0;
      }
    });

    // Return array with counts
    return sorted.map((monthYear) => {
      const count = allModels.filter((model) => {
        return model.created_at && getMonthYear(model.created_at) === monthYear;
      }).length;
      return { name: monthYear, count };
    });
  }, [allModels]);

  // Get filtered models based on active month and search
  const filteredModels = useMemo(() => {
    if (!allModels.length) return [];

    // First filter by month if not "all"
    let result =
      activeMonthYear === 'all'
        ? allModels
        : allModels.filter((model) => {
            return (
              model.created_at &&
              getMonthYear(model.created_at) === activeMonthYear
            );
          });

    // Then filter by search query if any
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (model) =>
          model.name.toLowerCase().includes(query) ||
          model.short_name?.toLowerCase().includes(query) ||
          model.id.toLowerCase().includes(query) ||
          getAuthorFromSlug(model.slug).toLowerCase().includes(query),
      );
    }

    // Sort by creation date (newest first)
    return result.sort(sortByDate);
  }, [allModels, activeMonthYear, searchQuery]);

  // Calculate grouped models by month
  const groupedModels = useMemo(() => {
    if (!filteredModels.length) return {};

    return filteredModels.reduce(
      (acc, model) => {
        const monthYear = model.created_at
          ? getMonthYear(model.created_at)
          : 'Unknown Date';
        if (!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(model);
        return acc;
      },
      {} as Record<string, OpenRouterModel[]>,
    );
  }, [filteredModels]);

  // Update indeterminate state for month selection
  useEffect(() => {
    if (activeMonthYear === 'all') return;

    // Get models for current month
    const monthModels = allModels.filter(
      (model) =>
        model.created_at && getMonthYear(model.created_at) === activeMonthYear,
    );

    if (!monthModels.length) {
      setSelectAllInMonth(false);
      return;
    }

    // Check if all models for this month are selected
    const selectedCount = monthModels.filter(
      (model) => visibility[model.slug],
    ).length;

    if (selectedCount === 0) {
      setSelectAllInMonth(false);
    } else if (selectedCount === monthModels.length) {
      setSelectAllInMonth(true);
    } else {
      setSelectAllInMonth('indeterminate');
    }
  }, [allModels, visibility, activeMonthYear]);

  // Handle select all checkbox for current month
  const handleSelectAllInMonth = (checked: boolean) => {
    const newVisibility = { ...visibility };

    // Update all models for the active month
    const modelsToUpdate =
      activeMonthYear === 'all'
        ? allModels
        : allModels.filter(
            (model) =>
              model.created_at &&
              getMonthYear(model.created_at) === activeMonthYear,
          );

    modelsToUpdate.forEach((model) => {
      newVisibility[model.slug] = checked;
    });

    setVisibility(newVisibility);
    setSelectAllInMonth(checked);
  };

  const handleVisibilityChange = useCallback(
    (slug: string, checked: boolean) => {
      setVisibility((prev) => ({
        ...prev,
        [slug]: checked,
      }));
    },
    [],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Construct the body ensuring we ONLY send model_visibility
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_visibility: visibility }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      toast.success('Model visibility updated successfully!');
    } catch (error: any) {
      console.error('Error saving model visibility:', error);
      toast.error('Failed to save settings', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingModels || isLoadingProfile;

  // Add a sorting function
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default direction
      setSortColumn(column);
      setSortDirection(column === 'created_at' ? 'desc' : 'asc');
    }
  };

  // Add a function to sort models based on current sort settings
  const sortModels = (models: OpenRouterModel[]) => {
    return [...models].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'name': {
          return (
            multiplier *
            (a.short_name || a.slug).localeCompare(b.short_name || b.slug)
          );
        }

        case 'created_at': {
          const dateA = new Date(a.created_at || '').getTime();
          const dateB = new Date(b.created_at || '').getTime();

          if (Number.isNaN(dateA)) return 1 * multiplier;
          if (Number.isNaN(dateB)) return -1 * multiplier;

          return multiplier * (dateA - dateB);
        }

        case 'context_length': {
          const contextA = a.endpoint?.context_length || a.context_length || 0;
          const contextB = b.endpoint?.context_length || b.context_length || 0;
          return multiplier * (contextA - contextB);
        }

        case 'input_price': {
          const priceA = Number.parseFloat(a.endpoint?.pricing.prompt || '0');
          const priceB = Number.parseFloat(b.endpoint?.pricing.prompt || '0');
          return multiplier * (priceA - priceB);
        }

        case 'output_price': {
          const outputA = Number.parseFloat(
            a.endpoint?.pricing.completion || '0',
          );
          const outputB = Number.parseFloat(
            b.endpoint?.pricing.completion || '0',
          );
          return multiplier * (outputA - outputB);
        }

        default:
          return 0;
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Model Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Select which models appear in your model selector dropdown. Unselected
          models will be hidden.
        </p>
      </div>

      <div className="border-b pb-4"></div>

      {/* Compact search and filter button */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1"
        >
          <Filter className="h-4 w-4" />
          Filters
          <Badge
            variant="secondary"
            className={cn(
              'ml-1',
              !activeMonthYear || activeMonthYear === 'all' ? 'hidden' : '',
            )}
          >
            {activeMonthYear !== 'all' ? activeMonthYear : ''}
          </Badge>
        </Button>
      </div>

      {/* Collapsible filter section */}
      {showFilters && (
        <div className="border rounded-md p-3 bg-muted/20">
          <div className="mb-2 text-sm font-medium">Filter by month</div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeMonthYear === 'all' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setActiveMonthYear('all')}
            >
              All Time
            </Button>

            {monthsAndYears.map((month) => (
              <Button
                key={month.name}
                variant={activeMonthYear === month.name ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setActiveMonthYear(month.name)}
              >
                {month.name}{' '}
                <Badge variant="secondary" className="ml-1">
                  {month.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Select all checkbox */}
          {activeMonthYear !== 'all' && (
            <div className="flex items-center space-x-3 mt-3">
              <Checkbox
                id="select-all-month"
                checked={selectAllInMonth === true}
                data-state={
                  selectAllInMonth === 'indeterminate'
                    ? 'indeterminate'
                    : undefined
                }
                onCheckedChange={(checked) => handleSelectAllInMonth(!!checked)}
                className={cn(
                  selectAllInMonth === 'indeterminate' && 'opacity-80',
                )}
              />
              <Label
                htmlFor="select-all-month"
                className="text-sm cursor-pointer hover:text-primary"
              >
                {selectAllInMonth === true
                  ? `Deselect all models from ${activeMonthYear}`
                  : `Select all models from ${activeMonthYear}`}
              </Label>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          // Show skeletons while loading
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-group-${i}`} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-2 ml-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={`skeleton-item-${i}-${j}`}
                    className="flex items-center space-x-3"
                  >
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : filteredModels.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
            {searchQuery
              ? 'No models match your search.'
              : 'Could not load available models. Please try refreshing the page.'}
          </p>
        ) : (
          <>
            {/* Group models by organization but keep month logic */}
            {Object.entries(
              // Group filtered models by organization
              filteredModels.reduce(
                (acc, model) => {
                  const author = getAuthorFromSlug(model.slug);
                  if (!acc[author]) acc[author] = [];
                  acc[author].push(model);
                  return acc;
                },
                {} as Record<string, OpenRouterModel[]>,
              ),
            )
              // Sort organizations alphabetically
              .sort(([authorA], [authorB]) => authorA.localeCompare(authorB))
              .map(([author, modelsInGroup]) => (
                <div
                  key={author}
                  className="mb-6 border rounded-md overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer"
                    onClick={() => toggleOrg(author)}
                  >
                    <div className="flex items-center">
                      <h4 className="text-md font-semibold">{author}</h4>
                      <Badge variant="outline" className="ml-2">
                        {modelsInGroup.length}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {expandedOrgs[author] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {expandedOrgs[author] && (
                    <div
                      className="w-full overflow-auto"
                      style={{ maxHeight: '400px' }}
                    >
                      <table className="w-full text-sm table-fixed">
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left p-2 w-8"></th>
                            <th className="text-left p-2 w-[25%]">
                              <button
                                type="button"
                                onClick={() => handleSort('name')}
                                className="flex items-center font-medium text-xs hover:text-primary"
                              >
                                Model
                                {sortColumn === 'name' ? (
                                  sortDirection === 'asc' ? (
                                    <ChevronUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-2 w-[15%] whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSort('input_price')}
                                className="flex items-center font-medium text-xs hover:text-primary"
                              >
                                Input Price
                                {sortColumn === 'input_price' ? (
                                  sortDirection === 'asc' ? (
                                    <ChevronUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-2 w-[15%] whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSort('output_price')}
                                className="flex items-center font-medium text-xs hover:text-primary"
                              >
                                Output Price
                                {sortColumn === 'output_price' ? (
                                  sortDirection === 'asc' ? (
                                    <ChevronUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-2 w-[15%] whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSort('context_length')}
                                className="flex items-center font-medium text-xs hover:text-primary"
                              >
                                Context
                                {sortColumn === 'context_length' ? (
                                  sortDirection === 'asc' ? (
                                    <ChevronUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-2 w-[10%] whitespace-nowrap">
                              Tools
                            </th>
                            <th className="text-left p-2 w-[15%]">
                              <button
                                type="button"
                                onClick={() => handleSort('created_at')}
                                className="flex items-center font-medium text-xs hover:text-primary"
                              >
                                Release Date
                                {sortColumn === 'created_at' ? (
                                  sortDirection === 'asc' ? (
                                    <ChevronUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                                )}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortModels(modelsInGroup).map((model) => (
                            <tr
                              key={model.slug}
                              className="border-b border-muted hover:bg-muted/50"
                            >
                              <td className="p-2">
                                <Checkbox
                                  id={model.slug}
                                  checked={visibility[model.slug] ?? false}
                                  onCheckedChange={(checked) =>
                                    handleVisibilityChange(
                                      model.slug,
                                      !!checked,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <Label
                                  htmlFor={model.slug}
                                  className="cursor-pointer hover:text-primary font-medium flex items-center gap-1"
                                >
                                  <span>
                                    {model.short_name ||
                                      model.slug.split('/')[1] ||
                                      model.slug}
                                  </span>
                                </Label>
                              </td>
                              <td className="p-2 whitespace-nowrap text-xs">
                                {formatPrice(model.endpoint?.pricing.prompt)}
                              </td>
                              <td className="p-2 whitespace-nowrap text-xs">
                                {formatPrice(
                                  model.endpoint?.pricing.completion,
                                )}
                              </td>
                              <td className="p-2 whitespace-nowrap text-xs">
                                {(
                                  model.endpoint?.context_length ||
                                  model.context_length
                                )?.toLocaleString()}{' '}
                                tokens
                              </td>
                              <td className="p-2 text-center">
                                {model.endpoint?.supports_tool_parameters ? (
                                  <span className="text-green-500 text-xs">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="p-2 max-w-xs">
                                <p className="text-xs text-muted-foreground">
                                  {model.created_at
                                    ? getMonthYear(model.created_at)
                                    : 'Unknown'}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
          </>
        )}
      </div>

      <Button onClick={handleSave} disabled={isSaving || isLoading}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  );
}
