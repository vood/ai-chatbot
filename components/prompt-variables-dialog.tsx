'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Extract variables from a prompt content (format: {variable_name})
export function extractVariables(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/\{([^{}]+)\}/g) || [];
  const variables = matches.map((match) => match.slice(1, -1)); // Remove { and }
  return [...new Set(variables)]; // Remove duplicates
}

// Replace variables in content with their values
export function replaceVariables(
  content: string,
  values: Record<string, string>,
): string {
  let result = content;
  Object.entries(values).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

interface PromptVariablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptContent: string;
  onComplete: (finalContent: string) => void;
}

export function PromptVariablesDialog({
  open,
  onOpenChange,
  promptContent,
  onComplete,
}: PromptVariablesDialogProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [hasVariables, setHasVariables] = useState<boolean | null>(null);
  const processedRef = useRef(false);

  // Process the prompt content only when the dialog opens
  useEffect(() => {
    if (open && promptContent && !processedRef.current) {
      const vars = extractVariables(promptContent);
      setHasVariables(vars.length > 0);

      // Initialize values if we have variables
      if (vars.length > 0) {
        const initialValues: Record<string, string> = {};
        vars.forEach((variable) => {
          initialValues[variable] = '';
        });
        setVariableValues(initialValues);
      } else {
        // If no variables, complete immediately
        onComplete(promptContent);
        // Set a timeout to close the dialog
        const timeoutId = setTimeout(() => {
          onOpenChange(false);
        }, 100);

        return () => clearTimeout(timeoutId);
      }

      processedRef.current = true;
    }

    // Reset the processedRef when dialog closes
    if (!open) {
      processedRef.current = false;
    }
  }, [open, promptContent, onComplete, onOpenChange]);

  const handleInputChange = useCallback((variable: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variable]: value,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!promptContent) return;

    const finalContent = replaceVariables(promptContent, variableValues);
    onComplete(finalContent);
    onOpenChange(false);
  }, [promptContent, variableValues, onComplete, onOpenChange]);

  // Format variable name for display (convert snake_case to Title Case)
  const formatVariableName = useCallback((variable: string): string => {
    return variable
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  // Don't render anything while we're determining if there are variables
  if (hasVariables === null) {
    return null;
  }

  // Render a simplified dialog for no variables
  if (hasVariables === false) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Using Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>This prompt doesn&apos;t have any variables to fill in.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Applying prompt to your message...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render the full dialog with form fields for variables
  const variables = extractVariables(promptContent);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete the prompt</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {variables.map((variable) => (
            <div key={variable} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`variable-${variable}`} className="text-right">
                {formatVariableName(variable)}
              </Label>
              <Input
                id={`variable-${variable}`}
                value={variableValues[variable] || ''}
                onChange={(e) => handleInputChange(variable, e.target.value)}
                className="col-span-3"
                placeholder={`Enter ${formatVariableName(variable).toLowerCase()}`}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
