import type { RoomState } from "@/lib/availability";
import type { Room } from "@/lib/rooms-data";
import { cn } from "@/lib/utils";

const X0 = 150;
const X1 = 980;
const GAP = 10;
const ROW_Y = { top: 30, bottom: 300 } as const;
const ROW_H = 190;

function layoutRow(rooms: Room[]) {
  const total = rooms.reduce((a, r) => a + r.span, 0);
  const avail = X1 - X0 - GAP * (rooms.length - 1);
  let x = X0;
  return rooms.map((r) => {
    const w = (avail * r.span) / total;
    const rect = { room: r, x, w };
    x += w + GAP;
    return rect;
  });
}

const FILL: Record<RoomState["status"], string> = {
  free: "fill-free-soft stroke-free",
  busy: "fill-busy-soft stroke-busy",
  unverified: "fill-unverified-soft stroke-unverified",
  offline: "fill-offline-soft stroke-offline",
};
const TEXT: Record<RoomState["status"], string> = {
  free: "fill-free",
  busy: "fill-busy",
  unverified: "fill-unverified",
  offline: "fill-offline",
};
const LABEL: Record<RoomState["status"], string> = {
  free: "✓ Free",
  busy: "✕ Busy",
  unverified: "? Unverified",
  offline: "— Not in service",
};

export function FloorMap({
  states,
  selectedId,
  onSelect,
  onHover,
}: {
  states: RoomState[];
  selectedId?: string | undefined;
  onSelect: (id: string) => void;
  onHover?: ((id: string | null) => void) | undefined;
}) {
  const top = layoutRow(states.filter((s) => s.room.row === "top").map((s) => s.room));
  const bottom = layoutRow(states.filter((s) => s.room.row === "bottom").map((s) => s.room));
  const byId = Object.fromEntries(states.map((s) => [s.room.id, s]));

  const renderRoom = (rect: { room: Room; x: number; w: number }, row: "top" | "bottom") => {
    const s = byId[rect.room.id];
    if (!s) return null;
    const y = ROW_Y[row];
    const selected = selectedId === rect.room.id;
    const cx = rect.x + rect.w / 2;
    const doorY = row === "top" ? y + ROW_H : y;
    return (
      <g
        key={rect.room.id}
        role="button"
        tabIndex={0}
        aria-label={`${rect.room.id}, ${rect.room.type}, ${LABEL[s.status]}`}
        aria-pressed={selected}
        onClick={() => onSelect(rect.room.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(rect.room.id);
          }
        }}
        onMouseEnter={() => onHover?.(rect.room.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(rect.room.id)}
        onBlur={() => onHover?.(null)}
        className="group cursor-pointer outline-none"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <rect
          x={rect.x}
          y={y}
          width={rect.w}
          height={ROW_H}
          rx={14}
          className={cn(
            FILL[s.status],
            "transition-all duration-200 group-hover:brightness-95 group-focus-visible:stroke-brand",
            selected ? "stroke-[5]" : "stroke-2",
          )}
        />
        {selected && (
          <rect
            x={rect.x - 6}
            y={y - 6}
            width={rect.w + 12}
            height={ROW_H + 12}
            rx={18}
            className="fill-none stroke-brand stroke-2 animate-dash"
          />
        )}
        <line
          x1={cx - 22}
          x2={cx + 22}
          y1={doorY}
          y2={doorY}
          className="stroke-background stroke-[6]"
        />
        <text
          x={cx}
          y={y + ROW_H / 2 - 14}
          textAnchor="middle"
          className="fill-foreground font-mono text-[22px] font-bold"
        >
          {rect.room.id}
        </text>
        <text
          x={cx}
          y={y + ROW_H / 2 + 14}
          textAnchor="middle"
          className={cn(TEXT[s.status], "text-[15px] font-semibold")}
        >
          {LABEL[s.status]}
        </text>
        <text
          x={cx}
          y={y + ROW_H / 2 + 38}
          textAnchor="middle"
          className="fill-muted-foreground text-[13px]"
        >
          {rect.room.name ?? rect.room.type} ·{" "}
          {rect.room.capacity === null ? "capacity unverified" : `${rect.room.capacity} seats`}
        </text>
        {s.justFreed && s.status === "free" && (
          <circle cx={rect.x + rect.w - 18} cy={y + 18} r={6} className="fill-free">
            <animate attributeName="r" values="5;9;5" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 1000 520"
      className="h-auto w-full select-none"
      role="img"
      aria-label="Floor plan"
    >
      <rect
        x={8}
        y={8}
        width={984}
        height={504}
        rx={24}
        className="fill-card stroke-border stroke-2"
      />
      {/* core */}
      <rect x={22} y={30} width={112} height={140} rx={12} className="fill-muted stroke-border" />
      <text
        x={78}
        y={106}
        textAnchor="middle"
        className="fill-muted-foreground text-[14px] font-semibold"
      >
        Stairs
      </text>
      <rect
        x={22}
        y={190}
        width={112}
        height={140}
        rx={12}
        className="fill-secondary stroke-border"
      />
      <text
        x={78}
        y={266}
        textAnchor="middle"
        className="fill-secondary-foreground text-[14px] font-semibold"
      >
        Lifts
      </text>
      <rect x={22} y={350} width={112} height={140} rx={12} className="fill-muted stroke-border" />
      <text
        x={78}
        y={426}
        textAnchor="middle"
        className="fill-muted-foreground text-[14px] font-semibold"
      >
        Washrooms
      </text>
      {/* corridor */}
      <rect x={X0} y={230} width={X1 - X0} height={60} rx={10} className="fill-background" />
      <line
        x1={X0 + 20}
        x2={X1 - 20}
        y1={260}
        y2={260}
        className="stroke-border stroke-2"
        strokeDasharray="10 10"
      />
      <text
        x={(X0 + X1) / 2}
        y={265}
        textAnchor="middle"
        className="fill-muted-foreground text-[12px] font-semibold uppercase tracking-[0.3em]"
      >
        Corridor
      </text>
      {top.map((r) => renderRoom(r, "top"))}
      {bottom.map((r) => renderRoom(r, "bottom"))}
    </svg>
  );
}
