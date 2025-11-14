import type { MouseEvent } from 'react';

type ButtonClickHandler = (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;

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
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (!onClick || disabled || isLoading) return;

    try {
      const result = onClick(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error('Button click handler error:', error);
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