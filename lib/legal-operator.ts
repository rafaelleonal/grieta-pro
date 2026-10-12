// Public contact details, read only by the legal Server Components.
// Never infer them from the authentication sender or private credentials.
export function getLegalOperator() {
  const name = process.env.LEGAL_OPERATOR_NAME?.trim() || "Rafael de Jesús León Alfaro";
  const candidateEmail = process.env.LEGAL_CONTACT_EMAIL?.trim();
  const email =
    candidateEmail && /^[^\s@<>?#]+@[^\s@<>?#]+\.[^\s@<>?#]+$/.test(candidateEmail)
      ? candidateEmail
      : undefined;
  const configuredAddress = process.env.LEGAL_CONTACT_ADDRESS?.trim();
  const address = configuredAddress || "Comitán, Chiapas";
  return {
    name,
    email,
    address,
    addressComplete: Boolean(configuredAddress),
    complete: Boolean(name && email && configuredAddress),
  };
}
