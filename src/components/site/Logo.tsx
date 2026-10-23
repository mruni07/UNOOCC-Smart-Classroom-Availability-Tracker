import rbuLogoUrl from "@/assets/rbu-logo.png";
const rbuLogo = { url: rbuLogoUrl };
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <rect width="40" height="40" rx="11" className="fill-primary" />
      <rect x="9" y="9" width="9" height="9" rx="2.5" className="fill-free" />
      <rect
        x="22"
        y="9"
        width="9"
        height="9"
        rx="2.5"
        className="fill-primary-foreground opacity-35"
      />
      <rect
        x="9"
        y="22"
        width="9"
        height="9"
        rx="2.5"
        className="fill-primary-foreground opacity-35"
      />
      <rect x="22" y="22" width="9" height="9" rx="2.5" className="fill-brand" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-lg font-extrabold tracking-tight",
            light ? "text-hero-foreground" : "text-foreground",
          )}
        >
          UNOOCC
        </span>
        <span
          className={cn(
            "text-[0.65rem] font-medium uppercase tracking-[0.14em]",
            light ? "text-hero-muted" : "text-muted-foreground",
          )}
        >
          Ramdeobaba University
        </span>
      </span>
      <span className="mx-1 h-8 w-px bg-border" aria-hidden />
      <img
        src={rbuLogo.url}
        alt="Ramdeobaba University logo"
        width={1531}
        height={540}
        className="h-8 w-auto rounded bg-card px-1 py-0.5"
      />
    </span>
  );
}
