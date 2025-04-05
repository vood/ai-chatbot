'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DialogTitle, DialogHeader } from '@/components/ui/dialog';

// Define Prompt type
export type Prompt = {
  id: string;
  name: string;
  content: string;
};

interface CommandPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPrompt: (content: string) => void;
}

export function CommandPrompt({
  open,
  onOpenChange,
  onSelectPrompt,
}: CommandPromptProps) {
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);

  // Use memoized handler to prevent URL changes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      // If URL has been modified, clean it up
      if (window.location.search) {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());
      }

      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  // Fetch prompts when dialog is about to open
  useEffect(() => {
    if (open && availablePrompts.length === 0 && !promptsLoading) {
      const fetchPrompts = async () => {
        setPromptsLoading(true);
        setPromptsError(null);
        try {
          const response = await fetch('/api/prompts');
          if (!response.ok) {
            throw new Error('Failed to fetch prompts');
          }
          const data = await response.json();
          setAvailablePrompts(data);
        } catch (error: any) {
          console.error('Error fetching prompts:', error);
          setPromptsError(error.message || 'Could not load prompts.');
        } finally {
          setPromptsLoading(false);
        }
      };
      fetchPrompts();
    }
  }, [open, availablePrompts.length, promptsLoading]);

  const handlePromptSelect = useCallback(
    (promptContent: string) => {
      // First call the parent's select handler
      onSelectPrompt(promptContent);

      // Then close the dialog
      // Add a small delay to ensure proper state handling
      // Use a timeout but make sure it's properly cleaned up
      const timeoutId = setTimeout(() => {
        handleOpenChange(false);
      }, 10);

      return () => clearTimeout(timeoutId);
    },
    [onSelectPrompt, handleOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Select a Prompt</DialogTitle>
      </DialogHeader>
      <CommandInput
        placeholder="Search prompts..."
        onKeyDown={(e) => {
          // Prevent keyboard events from affecting the URL
          if (
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown' ||
            e.key === 'Enter'
          ) {
            e.preventDefault();
          }
        }}
      />
      <CommandList>
        {promptsLoading && <CommandEmpty>Loading prompts...</CommandEmpty>}
        {promptsError && (
          <CommandEmpty className="text-destructive">
            {promptsError}
          </CommandEmpty>
        )}
        {!promptsLoading && !promptsError && availablePrompts.length === 0 && (
          <CommandEmpty>No prompts found.</CommandEmpty>
        )}
        {!promptsLoading && !promptsError && availablePrompts.length > 0 && (
          <CommandGroup heading="Your Prompts">
            {availablePrompts.map((prompt) => (
              <CommandItem
                key={prompt.id}
                value={prompt.name}
                onSelect={() => handlePromptSelect(prompt.content)}
                className="cursor-pointer"
              >
                <span>{prompt.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
