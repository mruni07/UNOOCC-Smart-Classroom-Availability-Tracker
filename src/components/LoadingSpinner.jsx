/**
 * Renders a loading spinner with a pulsing message.
 */
export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in-up">
      <div className="spinner" />
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 animate-pulse-soft">
        Checking room availability…
      </p>
    </div>
  );
}
