import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedTimetableEntry {
  weekday: number;
  start_time: string;
  end_time: string;
  subject: string;
  course_code: string | null;
  room_id: string;
  section: string;
  batch: string | null;
  entry_type: "class" | "lab" | "event";
  source_text: string;
  confidence: number;
}

export interface TimetableImportResult {
  entries: ParsedTimetableEntry[];
  extractedText: string;
  warnings: string[];
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const normal = (value: unknown) => String(value ?? "").trim();
const headerKey = (value: unknown) =>
  normal(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  return rows;
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function zipEntry(bytes: Uint8Array, name: string): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("The Excel file is not a valid ZIP workbook.");
  const entries = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error("The Excel workbook directory is invalid.");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const entryName = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (entryName === name) {
      if (uncompressedSize > 20 * 1024 * 1024)
        throw new Error("An Excel workbook part exceeds the 20 MB processing limit.");
      if (view.getUint32(localOffset, true) !== 0x04034b50)
        throw new Error("The Excel workbook entry is invalid.");
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
      if (method === 0) return compressed;
      if (method !== 8 || typeof DecompressionStream === "undefined")
        throw new Error("This Excel compression method is not supported in this browser.");
      return new Uint8Array(
        await awaitStream(
          new Blob([compressed])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat)),
        ),
      );
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function awaitStream(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  return new Response(stream).arrayBuffer();
}

async function parseXlsx(file: File): Promise<string[][]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sharedBytes = await zipEntry(bytes, "xl/sharedStrings.xml");
  const sheetBytes = await zipEntry(bytes, "xl/worksheets/sheet1.xml");
  if (!sheetBytes) throw new Error("The Excel workbook has no first worksheet.");
  const sharedDoc = sharedBytes
    ? new DOMParser().parseFromString(new TextDecoder().decode(sharedBytes), "application/xml")
    : null;
  const shared = sharedDoc
    ? [...sharedDoc.querySelectorAll("si")].map((node) =>
        [...node.querySelectorAll("t")].map((t) => t.textContent ?? "").join(""),
      )
    : [];
  const sheet = new DOMParser().parseFromString(
    new TextDecoder().decode(sheetBytes),
    "application/xml",
  );
  if (sheet.querySelector("parsererror"))
    throw new Error("The Excel worksheet XML could not be read.");
  return [...sheet.querySelectorAll("sheetData row")].map((row) => {
    const values: string[] = [];
    for (const cell of row.querySelectorAll("c")) {
      const index = columnIndex(cell.getAttribute("r") ?? "A");
      const raw =
        cell.querySelector("v")?.textContent ?? cell.querySelector("is t")?.textContent ?? "";
      values[index] = cell.getAttribute("t") === "s" ? (shared[Number(raw)] ?? "") : raw;
    }
    return values.map((value) => value ?? "");
  });
}

function field(record: Record<string, unknown>, names: string[]) {
  const match = Object.keys(record).find((key) => names.includes(headerKey(key)));
  return match ? record[match] : undefined;
}

function weekdayOf(value: unknown) {
  const key = normal(value).toLowerCase();
  const day = DAY_NAMES.findIndex((name) => key.startsWith(name.toLowerCase()));
  if (day >= 0) return day + 1;
  const numeric = Number(key);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 6 ? numeric : null;
}

