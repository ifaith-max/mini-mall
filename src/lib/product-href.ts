import {
  DEFAULT_PRODUCT_SORT,
  type ProductSort,
} from "./product-sort";

export type ProductListQuery = {
  search?: string;
  category?: string;
  page?: number;
  sort?: ProductSort;
};

/** 生成商品列表页链接，首页省略 page 与默认排序。 */
export function buildProductListHref({
  search,
  category,
  page,
  sort,
}: ProductListQuery): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (sort && sort !== DEFAULT_PRODUCT_SORT) params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
