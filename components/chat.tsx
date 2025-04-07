'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  startTransition,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { PromptProvider } from '@/hooks/use-prompt';
import { toast } from 'sonner';
import { saveChatModelAsCookie } from '@/app/(main)/actions';

// Define the model type again for client-side fetching
interface OpenRouterModel {
  slug: string;
  endpoint?: {
    supports_tool_parameters: boolean;
  };
  // Match the fields used in handleModelChange
}

// Client-side fetcher function (REMOVE - no longer needed)
// const clientFetcher = (url: string) => fetch(url).then((res) => res.json());

export function Chat({
  id,
  initialMessages,
  selectedChatModel: initialSelectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  const [currentModelId, setCurrentModelId] = useState(
    initialSelectedChatModel,
  );
  const [supportsToolsClient, setSupportsToolsClient] = useState(false); // Keep this state

  // REMOVE useSWR hook and useEffect for fetching model details
  /*
  const { data: selectedModelData, error: modelFetchError } = useSWR<OpenRouterModel>(...);
  useEffect(() => { ... }, [selectedModelData, modelFetchError]);
  */

  // Initialize supportsToolsClient based on initial model data (if available synchronously, otherwise might need a different approach or accept initial state)
  // For now, we'll rely on the first model selection to set it.
  // A more robust solution might involve passing initial supportsTools from the page.

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id,
    body: {
      id,
      selectedChatModel: currentModelId,
      supportsTools: supportsToolsClient,
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: () => {
      toast.error('An error occured, please try again!');
    },
    // Add currentModelId and supportsToolsClient as dependencies if useChat needs to re-initialize
    // Note: This might cause unexpected behavior depending on useChat implementation.
    // Test thoroughly if you uncomment this.
    // dependencies: [currentModelId, supportsToolsClient]
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  const handleApplyPrompt = (content: string) => {
    setInput(content);
  };

  // Updated Callback for ModelSelector
  const handleModelChange = (model: OpenRouterModel) => {
    setCurrentModelId(model.slug);
    const supports = model.endpoint?.supports_tool_parameters ?? false;
    setSupportsToolsClient(supports);
    // Update cookie preference if needed
    setTimeout(() => {
      saveChatModelAsCookie(model.slug); // Keep this if necessary
    }, 1000);
  };

  return (
    <PromptProvider onApplyPrompt={handleApplyPrompt}>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={currentModelId}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages as UIMessage[]}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              selectedChatModel={currentModelId}
              onModelChange={handleModelChange} // Pass the updated handler
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages as UIMessage[]}
              setMessages={setMessages}
              append={append}
              supportsTools={supportsToolsClient} // Pass the state
            />
          )}
        </form>
      </div>

      <Artifact
        selectedChatModel={currentModelId}
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages as UIMessage[]}
        setMessages={setMessages}
        reload={reload}
        votes={votes || []}
        isReadonly={isReadonly}
        supportsTools={supportsToolsClient}
        onModelChange={handleModelChange} // Pass the handler
      />
    </PromptProvider>
  );
}
