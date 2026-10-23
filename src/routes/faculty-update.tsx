import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock4, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNow } from "@/hooks/use-now";
import { UPDATE_REASONS, type FacultyUpdate, type UpdateReason } from "@/lib/availability";
import { floorOf } from "@/lib/rooms-data";
import { useStore } from "@/lib/store";
import { submitUpdate } from "@/lib/cloud-sync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dateLabel, toMin } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/faculty-update")({
  head: () => ({
    meta: [
      { title: "Faculty room update — UNOOCC" },
      {
        name: "description",
        content: "Taking an extra class or lab? Tell UNOOCC so students see the right room status.",
      },
      { property: "og:title", content: "Faculty room update — UNOOCC" },
      {
        property: "og:description",
        content: "Post an extra lecture, lab session, event or room change in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacultyUpdatePage,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    facultyId: z.string().trim().min(3, "Enter your faculty ID or university email").max(100),
    roomId: z.string().min(1, "Choose a room"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    start: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time"),
    reason: z.enum(UPDATE_REASONS),
    notes: z.string().max(300).optional(),
  })
  .refine((v) => toMin(v.end) > toMin(v.start), {
    message: "End time must be after start time",
    path: ["end"],
  })
  .refine((v) => toMin(v.start) >= 8 * 60 && toMin(v.end) <= 20 * 60, {
    message: "Use a time between 08:00 and 20:00",
    path: ["start"],
  });

type FormState = {
  name: string;
  facultyId: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
  reason: UpdateReason;
  notes: string;
};

function FacultyUpdatePage() {
  const { now } = useNow();
  const updates = useStore((s) => s.updates);
  const rooms = useStore((s) => s.rooms);
  const [user, setUser] = useState<User | null>(null);
  const [isFaculty, setIsFaculty] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const empty: FormState = {
    name: "",
    facultyId: "",
    roomId: "",
    date: "",
    start: "",
    end: "",
    reason: "Extra lecture",
    notes: "",
  };
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<FacultyUpdate | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRoleChecked(false);
    setIsFaculty(false);
    if (!user) {
      setRoleChecked(true);
      return;
    }
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsFaculty(!error && data?.some((role) => role.role === "faculty") === true);
        setRoleChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const today = now?.dateISO ?? "";
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isFaculty) {
      toast.error("Sign in with an authorized faculty account before submitting a room update.");
      return;
    }
    const data = { ...form, date: form.date || today };
    const res = schema.safeParse(data);
    if (!res.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      res.error.issues.forEach((i) => (errs[String(i.path[0]) as keyof FormState] = i.message));
      setErrors(errs);
      return;
    }
    if (today && data.date < today) {
      setErrors({ date: "Choose today or a future date" });
      return;
    }
    setSubmitting(true);
    submitUpdate({
      ...res.data,
      notes: res.data.notes || undefined,
      // Public submissions are never trusted as authorized. An authenticated
      // coordinator workflow must approve them before they affect availability.
      status: "pending",
    })
      .then((u) => {
        setDone(u);
        setForm(empty);
      })
      .catch(() => toast.error("Couldn't save your update. Please try again."))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <PageHeader
        eyebrow="For faculty"
        title="Faculty room update"
        description="Taking an extra class or lab? Tell UNOOCC so students see the right status."
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border bg-card p-8 text-center shadow-card"
              >
                <span
                  className={cn(
                    "mx-auto grid size-16 place-items-center rounded-full",
                    done.status === "live"
                      ? "bg-free-soft text-free"
                      : "bg-unverified-soft text-unverified",
                  )}
                >
                  {done.status === "live" ? (
                    <CheckCircle2 className="size-8" />
                  ) : (
                    <Clock4 className="size-8" />
                  )}
                </span>
                <h2 className="mt-5 text-2xl font-extrabold text-foreground">
                  {done.status === "live" ? "Update received." : "Sent for approval."}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {done.status === "live"
                    ? done.reason === "Room free again"
                      ? `${done.roomId} now shows as free for this slot.`
                      : `${done.roomId} now shows as busy for this slot.`
                    : "A coordinator will review it before the room status changes."}
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {done.roomId} · {dateLabel(done.date, today)} · {done.start}–{done.end}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="brand">
                    <Link to="/map" search={{ floor: floorOf(done.roomId), room: done.roomId }}>
                      <MapPin /> View on map
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setDone(null)}>
                    Submit another
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border bg-card p-6 shadow-card sm:p-8"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <F label="Name" error={errors.name}>
                    <Input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Prof. A. Sharma"
                      className="rounded-xl"
                      maxLength={80}
                    />
                  </F>
                  <F label="Faculty ID or university email" error={errors.facultyId}>
                    <Input
                      value={form.facultyId}
                      onChange={(e) => set("facultyId", e.target.value)}
                      placeholder="CSE-123 or name@university.edu"
                      className="rounded-xl"
                      maxLength={100}
                    />
                  </F>
                  <F label="Room" error={errors.roomId}>
                    <Select value={form.roomId} onValueChange={(v) => set("roomId", v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Choose a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms
                          .filter((r) => r.inService)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.id} · {r.name ?? r.type} · F{r.floor}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Date" error={errors.date}>
                    <Input
                      type="date"
                      min={today}
                      value={form.date || today}
                      onChange={(e) => set("date", e.target.value)}
                      className="rounded-xl"
                    />
                  </F>
                  <F label="Start time" error={errors.start}>
                    <Input
                      type="time"
                      step={900}
                      value={form.start}
                      onChange={(e) => set("start", e.target.value)}
                      className="rounded-xl"
                    />
                  </F>
                  <F label="End time" error={errors.end}>
                    <Input
                      type="time"
                      step={900}
                      value={form.end}
                      onChange={(e) => set("end", e.target.value)}
                      className="rounded-xl"
                    />
                  </F>
                  <F label="Reason" className="sm:col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {UPDATE_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => set("reason", r)}
                          aria-pressed={form.reason === r}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                            form.reason === r
                              ? "border-brand bg-brand text-brand-foreground shadow-glow"
                              : "bg-background text-foreground hover:border-brand/50",
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </F>
                  <F label="Notes (optional)" className="sm:col-span-2">
                    <Textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="e.g. V-B make-up class"
                      className="rounded-xl"
                      maxLength={300}
                      rows={3}
                    />
                  </F>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="hero" size="lg" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    {submitting ? "Submitting…" : "Submit update"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      setForm(empty);
                      setErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  Every update is stamped with your signed-in faculty account and time. A
                  coordinator must approve it before it affects availability.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            {!user ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void supabase.auth
                    .signInWithPassword({ email: authEmail.trim(), password: authPassword })
                    .then(({ error }) => {
                      if (error) toast.error(error.message);
                    });
                }}
                className="space-y-3"
              >
                <p className="font-display text-sm font-bold text-foreground">Faculty sign in</p>
                <p className="text-xs text-muted-foreground">
                  Only accounts granted the faculty role can submit updates. Reports still require
                  coordinator approval.
                </p>
                <Input
                  type="email"
                  autoComplete="username"
                  placeholder="University email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="rounded-xl"
                />
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  className="rounded-xl"
                />
                <Button type="submit" variant="outline" size="sm">
                  Sign in
                </Button>
              </form>
            ) : !roleChecked ? (
              <p className="text-sm text-muted-foreground">Checking faculty access…</p>
            ) : isFaculty ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    Faculty account verified
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()}>
                  Sign out
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-display text-sm font-bold text-foreground">
                  Faculty role required
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ask the Supabase project owner to grant this account the faculty role.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="font-display text-sm font-bold text-foreground">
              Coordinator review required
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submissions remain pending until an authorized coordinator reviews them. They do not
              change room availability before approval.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="font-display text-sm font-bold text-foreground">Recent updates</p>
            <ul className="mt-4 space-y-3">
              <AnimatePresence initial={false}>
                {updates.slice(0, 8).map((u) => (
                  <motion.li
                    key={u.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                      <span
                        className={cn(
                          "mt-1 size-2.5 shrink-0 rounded-full",
                          u.status === "live"
                            ? u.reason === "Room free again"
                              ? "bg-free"
                              : "bg-busy"
                            : "bg-unverified",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-mono font-bold">{u.roomId}</span> · {u.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateLabel(u.date, today)} {u.start}–{u.end} · {u.name}
                        </p>
                      </div>
                      {u.status === "pending" ? (
                        <span className="rounded-full bg-unverified-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-unverified">
                          Awaiting approval
                        </span>
                      ) : (
                        <span className="rounded-full bg-free-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-free">
                          Live
                        </span>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              {updates.length === 0 && (
                <li className="text-sm text-muted-foreground">No updates yet.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function F({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
