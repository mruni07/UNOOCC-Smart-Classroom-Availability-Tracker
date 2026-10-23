import { describe, expect, it } from "vitest";
import { parseTimetableFile } from "./timetable-import";

const csv = (text: string) =>
  Object.assign(new File([text], "timetable.csv", { type: "text/csv" }), {
    text: async () => text,
  });

describe("parseTimetableFile CSV imports", () => {
  it("normalizes structured rows into pending-review timetable entries", async () => {
    const result = await parseTimetableFile(
      csv("Day,Start,End,Subject,Room,Section,Batch\nMonday,09:00,10:00,Algorithms,606,B4,B1"),
      "B4",
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      weekday: 1,
      start_time: "09:00",
      end_time: "10:00",
      subject: "Algorithms",
      room_id: "DT-606",
      section: "B4",
      batch: "B1",
      confidence: 0.85,
    });
    expect(result.warnings).toEqual([]);
  });

  it("flags incomplete rows and duplicate timetable entries", async () => {
    const result = await parseTimetableFile(
      csv(
        "Day,Start,End,Subject,Room\nTuesday,10:00,11:00,Networks,606\nTuesday,10:00,11:00,Networks,606\nFunday,11:00,10:00,,",
      ),
      "B4",
    );
    expect(result.entries).toHaveLength(1);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.join(" ")).toContain("Duplicate");
    expect(result.warnings.join(" ")).toContain("needs review");
  });

  it("preserves same-room entries assigned to different sections", async () => {
    const result = await parseTimetableFile(
      csv(
        "Day,Start,End,Subject,Room,Section\nWednesday,10:00,11:00,Networks,606,B4\nWednesday,10:00,11:00,Networks,606,B5",
      ),
    );
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((entry) => entry.section)).toEqual(["B4", "B5"]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps unstructured documents for manual review instead of inventing entries", async () => {
    const result = await parseTimetableFile(csv("Monday 9-10 Algorithms DT-606"), "B4");
    expect(result.entries).toEqual([]);
    expect(result.warnings[0]).toContain("Could not identify structured timetable columns");
  });
});
