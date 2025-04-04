import * as React from 'react';
import {
  Button as OriginalButton,
  type ButtonProps as OriginalButtonProps,
} from '@/components/ui/button'; // Import the original Shadcn Button
import { cn } from '@/lib/utils';

// Define MyButtonProps: Omit original size, add our own with 'xs'
export interface ButtonProps extends Omit<OriginalButtonProps, 'size'> {
  size?: OriginalButtonProps['size'] | 'xs'; // Allow original sizes + 'xs'
}

// Create the MyButton component that wraps the original Button
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, ...props }, ref) => {
    // Conditionally apply 'xs' styles via className
    const isXs = size === 'xs';
    const xsStyles = isXs ? 'h-8 rounded-md px-3 text-sm [&_svg]:size-4' : '';

    // Determine the size prop to pass to the original Button
    // Pass undefined if 'xs', otherwise pass the original size
    const originalButtonSize = isXs ? undefined : size;

    // Render the original Button.
    // If size is 'xs', omit the size prop and rely on className override.
    // Otherwise, pass the size prop through.
    return (
      <OriginalButton
        ref={ref}
        size={originalButtonSize} // Pass the potentially adjusted size
        className={cn(xsStyles, className)} // Merge xs styles if applicable
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
