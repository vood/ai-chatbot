'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TrashIcon } from '@/components/icons';
import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AgentForm } from './agent-form';
import type { Tables } from '@/supabase/types';
import type { z } from 'zod';

type Agent = Tables<'assistants'>;

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialData?: Agent;
  onSubmit: (data: any) => Promise<void>;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export function AgentDialog({
  open,
  onOpenChange,
  title,
  description,
  initialData,
  onSubmit,
  onDelete,
  isSubmitting,
}: AgentDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleValidate = () => {
    toast.info('Validating form...', {
      description: 'Check console for validation details',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {title}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={handleValidate}
            >
              Check Validation
            </Button>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <AgentForm
            initialData={initialData}
            onSubmit={onSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
        <DialogFooter className="pt-4 justify-between">
          <div>
            {initialData?.id && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isSubmitting}
              >
                <TrashIcon size={14} /> Delete
              </Button>
            )}
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button type="submit" form="agent-form" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : initialData?.id ? (
                'Save Changes'
              ) : (
                'Create Agent'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
