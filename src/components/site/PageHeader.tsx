import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden border-b bg-gradient-soft", className)}>
      <div
        className="absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between md:py-14 lg:px-8">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand shadow-card">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-base text-muted-foreground md:text-lg">{description}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
