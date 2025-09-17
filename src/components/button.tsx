interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  isLoadingText?: string;
}

export function Button({ children, disabled, isLoading, isLoadingText, ...props }: ButtonProps) {
  return (
    <button {...props} disabled={isLoading || disabled}>
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
