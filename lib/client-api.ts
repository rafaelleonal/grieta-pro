/** POST JSON con mensajes de error seguros para mostrar. */
export async function postJson<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  if (!navigator.onLine) throw new Error("Sin conexión. Conéctate y vuelve a intentarlo.");
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    redirect: "error",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "No pudimos completar la solicitud. Intenta de nuevo.",
    );
  if (!data) throw new Error("El servidor devolvió una respuesta vacía. Intenta de nuevo.");
  return data as T;
}
