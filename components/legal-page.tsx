import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { LegalLinks } from "@/components/legal-links";
import { RiotNotice } from "@/components/riot-notice";
import { Alert } from "@/components/ui/feedback";
import { LEGAL_UPDATED_AT, LEGAL_UPDATED_LABEL } from "@/lib/legal-notice";
import { getLegalOperator } from "@/lib/legal-operator";

/** Tipografía del documento: columna de lectura de ~62 caracteres y enlaces en acento 300. */
const DOCUMENT =
  "max-w-[62ch] text-body text-neutral-200 [&_a]:text-accent-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-200 [&_h2]:mt-10 [&_h2]:scroll-mt-6 [&_h2]:text-h2 [&_h2]:font-medium [&_h2]:text-text [&_h3]:mt-6 [&_h3]:text-h3 [&_h3]:font-medium [&_h3]:text-text [&_li]:mt-1.5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-text [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5";

export function LegalPage({
  title,
  intro,
  sections = [],
  children,
}: {
  title: string;
  intro: string;
  sections?: { id: string; title: string }[];
  children: ReactNode;
}) {
  const operator = getLegalOperator();
  return (
    <main className="min-h-dvh bg-bg px-4 py-6 text-text md:px-10 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" aria-label="Elociencia, inicio" prefetch={false}>
            <BrandLogo size={32} />
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-1.5 text-small text-accent-300 hover:text-accent-200"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Volver a Elociencia
          </Link>
        </div>
        <article className="flex flex-col gap-6 rounded-lg bg-surface p-5 md:p-9">
          <header className="flex flex-col gap-2">
            <p className="text-overline font-medium uppercase text-neutral-500">
              Información legal · actualizado{" "}
              <time dateTime={LEGAL_UPDATED_AT}>{LEGAL_UPDATED_LABEL}</time>
            </p>
            <h1 className="text-h1 font-medium md:text-display">{title}</h1>
            <p className="max-w-[62ch] text-body text-neutral-300">{intro}</p>
          </header>
          {!operator.complete ? (
            <Alert tone="warning" title="Documento en preparación">
              Faltan datos de identificación o contacto del responsable. Este documento debe
              completarse antes de publicar el servicio o presentar la solicitud de producción.
            </Alert>
          ) : null}
          {sections.length ? (
            <nav aria-label="Contenido del documento" className="flex flex-col gap-2">
              <p className="text-overline font-medium uppercase text-neutral-500">En esta página</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {sections.map(({ id, title: sectionTitle }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="inline-flex min-h-11 items-center text-small text-accent-300 underline underline-offset-2 hover:text-accent-200"
                    >
                      {sectionTitle}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className={DOCUMENT}>{children}</div>
        </article>
        <footer className="flex flex-col items-center gap-3 text-center">
          <LegalLinks />
          <RiotNotice />
        </footer>
      </div>
    </main>
  );
}
