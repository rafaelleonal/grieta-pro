/** Une clases condicionales; los valores falsos se descartan. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
