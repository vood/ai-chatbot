'use client';

import { useState, useMemo, memo } from 'react';
import { Check, Image as DefaultImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SUPPORTED_IMAGE_MODELS,
  type ImageModelDefinition,
} from '@/lib/ai/models';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface ImageModelSelectorProps {
  selectedToolName: string;
  onSelectTool: (toolName: string) => void;
  disabled?: boolean;
  className?: string;
}

function PureImageModelSelector({
  selectedToolName,
  onSelectTool,
  disabled = false,
  className,
}: ImageModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedModel = useMemo(() => {
    return SUPPORTED_IMAGE_MODELS.find(
      (model) => model.toolName === selectedToolName,
    );
  }, [selectedToolName]);

  const handleSelect = (toolName: string) => {
    if (toolName !== selectedToolName) {
      onSelectTool(toolName);
    }
    setOpen(false);
  };

  const TriggerIcon = selectedModel?.iconComponent || DefaultImageIcon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Toggle
                pressed={!!selectedModel}
                variant="outline"
                size="sm"
                className="size-8"
                aria-expanded={open}
              >
                <TriggerIcon className="h-4 w-4" />
                <span className="sr-only">Select Image Generation Tool</span>
              </Toggle>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {selectedModel
              ? `Image Model: ${selectedModel.name}`
              : 'Select Image Model'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {SUPPORTED_IMAGE_MODELS.map((model) => {
                const ListItemIcon = model.iconComponent || DefaultImageIcon;
                return (
                  <CommandItem
                    key={model.toolName}
                    value={model.toolName}
                    onSelect={() => handleSelect(model.toolName)}
                    className="text-xs cursor-pointer flex items-center gap-2 py-1.5"
                  >
                    <ListItemIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5 self-start" />
                    <div className="flex flex-col flex-grow mr-2 overflow-hidden">
                      <span className="font-medium truncate">{model.name}</span>
                      {model.description && (
                        <span className="text-muted-foreground text-[10px] leading-tight whitespace-normal">
                          {model.description}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4 flex-shrink-0 mt-0.5 self-start',
                        selectedToolName === model.toolName
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const ImageModelSelector = memo(PureImageModelSelector);
