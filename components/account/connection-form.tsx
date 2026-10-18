"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { modelLabel } from "@/lib/model-labels";
import type { AccountStatus } from "@/lib/auth-client";
import type { AppStatus, Credentials } from "@/lib/types";

/**
 * Clave personal de OpenRouter y modelo. La clave vive sólo en memoria de esta pestaña:
 * no se guarda ni se registra, y no evita la cuenta, la cuota ni la concurrencia.
 */
export function ConnectionForm({
  credentials,
  status,
  account,
  onSave,
  onDone,
}: {
  credentials: Credentials;
  status: AppStatus | null;
  account: AccountStatus | null;
  onSave: (value: Credentials) => void;
  onDone?: () => void;
}) {
  const [draft, setDraft] = useState<Credentials>(credentials);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const models = account?.usage?.allowedModels || [];
  const defaultModel = account?.usage?.defaultModel || status?.defaultModel;
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      apiKey: draft.apiKey?.trim() || undefined,
      model: models.includes(draft.model || "") ? draft.model : undefined,
    });
    setSaved(true);
    onDone?.();
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="api-key"
        label={`Clave de OpenRouter${status?.configured ? " · opcional" : ""}`}
        help={
          <>
            Crea una clave en{" "}
            <a
              href="https://openrouter.ai/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-accent-300 underline underline-offset-2"
            >
              OpenRouter
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
            . Cada análisis puede consumir crédito de OpenRouter.
          </>
        }
      >
        <div className="flex gap-2">
          <Input
            id="api-key"
            type={visible ? "text" : "password"}
            value={draft.apiKey || ""}
            onChange={(event) => {
              setDraft({ ...draft, apiKey: event.target.value });
              setSaved(false);
            }}
            placeholder={status?.configured ? "Usar la clave de la app" : "sk-or-v1-..."}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="api-key-help"
          />
          <Button
            variant="icon"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
            className="rounded-md"
          >
            {visible ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </Button>
        </div>
      </Field>
      <Field id="model" label="Modelo" help="Modelos incluidos en tu plan.">
        <Select
          id="model"
          value={models.includes(draft.model || "") ? draft.model : ""}
          onChange={(event) => {
            setDraft({ ...draft, model: event.target.value || undefined });
            setSaved(false);
          }}
          aria-describedby="model-help"
        >
          <option value="">
            {defaultModel
              ? `${modelLabel(defaultModel)} · predeterminado`
              : "Predeterminado de la app"}
          </option>
          {models.map((model) => (
            <option key={model} value={model} title={model}>
              {modelLabel(model)}
            </option>
          ))}
        </Select>
      </Field>
      <p className="flex items-start gap-2 text-xs text-neutral-400">
        <Shield size={14} aria-hidden="true" className="mt-0.5 flex-none" />
        Tu clave sólo vive en esta pestaña: no se almacena ni se registra. Siguen aplicando las
        cuotas y el límite de consultas simultáneas.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          <Check size={16} aria-hidden="true" />
          Guardar
        </Button>
        {credentials.apiKey ? (
          <Button
            onClick={() => {
              setDraft({ ...draft, apiKey: undefined });
              onSave({ ...credentials, apiKey: undefined });
            }}
          >
            Quitar clave
          </Button>
        ) : null}
        {saved ? (
          <span role="status" className="inline-flex items-center text-small text-success-text">
            Guardado
          </span>
        ) : null}
      </div>
    </form>
  );
}
