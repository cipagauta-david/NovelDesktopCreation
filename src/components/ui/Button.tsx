import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'icon' | 'default';
  size?: 'default' | 'compact';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    
    let baseClass = '';
    
    if (variant === 'primary') baseClass = 'primary-button';
    else if (variant === 'ghost') baseClass = 'ghost-button';
    else if (variant === 'icon') baseClass = 'icon-button';
    
    if (size === 'compact') {
      baseClass = `${baseClass} compact-button`.trim();
    }

    return (
      <button
        ref={ref}
        className={`${baseClass} ${className}`.trim()}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
