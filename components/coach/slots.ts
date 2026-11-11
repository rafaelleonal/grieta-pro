import type { CoachInput, Role } from "@/lib/types";

export type SlotKey = "champion" | "enemy";

export type Slot = {
  key: SlotKey;
  /** Etiqueta corta en la tarjeta («Tú», «Tu rival»). */
  label: string;
  /** Texto de la tarjeta vacía. */
  emptyTitle: string;
  /** Qué se está eligiendo, para «Eligiendo: …». */
  choosing: string;
  /** Rol cuya lista muestra la cuadrícula al elegir esta ranura. */
  role: Role;
  team: "ally" | "enemy";
  optional: boolean;
};

/** Ranuras del matchup: tú y tu rival de línea (o el jungla rival). */
export function matchupSlots(role: Role): Slot[] {
  const jungle = role === "JUNGLE";
  return [
    {
      key: "champion",
      label: "Tú",
      emptyTitle: "Elige tu campeón",
      choosing: "tu campeón",
      role,
      team: "ally",
      optional: false,
    },
    {
      key: "enemy",
      label: jungle ? "Jungla rival" : "Tu rival",
      emptyTitle: jungle ? "Elige su jungla" : "Elige a tu rival",
      choosing: jungle ? "el jungla rival" : "tu rival",
      role,
      team: "enemy",
      optional: false,
    },
  ];
}

export function slotValue(input: CoachInput, key: SlotKey): string {
  return input[key] || "";
}

/** Siguiente ranura obligatoria vacía y, si no hay, la primera opcional vacía. */
export function nextSlot(input: CoachInput, slots: Slot[], after?: SlotKey): SlotKey | null {
  const start = after ? slots.findIndex((slot) => slot.key === after) + 1 : 0;
  const ordered = [...slots.slice(start), ...slots.slice(0, start)];
  return (
    ordered.find((slot) => !slot.optional && !slotValue(input, slot.key))?.key ||
    ordered.find((slot) => slot.optional && !slotValue(input, slot.key))?.key ||
    null
  );
}

export function splashUrl(championId: string) {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${encodeURIComponent(championId)}_0.jpg`;
}
