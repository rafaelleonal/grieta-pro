import { getLegalOperator } from "@/lib/legal-operator";

export function LegalContact() {
  const operator = getLegalOperator();
  const rows = [
    ["Responsable", operator.name],
    [
      "Contacto de soporte y privacidad",
      operator.email ? (
        <a href={`mailto:${encodeURIComponent(operator.email)}`}>{operator.email}</a>
      ) : (
        "Pendiente de publicar"
      ),
    ],
    [
      operator.addressComplete
        ? "Domicilio de contacto"
        : "Ubicación (domicilio completo pendiente)",
      operator.address,
    ],
  ] as const;
  return (
    <dl className="mt-4 grid gap-3 rounded-control bg-bg p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-neutral-400">{label}</dt>
          <dd className="text-small text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
