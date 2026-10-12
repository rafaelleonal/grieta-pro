"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Crosshair,
  ExternalLink,
  Flag,
  Heart,
  Layers,
  MessageCircle,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Swords,
  Timer,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { isCurrentCoachResult } from "@/lib/types";
import type {
  Catalog,
  Champion,
  CoachInput,
  CoachPlan,
  GameItem,
  GamePhase,
  GameRune,
  LegacyCoachPlan,
  RuneStyle,
  SavedCoachResult,
  Step,
  SummonerSpell,
} from "@/lib/types";
import "./coaching-result.css";

type Screen = "select" | "game";
type View = { screen: Screen; phase: GamePhase };
type Maps = {
  champions: Map<string, Champion>;
  items: Map<string, GameItem>;
  runes: Map<string, GameRune>;
  styles: Map<string, RuneStyle>;
  summoners: Map<string, SummonerSpell>;
};
type Props = {
  result: SavedCoachResult;
  catalog: Catalog;
  input: CoachInput;
  formOpen: boolean;
  ownerId?: string;
  sample: boolean;
  busy: boolean;
  followupError?: string;
  onFollowup: (message: string) => boolean;
};
const INITIAL_VIEW: View = { screen: "select", phase: "linea" };
const PHASES: { id: GamePhase; label: string; subtitle: string; shortcut: string }[] = [
  { id: "linea", label: "Línea", subtitle: "Nv. 1–6", shortcut: "1" },
  { id: "mid", label: "Mid game", subtitle: "Rotaciones", shortcut: "2" },
  { id: "late", label: "Late", subtitle: "Peleas", shortcut: "3" },
];
const ROLE_LABELS = { TOP: "Top", JUNGLE: "Jungla", MID: "Mid", ADC: "ADC", SUPPORT: "Support" };

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++)
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

/** Only screen and phase preferences are persisted, never private inputs or plan content. */
function createViewStore(owner: string, identity: string) {
  const key = `grietapro-coach-view-v1:${fingerprint(owner)}`;
  let value = INITIAL_VIEW;
  let loaded = false;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      if (!loaded) {
        loaded = true;
        try {
          const saved: unknown = JSON.parse(window.sessionStorage.getItem(key) || "null");
          if (
            saved &&
            typeof saved === "object" &&
            "identity" in saved &&
            saved.identity === identity &&
            "screen" in saved &&
            "phase" in saved &&
            (saved.screen === "select" || saved.screen === "game") &&
            (saved.phase === "linea" || saved.phase === "mid" || saved.phase === "late")
          )
            value = { screen: saved.screen, phase: saved.phase };
        } catch {
          /* In-memory navigation works when storage is unavailable. */
        }
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => value,
    set(next: View) {
      value = next;
      try {
        window.sessionStorage.setItem(key, JSON.stringify({ identity, ...next }));
      } catch {
        /* Storage is optional. */
      }
      listeners.forEach((listener) => listener());
    },
  };
}
function useViewPreferences(owner: string, identity: string) {
  const store = useMemo(() => createViewStore(owner, identity), [owner, identity]);
  return [
    useSyncExternalStore(store.subscribe, store.getSnapshot, () => INITIAL_VIEW),
    store.set,
  ] as const;
}

function onTabKey(
  event: ReactKeyboardEvent<HTMLDivElement>,
  index: number,
  count: number,
  select: (index: number) => void,
) {
  let next: number;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + count - 1) % count;
  else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % count;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = count - 1;
  else return;
  event.preventDefault();
  select(next);
  event.currentTarget.querySelectorAll<HTMLButtonElement>("button[role='tab']")[next]?.focus();
}

