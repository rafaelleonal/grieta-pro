import Link from "next/link";

export function LegalLinks({ openInNewTab = false }: { openInNewTab?: boolean }) {
  return (
    <nav
      aria-label="Documentos legales"
      className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs"
    >
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
          className="inline-flex min-h-11 items-center text-accent-300 underline underline-offset-2 hover:text-accent-100"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
