import { getCatalog, getChampionDetails } from "@/lib/catalog";

/** Public Riot data for one champion: ability names, text, base cooldowns and icons. */
export async function GET(_request: Request, context: RouteContext<"/api/catalog/champion/[id]">) {
  const { id } = await context.params;
  const catalog = await getCatalog();
  // getChampionDetails validates the ID against the catalog and the live version.
  const details = await getChampionDetails(id, catalog);
  if (!details)
    return Response.json(
      { error: "No encontramos las habilidades de ese campeón." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    { version: catalog.version, id, ...details },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
