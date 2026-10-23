/**
 * Error banner with retry button.
 */
export default function ErrorBanner({ message, onRetry }) {
  return (
    <div
      id="error-banner"
      className="mx-5 sm:mx-8 mt-6 rounded-2xl
                 bg-red-50 dark:bg-red-950/40
                 border border-red-200 dark:border-red-800/50
                 p-5 animate-fade-in-up"
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-red-500 dark:text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400/80 break-words">
            {message}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          id="retry-button"
          onClick={onRetry}
          className="mt-4 w-full sm:w-auto
                     px-4 py-2 rounded-xl
                     text-sm font-semibold
                     bg-red-100 dark:bg-red-900/40
                     text-red-700 dark:text-red-300
                     hover:bg-red-200 dark:hover:bg-red-900/60
                     transition-all duration-200 cursor-pointer
                     active:scale-[0.98]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
