/**
 * Cloud database persistence for shared data: faculty updates and contact messages.
 * Faculty updates are loaded into the local store and kept live via realtime.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FacultyUpdate, UpdateReason } from "./availability";
import type { Room, ScheduleEntry } from "./rooms-data";
import { setState } from "./store";
import type { ContactMessage } from "./store";

type Row = Database["public"]["Tables"]["faculty_updates"]["Row"];

function toUpdate(r: Row): FacultyUpdate {
  return {
    id: r.id,
    name: r.name,
    facultyId: r.faculty_id,
    roomId: r.room_id,
    date: r.date,
    start: r.start_time,
    end: r.end_time,
    reason: r.reason as UpdateReason,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    status: r.status === "pending" ? "pending" : "live",
  };
}

export async function loadTimetableSnapshot(dateISO?: string) {
  const [roomResult, documentResult, entryResult] = await Promise.all([
    supabase.from("rooms").select("*").order("room_id"),
    supabase
      .from("timetable_documents")
      .select("id,effective_from,effective_to")
      .eq("status", "active"),
    supabase.from("timetable_entries").select("*").eq("review_state", "approved"),
  ]);
  const error = roomResult.error ?? documentResult.error ?? entryResult.error;
  if (error) throw error;

  const documents = new Map((documentResult.data ?? []).map((doc) => [doc.id, doc]));
  const rooms: Room[] = (roomResult.data ?? []).map((row, index) => ({
    id: row.room_id,
    building: row.building,
    floor: row.floor,
    type:
      row.room_type === "Classroom" || row.room_type === "Lab" || row.room_type === "Seminar Hall"
        ? row.room_type
        : "Unclassified",
    capacity: row.capacity,
    verified: false,
    metadataVerified: row.metadata_verified,
    inService: row.is_active,
    row: index % 2 === 0 ? "top" : "bottom",
    span: 1,
  }));

  const schedule: ScheduleEntry[] = (entryResult.data ?? []).flatMap((entry) => {
    const doc = documents.get(entry.document_id);
    if (
      !doc ||
      (dateISO &&
        (doc.effective_from > dateISO || (doc.effective_to && doc.effective_to < dateISO)))
    )
      return [];
    return [
      {
        roomId: entry.room_id,
        day: entry.weekday % 7,
        start: entry.start_time.slice(0, 5),
        end: entry.end_time.slice(0, 5),
        course: entry.subject,
        code: entry.course_code ?? "",
        section: entry.section,
        batch: entry.batch,
        faculty: entry.faculty ?? "",
      },
    ];
  });
  setState({ rooms, schedule, timetableStatus: "ready", timetableError: undefined });
}

export function startTimetableSync() {
  const refresh = () =>
    loadTimetableSnapshot().catch((error) => {
      setState({
        timetableStatus: "error",
        timetableError: error instanceof Error ? error.message : "Could not load room data",
      });
    });
  void refresh();
  const channel = supabase
    .channel(`timetable-data-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
      void refresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "timetable_documents" }, () => {
      void refresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "timetable_entries" }, () => {
      void refresh();
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function loadUpdates() {
  const { data, error } = await supabase
    .from("faculty_updates")
    .select("*")
    .in("status", ["live", "pending"])
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  setState({ updates: (data ?? []).map(toUpdate) });
}

/** Starts realtime sync; returns a cleanup function. Call from useEffect. */
export function startUpdatesSync() {
  loadUpdates().catch((e) => console.error("Could not load faculty updates", e));
  const channel = supabase
    .channel(`faculty-updates-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "faculty_updates" }, () => {
      loadUpdates().catch(() => {});
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function submitUpdate(
  u: Omit<FacultyUpdate, "id" | "createdAt">,
): Promise<FacultyUpdate> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.user)
    throw new Error("Sign in with an authorized faculty account to submit an update.");
  const { data, error } = await supabase
    .from("faculty_updates")
    .insert({
      name: u.name,
      faculty_id: u.facultyId,
      room_id: u.roomId,
      date: u.date,
      start_time: u.start,
      end_time: u.end,
      reason: u.reason,
      notes: u.notes ?? null,
      status: u.status,
      created_by: sessionData.session.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  const saved = toUpdate(data);
  setState((s) => ({ updates: [saved, ...s.updates.filter((x) => x.id !== saved.id)] }));
  return saved;
}

export async function submitMessage(m: Omit<ContactMessage, "id" | "createdAt">) {
  const { error } = await supabase.from("contact_messages").insert({
    name: m.name,
    email: m.email,
    role: m.role,
    topic: m.topic,
    room_id: m.roomId || null,
    issue: m.issue || null,
    message: m.message,
  });
  if (error) throw error;
}
