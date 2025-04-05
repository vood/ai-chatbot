'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type React from 'react';

export type Action = {
  id: string;
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
};

interface ActionButtonsProps {
  actions: Action[];
}

export function ActionButtons({ actions }: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          className={cn(
            action.isActive
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-transparent border-zinc-200 dark:border-zinc-700',
            action.className || 'rounded-md p-2 h-8 transition-colors border',
          )}
          onClick={(event) => {
            event.preventDefault();
            action.onClick();
          }}
          disabled={action.disabled}
          title={action.tooltip}
        >
          {action.icon}
        </Button>
      ))}
    </div>
  );
}
