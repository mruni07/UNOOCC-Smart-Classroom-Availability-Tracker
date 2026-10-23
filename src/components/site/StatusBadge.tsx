import { Ban, Check, HelpCircle, X } from "lucide-react";
import type { Status } from "@/lib/availability";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<
  Status,
  { label: string; icon: typeof Check; badge: string; dot: string }
> = {
  free: {
    label: "Free",
    icon: Check,
    badge: "bg-free-soft text-free border-free/30",
    dot: "bg-free",
  },
  busy: { label: "Busy", icon: X, badge: "bg-busy-soft text-busy border-busy/30", dot: "bg-busy" },
  unverified: {
    label: "No class listed",
    icon: HelpCircle,
    badge: "bg-unverified-soft text-unverified border-unverified/40",
    dot: "bg-unverified",
  },
  offline: {
    label: "Not in service",
    icon: Ban,
    badge: "bg-offline-soft text-offline border-offline/30",
    dot: "bg-offline",
  },
};

export function StatusBadge({
  status,
  pulse,
  className,
}: {
  status: Status;
  pulse?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.badge,
        className,
      )}
    >
      {pulse && (
        <span
          className={cn(
            "absolute -left-0.5 -top-0.5 size-2.5 rounded-full animate-status-ping",
            meta.dot,
          )}
          aria-hidden
        />
      )}
      <Icon className="size-3.5" strokeWidth={2.75} aria-hidden />
      {meta.label}
    </span>
  );
}

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", STATUS_META[status].dot, className)}
      aria-hidden
    />
  );
}
