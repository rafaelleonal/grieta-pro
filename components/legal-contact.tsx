import { getLegalOperator } from "@/lib/legal-operator";

export function LegalContact() {
  const operator = getLegalOperator();
  return (
    <dl className="legal-contact">
      <div>
        <dt>Responsable</dt>
        <dd>{operator.name}</dd>
      </div>
      <div>
        <dt>Contacto de soporte y privacidad</dt>
        <dd>
          {operator.email ? (
            <a href={`mailto:${encodeURIComponent(operator.email)}`}>{operator.email}</a>
          ) : (
            "Pendiente de publicar"
          )}
        </dd>
      </div>
      <div>
        <dt>
          {operator.addressComplete
            ? "Domicilio de contacto"
            : "Ubicación (domicilio completo pendiente)"}
        </dt>
        <dd>{operator.address}</dd>
      </div>
    </dl>
  );
}
