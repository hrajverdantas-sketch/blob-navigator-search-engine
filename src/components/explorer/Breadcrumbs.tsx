import { ChevronRight, Home } from "lucide-react";
import { useExplorer } from "@/store/explorer";

export function Breadcrumbs() {
  const container = useExplorer((s) => s.container);
  const prefix = useExplorer((s) => s.prefix);
  const setPrefix = useExplorer((s) => s.setPrefix);

  if (!container) return null;
  const parts = prefix ? prefix.replace(/\/$/, "").split("/") : [];

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <button
        onClick={() => setPrefix("")}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-accent"
      >
        <Home className="size-3.5" />
        {container}
      </button>
      {parts.map((part, i) => {
        const next = parts.slice(0, i + 1).join("/") + "/";
        const isLast = i === parts.length - 1;
        return (
          <span key={next} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            <button
              onClick={() => setPrefix(next)}
              className={`rounded px-1.5 py-0.5 hover:bg-accent ${isLast ? "font-medium text-foreground" : ""}`}
            >
              {part}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
