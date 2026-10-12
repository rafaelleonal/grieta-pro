import { isBotLane } from "@/lib/coach-draft";
import type { CoachInput, Role } from "@/lib/types";

export type SlotKey = "champion" | "enemy" | "allyDuo" | "enemyDuo";

export type Slot = {
  key: SlotKey;
  /** Etiqueta corta en la tarjeta («Tú · ADC», «Su support»). */
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

const ROLE_SHORT: Record<Role, string> = {
  TOP: "Top",
  JUNGLE: "Jungla",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Support",
};

/**
 * Ranuras del matchup. En bot (ADC o Support) son cuatro: tú, tu pareja, tu rival de
 * línea (mismo rol) y su pareja. Las parejas son opcionales.
 */
export function matchupSlots(role: Role): Slot[] {
  const solo: Slot[] = [
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
      label: "Tu rival",
      emptyTitle: "Elige a tu rival",
      choosing: "tu rival",
      role,
      team: "enemy",
      optional: false,
    },
  ];
  if (!isBotLane(role)) return solo;
  const partner: Role = role === "ADC" ? "SUPPORT" : "ADC";
  return [
    { ...solo[0], label: `Tú · ${ROLE_SHORT[role]}` },
    {
      key: "enemy",
      label: `Su ${ROLE_SHORT[role]}`,
      emptyTitle: `Elige su ${ROLE_SHORT[role]}`,
      choosing: `su ${ROLE_SHORT[role]}`,
      role,
      team: "enemy",
      optional: false,
    },
    {
      key: "allyDuo",
      label: `Tu ${ROLE_SHORT[partner]}`,
      emptyTitle: `Tu ${ROLE_SHORT[partner]}`,
      choosing: `tu ${ROLE_SHORT[partner]}`,
      role: partner,
      team: "ally",
      optional: true,
    },
    {
      key: "enemyDuo",
      label: `Su ${ROLE_SHORT[partner]}`,
      emptyTitle: `Su ${ROLE_SHORT[partner]}`,
      choosing: `su ${ROLE_SHORT[partner]}`,
      role: partner,
      team: "enemy",
      optional: true,
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
