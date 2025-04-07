'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { memo } from 'react';
import { PaperclipIcon, ArrowUpIcon, StopIcon } from '@/components/icons';
import type React from 'react';

// Attachment Button
interface AttachmentsButtonProps {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}

function PureAttachmentsButton({
  fileInputRef,
  status,
}: AttachmentsButtonProps) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

// Export the component directly without memo
export const AttachmentsButton = PureAttachmentsButton;

// Stop Button
interface StopButtonProps {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}

function PureStopButton({ stop, setMessages }: StopButtonProps) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

export const StopButton = memo(PureStopButton);

// Send Button
interface SendButtonProps {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}

function PureSendButton({ submitForm, input, uploadQueue }: SendButtonProps) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

export const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

// Feature Toggle Button
interface FeatureToggleButtonProps {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
  disabled: boolean;
}

function PureFeatureToggleButton({
  icon,
  isActive,
  onClick,
  tooltip,
  disabled,
}: FeatureToggleButtonProps) {
  return (
    <Button
      className={`rounded-md p-2 h-8 transition-colors border ${
        isActive
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-transparent border-zinc-200 dark:border-zinc-700'
      }`}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      disabled={disabled}
      variant="ghost"
      title={tooltip}
    >
      {icon}
    </Button>
  );
}

export const FeatureToggleButton = memo(PureFeatureToggleButton);
