import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import { api, formatDate, formatSize, type Entry } from "@/lib/api";
import { useExplorer } from "@/store/explorer";
import * as Checkbox from "@radix-ui/react-checkbox";
import {
  File,
  FileImage,
  FileText,
  Folder,
  Loader2,
  Check,
} from "lucide-react";


function iconFor(entry: Entry) {
  if (entry.kind === "folder") return <Folder className="size-4 text-primary" />;
  const ct = entry.contentType ?? "";
  if (ct.startsWith("image/")) return <FileImage className="size-4 text-muted-foreground" />;
  if (ct.startsWith("text/") || ct.includes("json") || ct.includes("xml"))
    return <FileText className="size-4 text-muted-foreground" />;
  return <File className="size-4 text-muted-foreground" />;
}

export function FileList() {
  const container = useExplorer((s) => s.container);
  const prefix = useExplorer((s) => s.prefix);
  const query = useExplorer((s) => s.searchQuery);

  const setAvailableTypes = useExplorer(
    (s) => s.setAvailableTypes,
  );

  const contentType = useExplorer(
    (s) => s.contentType,
  );

  const setPrefix = useExplorer((s) => s.setPrefix);

  const setSearchQuery =
    useExplorer(
      (s) => s.setSearchQuery,
    );

  const selected = useExplorer((s) => s.selected);

  const toggleSelected = useExplorer(
    (s) => s.toggleSelected,
  );

  const isSelected = useExplorer(
    (s) => s.isSelected,
  );

  const clearSelected = useExplorer(
    (s) => s.clearSelected,
  );

  const isSearching =
    query.trim().length > 0;

  const browseQ = useInfiniteQuery({
    enabled: !!container && !isSearching,
    queryKey: ["browse", container, prefix],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.browse(container!, prefix, pageParam),
    getNextPageParam: (last) => last.continuationToken,
    staleTime: 30_000,
  });

  const searchQ = useInfiniteQuery({
    enabled: !!container && isSearching,

    queryKey: [
      "search",
      container,
      prefix,
      query,
      contentType,
    ],

    initialPageParam:
      undefined as string | undefined,

    queryFn: ({ pageParam }) =>
      api.search(
        container!,
        prefix,
        query,
        pageParam,
        {
          contentType,
        },
      ),

    getNextPageParam: (last) =>
      last.continuationToken,

    staleTime: 15_000,
  });

  const active = isSearching ? searchQ : browseQ;

  const entries: Entry[] = useMemo(() => {
    if (!active.data) return [];

    let data: Entry[] = [];

    if (isSearching) {
      data = active.data.pages.flatMap(
        (p) =>
          (p as { results: Entry[] }).results,
      );
    } else {
      data = active.data.pages.flatMap(
        (p) =>
          (p as { entries: Entry[] }).entries,
      );
    }

    // Local type filtering for current folder
    if (contentType) {
      data = data.filter((e) => {
        // Folder filter
        if (contentType === "folder") {
          return e.kind === "folder";
        }

        // Non-folder filters
        if (e.kind !== "blob") {
          return false;
        }

        const ct =
          e.contentType || "";

        if (
          contentType.endsWith("/*")
        ) {
          const prefix =
            contentType.replace(
              "/*",
              "",
            );

          return ct.startsWith(
            prefix + "/",
          );
        }

        return ct === contentType;
      });
    }

    return data;
  }, [
    active.data,
    isSearching,
    contentType,
  ]);

  useEffect(() => {
    const types = Array.from(
      new Set([
        ...entries
          .filter((e) => e.kind === "blob")
          .map((e) => e.contentType || "")
          .filter(Boolean),

        // include folders
        ...(entries.some(
          (e) => e.kind === "folder",
        )
          ? ["folder"]
          : []),
      ]),
    ).sort();

    setAvailableTypes(types);
  }, [entries, setAvailableTypes]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: entries.length + (active.hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  // Infinite scroll: when the last virtual item is the sentinel, fetch next.
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    const last = items[items.length - 1];
    if (!last) return;
    if (
      last.index >= entries.length &&
      active.hasNextPage &&
      !active.isFetchingNextPage
    ) {
      active.fetchNextPage();
    }
  }, [virtualizer.getVirtualItems(), entries.length, active]);

  if (!container) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a container to start browsing
      </div>
    );
  }

  if (active.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (active.error) {
    return (
      <div className="m-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {(active.error as Error).message}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {isSearching ? "No matches found" : "This folder is empty"}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-[44px_1fr_140px_180px_120px] gap-4 border-b border-border bg-muted/50 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <div />

        <div>Name</div>
        <div>Size</div>
        <div>Modified</div>
        <div>Type</div>
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {virtualizer.getVirtualItems().map((v) => {
            const isSentinel = v.index >= entries.length;
            const entry = entries[v.index];
            return (
              <div
                key={v.key}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${v.start}px)`, height: v.size }}
              >
                {isSentinel ? (
                  <div className="flex h-full items-center gap-2 px-4 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Loading more…
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => {
                      if (entry.kind === "folder") {
                        setPrefix(entry.path);

                        if (isSearching) {
                          setSearchQuery("");
                        }
                      }
                    }}
                    className="grid h-full w-full grid-cols-[44px_1fr_140px_180px_120px] items-center gap-4 border-b border-border/50 px-4 text-left text-sm transition-colors hover:bg-accent/60"
                  >
                    <div
                      className="flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();

                        toggleSelected({
                          kind: entry.kind,
                          path: entry.path,
                          name: entry.name,
                          container: container!,
                        });
                      }}
                    >
                      <Checkbox.Root
                        checked={isSelected(entry.path)}
                        className="flex h-4 w-4 items-center justify-center rounded border border-border bg-background"
                      >
                        <Checkbox.Indicator>
                          <Check className="size-3" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      {iconFor(entry)}
                      <span className="truncate" title={entry.path}>
                        {isSearching ? entry.path : entry.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.kind === "blob" ? formatSize(entry.size) : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.kind === "blob" ? formatDate(entry.lastModified) : "—"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {entry.kind === "folder"
                        ? "Folder"
                        : (entry.contentType ?? "file")}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {selected.length > 0 && (
        <div className="border-t border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selected.length} item(s) selected
            </div>

            <button
              onClick={async () => {
                const res = await fetch(
                  "/api/request-access",
                  {
                    method: "POST",
                    headers: {
                      "content-type":
                        "application/json",
                    },
                    body: JSON.stringify({
                      items: selected,
                    }),
                  },
                );

                if (res.ok) {
                  alert(
                    "Request submitted successfully",
                  );

                  clearSelected();
                } else {
                  alert(
                    "Failed to submit request",
                  );
                }
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
        <span>
          {entries.length} {isSearching ? "matches" : "items"}
          {active.hasNextPage ? " (more available)" : ""}
        </span>
        {active.isFetchingNextPage && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> fetching…
          </span>
        )}
      </div>
    </div>
  );
}
