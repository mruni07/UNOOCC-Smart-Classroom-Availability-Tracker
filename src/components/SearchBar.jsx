import { useState } from "react";

const QUICK_ACTIONS = [
  { label: "Free right now", query: "Which rooms are free right now?" },
  { label: "1st floor", query: "Which rooms are free on the 1st floor?" },
  { label: "2nd floor", query: "Which rooms are free on the 2nd floor?" },
  { label: "3rd floor", query: "Which rooms are free on the 3rd floor?" },
  { label: "4th floor", query: "Which rooms are free on the 4th floor?" },
  { label: "5th floor", query: "Which rooms are free on the 5th floor?" },
  { label: "6th floor", query: "Which rooms are free on the 6th floor?" },
  { label: "7th floor", query: "Which rooms are free on the 7th floor?" },
  { label: "8th floor", query: "Which rooms are free on the 8th floor?" },
  { label: "9th floor", query: "Which rooms are free on the 9th floor?" },
  { label: "10th floor", query: "Which rooms are free on the 10th floor?" },
];

/**
 * SearchBar — input field, send button, and quick-action chips.
 */
export default function SearchBar({ onSend, isLoading }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
  };

  const handleChip = (query) => {
    if (isLoading) return;
    onSend(query);
    setValue("");
  };

  return (
    <div className="px-5 sm:px-8">
      {/* Input row */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        {/* Search icon inside input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-neutral-400 dark:text-neutral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            id="search-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
            placeholder="Which rooms are free right now?"
            className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700
                       bg-white dark:bg-neutral-850
                       py-3.5 pl-11 pr-4
                       text-base text-neutral-900 dark:text-neutral-100
                       placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                       shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:border-coral-400
                       disabled:opacity-60
                       transition-all duration-200"
          />
        </div>

        {/* Send button */}
        <button
          id="send-button"
          type="submit"
          disabled={isLoading || !value.trim()}
          className="flex items-center justify-center
                     w-12 h-12 rounded-2xl
                     bg-coral-500 hover:bg-coral-600
                     dark:bg-coral-600 dark:hover:bg-coral-500
                     text-white shadow-md shadow-coral-500/25
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 cursor-pointer
                     active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>

      {/* Quick-action chips — scrollable row */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
           style={{ WebkitOverflowScrolling: "touch" }}>
        {QUICK_ACTIONS.map((chip) => (
          <button
            key={chip.label}
            id={`chip-${chip.label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => handleChip(chip.query)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0
                       px-3.5 py-2 rounded-xl
                       text-sm font-medium
                       bg-coral-50 dark:bg-neutral-800
                       text-coral-700 dark:text-coral-300
                       border border-coral-200/60 dark:border-neutral-700
                       hover:bg-coral-100 dark:hover:bg-neutral-700
                       hover:border-coral-300 dark:hover:border-neutral-600
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 cursor-pointer
                       active:scale-[0.97]"
          >
            <span className="text-coral-400 dark:text-coral-500 text-xs">●</span>
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
