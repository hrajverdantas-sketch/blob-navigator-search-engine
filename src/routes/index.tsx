import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/explorer/Breadcrumbs";
import { FileList } from "@/components/explorer/FileList";
import { SearchBar } from "@/components/explorer/SearchBar";
import { Sidebar } from "@/components/explorer/Sidebar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Azure Blob Explorer" },
      {
        name: "description",
        content:
          "Fast, lazy-loading explorer for Azure Blob Storage. Browse millions of blobs with virtualized rendering and recursive search.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <Breadcrumbs />
          <SearchBar />
        </header>
        <section className="min-h-0 flex-1">
          <FileList />
        </section>
      </main>
    </div>
  );
}
