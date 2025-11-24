interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullscreen?: boolean;
}

export function LoadingSpinner({ message, size = 'medium', fullscreen = false }: LoadingSpinnerProps) {
  const sizeMap = {
    small: 24,
    medium: 48,
    large: 64,
  };

  const spinnerSize = sizeMap[size];

  const spinner = (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{
          width: `${spinnerSize}px`,
          height: `${spinnerSize}px`,
        }}
      />
      {message && <p className="text-secondary mt-md">{message}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {spinner}
      </div>
    );
  }

  return spinner;
}
