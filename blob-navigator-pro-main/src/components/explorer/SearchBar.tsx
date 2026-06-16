import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useExplorer } from "@/store/explorer";

function friendlyTypeName(type: string) {
  const map: Record<string, string> = {
    "folder": "Folder",

    "application/pdf": "PDF",

    "application/zip": "ZIP",

    "application/msword": "Word",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "Excel",
  };

  if (map[type]) {
    return map[type];
  }

  if (type.startsWith("image/")) {
    return type
      .replace("image/", "")
      .toUpperCase();
  }

  return type;
}

export function SearchBar() {
  const query = useExplorer(
    (s) => s.searchQuery,
  );

  const setQuery = useExplorer(
    (s) => s.setSearchQuery,
  );

  const contentType = useExplorer(
    (s) => s.contentType,
  );

  const setContentType = useExplorer(
    (s) => s.setContentType,
  );

  const availableTypes = useExplorer(
    (s) => s.availableTypes,
  );

  const prefix = useExplorer(
    (s) => s.prefix,
  );

  const [local, setLocal] =
    useState(query);

  useEffect(() => {
    setLocal(query);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== query) {
        setQuery(local);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [
    local,
    query,
    setQuery,
  ]);

  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          value={local}
          onChange={(e) =>
            setLocal(e.target.value)
          }
          placeholder={`Search recursively in ${prefix || "container root"
            }…`}
          className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-8 text-sm outline-none ring-ring/20 transition focus:border-ring focus:ring-2"
        />

        {local && (
          <button
            onClick={() => setLocal("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <select
        value={contentType}
        onChange={(e) =>
          setContentType(
            e.target.value,
          )
        }
        className="h-9 rounded-md border border-input bg-card px-2 text-sm outline-none"
      >
        <option value="">
          All Types
        </option>

        {availableTypes.map(
          (type) => (
            <option
              key={type}
              value={type}
            >
              {friendlyTypeName(
                type,
              )}
            </option>
          ),
        )}
      </select>
    </div>
  );
}