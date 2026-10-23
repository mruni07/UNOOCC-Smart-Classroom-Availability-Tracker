import { cn } from "@/lib/utils";

export function LiveIndicator({
  className,
  light,
}: {
  className?: string;
  showButton?: boolean;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs",
        light ? "text-hero-muted" : "text-muted-foreground",
        className,
      )}
      role="status"
    >
      <span className="relative inline-flex size-2 rounded-full bg-unverified" aria-hidden="true" />
      <span>Room listings and timetable status require verification</span>
    </div>
  );
}
