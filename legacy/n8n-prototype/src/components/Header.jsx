/**
 * Header — app name, subtitle, and dark-mode toggle.
 */
export default function Header({ dark, onToggleTheme }) {
  return (
    <header className="relative flex items-center justify-between px-5 pt-6 pb-4 sm:px-8">
      {/* Left — branding */}
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-coral-500 dark:text-coral-400 mb-0.5">
          UNOOCC
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
          <span className="gradient-text">Room</span>{" "}
          <span className="text-neutral-800 dark:text-neutral-100">Availability</span>
        </h1>
        <p className="mt-0.5 text-sm sm:text-base font-medium text-neutral-500 dark:text-neutral-400">
          Find a free classroom near you.
        </p>
      </div>

      {/* Right — theme toggle */}
      <button
        id="theme-toggle"
        onClick={onToggleTheme}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="flex items-center justify-center w-10 h-10 rounded-xl
                   bg-neutral-100 dark:bg-neutral-800
                   hover:bg-neutral-200 dark:hover:bg-neutral-700
                   text-neutral-600 dark:text-neutral-300
                   shadow-sm transition-all duration-200 cursor-pointer"
      >
        {dark ? (
          /* Sun icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          /* Moon icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>
    </header>
  );
}
