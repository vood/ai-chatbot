'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { SparklesIcon } from './icons';
import { useClickOutside } from '@/hooks/use-click-outside';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export type Prompt = {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
  sharing: string;
  folder_id: string | null;
};

interface CommandMenuProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSelectPrompt: (prompt: Prompt) => void;
  searchTerm: string;
  anchorPosition: { top: number; left: number } | null;
}

export function CommandMenu({
  isOpen,
  setIsOpen,
  onSelectPrompt,
  searchTerm,
  anchorPosition,
}: CommandMenuProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useClickOutside(menuRef, () => {
    if (isOpen) setIsOpen(false);
  });

  // Fetch prompts
  useEffect(() => {
    if (isOpen) {
      fetchPrompts();
    }
  }, [isOpen]);

  // Filter prompts based on search term
  useEffect(() => {
    if (searchTerm.startsWith('/')) {
      const query = searchTerm.toLowerCase().slice(1);
      setFilteredPrompts(
        prompts.filter((prompt) => prompt.name.toLowerCase().includes(query)),
      );
    }
  }, [searchTerm, prompts]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    onSelectPrompt(prompt);
    setIsOpen(false);
  };

  if (!isOpen || !anchorPosition) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50"
      style={{
        top: `${anchorPosition.top}px`,
        left: `${anchorPosition.left}px`,
        width: '300px',
      }}
    >
      <Command className="rounded-lg border shadow-md">
        <CommandList>
          <CommandInput
            placeholder="Search prompts..."
            value={searchTerm.slice(1)}
          />
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center p-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            ) : searchTerm.length > 1 ? (
              'No matching prompts found'
            ) : (
              'No prompts yet'
            )}
          </CommandEmpty>
          {!loading && (
            <CommandGroup heading="Prompts">
              {filteredPrompts.map((prompt) => (
                <CommandItem
                  key={prompt.id}
                  onSelect={() => handleSelectPrompt(prompt)}
                  className="flex items-center gap-2"
                >
                  <SparklesIcon size={14} />
                  <span>{prompt.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
