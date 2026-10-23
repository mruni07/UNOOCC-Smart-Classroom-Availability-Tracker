import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Bot, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNow } from "@/hooks/use-now";
import { answerQuestion } from "@/lib/assistant";
import type { RoomState } from "@/lib/availability";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CompactRoomCard } from "./RoomCard";

interface Msg {
  id: number;
  role: "user" | "bot";
  text: string;
  rooms?: RoomState[] | undefined;
  from?: number | undefined;
}

const CHIPS = [
  "Free labs right now",
  "Rooms free at 2 PM Monday",
  "Quiet room for 2 hours",
  "Is DT-604 free at 3 pm?",
];

export function AssistantChat({
  className,
  autoFocus,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const { now } = useNow();
  const updates = useStore((s) => s.updates);
  const favorites = useStore((s) => s.favorites);
  const rooms = useStore((s) => s.rooms);
  const schedule = useStore((s) => s.schedule);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, role: "bot", text: "Hi, I’m the UNOOCC assistant. Ask me which rooms are free." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || typing || !now) return;
    setMessages((m) => [...m, { id: idRef.current++, role: "user", text }]);
    setInput("");
    setTyping(true);
    window.setTimeout(
      () => {
        const res = answerQuestion(text, now, updates, favorites, rooms, schedule);
        setMessages((m) => [
          ...m,
          {
            id: idRef.current++,
            role: "bot",
            text: res.text,
            rooms: res.rooms,
            from: res.query?.from,
          },
        ]);
        setTyping(false);
      },
      650 + Math.random() * 450,
    );
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
          <Bot className="size-5" />
        </span>
        <div>
          <p className="font-display text-sm font-bold">UNOOCC assistant</p>
          <p className="text-xs opacity-75">Uses current Supabase room and timetable data</p>
        </div>
        <Sparkles className="ml-auto size-4 text-brand" />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}
            >
              <p
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-brand text-brand-foreground"
                    : "rounded-bl-md bg-secondary text-secondary-foreground",
                )}
              >
                {m.text}
              </p>
              {m.rooms && m.rooms.length > 0 && (
                <div className="grid w-full max-w-[92%] gap-2">
                  {m.rooms.map((s) => (
                    <CompactRoomCard key={s.room.id} state={s} from={m.from ?? 0} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <div
            className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3"
            aria-label="Assistant is typing"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-secondary-foreground animate-typing"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => ask(c)}
              className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {c}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 rounded-xl border bg-background p-1.5 focus-within:border-brand"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Which classrooms are free on floor 6?"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Ask the assistant"
            autoFocus={autoFocus}
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="grid size-8 place-items-center rounded-lg bg-brand text-brand-foreground transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
