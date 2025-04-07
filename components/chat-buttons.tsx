'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { memo } from 'react';
import { PaperclipIcon, ArrowUpIcon, StopIcon } from '@/components/icons';
import type React from 'react';
import { Toggle } from '@/components/ui/toggle';

// Attachment Button
interface AttachmentsButtonProps {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
  disabled?: boolean;
}

function PureAttachmentsButton({
  fileInputRef,
  status,
  disabled,
}: AttachmentsButtonProps) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready' || disabled}
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
  isUploading?: boolean;
}

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  isUploading,
}: SendButtonProps) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0 || isUploading}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

export const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.isUploading !== nextProps.isUploading) return false;
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
    <Toggle
      pressed={isActive}
      onPressedChange={() => onClick()}
      disabled={disabled}
      title={tooltip}
      variant="outline"
      size="sm"
      className="transition-all size-8"
    >
      {icon}
    </Toggle>
  );
}

export const FeatureToggleButton = memo(PureFeatureToggleButton);
