export const PRODUCT_SORTS = ["latest", "price-asc", "price-desc"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const DEFAULT_PRODUCT_SORT: ProductSort = "latest";

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  latest: "最新上架",
  "price-asc": "价格从低到高",
  "price-desc": "价格从高到低",
};

export function parseProductSort(value: unknown): ProductSort {
  return typeof value === "string" &&
    (PRODUCT_SORTS as readonly string[]).includes(value)
    ? (value as ProductSort)
    : DEFAULT_PRODUCT_SORT;
}
