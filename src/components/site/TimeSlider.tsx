import { Clock, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DAY_END, DAY_START, fmt } from "@/lib/time";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

export function TimeSlider({
  value,
  duration,
  onChange,
  onNow,
  isNow,
  className,
}: {
  value: number;
  duration: number;
  onChange: (v: number) => void;
  onNow?: (() => void) | undefined;
  isNow?: boolean | undefined;
  className?: string | undefined;
}) {
  const max = DAY_END - Math.min(duration, 60);
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="size-4 text-brand" />
          <span>Scrub the day</span>
          <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
            {fmt(value)}–{fmt(Math.min(value + duration, DAY_END))}
          </span>
        </div>
        {onNow && (
          <button
            type="button"
            onClick={onNow}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
              isNow
                ? "bg-brand-soft text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <RotateCcw className="size-3" /> {isNow ? "Showing now" : "Back to now"}
          </button>
        )}
      </div>
      <Slider
        min={DAY_START}
        max={max}
        step={15}
        value={[Math.min(value, max)]}
        onValueChange={(v) => onChange(v[0] ?? value)}
        aria-label="Start time"
      />
      <div className="mt-2 flex justify-between font-mono text-[0.65rem] text-muted-foreground">
        {HOURS.map((h) => (
          <span key={h} className="hidden first:inline last:inline sm:inline">
            {fmt(h).slice(0, 2)}
          </span>
        ))}
      </div>
    </div>
  );
}
