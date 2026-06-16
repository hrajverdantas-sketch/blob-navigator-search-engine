import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Database, Folder, FolderOpen, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useExplorer } from "@/store/explorer";

export function Sidebar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["containers"],
    queryFn: api.containers,
    staleTime: 60_000,
  });

  const container = useExplorer((s) => s.container);
  const setContainer = useExplorer((s) => s.setContainer);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3">
        <Database className="size-4 text-primary" />
        <h1 className="text-sm font-semibold tracking-tight">Blob Explorer</h1>
      </div>
      <div className="px-3 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Containers
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div className="mx-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {(error as Error).message}
          </div>
        )}
        {data?.containers.map((c) => (
          <ContainerNode
            key={c.name}
            name={c.name}
            active={container === c.name}
            onSelect={() => setContainer(c.name)}
          />
        ))}
        {data && data.containers.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No containers found</div>
        )}
      </div>
    </aside>
  );
}

function ContainerNode({ name, active, onSelect }: { name: string; active: boolean; onSelect: () => void }) {
  const isExpanded = useExplorer((s) => s.isExpanded(name, ""));
  const toggleExpanded = useExplorer((s) => s.toggleExpanded);

  return (
    <div>
      <button
        onClick={() => {
          onSelect();
          if (!isExpanded) toggleExpanded(name, "");
        }}
        className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent ${
          active ? "bg-sidebar-accent font-medium" : ""
        }`}
      >
        <ChevronRight
          className={`size-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(name, "");
          }}
        />
        {isExpanded ? <FolderOpen className="size-4 text-primary" /> : <Folder className="size-4 text-primary" />}
        <span className="truncate">{name}</span>
      </button>
      {isExpanded && <FolderChildren container={name} prefix="" depth={1} />}
    </div>
  );
}

function FolderChildren({ container, prefix, depth }: { container: string; prefix: string; depth: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["browse", container, prefix, "sidebar"],
    queryFn: () => api.browse(container, prefix),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 py-1 text-xs text-muted-foreground" style={{ paddingLeft: 12 + depth * 14 }}>
        <Loader2 className="size-3 animate-spin" /> Loading…
      </div>
    );
  }

  const folders = data?.entries.filter((e) => e.kind === "folder") ?? [];
  if (folders.length === 0) return null;

  return (
    <div>
      {folders.map((f) => (
        <FolderNode key={f.path} container={container} path={f.path} name={f.name} depth={depth} />
      ))}
    </div>
  );
}

function FolderNode({ container, path, name, depth }: { container: string; path: string; name: string; depth: number }) {
  const expanded = useExplorer((s) => s.isExpanded(container, path));
  const toggleExpanded = useExplorer((s) => s.toggleExpanded);
  const setContainer = useExplorer((s) => s.setContainer);
  const setPrefix = useExplorer((s) => s.setPrefix);
  const activePrefix = useExplorer((s) => s.prefix);
  const activeContainer = useExplorer((s) => s.container);
  const active = activeContainer === container && activePrefix === path;

  return (
    <div>
      <button
        onClick={() => {
          if (activeContainer !== container) setContainer(container);
          setPrefix(path);
          if (!expanded) toggleExpanded(container, path);
        }}
        className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-sidebar-accent ${
          active ? "bg-sidebar-accent font-medium" : ""
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(container, path);
          }}
        />
        {expanded ? <FolderOpen className="size-4 shrink-0 text-primary/80" /> : <Folder className="size-4 shrink-0 text-primary/80" />}
        <span className="truncate">{name}</span>
      </button>
      {expanded && <FolderChildren container={container} prefix={path} depth={depth + 1} />}
    </div>
  );
}
