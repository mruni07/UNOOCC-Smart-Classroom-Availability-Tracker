import { useState, useCallback, useRef } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBanner from "./components/ErrorBanner";
import ResultsArea from "./components/ResultsArea";
import EmptyState from "./components/EmptyState";
import { useTheme } from "./hooks/useTheme";
import { askAgent } from "./services/api";

export default function App() {
  const { dark, toggle } = useTheme();

  // Query / response state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);      // { text, timestamp }
  const [error, setError] = useState(null);         // string | null
  const lastQueryRef = useRef("");

  const handleSend = useCallback(async (question) => {
    lastQueryRef.current = question;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = await askAgent(question);
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setResult({ text, timestamp: now });
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (lastQueryRef.current) {
      handleSend(lastQueryRef.current);
    }
  }, [handleSend]);

  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950 font-sans transition-colors duration-300">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-coral-200/30 dark:bg-coral-900/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-amber-200/20 dark:bg-amber-900/10 blur-3xl" />
      </div>

      {/* App shell */}
      <div className="mx-auto max-w-lg pb-10">
        <Header dark={dark} onToggleTheme={toggle} />

        <div className="mt-2">
          <SearchBar onSend={handleSend} isLoading={loading} />
        </div>

        {/* Content area */}
        <main className="mt-2">
          {loading && <LoadingSpinner />}

          {error && !loading && (
            <ErrorBanner message={error} onRetry={handleRetry} />
          )}

          {result && !loading && !error && (
            <ResultsArea text={result.text} timestamp={result.timestamp} />
          )}

          {!result && !loading && !error && <EmptyState />}
        </main>

        {/* Footer */}
        <footer className="mt-10 text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            UNOOCC — Smart Classroom Availability Tracker
          </p>
        </footer>
      </div>
    </div>
  );
}
