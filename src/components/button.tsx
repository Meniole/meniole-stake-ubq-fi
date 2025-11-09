interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  isLoading?: boolean;
  isLoadingText?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void | { hash: string; } | undefined>;
}

export function Button({ children, disabled, isLoading, isLoadingText, onClick, ...props }: ButtonProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button {...props} onClick={handleClick} disabled={isLoading || disabled}>
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