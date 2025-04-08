'use client';

import type { Attachment, UIMessage } from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
  useMemo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import {
  ArrowUpIcon,
  PaperclipIcon,
  StopIcon,
  GlobeIcon,
  ImageIcon,
  SparklesIcon,
} from './icons';
import { ModelSelector } from './model-selector';
import { ImageModelSelector } from './image-model-selector';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import { FeatureToggleButton } from './chat-buttons';
import { SUPPORTED_IMAGE_MODELS } from '@/lib/ai/models';

// Import our new components & hooks
import { CommandPrompt } from './command-prompt';
import { PromptVariablesDialog } from './prompt-variables-dialog';
import { AttachmentsButton, SendButton, StopButton } from './chat-buttons';
import { useSupabaseStorageUpload } from '@/hooks/use-supabase-storage-upload';
import { MCPToolsMenu } from './mcp-tools-menu';

// Define the type locally (or move to a shared types file)
interface OpenRouterModel {
  slug: string;
  endpoint?: {
    supports_tool_parameters: boolean;
  };
  // Add other fields if needed from ModelSelector's definition
}

// Update Props Interface
interface PureMultimodalInputProps {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  supportsTools: boolean;
  selectedChatModel: string;
  onModelChange: (model: OpenRouterModel) => void;
  // Unified props for ALL tools
  selectedTools: ReadonlySet<string>; // <-- Single Set for all selected tools
  onSelectedToolsChange: (newSelectedTools: Set<string>) => void; // <-- Single handler
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  supportsTools,
  selectedChatModel,
  onModelChange,
  selectedTools,
  onSelectedToolsChange,
}: PureMultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  // State for command prompt and variable handling
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showVariablesDialog, setShowVariablesDialog] = useState(false);
  const [selectedPromptContent, setSelectedPromptContent] = useState('');

  // Use the custom upload hook
  const { uploadQueue, isUploading, handleFileChange } =
    useSupabaseStorageUpload({
      onUploadSuccess: (uploadedAttachments) => {
        // Update the attachments state managed by useChat
        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...uploadedAttachments,
        ]);
      },
      // Optional: Add onUploadError handling if needed
      // onUploadError: (error, fileName) => { ... }
    });

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K (macOS) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); // Prevent any default browser behavior
        if (status === 'ready' && !isUploading) {
          // Also check if not uploading
          setShowCommandDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, isUploading]); // Add isUploading dependency

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;

    // Check if the user has just typed "/" at the start or in an empty field
    if (value === '/' && (!input || input.trim() === '')) {
      event.preventDefault(); // Prevent any default behavior
      if (!isUploading) {
        // Only open if not uploading
        setShowCommandDialog(true);
      }
      return;
    }

    setInput(value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive the current image tool name from the set for the selector
  const selectedImageToolName = useMemo(() => {
    const imageToolNames = new Set(
      SUPPORTED_IMAGE_MODELS.map((m) => m.toolName),
    );
    for (const toolName of selectedTools) {
      if (imageToolNames.has(toolName)) {
        return toolName;
      }
    }
    return ''; // Return empty or default if none found
  }, [selectedTools]);

  // Handler for Image Selector change
  const handleImageToolChange = useCallback(
    (newImageToolName: string) => {
      const newSelectedTools = new Set(selectedTools);
      const imageToolNames = new Set(
        SUPPORTED_IMAGE_MODELS.map((m) => m.toolName),
      );
      imageToolNames.forEach((name) => {
        if (newSelectedTools.has(name)) {
          newSelectedTools.delete(name);
        }
      });
      if (newImageToolName) {
        newSelectedTools.add(newImageToolName);
      }
      onSelectedToolsChange(newSelectedTools);
    },
    [selectedTools, onSelectedToolsChange],
  );

  // Handler for Toggle Button change
  const handleToggleTool = useCallback(
    (toolNameToToggle: string) => {
      const newSelectedTools = new Set(selectedTools);
      if (newSelectedTools.has(toolNameToToggle)) {
        newSelectedTools.delete(toolNameToToggle);
      } else {
        newSelectedTools.add(toolNameToToggle);
      }
      onSelectedToolsChange(newSelectedTools);
    },
    [selectedTools, onSelectedToolsChange],
  );

  // Update submitForm to use selectedTools set
  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Extract and identify MCP tools vs standard tools
    const mcpTools = Array.from(selectedTools)
      .filter((tool) => tool.includes('_')) // MCP tools have a server prefix with underscore
      .map((id) => id);

    const standardTools = Array.from(selectedTools).filter(
      (tool) => !tool.includes('_'),
    ); // Standard tools don't have an underscore

    handleSubmit(undefined, {
      experimental_attachments: attachments,
      data: {
        // Standard tool flags
        webSearchEnabled: JSON.stringify(standardTools.includes('webSearch')),
        // Add MCP tools data
        mcpTools: JSON.stringify(mcpTools),
        selectedTools: JSON.stringify(Array.from(selectedTools)),
      },
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    selectedTools,
  ]);

  // Handle prompt selection and variable replacement
  const handlePromptSelect = (promptContent: string) => {
    // First store the selected prompt content
    setSelectedPromptContent(promptContent);

    // We'll close the command dialog (this should be handled by the CommandPrompt component)
    // and only open the variables dialog after that

    // Make sure we delay showing variables dialog until after command dialog is closed
    // but only if not already in a variables dialog flow
    if (!showVariablesDialog) {
      setTimeout(() => {
        setShowVariablesDialog(true);
      }, 100);
    }
  };

  // Handle final prompt with variables filled in
  const handleFinalPrompt = useCallback(
    (finalContent: string) => {
      setInput(finalContent);
      // Adjust height after setting input
      requestAnimationFrame(() => {
        adjustHeight();
        textareaRef.current?.focus();
      });
    },
    [setInput],
  );

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} />
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange} // Use handleFileChange from the hook
        tabIndex={-1}
        disabled={isUploading} // Disable input while uploading
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {/* Display successfully uploaded attachments */}
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {/* Display files currently in the upload queue */}
          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        className={cx(
          'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base pb-10 dark:border-zinc-700',
          className,
        )}
        rows={2}
        autoFocus
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();

            if (status !== 'ready') {
              toast.error('Please wait for the model to finish its response!');
            } else if (isUploading) {
              toast.error('Please wait for uploads to complete!');
            } else {
              submitForm();
            }
          }
        }}
      />

      <div className="absolute bottom-0 p-2 w-full flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <AttachmentsButton
            fileInputRef={fileInputRef}
            status={status}
            disabled={isUploading} // Disable button during upload
          />
          <ModelSelector
            selectedModelId={selectedChatModel}
            className="min-w-[100px] text-xs border border-zinc-200 dark:border-zinc-700"
            onSelectModel={onModelChange}
          />

          {/* Only show tool buttons when tools are supported */}
          {supportsTools && (
            <>
              <ImageModelSelector
                selectedToolName={selectedImageToolName}
                onSelectTool={handleImageToolChange}
                disabled={status !== 'ready' || isUploading}
              />
              <FeatureToggleButton
                icon={<GlobeIcon size={14} />}
                isActive={selectedTools.has('webSearch')}
                onClick={() => handleToggleTool('webSearch')}
                tooltip="Toggle web search"
                disabled={status !== 'ready' || isUploading}
              />
              <MCPToolsMenu
                selectedTools={selectedTools}
                onSelectedToolsChange={onSelectedToolsChange}
                disabled={status !== 'ready' || isUploading}
              />
            </>
          )}
        </div>

        <div>
          {status === 'submitted' ? (
            <StopButton stop={stop} setMessages={setMessages} />
          ) : (
            <SendButton
              input={input}
              submitForm={submitForm}
              uploadQueue={uploadQueue} // Keep for visual disabling logic if needed
              isUploading={isUploading} // Use hook's uploading state
            />
          )}
        </div>
      </div>

      {/* Command Dialog for Prompts */}
      <CommandPrompt
        open={showCommandDialog}
        onOpenChange={setShowCommandDialog}
        onSelectPrompt={handlePromptSelect}
      />

      {/* Dialog for handling prompt variables */}
      <PromptVariablesDialog
        open={showVariablesDialog}
        onOpenChange={setShowVariablesDialog}
        promptContent={selectedPromptContent}
        onComplete={handleFinalPrompt}
      />
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    // Check primitive props first (cheap)
    if (
      prevProps.chatId !== nextProps.chatId ||
      prevProps.input !== nextProps.input ||
      prevProps.selectedChatModel !== nextProps.selectedChatModel ||
      prevProps.status !== nextProps.status ||
      prevProps.className !== nextProps.className ||
      prevProps.supportsTools !== nextProps.supportsTools ||
      prevProps.selectedTools !== nextProps.selectedTools
    ) {
      return false; // Props are different, re-render
    }

    // Check potentially expensive deep comparisons
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false; // Props are different, re-render
    }
    // Check messages - this could be expensive if messages are large/frequent
    if (!equal(prevProps.messages, nextProps.messages)) {
      // Added messages check
      return false; // Props are different, re-render
    }

    // Check function references (assuming parent memoizes them)
    if (
      prevProps.setInput !== nextProps.setInput ||
      prevProps.stop !== nextProps.stop ||
      prevProps.setAttachments !== nextProps.setAttachments ||
      prevProps.setMessages !== nextProps.setMessages ||
      prevProps.append !== nextProps.append ||
      prevProps.handleSubmit !== nextProps.handleSubmit ||
      prevProps.onModelChange !== nextProps.onModelChange ||
      prevProps.onSelectedToolsChange !== nextProps.onSelectedToolsChange
    ) {
      // Added function checks
      return false; // Props are different, re-render
    }

    // If all checks pass, props are considered equal
    return true;
  },
);
