import type { MouseEvent } from 'react';

type ButtonClickHandler =
  | ((...args: any[]) => void | Promise<void | any>)
  | ((event: MouseEvent<HTMLButtonElement>) => void | Promise<void>);

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  isLoading?: boolean;
  isLoadingText?: string;
  onClick?: ButtonClickHandler;
}

export function Button({
  children,
  disabled,
  isLoading,
  isLoadingText,
  onClick,
  ...props
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled && !isLoading) {      
      try {
        const result = onClick(event);
        if (result instanceof Promise) {
          result.catch(console.error);
        }
      } catch {        
        const result = (onClick as () => any)();
        if (result instanceof Promise) {
          result.catch(console.error);
        }
      }
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <div className="spinner button-spinner"></div>
          <span>{isLoadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}