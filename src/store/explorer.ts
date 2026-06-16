import { create } from "zustand";

export interface SelectedItem {
  kind: "folder" | "blob";
  path: string;
  name: string;
  container: string;
}

interface ExplorerState {
  container: string | null;

  prefix: string;

  searchQuery: string;

  contentType: string;

  availableTypes: string[];

  expanded: Set<string>;

  selected: SelectedItem[];

  setContainer: (
    name: string | null,
  ) => void;

  setPrefix: (
    prefix: string,
  ) => void;

  setSearchQuery: (
    q: string,
  ) => void;

  setContentType: (
    type: string,
  ) => void;

  setAvailableTypes: (
    types: string[],
  ) => void;

  toggleExpanded: (
    container: string,
    prefix: string,
  ) => void;

  isExpanded: (
    container: string,
    prefix: string,
  ) => boolean;

  toggleSelected: (
    item: SelectedItem,
  ) => void;

  clearSelected: () => void;

  isSelected: (
    path: string,
  ) => boolean;
}

export const useExplorer =
  create<ExplorerState>((set, get) => ({
    container: null,

    prefix: "",

    searchQuery: "",

    contentType: "",

    availableTypes: [],

    expanded: new Set(),

    selected: [],

    setContainer: (name) =>
      set({
        container: name,
        prefix: "",
        searchQuery: "",
        contentType: "",
      }),

    setPrefix: (prefix) =>
      set({
        prefix,
      }),

    setSearchQuery: (q) =>
      set({
        searchQuery: q,
      }),

    setContentType: (type) =>
      set({
        contentType: type,
      }),

    setAvailableTypes: (types) =>
      set({
        availableTypes: types,
      }),

    toggleExpanded: (
      container,
      prefix,
    ) => {
      const key =
        `${container}::${prefix}`;

      const next = new Set(
        get().expanded,
      );

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      set({
        expanded: next,
      });
    },

    isExpanded: (
      container,
      prefix,
    ) =>
      get().expanded.has(
        `${container}::${prefix}`,
      ),

    toggleSelected: (item) => {
      const current =
        get().selected;

      const exists = current.some(
        (x) => x.path === item.path,
      );

      if (exists) {
        set({
          selected: current.filter(
            (x) => x.path !== item.path,
          ),
        });
      } else {
        set({
          selected: [...current, item],
        });
      }
    },

    clearSelected: () =>
      set({
        selected: [],
      }),

    isSelected: (path) =>
      get().selected.some(
        (x) => x.path === path,
      ),
  }));