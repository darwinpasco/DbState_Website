import type { CollectionEntry } from "astro:content";

export type DocsEntry = CollectionEntry<"docs">;

export type DocsNavigationGroup = {
  section: string;
  entries: DocsEntry[];
};

export const docsSectionOrder = [
  "Start here",
  "Schema workflows",
  "Reference data",
  "Release preparation",
  "Trust and scope",
] as const;

const sectionRank = new Map<string, number>(
  docsSectionOrder.map((section, index) => [section, index]),
);

export function getDocsSlug(entry: DocsEntry) {
  return entry.id.replace(/\/index$/, "");
}

export function getDocsUrl(entry: DocsEntry) {
  return `/docs/${getDocsSlug(entry)}/`;
}

export function getPublishedDocs(entries: DocsEntry[]) {
  return entries
    .filter((entry) => !entry.data.draft)
    .sort((left, right) => {
      const leftRank =
        sectionRank.get(left.data.section) ?? Number.MAX_SAFE_INTEGER;
      const rightRank =
        sectionRank.get(right.data.section) ?? Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (left.data.order !== right.data.order) {
        return left.data.order - right.data.order;
      }

      return left.data.title.localeCompare(right.data.title);
    });
}

export function groupDocsBySection(
  entries: DocsEntry[],
): DocsNavigationGroup[] {
  const groups = new Map<string, DocsEntry[]>();

  for (const entry of getPublishedDocs(entries)) {
    const group = groups.get(entry.data.section) ?? [];
    group.push(entry);
    groups.set(entry.data.section, group);
  }

  return Array.from(groups, ([section, groupedEntries]) => ({
    section,
    entries: groupedEntries,
  }));
}

export function getDocsPager(entries: DocsEntry[], currentEntry: DocsEntry) {
  const orderedEntries = getPublishedDocs(entries);
  const currentIndex = orderedEntries.findIndex(
    (entry) => entry.id === currentEntry.id,
  );

  return {
    previous: currentIndex > 0 ? orderedEntries[currentIndex - 1] : undefined,
    next:
      currentIndex >= 0 && currentIndex < orderedEntries.length - 1
        ? orderedEntries[currentIndex + 1]
        : undefined,
  };
}
