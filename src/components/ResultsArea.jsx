/**
 * Renders the agent's prose response as nicely formatted content.
 *
 * Since the agent replies in natural language (not structured JSON),
 * we render the text directly — splitting on line breaks and detecting
 * bullet points / numbered lists for formatting.
 */
export default function ResultsArea({ text, timestamp }) {
  // Split the text into lines, preserving structure
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  return (
    <div className="px-5 sm:px-8 mt-6 animate-fade-in-up">
      {/* Timestamp */}
      {timestamp && (
        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-3 flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          as of {timestamp}
        </p>
      )}

      {/* Response card */}
      <div
        id="results-card"
        className="rounded-2xl
                   bg-white dark:bg-neutral-850
                   border border-neutral-200/70 dark:border-neutral-700/70
                   shadow-lg shadow-neutral-900/[0.04] dark:shadow-neutral-900/30
                   overflow-hidden"
      >
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-coral-400 via-coral-500 to-amber-400" />

        <div className="p-5 sm:p-6 stagger-children">
          {lines.map((line, idx) => {
            const isBullet = /^[-•*]\s/.test(line);
            const isNumbered = /^\d+[\.\)]\s/.test(line);

            if (isBullet || isNumbered) {
              const content = line.replace(/^[-•*\d\.\)]+\s*/, "");
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 py-2.5
                             border-b border-neutral-100 dark:border-neutral-800
                             last:border-b-0 animate-fade-in-up"
                >
                  <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-coral-400 dark:bg-coral-500" />
                  <p className="text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {highlightAvailability(content)}
                  </p>
                </div>
              );
            }

            // Regular paragraph
            return (
              <p
                key={idx}
                className="text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300 py-1.5 animate-fade-in-up"
              >
                {highlightAvailability(line)}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Highlights "free until" / "available" / time patterns with color accents.
 */
function highlightAvailability(text) {
  // Match patterns like "free until 2:30 PM", "available until end of day", etc.
  const parts = text.split(/(free until [^,.\n]+|available until [^,.\n]+|free for the rest of the day|available all day|no (?:rooms|classrooms) (?:are )?(?:currently )?(?:free|available))/gi);

  return parts.map((part, i) => {
    const lower = part.toLowerCase();

    if (/free for the rest of the day|available all day/i.test(lower)) {
      return (
        <span key={i} className="font-semibold text-green-600 dark:text-green-400">
          {part}
        </span>
      );
    }

    if (/free until|available until/i.test(lower)) {
      return (
        <span key={i} className="font-semibold text-amber-600 dark:text-amber-400">
          {part}
        </span>
      );
    }

    if (/no (?:rooms|classrooms)/i.test(lower)) {
      return (
        <span key={i} className="font-semibold text-red-500 dark:text-red-400">
          {part}
        </span>
      );
    }

    return part;
  });
}
