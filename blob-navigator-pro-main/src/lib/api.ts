export type Entry =
  | { kind: "folder"; name: string; path: string }
  | {
      kind: "blob";
      name: string;
      path: string;
      size: number;
      contentType?: string;
      lastModified?: string;
    };

export interface BrowseResult {
  entries: Entry[];
  continuationToken?: string;
}

export interface SearchResult {
  results: Entry[];
  continuationToken?: string;
  scanned: number;
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body?.error || `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  containers: () =>
    getJson<{ containers: { name: string }[] }>("/api/containers"),
  browse: (container: string, prefix: string, token?: string) => {
    const u = new URLSearchParams({ container, prefix });
    if (token) u.set("continuationToken", token);
    return getJson<BrowseResult>(`/api/browse?${u}`);
  },
  search: (
    container: string,
    prefix: string,
    q: string,
    token?: string,
    filters?: {
      minSize?: number;
      maxSize?: number;
      contentType?: string;
      modifiedAfter?: string;
      modifiedBefore?: string;
    },
  ) => {
    const u = new URLSearchParams({ container, prefix, q });
    if (token) u.set("continuationToken", token);
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v != null && v !== "") u.set(k, String(v));
      }
    }
    return getJson<SearchResult>(`/api/search?${u}`);
  },
};

export function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}
