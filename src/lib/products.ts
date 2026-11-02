import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { parseProductSort, type ProductSort } from "./product-sort";

export const PRODUCT_PAGE_SIZE = 9;

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: { select: { id: true; name: true; slug: true } } };
}>;

export type ProductListParams = {
  search?: string;
  category?: string;
  page?: number;
  sort?: ProductSort;
};

export type ProductListResult = {
  products: ProductWithCategory[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: ProductSort;
};

const categoryInclude = {
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

/** 前台与公开 API 共用的商品列表查询。 */
export async function listProducts({
  search,
  category,
  page = 1,
  sort,
}: ProductListParams): Promise<ProductListResult> {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(search ? { name: { contains: search } } : {}),
    ...(category ? { category: { slug: category } } : {}),
  };

  const total = await db.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));

  // 钳制页码：既避免超出总页数时误报“无商品”，也避免超大页码导致 skip 溢出。
  const requestedPage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const currentPage = Math.min(requestedPage, totalPages);

  const sortBy = parseProductSort(sort);
  // createdAt / price 可能相同，追加 id 保证分页顺序稳定。
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sortBy === "price-asc"
      ? [{ price: "asc" }, { id: "asc" }]
      : sortBy === "price-desc"
        ? [{ price: "desc" }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "asc" }];

  const products = await db.product.findMany({
    where,
    include: categoryInclude,
    orderBy,
    skip: (currentPage - 1) * PRODUCT_PAGE_SIZE,
    take: PRODUCT_PAGE_SIZE,
  });

  return {
    products,
    page: currentPage,
    pageSize: PRODUCT_PAGE_SIZE,
    total,
    totalPages,
    sort: sortBy,
  };
}

/** 商品详情，只返回在售商品。 */
export async function getProductById(
  id: string,
): Promise<ProductWithCategory | null> {
  return db.product.findFirst({
    where: { id, isActive: true },
    include: categoryInclude,
  });
}

/** 商品详情页使用 slug 查询。 */
export async function getProductBySlug(
  slug: string,
): Promise<ProductWithCategory | null> {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: categoryInclude,
  });
}

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
};

/** 分类列表，productCount 只统计在售商品，并跟随关键词过滤。 */
export async function listCategoriesWithCounts(
  search?: string,
): Promise<CategoryWithCount[]> {
  const productWhere: Prisma.ProductWhereInput = {
    isActive: true,
    ...(search ? { name: { contains: search } } : {}),
  };

  const categories = await db.category.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { products: { where: productWhere } },
      },
    },
  });

  return categories.map(({ _count, ...category }) => ({
    ...category,
    productCount: _count.products,
  }));
}
