'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Prompt } from '@/components/command-menu';

interface PromptContextType {
  selectedPrompt: Prompt | null;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  handleSelectPrompt: (prompt: Prompt) => void;
  handleApplyPrompt: (content: string) => void;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export function PromptProvider({
  children,
  onApplyPrompt,
}: {
  children: ReactNode;
  onApplyPrompt: (content: string) => void;
}) {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  // Listen for prompt:selected events from the sidebar
  useEffect(() => {
    const handlePromptEvent = (event: CustomEvent<{ prompt: Prompt }>) => {
      setSelectedPrompt(event.detail.prompt);
    };

    window.addEventListener(
      'prompt:selected',
      handlePromptEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        'prompt:selected',
        handlePromptEvent as EventListener,
      );
    };
  }, []);

  // Function to handle selecting a prompt
  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };

  // Function to apply a prompt to the input
  const handleApplyPrompt = (content: string) => {
    onApplyPrompt(content);
    setSelectedPrompt(null);
  };

  return (
    <PromptContext.Provider
      value={{
        selectedPrompt,
        setSelectedPrompt,
        handleSelectPrompt,
        handleApplyPrompt,
      }}
    >
      {children}
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const context = useContext(PromptContext);

  if (context === undefined) {
    throw new Error('usePrompt must be used within a PromptProvider');
  }

  return context;
}
