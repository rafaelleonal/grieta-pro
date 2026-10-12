/** POST JSON con clave de idempotencia; mensajes de error seguros para mostrar. */
export async function postJson<T>(
  path: string,
  body: unknown,
  signal: AbortSignal,
  idempotencyKey = crypto.randomUUID(),
): Promise<T> {
  if (!navigator.onLine)
    throw new Error(
      "Sin conexión. Conecta internet y vuelve a solicitar el análisis cuando estés listo.",
    );
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
    signal,
    redirect: "error",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : "No pudimos completar la solicitud. Intenta de nuevo.",
    );
  if (!data) throw new Error("El servidor devolvió una respuesta vacía. Intenta de nuevo.");
  return data as T;
}
