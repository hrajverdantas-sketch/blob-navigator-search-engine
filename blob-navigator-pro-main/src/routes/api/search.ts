import { createFileRoute } from "@tanstack/react-router";
import { search, type SearchOptions } from "@/lib/azure.server";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const container = url.searchParams.get("container") ?? "";
        const prefix = url.searchParams.get("prefix") ?? "";
        const q = url.searchParams.get("q") ?? "";
        const token = url.searchParams.get("continuationToken") ?? undefined;
        const opts: SearchOptions = {
          minSize: numParam(url, "minSize"),
          maxSize: numParam(url, "maxSize"),
          contentType: url.searchParams.get("contentType") ?? undefined,
          modifiedAfter: url.searchParams.get("modifiedAfter") ?? undefined,
          modifiedBefore: url.searchParams.get("modifiedBefore") ?? undefined,
        };
        if (!container) {
          return Response.json(
            { error: "container is required" },
            { status: 400 },
          );
        }
        try {
          const result = await search(container, prefix, q, token, opts);
          return Response.json(result);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

function numParam(url: URL, key: string): number | undefined {
  const v = url.searchParams.get(key);
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
