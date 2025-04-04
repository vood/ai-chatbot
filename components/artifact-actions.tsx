import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { artifactDefinitions, type UIArtifact } from './artifact';
import { type Dispatch, memo, type SetStateAction, useState } from 'react';
import type { ArtifactActionContext } from './create-artifact';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SendHorizonal } from 'lucide-react';
import React from 'react';

interface ArtifactActionsProps {
  artifact: UIArtifact;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: any;
  setMetadata: Dispatch<SetStateAction<any>>;
}

function PureArtifactActions({
  artifact,
  handleVersionChange,
  currentVersionIndex,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
}: ArtifactActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
  };

  return (
    <div className="flex flex-row gap-1">
      {artifactDefinition.actions.map((action) => {
        const key = action.description;
        const disabled =
          isLoading || artifact.status === 'streaming'
            ? true
            : action.isDisabled
              ? action.isDisabled(actionContext)
              : false;

        if (action.render) {
          // If a render function exists, call it with context and props
          return (
            <React.Fragment key={key}>
              {action.render(actionContext, { isLoading, disabled })}
            </React.Fragment>
          );
        } else if (action.onClick) {
          // Otherwise, render the standard button with onClick
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('h-fit dark:hover:bg-zinc-700', {
                    'p-2': !action.label,
                    'py-1.5 px-2': action.label,
                  })}
                  onClick={async () => {
                    setIsLoading(true);

                    try {
                      if (action.onClick) {
                        await Promise.resolve(action.onClick(actionContext));
                      }
                    } catch (error) {
                      toast.error('Failed to execute action');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={disabled}
                >
                  {action.icon}
                  {action.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{action.description}</TooltipContent>
            </Tooltip>
          );
        }

        return null; // Skip actions with neither render nor onClick
      })}
    </div>
  );
}

export const ArtifactActions = memo(
  PureArtifactActions,
  (prevProps, nextProps) => {
    if (prevProps.artifact.status !== nextProps.artifact.status) return false;
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
      return false;
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
    if (prevProps.artifact.content !== nextProps.artifact.content) return false;

    return true;
  },
);
