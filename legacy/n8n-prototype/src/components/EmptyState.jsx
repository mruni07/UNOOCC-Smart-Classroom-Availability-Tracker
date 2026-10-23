/**
 * Empty state — shown before any search, with a friendly illustration.
 */
export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 animate-fade-in-up">
      {/* Illustration: campus building icon */}
      <div className="w-20 h-20 rounded-3xl bg-coral-50 dark:bg-neutral-800 flex items-center justify-center mb-5 shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 text-coral-400 dark:text-coral-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Building */}
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="9" y1="22" x2="9" y2="18" />
          <line x1="15" y1="22" x2="15" y2="18" />
          {/* Windows */}
          <rect x="7" y="5" width="3" height="3" rx="0.5" />
          <rect x="14" y="5" width="3" height="3" rx="0.5" />
          <rect x="7" y="11" width="3" height="3" rx="0.5" />
          <rect x="14" y="11" width="3" height="3" rx="0.5" />
          {/* Door */}
          <rect x="10" y="17" width="4" height="5" rx="1" />
        </svg>
      </div>

      <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 text-center">
        What room do you need?
      </h2>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-xs leading-relaxed">
        Ask me anything — "free rooms on 1st floor", "labs open after 2 PM",
        or tap a quick filter above.
      </p>
    </div>
  );
}
