import { coachBrief } from "@/lib/coach-presentation";
import type { HistoryRecord } from "@/components/account-controls";

export type DateGroup = "Hoy" | "Ayer" | "Esta semana" | "Este mes" | "Anteriores";

const DAY = 86_400_000;

export function dateGroup(value: string, now = new Date()): DateGroup {
  const date = new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.getTime();
  if (time >= today) return "Hoy";
  if (time >= today - DAY) return "Ayer";
  if (time >= today - 6 * DAY) return "Esta semana";
  if (time >= today - 30 * DAY) return "Este mes";
  return "Anteriores";
}

export function relativeTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (Number.isNaN(minutes)) return "";
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 24 * 60) return `Hace ${Math.round(minutes / 60)} h`;
  if (dateGroup(value, now) === "Ayer") return "Ayer";
  return date.toLocaleDateString("es-MX", {
    weekday: minutes < 7 * 24 * 60 ? "long" : undefined,
    day: minutes < 7 * 24 * 60 ? undefined : "numeric",
    month: minutes < 7 * 24 * 60 ? undefined : "short",
  });
}

/** Primera frase útil del plan guardado, sin parafrasear ni inventar. */
export function recordSummary(record: HistoryRecord): string {
  const brief = coachBrief(record.result);
  return brief.priority || brief.avoid || "";
}

export function groupRecords(records: HistoryRecord[]) {
  const groups = new Map<DateGroup, HistoryRecord[]>();
  for (const record of records) {
    const group = dateGroup(record.createdAt);
    groups.set(group, [...(groups.get(group) || []), record]);
  }
  return [...groups.entries()];
}
