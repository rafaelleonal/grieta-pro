"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Crosshair,
  ExternalLink,
  Flag,
  Layers,
  ShieldAlert,
  ShoppingBag,
  Swords,
} from "lucide-react";
import type { CoachResult, GameItem } from "@/lib/types";
import "./coaching-result.css";

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function Item({ id, item }: { id: string; item: GameItem | undefined }) {
  return (
    <span className="qp-item">
      {item ? (
        <Image src={item.image} alt="" width={26} height={26} loading="lazy" unoptimized />
      ) : null}
      {item?.name || `Objeto ${id}`}
    </span>
  );
}

export function CoachingResult({
  result,
  items,
  sample,
  busy,
  onFollowup,
}: {
  result: CoachResult;
  items: GameItem[];
  sample: boolean;
  busy: boolean;
  onFollowup: (message: string) => boolean;
}) {
  const [followup, setFollowup] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const followupId = useId();
  const helpId = useId();
  const copyTimer = useRef<number | null>(null);
  const plan = result.plan;
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const sourceLinks = result.meta.sources.filter((source) => safeUrl(source.url));
  const opening =
    plan.levels.find((level) => level.level.replace(/nivel\s*/i, "") === "1") || plan.levels[0];
  const reaction = plan.mechanics[0];

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  async function copyPlan() {
    const text = [
      sample ? "EJEMPLO LOCAL · SIN IA · SIN VERIFICAR" : "PLAN DE PARTIDA",
      plan.headline,
      plan.winCondition,
      "NIVEL 1–6",
      ...plan.levels.map((level) => `${level.level}: ${level.action}`),
      "MECÁNICAS",
      ...plan.mechanics.map((mechanic) => `${mechanic.trigger}: ${mechanic.response}`),
      "BUILD",
      plan.build.label,
      `Inicio: ${plan.build.starting.map((id) => itemMap.get(id)?.name || id).join(", ")}`,
      `Objetos principales: ${plan.build.core.map((id) => itemMap.get(id)?.name || id).join(", ")}`,
      ...plan.build.situational.map(
        (item) => `${itemMap.get(item.item)?.name || item.item}: ${item.reason}`,
      ),
      `Runas: ${plan.build.runes.join(", ")}`,
      `Hechizos: ${plan.build.summoners.join(", ")}`,
      `Habilidades: ${plan.build.skillOrder}`,
      "MAPA",
      ...plan.macro,
      "EVITA",
      ...plan.avoid,
      ...result.meta.warnings,
      ...sourceLinks.map((source) => `${source.title}: ${source.url}`),
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError("");
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("No pudimos copiar. Selecciona el texto del plan para copiarlo.");
    }
  }

  return (
    <section className="panel result-panel quick-plan" aria-label="Tu plan de partida">
      <header className="qp-header">
        <div className="qp-topline">
          <h2>Tu plan de partida</h2>
          <span className={`qp-badge ${sample ? "sample" : ""}`}>
            {sample ? "EJEMPLO" : "COACH CON IA"}
          </span>
        </div>
        <p className="qp-headline">{plan.headline}</p>
        <p className="qp-goal">{plan.winCondition}</p>
        <div className="qp-meta">
          <span>{sample ? "Demostración local" : plan.difficulty}</span>
          {!sample ? <span>Catálogo {result.meta.version}</span> : null}
          <button type="button" className="qp-copy" onClick={() => void copyPlan()}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copiado" : "Copiar plan"}
          </button>
        </div>
        {copyError ? (
          <p className="qp-followup-help" role="status">
            {copyError}
          </p>
        ) : null}
      </header>
      <div className="qp-body">
        {result.meta.warnings.length ? (
          <details className="qp-verification">
            <summary>
              <AlertTriangle size={15} />
              <span>
                {sample
                  ? "Ejemplo local · sin IA · sin verificar"
                  : `Antes de usarlo · ${result.meta.warnings.length} ${result.meta.warnings.length === 1 ? "advertencia" : "advertencias"}`}
              </span>
              <ChevronDown size={14} className="qp-chevron" />
            </summary>
            <ul>
              {result.meta.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </details>
        ) : null}

        <div className="qp-essentials" aria-label="Lo esencial">
          {opening ? (
            <div className="qp-decision">
              <span className="qp-decision-icon">
                <Flag size={17} />
              </span>
              <div>
                <h3 className="qp-decision-label">
                  Empieza así · nivel {opening.level.replace(/nivel\s*/i, "")}
                </h3>
                <p>{opening.action}</p>
              </div>
            </div>
          ) : null}
          {reaction ? (
            <div className="qp-decision">
              <span className="qp-decision-icon">
                <Crosshair size={17} />
              </span>
              <div>
                <h3 className="qp-decision-label">Si pasa esto</h3>
                <p>
                  <strong>{reaction.trigger}</strong>
                  <br />
                  {reaction.response}
                </p>
              </div>
            </div>
          ) : null}
          {plan.avoid[0] ? (
            <div className="qp-decision qp-risk">
              <span className="qp-decision-icon">
                <ShieldAlert size={17} />
              </span>
              <div>
                <h3 className="qp-decision-label">Evita</h3>
                <p>{plan.avoid[0]}</p>
              </div>
            </div>
          ) : null}
        </div>

        {plan.build.starting.length || plan.build.core.length ? (
          <div className="qp-shopping">
            <div className="qp-shopping-heading">
              <h3>
                <ShoppingBag size={15} />
                Compra rápida
              </h3>
              <span>Build orientativa</span>
            </div>
            <div className="qp-shopping-groups">
              {plan.build.starting.length ? (
                <div>
                  <h4>Inicio</h4>
                  <div className="qp-items">
                    {plan.build.starting.map((id, index) => (
                      <Item key={`${id}-${index}`} id={id} item={itemMap.get(id)} />
                    ))}
                  </div>
                </div>
              ) : null}
              {plan.build.core.length ? (
                <div>
                  <h4>Objetos principales</h4>
                  <div className="qp-items">
                    {plan.build.core.map((id, index) => (
                      <Item key={`${id}-${index}`} id={id} item={itemMap.get(id)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="qp-details">
          <p className="qp-details-label">Afina el plan</p>
          <details className="qp-detail">
            <summary>
              <Layers size={16} />
              <span>Primeros niveles · 1–6</span>
              <ChevronDown size={15} className="qp-chevron" />
            </summary>
            <div className="qp-detail-content">
              <ol className="qp-levels">
                {plan.levels.map((level, index) => (
                  <li key={`${level.level}-${index}`}>
                    <span className="qp-level-number">{level.level.replace(/nivel\s*/i, "")}</span>
                    <div>
                      <h4>Nivel {level.level.replace(/nivel\s*/i, "")}</h4>
                      <p>{level.action}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </details>
          <details className="qp-detail">
            <summary>
              <Crosshair size={16} />
              <span>Cómo reaccionar</span>
              <ChevronDown size={15} className="qp-chevron" />
            </summary>
            <div className="qp-detail-content">
              <ul className="qp-tips">
                {plan.mechanics.map((mechanic, index) => (
                  <li key={index}>
                    <strong>{mechanic.trigger}</strong>
                    <p>{mechanic.response}</p>
                  </li>
                ))}
              </ul>
            </div>
          </details>
          <details className="qp-detail">
            <summary>
              <Swords size={16} />
              <span>Build, runas y hechizos</span>
              <ChevronDown size={15} className="qp-chevron" />
            </summary>
            <div className="qp-detail-content">
              <p>{plan.build.label}</p>
              {plan.build.starting.length ? (
                <section className="qp-build-section">
                  <h4>Compra inicial</h4>
                  <div className="qp-items">
                    {plan.build.starting.map((id, index) => (
                      <Item key={`${id}-${index}`} id={id} item={itemMap.get(id)} />
                    ))}
                  </div>
                </section>
              ) : null}
              {plan.build.core.length ? (
                <section className="qp-build-section">
                  <h4>Objetos principales</h4>
                  <div className="qp-items">
                    {plan.build.core.map((id, index) => (
                      <Item key={`${id}-${index}`} id={id} item={itemMap.get(id)} />
                    ))}
                  </div>
                </section>
              ) : null}
              {plan.build.situational.length ? (
                <section className="qp-build-section">
                  <h4>Adapta a la partida</h4>
                  {plan.build.situational.map((entry, index) => (
                    <div className="qp-situational" key={index}>
                      <Item id={entry.item} item={itemMap.get(entry.item)} />
                      <p>{entry.reason}</p>
                    </div>
                  ))}
                </section>
              ) : null}
              <section className="qp-build-section">
                <h4>Runas</h4>
                <div className="qp-items">
                  {plan.build.runes.map((rune, index) => (
                    <span className="qp-item" key={index}>
                      {rune}
                    </span>
                  ))}
                </div>
              </section>
              <section className="qp-build-section">
                <h4>Hechizos</h4>
                <p>{plan.build.summoners.join(" · ")}</p>
              </section>
              <section className="qp-build-section">
                <h4>Orden de habilidades</h4>
                <p>{plan.build.skillOrder}</p>
              </section>
            </div>
          </details>
          <details className="qp-detail">
            <summary>
              <Flag size={16} />
              <span>Mapa y errores a evitar</span>
              <ChevronDown size={15} className="qp-chevron" />
            </summary>
            <div className="qp-detail-content">
              <ul className="qp-tips">
                {plan.macro.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
              <h4 className="qp-risk-heading">
                <ShieldAlert size={15} />
                Evita estas decisiones
              </h4>
              <ul className="qp-tips">
                {plan.avoid.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          </details>
        </div>
        {sourceLinks.length ? (
          <div className="qp-sources">
            <p>Fuentes del plan</p>
            {sourceLinks.map((source, index) => (
              <a
                className="qp-source"
                key={index}
                href={safeUrl(source.url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.title}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <form
        className="qp-followup"
        onSubmit={(event) => {
          event.preventDefault();
          if (followup.trim() && !busy && onFollowup(followup.trim())) setFollowup("");
        }}
      >
        <label htmlFor={followupId}>¿Algo cambia en tu partida?</label>
        <div className="qp-followup-row">
          <input
            id={followupId}
            aria-describedby={helpId}
            value={followup}
            onChange={(event) => setFollowup(event.target.value)}
            placeholder="¿Y si me campean?"
            maxLength={1000}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={!followup.trim() || busy}
            aria-label="Actualizar el plan con este contexto"
          >
            <span>Preguntar</span>
            <ArrowUp size={16} />
          </button>
        </div>
        <p className="qp-followup-help" id={helpId}>
          Cada pregunta genera un nuevo análisis.
        </p>
      </form>
    </section>
  );
}
