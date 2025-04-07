import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Plus } from 'lucide-react';

export interface PageAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  icon?: ReactNode;
  disabled?: boolean;
  size?: ButtonProps['size'];
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: PageAction[];
  className?: string;
  showSidebarToggle?: boolean;
  icon?: ReactNode;
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  showSidebarToggle = true,
  icon,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex justify-between items-center h-12 px-2 border-b bg-background w-full shrink-0',
        className,
      )}
    >
      <h1 className="text-lg font-semibold flex items-center gap-2">
        {showSidebarToggle && <SidebarToggle />}
        {icon}
        {title}
      </h1>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant={action.variant || 'default'}
              disabled={action.disabled}
              size={action.size || 'sm'}
              className="gap-2"
            >
              {action.icon && action.icon}
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