function Portrait({ champion, size = 24 }: { champion: Champion | undefined; size?: number }) {
  return champion ? (
    <Image
      className="cp-portrait"
      src={champion.image}
      alt={champion.name}
      title={champion.name}
      width={size}
      height={size}
      unoptimized
    />
  ) : (
    <span className="cp-portrait cp-image-fallback" aria-label="Campeón sin definir">
      <CircleHelp size={size > 28 ? 20 : 14} />
    </span>
  );
}
function MiniChampions({ ids, maps, size = 24 }: { ids?: string[]; maps: Maps; size?: number }) {
  return ids?.length ? (
    <span className="cp-mini-champions">
      {ids.map((id) => (
        <Portrait key={id} champion={maps.champions.get(id)} size={size} />
      ))}
    </span>
  ) : null;
}
function CatalogIcon({
  entry,
  size,
}: {
  entry: { image: string; name: string } | undefined;
  size: number;
}) {
  return entry ? (
    <Image
      className="cp-catalog-icon"
      src={entry.image}
      alt=""
      width={size}
      height={size}
      unoptimized
    />
  ) : (
    <span className="cp-catalog-icon cp-image-fallback">
      <CircleHelp size={22} />
    </span>
  );
}
function ItemCard({
  id,
  maps,
  active = true,
  order,
  horizontal = false,
}: {
  id: string;
  maps: Maps;
  active?: boolean;
  order?: number;
  horizontal?: boolean;
}) {
  const item = maps.items.get(id);
  return (
    <div
      className={`cp-item-card ${active ? "is-current" : ""} ${horizontal ? "is-horizontal" : ""}`}
    >
      <span className="cp-item-picture">
        <CatalogIcon entry={item} size={horizontal ? 48 : 64} />
        {order ? <span className="cp-item-order">{order}</span> : null}
      </span>
      <span className="cp-item-text">
        <span className="cp-item-name">{item?.name || `Objeto ${id}`}</span>
        <span className="cp-item-gold">
          {item ? `${item.gold.toLocaleString("es-MX")} oro` : "Coste no disponible"}
        </span>
      </span>
    </div>
  );
}
function Composition({
  input,
  plan,
  maps,
}: {
  input: CoachInput;
  plan: CoachPlan | undefined;
  maps: Maps;
}) {
  const rows = [
    {
      team: "ally",
      label: "Tu equipo",
      ids: [...new Set([input.champion, ...input.allies])].filter(Boolean),
    },
    {
      team: "enemy",
      label: "Rivales",
      ids: [...new Set([input.enemy, ...input.enemies])].filter(Boolean),
    },
  ];
  return (
    <div className="cp-composition" aria-label="Composición conocida de la partida">
      {rows.map((row) => (
        <div className="cp-composition-row" key={row.team}>
          <span className="cp-eyebrow">{row.label}</span>
          <div className="cp-team">
            {row.ids.map((id) => {
              const member = plan?.composition.find(
                (entry) => entry.champion === id && entry.team === row.team,
              );
              const self = row.team === "ally" && id === input.champion;
              const rival = row.team === "enemy" && id === input.enemy;
              const champion = maps.champions.get(id);
              const label = self ? "Tú" : rival ? "Rival" : member?.label || champion?.name || id;
              return (
                <div
                  key={id}
                  className={`cp-team-member ${member?.mark ? `mark-${member.mark}` : self || rival ? "mark-self" : "mark-none"}`}
                  title={member?.note || champion?.name || id}
                >
                  <Portrait champion={champion} size={40} />
                  <span>{label}</span>
                </div>
              );
            })}
            {row.ids.length < 5 ? (
              <span className="cp-composition-missing">{5 - row.ids.length} por definir</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
function RuneRow({ id, maps }: { id: string; maps: Maps }) {
  const rune = maps.runes.get(id);
  return (
    <div className="cp-rune-row">
      <CatalogIcon entry={rune} size={44} />
      <span>{rune?.name || id}</span>
    </div>
  );
}
function RuneTree({ id, maps }: { id: string; maps: Maps }) {
  const tree = maps.styles.get(id);
  return (
    <div className="cp-rune-tree">
      <CatalogIcon entry={tree} size={28} />
      <span>{tree?.name || id}</span>
    </div>
  );
}

function SelectScreen({ plan, maps, onGame }: { plan: CoachPlan; maps: Maps; onGame: () => void }) {
  const runes = plan.build.runes;
  const spells = plan.build.summoners;
  const keystone = maps.runes.get(runes.primary.keystone);
  const altRune = runes.alternative;
  const altSpells = spells.alternative;
  const total = plan.build.starting.reduce((sum, id) => sum + (maps.items.get(id)?.gold || 0), 0);
  return (
    <div className="cp-select-screen">
      <div className="cp-select-grid">
        <section className="cp-card cp-runes-card" aria-labelledby="coach-runes-heading">
          <h3 id="coach-runes-heading">
            <Sparkles size={22} />
            ¿Qué runas?<span>Página recomendada</span>
          </h3>
          <div className="cp-rune-columns">
            <div>
              <RuneTree id={runes.primary.style} maps={maps} />
              <div className="cp-keystone">
                <CatalogIcon entry={keystone} size={80} />
                <div>
                  <h4>{keystone?.name || runes.primary.keystone}</h4>
                  <p>{runes.why}</p>
                </div>
              </div>
              <div className="cp-minor-runes">
                {runes.primary.minors.map((id) => (
                  <RuneRow key={id} id={id} maps={maps} />
                ))}
              </div>
            </div>
            <div>
              <RuneTree id={runes.secondary.style} maps={maps} />
              <div className="cp-minor-runes">
                {runes.secondary.minors.map((id) => (
                  <RuneRow key={id} id={id} maps={maps} />
                ))}
              </div>
              <div className="cp-shards">
                <span className="cp-eyebrow">Fragmentos</span>
                {runes.shards.map((shard, index) => (
                  <div key={`${shard}-${index}`}>
                    <span className="cp-shard-icon">
                      {index === 0 ? (
                        <Zap size={14} />
                      ) : /vida|salud/i.test(shard) ? (
                        <Heart size={14} />
                      ) : (
                        <Shield size={14} />
                      )}
                    </span>
                    {shard}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {altRune ? (
            <div className="cp-alternative">
              <div className="cp-alternative-condition">
                <span className="cp-eyebrow">Alternativa</span>
                <MiniChampions ids={altRune.champions} maps={maps} size={22} />
                <span>{altRune.when}</span>
              </div>
              <div className="cp-alt-rune">
                <CatalogIcon entry={maps.runes.get(altRune.keystone)} size={52} />
                <div>
                  <h4>
                    {maps.runes.get(altRune.keystone)?.name || altRune.keystone}
                    <span>{maps.styles.get(altRune.style)?.name || altRune.style}</span>
                  </h4>
                  <p>{altRune.why}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
        <section className="cp-card cp-spells-card" aria-labelledby="coach-spells-heading">
          <h3 id="coach-spells-heading">
            <WandSparkles size={22} />
            ¿Qué hechizos?
          </h3>
          <div className="cp-spells-main">
            <div className="cp-spell-pair">
              {spells.pick.map((id) => (
                <div className="cp-spell" key={id}>
                  <CatalogIcon entry={maps.summoners.get(id)} size={60} />
                  <span>{maps.summoners.get(id)?.name || id}</span>
                </div>
              ))}
            </div>
            <p>{spells.why}</p>
          </div>
          {altSpells ? (
            <div className="cp-alternative">
              <div className="cp-alternative-condition">
                <span className="cp-eyebrow">Alternativa</span>
                <MiniChampions ids={altSpells.champions} maps={maps} size={22} />
                <span>{altSpells.when}</span>
              </div>
              <div className="cp-alt-spells">
                <span>
                  {altSpells.pick.map((id) => (
                    <CatalogIcon key={id} entry={maps.summoners.get(id)} size={42} />
                  ))}
                </span>
                <div>
                  <h4>
                    {altSpells.pick.map((id) => maps.summoners.get(id)?.name || id).join(" + ")}
                  </h4>
                  <p>{altSpells.why}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
        <section className="cp-card cp-start-card" aria-labelledby="coach-start-heading">
          <h3 id="coach-start-heading">
            <Flag size={22} />
            ¿Con qué salgo?
          </h3>
          <span className="cp-eyebrow cp-skills-label">Habilidades · nivel 1 a 6</span>
          <div className="cp-skill-row">
            <ol>
              {plan.build.skillOrder.first6.map((skill, index) => (
                <li key={index}>
                  <span
                    className={skill === "R" ? "is-ultimate" : ""}
                    title={
                      skill === null
                        ? "Aphelios mejora atributos; consulta la prioridad."
                        : undefined
                    }
                  >
                    {skill || "—"}
                  </span>
                  <small>Nv. {index + 1}</small>
                </li>
              ))}
            </ol>
            <p>
              Después: máximo <strong>{plan.build.skillOrder.max}</strong>
            </p>
          </div>
          <div className="cp-start-purchase cp-rule">
            <div>
              <span className="cp-eyebrow">Compra inicial</span>
              <span className="cp-start-total">{total.toLocaleString("es-MX")} oro</span>
            </div>
            <div className="cp-start-items">
              {plan.build.starting.map((id, index) => (
                <ItemCard key={`${id}-${index}`} id={id} maps={maps} horizontal />
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className="cp-comp-notes">
        <span className="cp-eyebrow">Por su composición</span>
        {plan.compNotes.map((note, index) => (
          <div className={`cp-comp-note mark-${note.mark}`} key={index}>
            <MiniChampions ids={note.champions} maps={maps} />
            <strong>{note.title}</strong>
            <ArrowRight size={13} />
            <span>{note.action}</span>
          </div>
        ))}
        <button type="button" className="cp-primary cp-start-game" onClick={onGame}>
          Empezó la partida
          <ArrowRight size={15} />
          <kbd>P</kbd>
        </button>
      </div>
    </div>
  );
}

function GameScreen({
  plan,
  maps,
  phase,
  enemy,
  formOpen,
}: {
  plan: CoachPlan;
  maps: Maps;
  phase: GamePhase;
  enemy: string;
  formOpen: boolean;
}) {
  const steps: (Step & { level?: string })[] = phase === "linea" ? plan.levels : plan.phases[phase];
  const currentItems = new Set(plan.build.nowByPhase[phase]);
  return (
    <div className={`cp-game-grid ${formOpen ? "cp-condensed" : ""}`}>
      <section className="cp-card cp-steps-card" aria-labelledby="coach-steps-heading">
        <h3 id="coach-steps-heading">
          <Layers size={22} />
          ¿Qué hago?
          <span>{phase === "linea" ? "Por nivel" : phase === "mid" ? "Rotaciones" : "Peleas"}</span>
          <span className="cp-step-legend">
            <span>
              <i />
              Tu ventana
            </span>
            <span>
              <i />
              Cuidado
            </span>
          </span>
        </h3>
        <ol className="cp-steps">
          {steps.map((step, index) => (
            <li className={`edge-${step.edge}`} key={index}>
              <span className="cp-step-number">{step.level || index + 1}</span>
              <div>
                <div className="cp-step-cue">
                  <strong>{step.cue}</strong>
                  {step.skill ? <span className="cp-skill-chip">{step.skill}</span> : null}
                  <MiniChampions ids={step.champions} maps={maps} />
                </div>
                <p className="cp-step-detail">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="cp-card cp-build-card" aria-labelledby="coach-build-heading">
        <h3 id="coach-build-heading">
          <ShoppingBag size={22} />
          ¿Qué compro?<span>Build orientativa</span>
        </h3>
        <div className="cp-build-order">
          {plan.build.starting.map((id, index) => (
            <ItemCard
              key={`start-${id}-${index}`}
              id={id}
              maps={maps}
              active={currentItems.has(id)}
            />
          ))}
          <ArrowRight className="cp-build-arrow" size={20} />
          {plan.build.core.map((id, index) => (
            <ItemCard
              key={`core-${id}-${index}`}
              id={id}
              maps={maps}
              order={index + 1}
              active={currentItems.has(id)}
            />
          ))}
        </div>
        <div className="cp-situational cp-rule">
          {plan.build.situational.map((item, index) => (
            <div
              className={`cp-situational-item ${currentItems.has(item.item) ? "is-current" : ""}`}
              key={index}
            >
              <CatalogIcon entry={maps.items.get(item.item)} size={48} />
              <div>
                <strong>{maps.items.get(item.item)?.name || `Objeto ${item.item}`}</strong>
                <div>
                  <span>{item.reason}</span>
                  <MiniChampions ids={item.champions} maps={maps} size={22} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="cp-card cp-reactions-card" aria-labelledby="coach-reactions-heading">
        <h3 id="coach-reactions-heading">
          <Crosshair size={22} />
          ¿Cómo respondo?
        </h3>
        <div className="cp-reactions">
          {plan.reactions[phase].map((reaction, index) => (
            <div className="cp-reaction cp-rule" key={index}>
              <MiniChampions ids={reaction.champions} maps={maps} size={32} />
              <div>
                <h4>{reaction.trigger}</h4>
                <p>{reaction.response}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="cp-card cp-enemy-card" aria-labelledby="coach-enemy-heading">
        <h3 id="coach-enemy-heading">
          <Timer size={22} />
          ¿Cuándo pego?<span>Claves de {maps.champions.get(enemy)?.name || enemy} · rango 1</span>
        </h3>
        <div className="cp-enemy-keys">
          {plan.enemyKeys.map((ability, index) => (
            <div key={index} className="cp-enemy-key">
              <span className="cp-enemy-keycap">{ability.key}</span>
              <div>
                <div className="cp-enemy-ability">
                  <strong>{ability.name}</strong>
                  <span className={/\d/.test(ability.cooldown) ? undefined : "is-unconfirmed"}>
                    {ability.cooldown}
                  </span>
                </div>
                <p>
                  {ability.note}
                  <MiniChampions ids={ability.champions} maps={maps} size={22} />
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="cp-avoid">
          <ShieldAlert size={18} />
          <p>
            <strong>Evita · </strong>
            {plan.avoid[phase]}
          </p>
        </div>
      </section>
    </div>
  );
}

function LegacyScreen({ plan, maps }: { plan: LegacyCoachPlan; maps: Maps }) {
  return (
    <div className="cp-legacy">
      <p className="cp-legacy-notice">
        <AlertTriangle size={16} />
        Este plan se guardó con el formato anterior. Puedes consultarlo completo; genera un nuevo
        plan para ver selección y fases.
      </p>
      <div className="cp-legacy-grid">
        <section className="cp-card">
          <h3>
            <Layers size={22} />
            Niveles 1–6
          </h3>
          {plan.levels.map((step, index) => (
            <p key={index}>
              <strong>{step.level} · </strong>
              {step.action}
            </p>
          ))}
        </section>
        <section className="cp-card">
          <h3>
            <ShoppingBag size={22} />
            Preparación y compras
          </h3>
          <p>{plan.build.label}</p>
          <div className="cp-start-items">
            {[...plan.build.starting, ...plan.build.core].map((id, index) => (
              <ItemCard key={`${id}-${index}`} id={id} maps={maps} horizontal />
            ))}
          </div>
          {plan.build.situational.map((item, index) => (
            <p key={index}>
              <strong>{maps.items.get(item.item)?.name || item.item} · </strong>
              {item.reason}
            </p>
          ))}
          <p>
            <strong>Runas · </strong>
            {plan.build.runes.join(" · ")}
          </p>
          <p>
            <strong>Hechizos · </strong>
            {plan.build.summoners.join(" + ")}
          </p>
          <p>
            <strong>Habilidades · </strong>
            {plan.build.skillOrder}
          </p>
        </section>
        <section className="cp-card">
          <h3>
            <Crosshair size={22} />
            Mecánicas
          </h3>
          {plan.mechanics.map((reaction, index) => (
            <p key={index}>
              <strong>{reaction.trigger}</strong>
              <br />
              {reaction.response}
            </p>
          ))}
        </section>
        <section className="cp-card">
          <h3>
            <Flag size={22} />
            Mapa y precauciones
          </h3>
          {plan.macro.map((text, index) => (
            <p key={`macro-${index}`}>{text}</p>
          ))}
          {plan.avoid.map((text, index) => (
            <p key={`avoid-${index}`}>
              <strong>Evita · </strong>
              {text}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}

function planText(result: SavedCoachResult, maps: Maps, sample: boolean, input: CoachInput) {
  const names = (ids: string[]) => ids.map((id) => maps.items.get(id)?.name || id).join(", ");
  const plan = result.plan;
  const text = [
    sample ? "EJEMPLO LOCAL · SIN IA · SIN VERIFICAR" : "PLAN DE PARTIDA",
    plan.headline,
    plan.winCondition,
    `${maps.champions.get(input.champion)?.name || input.champion} vs. ${maps.champions.get(input.enemy)?.name || input.enemy} · ${ROLE_LABELS[input.role]} · ${input.rank}`,
    "BUILD ORIENTATIVA",
    plan.build.label,
    `Inicio: ${names(plan.build.starting)}`,
    `Orden: ${names(plan.build.core)}`,
    ...plan.build.situational.map((item) => `${names([item.item])}: ${item.reason}`),
  ];
  if (isCurrentCoachResult(result)) {
    const current = result.plan;
    const runeName = (id: string) => maps.runes.get(id)?.name || id;
    const spellNames = (ids: string[]) =>
      ids.map((id) => maps.summoners.get(id)?.name || id).join(" + ");
    const runes = current.build.runes;
    text.push(
      "SELECCIÓN DE CAMPEONES",
      `Primaria: ${maps.styles.get(runes.primary.style)?.name || runes.primary.style} · ${[runes.primary.keystone, ...runes.primary.minors].map(runeName).join(", ")}`,
      `Secundaria: ${maps.styles.get(runes.secondary.style)?.name || runes.secondary.style} · ${runes.secondary.minors.map(runeName).join(", ")}`,
      `Fragmentos: ${runes.shards.join(", ")}`,
      runes.why,
      `Hechizos: ${spellNames(current.build.summoners.pick)} · ${current.build.summoners.why}`,
      `Habilidades 1–6: ${current.build.skillOrder.first6.map((skill) => skill || "—").join(" → ")} · Máximo: ${current.build.skillOrder.max}`,
    );
    if (runes.alternative)
      text.push(
        `Runa alternativa: ${runeName(runes.alternative.keystone)} · ${runes.alternative.when} · ${runes.alternative.why}`,
      );
    if (current.build.summoners.alternative) {
      const alternative = current.build.summoners.alternative;
      text.push(
        `Hechizos alternativos: ${spellNames(alternative.pick)} · ${alternative.when} · ${alternative.why}`,
      );
    }
    text.push(
      "COMPOSICIÓN",
      ...current.composition.map(
        (member) =>
          `${member.team === "ally" ? "Aliado" : "Rival"}: ${maps.champions.get(member.champion)?.name || member.champion} · ${member.label}${member.note ? ` · ${member.note}` : ""}`,
      ),
      ...current.compNotes.map((note) => `${note.title}: ${note.action}`),
    );
    for (const phase of PHASES) {
      const steps = phase.id === "linea" ? current.levels : current.phases[phase.id];
      text.push(
        phase.label.toUpperCase(),
        ...steps.map(
          (step, index) =>
            `${"level" in step ? step.level : index + 1} · ${step.cue}: ${step.text}`,
        ),
        ...current.reactions[phase.id].map(
          (reaction) => `${reaction.trigger}: ${reaction.response}`,
        ),
        ...(current.build.nowByPhase[phase.id].length
          ? [`Compra en esta fase: ${names(current.build.nowByPhase[phase.id])}`]
          : []),
        `Evita: ${current.avoid[phase.id]}`,
      );
    }
    text.push(
      "CLAVES DEL RIVAL",
      ...current.enemyKeys.map(
        (ability) => `${ability.key} · ${ability.name} · ${ability.cooldown}: ${ability.note}`,
      ),
    );
  } else
    text.push(
      "PLAN GUARDADO EN FORMATO ANTERIOR",
      ...result.plan.levels.map((level) => `${level.level}: ${level.action}`),
      ...result.plan.mechanics.map((reaction) => `${reaction.trigger}: ${reaction.response}`),
      `Runas: ${result.plan.build.runes.join(", ")}`,
      `Hechizos: ${result.plan.build.summoners.join(", ")}`,
      `Habilidades: ${result.plan.build.skillOrder}`,
      ...result.plan.avoid.map((avoid) => `Evita: ${avoid}`),
    );
  text.push(
    "MAPA",
    ...plan.macro,
    ...result.meta.warnings,
    ...result.meta.sources
      .filter((source) => safeUrl(source.url))
      .map((source) => `${source.title}: ${source.url}`),
  );
  return text.join("\n\n");
}

export function CoachingResult(props: Props) {
  const { result, input, ownerId } = props;
  const identity = fingerprint(
    JSON.stringify([
      result.meta.generatedAt,
      input.champion,
      input.enemy,
      input.role,
      input.rank,
      input.allies,
      input.enemies,
    ]),
  );
  return <CoachView key={`${ownerId || "anonymous"}:${identity}`} {...props} identity={identity} />;
}
function CoachView({
  result,
  catalog,
  input,
  formOpen,
  ownerId,
  sample,
  busy,
  followupError,
  onFollowup,
  identity,
}: Props & { identity: string }) {
  const [view, setView] = useViewPreferences(ownerId || "anonymous", identity);
  const [followup, setFollowup] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [warnOpen, setWarnOpen] = useState(false);
  const followupId = useId();
  const helpId = useId();
  const warningsId = useId();
  const selectId = useId();
  const gameId = useId();
  const copyTimer = useRef<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const followupInput = useRef<HTMLTextAreaElement>(null);
  const askButton = useRef<HTMLButtonElement>(null);
  const maps = useMemo<Maps>(
    () => ({
      champions: new Map(catalog.champions.map((champion) => [champion.id, champion])),
      items: new Map(catalog.items.map((item) => [item.id, item])),
      runes: new Map(catalog.runes.map((rune) => [rune.key, rune])),
      styles: new Map(catalog.runeStyles.map((style) => [style.key, style])),
      summoners: new Map(catalog.summoners.map((summoner) => [summoner.id, summoner])),
    }),
    [catalog],
  );
  const current = isCurrentCoachResult(result);
  const champion = maps.champions.get(input.champion);
  const enemy = maps.champions.get(input.enemy);
  const sources = result.meta.sources.filter((source) => safeUrl(source.url));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
        ) ||
          target.isContentEditable)
      )
        return;
      if (document.querySelector("dialog[open], [role='dialog']:not([aria-hidden='true'])")) return;
      const key = event.key.toLowerCase();
      if (key === "/") {
        event.preventDefault();
        dialog.current?.showModal();
        followupInput.current?.focus();
        return;
      }
      if (!current) return;
      if (key === "s" || key === "p") {
        event.preventDefault();
        setView({ ...view, screen: key === "s" ? "select" : "game" });
      }
      const phase = PHASES.find((entry) => entry.shortcut === key);
      if (phase) {
        event.preventDefault();
        setView({ screen: "game", phase: phase.id });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, setView, view]);
  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );
  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(planText(result, maps, sample, input));
      setCopied(true);
      setCopyError("");
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("No pudimos copiar. Puedes seleccionar el texto del plan para copiarlo.");
    }
  }

  return (
    <section className="panel result-panel coach-plan" aria-label="Tu plan de partida">
      <header className="cp-header">
        <div className="cp-toolbar">
          {current ? (
            <div
              className="cp-screen-tabs"
              role="tablist"
              aria-label="Pantalla del plan"
              onKeyDown={(event) =>
                onTabKey(event, view.screen === "select" ? 0 : 1, 2, (index) =>
                  setView({ ...view, screen: index === 0 ? "select" : "game" }),
                )
              }
            >
              {[
                {
                  id: "select",
                  label: "Selección de campeones",
                  shortcut: "S",
                  icon: Users,
                  panelId: selectId,
                },
                { id: "game", label: "En partida", shortcut: "P", icon: Swords, panelId: gameId },
              ].map((screen) => (
                <button
                  id={`${screen.panelId}-tab`}
                  key={screen.id}
                  type="button"
                  role="tab"
                  aria-selected={view.screen === screen.id}
                  tabIndex={view.screen === screen.id ? 0 : -1}
                  aria-controls={screen.panelId}
                  className={view.screen === screen.id ? "is-active" : ""}
                  onClick={() => setView({ ...view, screen: screen.id as Screen })}
                >
                  <screen.icon size={15} />
                  <span>{screen.label}</span>
                  <kbd>{screen.shortcut}</kbd>
                </button>
              ))}
            </div>
          ) : (
            <span className="cp-legacy-label">Plan guardado</span>
          )}
          <div className="cp-matchup">
            <Portrait champion={champion} size={30} />
            <strong>{champion?.name || input.champion}</strong>
            <span>vs.</span>
            <Portrait champion={enemy} size={30} />
            <strong>{enemy?.name || input.enemy}</strong>
            <span className="cp-role-rank">
              {ROLE_LABELS[input.role]} · {input.rank}
            </span>
          </div>
          {sample || result.meta.warnings.length ? (
            <button
              className="cp-warning-toggle"
              type="button"
              aria-expanded={warnOpen}
              aria-controls={warningsId}
              onClick={() => setWarnOpen(!warnOpen)}
            >
              <AlertTriangle size={13} />
              {sample ? "Ejemplo" : "Avisos"}
              <ChevronDown size={11} />
            </button>
          ) : null}
          <div className="cp-toolbar-right">
            {current && view.screen === "game" ? (
              <div
                className="cp-phase-tabs"
                role="tablist"
                aria-label="Fase de la partida"
                onKeyDown={(event) =>
                  onTabKey(
                    event,
                    PHASES.findIndex((phase) => phase.id === view.phase),
                    PHASES.length,
                    (index) => setView({ screen: "game", phase: PHASES[index].id }),
                  )
                }
              >
                {PHASES.map((phase) => (
                  <button
                    key={phase.id}
                    type="button"
                    role="tab"
                    aria-selected={view.phase === phase.id}
                    tabIndex={view.phase === phase.id ? 0 : -1}
                    id={`${gameId}-phase-${phase.id}`}
                    aria-controls={gameId}
                    className={view.phase === phase.id ? "is-active" : ""}
                    onClick={() => setView({ screen: "game", phase: phase.id })}
                  >
                    <strong>{phase.label}</strong>
                    <span>{phase.subtitle}</span>
                    <kbd>{phase.shortcut}</kbd>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="cp-actions">
              <button
                ref={askButton}
                className="cp-ghost"
                type="button"
                title="Preguntar al coach (/)"
                aria-label="Preguntar al coach"
                aria-haspopup="dialog"
                onClick={() => {
                  dialog.current?.showModal();
                  followupInput.current?.focus();
                }}
              >
                <MessageCircle size={18} />
              </button>
              <button
                className="cp-ghost"
                type="button"
                title={copied ? "Copiado" : "Copiar plan"}
                aria-label={copied ? "Plan copiado" : "Copiar plan"}
                onClick={() => void copyPlan()}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>
        {warnOpen ? (
          <div className="cp-warnings" id={warningsId}>
            {sample ? (
              <p>Demostración escrita · sin IA · sin verificar para el parche actual.</p>
            ) : null}
            {result.meta.warnings.map((warning, index) => (
              <p key={index}>{warning}</p>
            ))}
          </div>
        ) : null}
        {copyError ? (
          <p className="cp-copy-error" role="status">
            {copyError}
          </p>
        ) : null}
        <div className="cp-heading">
          <div>
            <h2>{result.plan.headline}</h2>
            <p>{result.plan.winCondition}</p>
          </div>
          <Composition input={input} plan={current ? result.plan : undefined} maps={maps} />
        </div>
      </header>
      {current ? (
        <>
          <div
            className="cp-screen-body"
            role="tabpanel"
            id={view.screen === "select" ? selectId : gameId}
            aria-labelledby={
              view.screen === "select"
                ? `${selectId}-tab`
                : `${gameId}-tab ${gameId}-phase-${view.phase}`
            }
          >
            {view.screen === "select" ? (
              <SelectScreen
                plan={result.plan}
                maps={maps}
                onGame={() => setView({ screen: "game", phase: "linea" })}
              />
            ) : (
              <GameScreen
                plan={result.plan}
                maps={maps}
                phase={view.phase}
                enemy={input.enemy}
                formOpen={formOpen}
              />
            )}
          </div>
          <div
            id={view.screen === "select" ? gameId : selectId}
            role="tabpanel"
            aria-labelledby={`${view.screen === "select" ? gameId : selectId}-tab`}
            hidden
          />
        </>
      ) : (
        <LegacyScreen plan={result.plan} maps={maps} />
      )}
      <footer className="cp-plan-footer">
        <span>
          {sample ? "Ejemplo local" : `Catálogo ${result.meta.version} · ${result.plan.difficulty}`}
        </span>
        {sources.map((source, index) => (
          <a
            key={index}
            href={safeUrl(source.url) || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={11} />
            {source.title}
          </a>
        ))}
      </footer>
      <span className="cp-sr-only" role="status">
        {copied ? "Plan copiado al portapapeles." : ""}
      </span>
      <dialog
        ref={dialog}
        className="cp-followup"
        aria-labelledby={followupId}
        aria-describedby={helpId}
        onClose={() => askButton.current?.focus()}
        onClick={(event) => {
          if (event.target === dialog.current) {
            const bounds = dialog.current.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              dialog.current.close();
          }
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const message = followup.trim();
            if (!busy && message && onFollowup(message)) {
              setFollowup("");
              dialog.current?.close();
            }
          }}
        >
          <div className="cp-followup-title">
            <label id={followupId} htmlFor={`${followupId}-input`}>
              ¿Algo cambia en tu partida?
            </label>
            <button
              type="button"
              className="cp-ghost"
              aria-label="Cerrar pregunta"
              onClick={() => dialog.current?.close()}
            >
              <X size={16} />
            </button>
          </div>
          <div className="cp-followup-row">
            <textarea
              id={`${followupId}-input`}
              ref={followupInput}
              value={followup}
              onChange={(event) => setFollowup(event.target.value)}
              placeholder="¿Y si me campean?"
              maxLength={1000}
              rows={2}
              disabled={busy}
            />
            <button type="submit" className="cp-primary" disabled={busy || !followup.trim()}>
              {busy ? "Analizando…" : "Preguntar"}
              <ArrowUp size={14} />
            </button>
          </div>
          {followupError ? (
            <p className="cp-followup-error" role="alert">
              {followupError}
            </p>
          ) : null}
          <p id={helpId}>Cada pregunta genera un nuevo análisis. · Esc para cerrar</p>
        </form>
      </dialog>
    </section>
  );
}
