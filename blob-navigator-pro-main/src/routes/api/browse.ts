import { createFileRoute } from "@tanstack/react-router";
import { browse } from "@/lib/azure.server";

export const Route = createFileRoute("/api/browse")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const container = url.searchParams.get("container") ?? "";
        const prefix = url.searchParams.get("prefix") ?? "";
        const token = url.searchParams.get("continuationToken") ?? undefined;
        if (!container) {
          return Response.json(
            { error: "container is required" },
            { status: 400 },
          );
        }
        if (prefix && prefix.length > 0 && !prefix.endsWith("/")) {
          return Response.json(
            { error: "prefix must end with /" },
            { status: 400 },
          );
        }
        try {
          const result = await browse(container, prefix, token);
          return Response.json(result);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