function minuteTime(value: unknown) {
  if (typeof value === "number" && value >= 0 && value < 1)
    return `${String(Math.floor((value * 1440) / 60)).padStart(2, "0")}:${String(Math.floor(value * 1440) % 60).padStart(2, "0")}`;
  const text = normal(value);
  const m = text.match(/^(\d{1,2}):([0-5]\d)(?:\s*([ap]m))?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  if (m[3]) {
    hour %= 12;
    if (m[3].toLowerCase() === "pm") hour += 12;
  }
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${m[2]}`;
}

function parseRows(rows: string[][], section: string): TimetableImportResult {
  const warnings: string[] = [];
  const headers = (rows[0] ?? []).map(headerKey);
  const hasHeaders =
    headers.some((key) => ["weekday", "day"].includes(key)) &&
    headers.some((key) => ["start", "starttime", "start_time"].includes(key));
  if (!hasHeaders)
    return {
      entries: [],
      extractedText: rows.map((row) => row.join(" | ")).join("\n"),
      warnings: [
        "Could not identify structured timetable columns. Add entries in the review form.",
      ],
    };
  const keys = rows[0] ?? [];
  const records = rows
    .slice(1)
    .map((values) => Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ""])));
  const entries: ParsedTimetableEntry[] = [];
  for (const [index, record] of records.entries()) {
    const day = weekdayOf(field(record, ["day", "weekday"]));
    const start = minuteTime(field(record, ["start", "starttime", "start_time"]));
    const end = minuteTime(field(record, ["end", "endtime", "end_time"]));
    const subject = normal(field(record, ["subject", "course", "coursename", "activity"]));
    const rawRoom = normal(field(record, ["room", "roomid", "roomnumber", "classroom"]))
      .toUpperCase()
      .replace(/\s+/g, "");
    const roomNumber = rawRoom.match(/\d{3,4}/)?.[0] ?? "";
    const room = rawRoom.startsWith("LAB")
      ? `Lab-${roomNumber}`
      : rawRoom.startsWith("DT")
        ? `DT-${roomNumber}`
        : `DT-${roomNumber}`;
    const batch = normal(field(record, ["batch", "labgroup", "group"])) || null;
    const courseCode = normal(field(record, ["coursecode", "code", "subjectcode"])) || null;
    const rowSection = normal(field(record, ["section", "class", "division"])) || section;
    if (!day || !start || !end || end <= start || !subject || !roomNumber) {
      warnings.push(
        `Row ${index + 2} needs review: day, time interval, subject, or room number is missing or invalid.`,
      );
      continue;
    }
    entries.push({
      weekday: day,
      start_time: start,
      end_time: end,
      subject,
      course_code: courseCode,
      room_id: room,
      section: rowSection,
      batch,
      entry_type: /lab/i.test(`${subject} ${normal(field(record, ["type", "entrytype"]))}`)
        ? "lab"
        : /event/i.test(subject)
          ? "event"
          : "class",
      source_text: keys.map((key) => `${key}: ${normal(record[key])}`).join("; "),
      confidence: 0.85,
    });
  }
  const seen = new Set<string>();
  const unique: ParsedTimetableEntry[] = [];
  for (const entry of entries) {
    const key = [
      entry.weekday,
      entry.start_time,
      entry.end_time,
      entry.room_id,
      entry.subject,
      entry.section,
      entry.batch,
    ].join("|");
    if (seen.has(key)) {
      warnings.push(
        `Duplicate timetable entry detected: ${entry.subject}, ${entry.room_id}, ${entry.start_time}.`,
      );
      continue;
    }
    seen.add(key);
    unique.push(entry);
  }
  return {
    entries: unique,
    extractedText: rows.map((row) => row.join(" | ")).join("\n"),
    warnings,
  };
}

export async function parseTimetableFile(
  file: File,
  section: string,
): Promise<TimetableImportResult> {
  const extension = file.name.toLowerCase().split(".").at(-1);
  if (extension === "csv") return parseRows(parseCsv(await file.text()), section);
  if (extension === "xlsx") return parseRows(await parseXlsx(file), section);
  if (extension !== "pdf") throw new Error("Supported timetable files are PDF, CSV and XLSX.");

  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), useSystemFonts: true });
  const pdf = await task.promise;
  if (pdf.numPages > 100) throw new Error("Timetable PDF exceeds the 100-page processing limit.");
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  const extractedText = pages.join("\n").slice(0, 200000);
  const rows = parseCsv(extractedText.replace(/\s*\n\s*/g, "\n")).filter((row) => row.length > 1);
  const structured = parseRows(rows, section);
  if (!structured.entries.length) {
    return {
      entries: [],
      extractedText,
      warnings: [
        "PDF text was extracted, but its timetable layout needs coordinator review. Add or edit structured entries before activation.",
      ],
    };
  }
  return {
    ...structured,
    extractedText,
    warnings: [
      ...structured.warnings,
      "PDF extraction is a draft. Confirm every room, batch and time against the source document.",
    ],
  };
}

export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
