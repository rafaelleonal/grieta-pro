import { getCatalog } from "@/lib/catalog";

export async function GET() {
  const catalog = await getCatalog();
  return Response.json(catalog, {
    headers: {
      "Cache-Control":
        catalog.source === "live" ? "public, max-age=300, stale-while-revalidate=600" : "no-store",
    },
  });
}
