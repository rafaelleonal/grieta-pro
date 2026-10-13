import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, History, Layers, Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { LegalLinks } from "@/components/legal-links";
import { RiotNotice } from "@/components/riot-notice";
import { Alert } from "@/components/ui/feedback";

const BENEFITS = [
  [Layers, "Consejos breves para tus niveles 1–6"],
  [History, "Tus sesiones guardadas en tu cuenta"],
  [Lock, "Sin guardar tus capturas originales"],
] as const;

/** Acceso: marca a la izquierda y panel de cuenta a la derecha; una columna en móvil. */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-bg text-text lg:grid-cols-2">
      <aside className="flex flex-col gap-6 border-b border-divider bg-surface/40 px-4 py-6 md:px-10 lg:border-r lg:border-b-0 lg:px-16 lg:py-14">
        <Link href="/" aria-label="Elociencia, inicio" className="self-start">
          <BrandLogo size={40} />
        </Link>
        <div className="hidden flex-col gap-4 lg:mt-auto lg:flex">
          <span className="text-overline font-medium uppercase text-accent-300">
            — Prepara. Entiende. Mejora.
          </span>
          <p className="max-w-lg text-display font-medium">Entra a tu partida con un plan.</p>
          <ul className="flex flex-col gap-3">
            {BENEFITS.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-body text-neutral-200">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-md bg-accent-900 text-accent-200"
                >
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden text-xs text-neutral-400 lg:block">
          <RiotNotice />
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center gap-5 px-4 py-8 md:px-10">
        <section
          aria-labelledby="auth-title"
          className="flex w-full max-w-md flex-col gap-5 rounded-lg bg-surface p-5 md:p-7"
        >
          <header className="flex flex-col gap-1">
            <h1 id="auth-title" className="text-h1 font-medium">
              {title}
            </h1>
            {description ? <p className="text-small text-neutral-400">{description}</p> : null}
          </header>
          {children}
        </section>
        <div className="flex w-full max-w-md flex-col items-center gap-2 text-center text-xs text-neutral-400">
          <LegalLinks openInNewTab />
          <div className="lg:hidden">
            <RiotNotice />
          </div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 text-small text-accent-300 hover:text-accent-200"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Volver al coach
          </Link>
        </div>
      </main>
    </div>
  );
}

export function Feedback({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error ? (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
    </>
  );
}
