import { createFileRoute } from "@tanstack/react-router";
import { listContainers } from "@/lib/azure.server";

export const Route = createFileRoute("/api/containers")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const allContainers = await listContainers();

          const allowed =
            process.env.VISIBLE_CONTAINERS
              ?.split(",")
              .map((x) => x.trim())
              .filter(Boolean);

          const containers =
            allowed && allowed.length > 0
              ? allContainers.filter((c) =>
                allowed.includes(c.name),
              )
              : allContainers;

          return Response.json(
            { containers },
            {
              headers: {
                "cache-control": "private, max-age=30",
              },
            },
          );
        } catch (e) {
          const msg =
            e instanceof Error
              ? e.message
              : "Unknown error";

          return Response.json(
            { error: msg },
            { status: 500 },
          );
        }
      },
    },
  },
});