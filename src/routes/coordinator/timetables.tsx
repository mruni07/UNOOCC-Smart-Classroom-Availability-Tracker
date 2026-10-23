import { createFileRoute } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  Archive,
  Check,
  FileText,
  Loader2,
  LockKeyhole,
  LogOut,
  Plus,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { parseTimetableFile, sha256File, type ParsedTimetableEntry } from "@/lib/timetable-import";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coordinator/timetables")({
  head: () => ({ meta: [{ title: "Timetable administration — UNOOCC" }] }),
  component: TimetableAdmin,
});

type DocumentRow = Tables<"timetable_documents">;
type EntryRow = Tables<"timetable_entries">;
type FacultyReportRow = Tables<"faculty_updates">;
type DocForm = {
  name: string;
  academicSession: string;
  semester: string;
  department: string;
  programme: string;
  section: string;
  batch: string;
  effectiveFrom: string;
  effectiveTo: string;
};
type EntryForm = {
  weekday: string;
  start: string;
  end: string;
  subject: string;
  code: string;
  room: string;
  batch: string;
  type: "class" | "lab" | "event";
};

const emptyDoc: DocForm = {
  name: "",
  academicSession: "2026-27",
  semester: "5",
  department: "CSE",
  programme: "B.Tech CSE (DSA)",
  section: "B4",
  batch: "",
  effectiveFrom: "2026-07-13",
  effectiveTo: "",
};
const emptyEntry: EntryForm = {
  weekday: "1",
  start: "09:00",
  end: "10:00",
  subject: "",
  code: "",
  room: "",
  batch: "",
  type: "class",
};
const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function TimetableAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [form, setForm] = useState<DocForm>(emptyDoc);
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [facultyReports, setFacultyReports] = useState<FacultyReportRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntry);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
    setIsCoordinator(false);
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
        setIsCoordinator(!error && data?.some((role) => role.role === "coordinator") === true);
        setRoleChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshDocuments = async () => {
    const { data, error } = await supabase
      .from("timetable_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    setDocuments(data ?? []);
  };

  const refreshFacultyReports = async () => {
    const { data, error } = await supabase
      .from("faculty_updates")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setFacultyReports(data ?? []);
  };

  useEffect(() => {
    if (!isCoordinator) return;
    void Promise.all([refreshDocuments(), refreshFacultyReports()]).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not load coordinator data."),
    );
  }, [isCoordinator]);

  const selected = documents.find((doc) => doc.id === selectedId) ?? null;
  const approvedCount = useMemo(
    () => entries.filter((entry) => entry.review_state === "approved").length,
    [entries],
  );

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) toast.error(error.message);
    setAuthBusy(false);
  };

  const loadEntries = async (doc: DocumentRow) => {
    setSelectedId(doc.id);
    setSourceText(doc.extracted_text ?? "");
    const { data, error } = await supabase
      .from("timetable_entries")
      .select("*")
      .eq("document_id", doc.id)
      .order("weekday")
      .order("start_time");
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries(data ?? []);
    setEntryForm(emptyEntry);
  };

  const termFor = async (metadata: DocForm) => {
    const semester = Number(metadata.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 12)
      throw new Error("Semester must be between 1 and 12.");
    if (!/^\d{4}-\d{2}$/.test(metadata.academicSession))
      throw new Error("Use an academic session such as 2026-27.");
    if (
      !metadata.effectiveFrom ||
      (metadata.effectiveTo && metadata.effectiveTo < metadata.effectiveFrom)
    )
      throw new Error("Check the timetable effective dates.");
    const found = await supabase
      .from("academic_terms")
      .select("id")
      .eq("academic_session", metadata.academicSession)
      .eq("semester", semester)
      .eq("effective_from", metadata.effectiveFrom)
      .maybeSingle();
    if (found.error) throw found.error;
    if (found.data) return found.data.id;
    const created = await supabase
      .from("academic_terms")
      .insert({
        academic_session: metadata.academicSession,
        semester,
        effective_from: metadata.effectiveFrom,
        effective_to: metadata.effectiveTo || null,
        status: "active",
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    return created.data.id;
  };

  const ensureRoomRecords = async (parsed: ParsedTimetableEntry[]) => {
    const rooms = [...new Set(parsed.map((entry) => entry.room_id))];
    if (!rooms.length) return;
    const rows = rooms.map((room_id) => {
      const digits = room_id.match(/\d{3,4}/)?.[0] ?? "0";
      return {
        room_id,
        building: "Digital Tower",
        floor: Number(digits.length === 4 ? digits.slice(0, 2) : digits.slice(0, 1)),
        room_type: null,
        capacity: null,
        metadata_verified: false,
        is_active: true,
      };
    });
    const { error } = await supabase
      .from("rooms")
      .upsert(rows, { onConflict: "room_id", ignoreDuplicates: true });
    if (error) throw error;
  };

  const uploadSelected = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!files.length) {
      toast.error("Select one or more timetable files.");
      return;
    }
    setBusy(true);
    setMessage("");
    let success = 0;
    const errors: string[] = [];
    try {
      const termId = await termFor(form);
      for (const file of files) {
        try {
          if (file.size < 1 || file.size > MAX_FILE_BYTES)
            throw new Error("Files must be no larger than 15 MB.");
          const ext = file.name.toLowerCase().split(".").at(-1);
          if (!ext || !["pdf", "csv", "xlsx"].includes(ext))
            throw new Error("Choose a PDF, CSV or XLSX file.");
          const mime =
            ext === "pdf"
              ? "application/pdf"
              : ext === "csv"
                ? "text/csv"
                : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          const digest = await sha256File(file);
          const parsed = await parseTimetableFile(file, form.section.trim());
          const duplicate = await supabase
            .from("timetable_documents")
            .select("*")
            .eq("academic_term_id", termId)
            .eq("department", form.department.trim())
            .eq("programme", form.programme.trim())
            .eq("section", form.section.trim())
            .eq("sha256", digest)
            .maybeSingle();
          if (duplicate.error) throw duplicate.error;
          if (duplicate.data?.storage_path) {
            errors.push(`${file.name}: duplicate upload already exists and was skipped.`);
            continue;
          }

          let docId = duplicate.data?.id;
          if (!docId) {
            const inserted = await supabase
              .from("timetable_documents")
              .insert({
                name: form.name.trim() || file.name.replace(/\.[^.]+$/, ""),
                original_file_name: file.name,
                mime_type: mime,
                file_size_bytes: file.size,
                sha256: digest,
                academic_term_id: termId,
                department: form.department.trim(),
                programme: form.programme.trim(),
                section: form.section.trim(),
                batch: form.batch.trim() || null,
                effective_from: form.effectiveFrom,
                effective_to: form.effectiveTo || null,
                status: "processing",
                uploaded_by: user?.id ?? null,
                review_notes: parsed.warnings.join("\n").slice(0, 4000) || null,
                extracted_text: parsed.extractedText.slice(0, 200000) || null,
              })
              .select("id")
              .single();
            if (inserted.error) throw inserted.error;
            docId = inserted.data.id;
          }

          const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
          const path = `${docId}/${safeName}`;
          const stored = await supabase.storage
            .from("timetables")
            .upload(path, file, { contentType: mime, upsert: false });
          if (stored.error) throw stored.error;
          const attached = await supabase
            .from("timetable_documents")
            .update({
              storage_path: path,
              file_size_bytes: file.size,
              uploaded_by: user?.id ?? null,
              status: "needs_review",
              review_notes: parsed.warnings.join("\n").slice(0, 4000) || null,
              extracted_text: parsed.extractedText.slice(0, 200000) || null,
            })
            .eq("id", docId);
          if (attached.error) {
            await supabase.storage.from("timetables").remove([path]);
            throw attached.error;
          }

          if (parsed.entries.length) {
            await ensureRoomRecords(parsed.entries);
            const batch = parsed.entries.map((entry) => ({
              ...entry,
              batch: entry.batch ?? (form.batch.trim() || null),
              document_id: docId!,
              review_state: "needs_review" as const,
            }));
            const savedEntries = await supabase.from("timetable_entries").insert(batch);
            if (savedEntries.error) throw savedEntries.error;
          }
          success += 1;
          if (parsed.warnings.length) errors.push(`${file.name}: ${parsed.warnings.join(" ")}`);
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : "Upload failed."}`);
        }
      }
      setMessage(
        [
          success
            ? `${success} timetable file${success === 1 ? "" : "s"} uploaded to private storage for review.`
            : "No new files were uploaded.",
          ...errors,
        ].join("\n"),
      );
      setFiles([]);
      await refreshDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateEntryForm = (key: keyof EntryForm, value: string) =>
    setEntryForm((current) => ({ ...current, [key]: value }));

  const saveEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const start = entryForm.start,
      end = entryForm.end;
    if (
      !entryForm.subject.trim() ||
      !entryForm.room.trim() ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
      end <= start
    ) {
      toast.error("Enter a subject, room and valid start/end interval.");
      return;
    }
    const roomId = entryForm.room
      .trim()
      .toUpperCase()
      .replace(/^DT(\d)/, "DT-$1")
      .replace(/^LAB-?(\d)/, "Lab-$1");
    setBusy(true);
    try {
      const parsedRoom: ParsedTimetableEntry = {
        weekday: Number(entryForm.weekday),
        start_time: start,
        end_time: end,
        subject: entryForm.subject.trim(),
        course_code: entryForm.code.trim() || null,
        room_id: roomId,
        section: selected.section,
        batch: entryForm.batch.trim() || selected.batch,
        entry_type: entryForm.type,
        source_text: "Coordinator reviewed/entered",
        confidence: 1,
      };
      await ensureRoomRecords([parsedRoom]);
      const payload = {
        document_id: selected.id,
        weekday: parsedRoom.weekday,
        start_time: start,
        end_time: end,
        subject: parsedRoom.subject,
        course_code: parsedRoom.course_code,
        room_id: roomId,
        section: selected.section,
        batch: parsedRoom.batch,
        entry_type: parsedRoom.entry_type,
        source_text: parsedRoom.source_text,
        confidence: 1,
        review_state: "needs_review" as const,
      };
      const result = editingId
        ? await supabase
            .from("timetable_entries")
            .update(payload)
            .eq("id", editingId)
            .select("*")
            .single()
        : await supabase.from("timetable_entries").insert(payload).select("*").single();
      if (result.error) throw result.error;
      setEntries((current) =>
        editingId
          ? current.map((entry) => (entry.id === editingId ? result.data : entry))
          : [...current, result.data].sort(
              (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time),
            ),
      );
      setEditingId(null);
      setEntryForm(emptyEntry);
      toast.success("Draft timetable entry saved for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save timetable entry.");
    } finally {
      setBusy(false);
    }
  };

  const editEntry = (entry: EntryRow) => {
    setEditingId(entry.id);
    setEntryForm({
      weekday: String(entry.weekday),
      start: entry.start_time.slice(0, 5),
      end: entry.end_time.slice(0, 5),
      subject: entry.subject,
      code: entry.course_code ?? "",
      room: entry.room_id,
      batch: entry.batch ?? "",
      type: entry.entry_type as EntryForm["type"],
    });
  };

  const markReviewed = async (entry: EntryRow, reviewed: boolean) => {
    const update = await supabase
      .from("timetable_entries")
      .update({
        review_state: reviewed ? "approved" : "needs_review",
        reviewed_by: reviewed ? (user?.id ?? null) : null,
        reviewed_at: reviewed ? new Date().toISOString() : null,
      })
      .eq("id", entry.id)
      .select("*")
      .single();
    if (update.error) {
      toast.error(update.error.message);
      return;
    }
    setEntries((current) => current.map((row) => (row.id === entry.id ? update.data : row)));
  };

  const approveDocument = async () => {
    if (!selected || !entries.length || approvedCount !== entries.length) {
      toast.error("Review and approve every entry first.");
      return;
    }
    const result = await supabase
      .from("timetable_documents")
      .update({
        status: "approved",
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Timetable approved. Activate it when it should become the selected schedule.");
    await refreshDocuments();
  };

  const activateDocument = async () => {
    if (!selected) return;
    const result = await supabase.rpc("activate_timetable", { p_document_id: selected.id });
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      "Timetable activated. The previous schedule for this section and batch was archived.",
    );
    await refreshDocuments();
  };

  const archiveDocument = async (doc: DocumentRow) => {
    const result = await supabase
      .from("timetable_documents")
      .update({ status: "archived" })
      .eq("id", doc.id);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(
        "Timetable archived. Its source file and entries remain available to coordinators.",
      );
      await refreshDocuments();
    }
  };

  const reviewFacultyReport = async (report: FacultyReportRow, approve: boolean) => {
    const result = await supabase.rpc("review_faculty_update", {
      p_update_id: report.id,
      p_approve: approve,
    });
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      approve ? "Faculty report approved and applied to availability." : "Faculty report rejected.",
    );
    setFacultyReports((current) => current.filter((row) => row.id !== report.id));
  };

  const sourceHref = async () => {
    if (!selected?.storage_path) return;
    const result = await supabase.storage
      .from("timetables")
      .createSignedUrl(selected.storage_path, 60);
    if (result.error) toast.error(result.error.message);
    else window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (!user || !isCoordinator) {
    return (
      <>
        <PageHeader
          eyebrow="Coordinator"
          title="Timetable administration"
          description="Upload, review and activate multiple timetable sources."
        />
        <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
            {!user ? (
              <form onSubmit={signIn} className="space-y-4">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="size-5 text-brand" />
                  <h2 className="font-display text-lg font-bold">Coordinator sign in</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use a Supabase account already assigned the coordinator role. Public registration
                  is disabled for this page.
                </p>
                <Label>
                  Email
                  <Input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Label>
                <Label>
                  Password
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Label>
                <Button type="submit" variant="hero" disabled={authBusy}>
                  {authBusy ? <Loader2 className="animate-spin" /> : <LockKeyhole />} Sign in
                </Button>
              </form>
            ) : !roleChecked ? (
              <p className="text-sm text-muted-foreground">Checking coordinator access…</p>
            ) : (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-bold">Coordinator role required</h2>
                <p className="text-sm text-muted-foreground">
                  This account is signed in but is not authorized to manage timetables. Ask the
                  Supabase project owner to grant the coordinator role.
                </p>
                <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
                  <LogOut /> Sign out
                </Button>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Coordinator"
        title="Timetable administration"
        description="Upload multiple timetable files, review extracted entries and activate schedules without deleting older sources."
      >
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
          <LogOut /> Sign out
        </Button>
      </PageHeader>
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <form
          onSubmit={uploadSelected}
          className="rounded-3xl border bg-card p-6 shadow-card sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <UploadCloud className="size-5 text-brand" />
            <h2 className="font-display text-xl font-bold">Upload timetable files</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Timetable name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. CSE DSA Semester V"
              />
            </Field>
            <Field label="Academic session">
              <Input
                value={form.academicSession}
                onChange={(e) => setForm({ ...form, academicSession: e.target.value })}
                required
              />
            </Field>
            <Field label="Semester">
              <Input
                type="number"
                min="1"
                max="12"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                required
              />
            </Field>
            <Field label="Department">
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              />
            </Field>
            <Field label="Programme">
              <Input
                value={form.programme}
                onChange={(e) => setForm({ ...form, programme: e.target.value })}
                required
              />
            </Field>
            <Field label="Section">
              <Input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                required
              />
            </Field>
            <Field label="Batch (optional)">
              <Input
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                placeholder="B1, B2, etc."
              />
            </Field>
            <Field label="Effective from">
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                required
              />
            </Field>
            <Field label="Effective to">
              <Input
                type="date"
                value={form.effectiveTo}
                min={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
              />
            </Field>
            <Field label="PDF, CSV or XLSX (max 15 MB each)">
              <Input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </Field>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            PDF tables are extracted as draft text; CSV/XLSX work best with columns Day, Start, End,
            Subject, Room, Section and optional Batch/Course Code. Every imported entry requires
            human review.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="hero" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}{" "}
              {busy ? "Processing…" : `Upload ${files.length || "files"}`}
            </Button>
            <span className="text-xs text-muted-foreground">
              Private storage · duplicate files are detected by SHA-256
            </span>
          </div>
          {message && (
            <pre
              role="status"
              className="mt-5 whitespace-pre-wrap rounded-xl border bg-background p-4 text-sm text-foreground"
            >
              {message}
            </pre>
          )}
        </form>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Timetable sources</h2>
            <ul className="mt-4 space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className={cn(
                    "rounded-xl border p-3",
                    selectedId === doc.id && "border-brand ring-1 ring-brand/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void loadEntries(doc)}
                    className="w-full text-left"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{doc.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {doc.section} · {doc.academic_term_id.slice(0, 8)} · {doc.effective_from}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-bold uppercase">
                        {doc.status}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex gap-2">
                    {doc.storage_path && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedId(doc.id);
                          void sourceHref();
                        }}
                      >
                        <FileText /> Source
                      </Button>
                    )}
                    {doc.status !== "archived" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void archiveDocument(doc)}
                      >
                        <Archive /> Archive
                      </Button>
                    )}
                  </div>
                </li>
              ))}
              {!documents.length && (
                <li className="text-sm text-muted-foreground">No timetable documents yet.</li>
              )}
            </ul>
          </div>

          <div className="space-y-6">
            {selected ? (
              <>
                <div className="rounded-3xl border bg-card p-6 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold">
                        Review entries: {selected.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {approvedCount} of {entries.length} entries reviewed · {selected.status}
                      </p>
                    </div>
                    {selected.storage_path && (
                      <Button variant="outline" onClick={() => void sourceHref()}>
                        <FileText /> View source
                      </Button>
                    )}
                  </div>
                  {selected.review_notes && (
                    <p className="mt-4 whitespace-pre-wrap rounded-xl border border-unverified/30 bg-unverified-soft p-3 text-sm text-unverified">
                      {selected.review_notes}
                    </p>
                  )}
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="py-2">Day</th>
                          <th>Time</th>
                          <th>Subject / code</th>
                          <th>Room</th>
                          <th>Batch</th>
                          <th>Review</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-0">
                            <td className="py-3">{DAYS[entry.weekday]}</td>
                            <td>
                              {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
                            </td>
                            <td>
                              {entry.subject}
                              <span className="block text-xs text-muted-foreground">
                                {entry.course_code}
                              </span>
                            </td>
                            <td className="font-mono">{entry.room_id}</td>
                            <td>{entry.batch ?? "—"}</td>
                            <td>
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={entry.review_state === "approved"}
                                  onChange={(e) => void markReviewed(entry, e.target.checked)}
                                />{" "}
                                Approved
                              </label>
                            </td>
                            <td>
                              <Button size="sm" variant="ghost" onClick={() => editEntry(entry)}>
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!entries.length && (
                      <p className="py-6 text-sm text-muted-foreground">
                        No structured entries extracted. Add them manually below after checking the
                        source.
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={
                        !entries.length ||
                        approvedCount !== entries.length ||
                        selected.status === "approved" ||
                        selected.status === "active"
                      }
                      onClick={() => void approveDocument()}
                    >
                      <Check /> Approve reviewed timetable
                    </Button>
                    <Button
                      variant="hero"
                      disabled={selected.status !== "approved"}
                      onClick={() => void activateDocument()}
                    >
                      Activate timetable
                    </Button>
                  </div>
                </div>

                <form onSubmit={saveEntry} className="rounded-3xl border bg-card p-6 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold">
                      {editingId ? "Edit entry" : "Add timetable entry"}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEntryForm(emptyEntry);
                      }}
                    >
                      <Plus /> New
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Day">
                      <select
                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                        value={entryForm.weekday}
                        onChange={(e) => updateEntryForm("weekday", e.target.value)}
                      >
                        {DAYS.slice(1).map((day, index) => (
                          <option key={day} value={index + 1}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Start">
                      <Input
                        type="time"
                        value={entryForm.start}
                        onChange={(e) => updateEntryForm("start", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="End">
                      <Input
                        type="time"
                        value={entryForm.end}
                        onChange={(e) => updateEntryForm("end", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Room">
                      <Input
                        value={entryForm.room}
                        onChange={(e) => updateEntryForm("room", e.target.value)}
                        placeholder="DT-606"
                        required
                      />
                    </Field>
                    <Field label="Subject">
                      <Input
                        value={entryForm.subject}
                        onChange={(e) => updateEntryForm("subject", e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Course code">
                      <Input
                        value={entryForm.code}
                        onChange={(e) => updateEntryForm("code", e.target.value)}
                      />
                    </Field>
                    <Field label="Batch">
                      <Input
                        value={entryForm.batch}
                        onChange={(e) => updateEntryForm("batch", e.target.value)}
                        placeholder="B1/B2/B3"
                      />
                    </Field>
                    <Field label="Entry type">
                      <select
                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                        value={entryForm.type}
                        onChange={(e) => updateEntryForm("type", e.target.value)}
                      >
                        <option value="class">Class</option>
                        <option value="lab">Lab</option>
                        <option value="event">Event</option>
                      </select>
                    </Field>
                  </div>
                  <Button type="submit" variant="brand" className="mt-4" disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" /> : <Check />} Save draft entry
                  </Button>
                </form>
                {sourceText && (
                  <details className="rounded-2xl border bg-card p-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Extracted source text
                    </summary>
                    <Textarea
                      className="mt-3 min-h-40 font-mono text-xs"
                      readOnly
                      value={sourceText}
                    />
                  </details>
                )}
              </>
            ) : (
              <div className="rounded-3xl border bg-card p-8 text-sm text-muted-foreground">
                Select a timetable to review its entries. Original source files remain private and
                are retained when a schedule is archived.
              </div>
            )}
          </div>
        </section>
        <section className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Faculty update review</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Approving a report updates availability. Overlapping approved reports are rejected
                by the database.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void refreshFacultyReports().catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Refresh failed."),
                )
              }
            >
              Refresh
            </Button>
          </div>
          <ul className="mt-5 space-y-3">
            {facultyReports.map((report) => (
              <li
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-semibold">
                    <span className="font-mono">{report.room_id}</span> · {report.reason}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {report.date} {report.start_time}–{report.end_time} · {report.name} (
                    {report.faculty_id})
                  </p>
                  {report.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">{report.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void reviewFacultyReport(report, false)}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    variant="hero"
                    size="sm"
                    onClick={() => void reviewFacultyReport(report, true)}
                  >
                    <Check /> Approve
                  </Button>
                </div>
              </li>
            ))}
            {!facultyReports.length && (
              <li className="text-sm text-muted-foreground">No pending faculty reports.</li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}
