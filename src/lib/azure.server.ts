// Server-only Azure Blob client. Never import from client code.
import {
  BlobServiceClient,
  type ContainerClient,
} from "@azure/storage-blob";

let _service: BlobServiceClient | null =
  null;

export function getBlobService(): BlobServiceClient {
  if (_service) return _service;

  const conn =
    process.env
      .AZURE_STORAGE_CONNECTION_STRING;

  if (!conn) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is not set",
    );
  }

  _service =
    BlobServiceClient.fromConnectionString(
      conn,
    );

  return _service;
}

export function getContainer(
  name: string,
): ContainerClient {
  if (
    !name ||
    !/^[a-z0-9][a-z0-9-]{1,62}$/.test(
      name,
    )
  ) {
    throw new Error(
      "Invalid container name",
    );
  }

  return getBlobService().getContainerClient(
    name,
  );
}

export type BrowseEntry =
  | {
    kind: "folder";
    name: string;
    path: string;
  }
  | {
    kind: "blob";
    name: string;
    path: string;
    size: number;
    contentType?: string;
    lastModified?: string;
  };

export interface BrowseResult {
  entries: BrowseEntry[];
  continuationToken?: string;
}

function lastSegment(
  path: string,
  isFolder: boolean,
): string {
  const trimmed = isFolder
    ? path.replace(/\/$/, "")
    : path;

  const idx =
    trimmed.lastIndexOf("/");

  return idx >= 0
    ? trimmed.slice(idx + 1)
    : trimmed;
}

const PAGE_SIZE = 200;

export async function listContainers(): Promise<
  { name: string }[]
> {
  const svc = getBlobService();

  const out: { name: string }[] =
    [];

  for await (const c of svc.listContainers()) {
    out.push({
      name: c.name,
    });
  }

  out.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return out;
}

export async function browse(
  container: string,
  prefix: string,
  continuationToken?: string,
): Promise<BrowseResult> {
  const client =
    getContainer(container);

  const iter = client
    .listBlobsByHierarchy("/", {
      prefix,
    })
    .byPage({
      maxPageSize: PAGE_SIZE,
      continuationToken,
    });

  const page =
    (await iter.next()).value;

  if (!page) {
    return {
      entries: [],
    };
  }

  const entries: BrowseEntry[] =
    [];

  for (
    const p of page.segment
      .blobPrefixes ?? []
  ) {
    entries.push({
      kind: "folder",
      name: lastSegment(
        p.name,
        true,
      ),
      path: p.name,
    });
  }

  for (
    const b of page.segment
      .blobItems ?? []
  ) {
    entries.push({
      kind: "blob",
      name: lastSegment(
        b.name,
        false,
      ),
      path: b.name,
      size:
        b.properties
          .contentLength ?? 0,
      contentType:
        b.properties.contentType,
      lastModified:
        b.properties.lastModified?.toISOString(),
    });
  }

  return {
    entries,
    continuationToken:
      page.continuationToken ||
      undefined,
  };
}

export interface SearchOptions {
  minSize?: number;
  maxSize?: number;
  contentType?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

interface AzureSearchDoc {
  id: string;
  Name: string;
  Content_Length: number;
  Content_Type?: string;
  LastModified?: string;
  ETag?: string;
}

interface AzureSearchResponse {
  "@odata.count"?: number;
  value: AzureSearchDoc[];
}

function getIndexName(
  container: string,
): string {
  return `${container}-ngram`;
}

export async function search(
  container: string,
  prefix: string,
  query: string,
  continuationToken?: string,
  opts?: SearchOptions,
  maxResults = 500,
) {
  const endpoint =
    process.env
      .AZURE_SEARCH_ENDPOINT;

  const apiKey =
    process.env
      .AZURE_SEARCH_API_KEY;

  if (!endpoint) {
    throw new Error(
      "AZURE_SEARCH_ENDPOINT is not set",
    );
  }

  if (!apiKey) {
    throw new Error(
      "AZURE_SEARCH_API_KEY is not set",
    );
  }

  const index =
    getIndexName(container);

  const skip = continuationToken
    ? Number(
      continuationToken,
    )
    : 0;

  const body = {
    search: query || "*",
    count: true,
    top: maxResults,
    skip,
  };

  const response =
    await fetch(
      `${endpoint}/indexes/${index}/docs/search?api-version=2024-07-01`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(
          body,
        ),
      },
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Azure Search failed (${response.status}): ${errorText}`,
    );
  }

  const data =
    (await response.json()) as AzureSearchResponse;

  const folders: BrowseEntry[] = [];
  const files: BrowseEntry[] = [];

  const addedFolders = new Set<string>();

  const searchTerm =
    query.trim().toLowerCase();

  for (const doc of data.value) {

    const relativePath =
      doc.Name.startsWith(
        `${container}/`
      )
        ? doc.Name.substring(
          container.length + 1
        )
        : doc.Name;

    const parts =
      relativePath.split("/");

    //
    // Find matching folders
    //
    for (
      let i = 0;
      i < parts.length - 1;
      i++
    ) {

      const folderName =
        parts[i];

      const folderPath =
        parts
          .slice(0, i + 1)
          .join("/") + "/";

      if (
        searchTerm &&
        folderName
          .toLowerCase()
          .includes(searchTerm) &&
        !addedFolders.has(
          folderPath
        )
      ) {

        addedFolders.add(
          folderPath
        );

        folders.push({
          kind: "folder",
          name: folderName,
          path: folderPath,
        });
      }
    }

    //
    // File result
    //
    files.push({
      kind: "blob",
      name:
        parts[
        parts.length - 1
        ] ?? "",
      path: relativePath,
      size:
        doc.Content_Length ?? 0,
      contentType:
        doc.Content_Type,
      lastModified:
        doc.LastModified,
    });
  }

  const results = [
    ...folders,
    ...files,
  ];

  const nextSkip =
    data.value.length ===
      maxResults
      ? String(
        skip + maxResults
      )
      : undefined;

  return {
    results,
    continuationToken:
      nextSkip,
    scanned:
      data["@odata.count"] ??
      results.length,
  };
}