export type PageItem = number | "…";

/**
 * Builds the items of a windowed pagination bar, e.g. `1 … 9 10 11 … 25`.
 *
 * The first page, the last page and the pages next to the current one are
 * always shown. A gap of exactly one page is filled with that page number
 * instead of "…", so `1 … 3` never appears.
 * @param currentPage - The page being viewed (1-based).
 * @param totalPages - Number of pages. 0 when there are no rows.
 * @returns Page numbers in ascending order, with "…" where pages are skipped.
 *   Empty when `totalPages` is 0.
 * @example
 * getPageItems(10, 25); // [1, "…", 9, 10, 11, "…", 25]
 */
export function getPageItems(
  currentPage: number,
  totalPages: number,
): PageItem[] {
  const candidates = [
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ];
  const pages = [
    ...new Set(
      candidates.filter((p) => p > 0 && p <= totalPages).sort((a, b) => a - b),
    ),
  ];
  const pageItems: PageItem[] = [];
  let prev: number | undefined;
  for (const page of pages) {
    if (prev !== undefined) {
      const gap = page - prev;
      if (gap === 2) {
        pageItems.push(prev + 1);
      } else if (gap > 2) {
        pageItems.push("…");
      }
    }
    pageItems.push(page);
    prev = page;
  }
  return pageItems;
}
