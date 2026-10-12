import Link from "next/link";

export function LegalLinks({ openInNewTab = false }: { openInNewTab?: boolean }) {
  return (
    <nav className="legal-links" aria-label="Documentos legales">
      {[
        { href: "/terminos", label: "Términos de uso" },
        { href: "/privacidad", label: "Política de privacidad" },
      ].map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          aria-label={openInNewTab ? `${label} (abre otra pestaña)` : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
