import type { ReactNode } from "react";
import Link from "next/link";
import { LegalLinks } from "@/components/legal-links";
import { RiotNotice } from "@/components/riot-notice";
import { LEGAL_UPDATED_AT, LEGAL_UPDATED_LABEL } from "@/lib/legal-notice";
import { getLegalOperator } from "@/lib/legal-operator";
import "./legal.css";

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
    <main className="legal-page">
      <div className="legal-shell">
        <Link href="/" className="legal-back" prefetch={false}>
          ← Volver a Elociencia
        </Link>
        <article className="legal-document">
          <header className="legal-heading">
            <p className="legal-eyebrow">Elociencia · Información legal</p>
            <h1>{title}</h1>
            <p className="legal-intro">{intro}</p>
            <p className="legal-date">
              Última actualización: <time dateTime={LEGAL_UPDATED_AT}>{LEGAL_UPDATED_LABEL}</time>
            </p>
          </header>
          {!operator.complete ? (
            <aside className="legal-pending" aria-label="Documento en preparación">
              <strong>Documento en preparación</strong>
              <p>
                Faltan datos de identificación o contacto del responsable. Este documento debe
                completarse antes de publicar el servicio o presentar la solicitud de producción.
              </p>
            </aside>
          ) : null}
          {sections.length ? (
            <nav className="legal-index" aria-label="Contenido del documento">
              <p>En esta página</p>
              <ul>
                {sections.map(({ id, title: sectionTitle }) => (
                  <li key={id}>
                    <a href={`#${id}`}>{sectionTitle}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="legal-content">{children}</div>
        </article>
        <footer className="legal-footer">
          <LegalLinks />
          <RiotNotice />
        </footer>
      </div>
    </main>
  );
}
