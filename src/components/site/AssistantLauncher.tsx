import { useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AssistantChat } from "./AssistantChat";

export function AssistantLauncher() {
  const open = useStore((s) => s.assistantOpen);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onFind = pathname === "/find";

  return (
    <>
      <button
        type="button"
        onClick={() => actions.setAssistantOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:-translate-y-0.5",
          onFind && "lg:hidden",
        )}
        aria-label="Open the UNOOCC assistant"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Ask the assistant</span>
      </button>
      <Sheet open={open} onOpenChange={actions.setAssistantOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l-0 p-0 sm:max-w-md"
        >
          <SheetTitle className="sr-only">UNOOCC assistant</SheetTitle>
          <SheetDescription className="sr-only">
            Ask which rooms are free in plain language.
          </SheetDescription>
          <AssistantChat className="h-full rounded-none border-0" autoFocus />
        </SheetContent>
      </Sheet>
    </>
  );
}
