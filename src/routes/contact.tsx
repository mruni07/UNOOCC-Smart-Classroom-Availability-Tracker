import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CheckCircle2, Flag, Loader2, MapPin, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { submitMessage } from "@/lib/cloud-sync";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact the UNOOCC team" },
      {
        name: "description",
        content:
          "Send feedback or report a wrong room status to the UNOOCC project team at Ramdeobaba University.",
      },
      { property: "og:title", content: "Contact UNOOCC" },
      { property: "og:description", content: "Spotted a room showing the wrong status? Tell us." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const ROLES = ["Student", "Faculty", "Admin"];
const ISSUES = [
  "Shows free but is occupied",
  "Shows busy but is empty",
  "Wrong class shown",
  "Room details are wrong",
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.string().min(1),
  topic: z.enum(["message", "report"]),
  roomId: z.string().optional(),
  issue: z.string().optional(),
  message: z.string().trim().min(5, "Write a short message").max(1000),
});

function Contact() {
  const rooms = useStore((s) => s.rooms);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Student",
    topic: "message" as "message" | "report",
    roomId: "",
    issue: ISSUES[0] ?? "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!res.success)
      res.error.issues.forEach((i) => (errs[String(i.path[0]) as keyof typeof form] = i.message));
    if (form.topic === "report" && !form.roomId) errs.roomId = "Choose the room";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSending(true);
    submitMessage({ ...form, topic: form.topic === "report" ? "Wrong room status" : "General" })
      .then(() => {
        setSent(true);
        toast.success(
          form.topic === "report" ? "Report received — thank you!" : "Message sent — thank you!",
        );
      })
      .catch(() => toast.error("Couldn't send your message. Please try again."))
      .finally(() => setSending(false));
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="Questions, ideas, or a room showing the wrong status? We read every message."
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border bg-card p-10 text-center shadow-card"
              >
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-free-soft text-free">
                  <CheckCircle2 className="size-8" />
                </span>
                <h2 className="mt-5 text-2xl font-extrabold text-foreground">
                  Thanks, {form.name.split(" ")[0]}!
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {form.topic === "report"
                    ? `Your report for ${form.roomId} was sent to the project team for review.`
                    : "The project team will get back to you soon."}
                </p>
                <Button
                  className="mt-6"
                  variant="outline"
                  onClick={() => {
                    setSent(false);
                    setForm((f) => ({ ...f, message: "", roomId: "" }));
                  }}
                >
                  Send another
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl border bg-card p-6 shadow-card sm:p-8"
              >
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
                  {[
                    { v: "message", label: "Send a message", icon: MessageSquare },
                    { v: "report", label: "Report a wrong room status", icon: Flag },
                  ].map((t) => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => set("topic", t.v)}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                        form.topic === t.v
                          ? "bg-card text-foreground shadow-card"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <t.icon className={cn("size-4", form.topic === t.v && "text-brand")} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <F label="Name" error={errors.name}>
                    <Input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="rounded-xl"
                      maxLength={80}
                    />
                  </F>
                  <F label="Email" error={errors.email}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className="rounded-xl"
                      maxLength={255}
                    />
                  </F>
                  <F label="I am a" className="sm:col-span-2">
                    <div className="flex gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => set("role", r)}
                          aria-pressed={form.role === r}
                          className={cn(
                            "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                            form.role === r
                              ? "border-brand bg-brand-soft text-brand"
                              : "bg-background text-foreground hover:border-brand/40",
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </F>
                  <AnimatePresence initial={false}>
                    {form.topic === "report" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-5 overflow-hidden sm:col-span-2 sm:grid-cols-2"
                      >
                        <F label="Room" error={errors.roomId}>
                          <Select value={form.roomId} onValueChange={(v) => set("roomId", v)}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Choose a room" />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.id} · Floor {r.floor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </F>
                        <F label="What’s wrong?">
                          <Select value={form.issue} onValueChange={(v) => set("issue", v)}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUES.map((i) => (
                                <SelectItem key={i} value={i}>
                                  {i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </F>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <F label="Message" error={errors.message} className="sm:col-span-2">
                    <Textarea
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      rows={5}
                      maxLength={1000}
                      className="rounded-xl"
                      placeholder={
                        form.topic === "report"
                          ? "e.g. There was a lecture in this room at 11:00 but it showed as free."
                          : "How can we help?"
                      }
                    />
                  </F>
                </div>
                <Button type="submit" variant="hero" size="lg" className="mt-6" disabled={sending}>
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  {sending ? "Sending…" : form.topic === "report" ? "Send report" : "Send message"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-5 lg:col-span-5">
          <div className="overflow-hidden rounded-3xl bg-hero p-8 text-hero-foreground">
            <Building2 className="size-7 text-brand" />
            <h2 className="mt-4 text-2xl font-extrabold">Ramdeobaba University, Nagpur</h2>
            <p className="mt-2 text-hero-muted">Department of Computer Science &amp; Engineering</p>
            <div className="mt-6 flex items-start gap-3 text-sm text-hero-muted">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>Digital Tower · Availability tracker floors 4, 5 and 6</span>
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <p className="font-display text-base font-bold text-foreground">
              Why report a wrong status?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Room records and schedules require coordinator review. Each report helps the project
              team verify information and move it from a reviewed timetable or room record.
            </p>
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
