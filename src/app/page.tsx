import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/product/Pagination";
import { ProductCard } from "@/components/product/ProductCard";
import { ShopShell } from "@/components/shop/ShopShell";
import { listCategoriesWithCounts, listProducts } from "@/lib/products";
import { buildProductListHref } from "@/lib/product-href";
import {
  parseProductSort,
  PRODUCT_SORT_LABELS,
  PRODUCT_SORTS,
} from "@/lib/product-sort";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "首页",
};

type HomePageProps = {
  searchParams: Promise<{
    search?: string | string[];
    category?: string | string[];
    page?: string | string[];
    sort?: string | string[];
  }>;
};

function parsePage(raw: string | undefined): number {
  const value = Number(raw ?? "1");
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const search = firstParam(params.search);
  const category = firstParam(params.category);
  const page = parsePage(firstParam(params.page));
  const sort = parseProductSort(firstParam(params.sort));

  // 分类计数跟随搜索词，避免角标与实际结果不一致
  const categories = await listCategoriesWithCounts(search || undefined);
  const activeCategory = categories.find((item) => item.slug === category);
  const invalidCategory = Boolean(category) && !activeCategory;
  const effectiveCategory = activeCategory ? category : "";

  const result = await listProducts({
    search,
    category: effectiveCategory || undefined,
    page,
    sort,
  });

  const totalAll = categories.reduce((sum, item) => sum + item.productCount, 0);
  const heading = search
    ? activeCategory
      ? `在“${activeCategory.name}”中搜索“${search}”`
      : `搜索“${search}”`
    : activeCategory
      ? activeCategory.name
      : "全部商品";

  const categoryHref = (slug?: string) =>
    buildProductListHref({
      search: search || undefined,
      category: slug,
      sort,
    });

  return (
    <ShopShell>
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="border-b border-slate-200 py-12 sm:py-16">
          <p className="text-sm text-slate-500">
            {totalAll} 件商品，{categories.length} 个分类
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            日常好物，少而精。
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-500">
            从耳机到咖啡豆，挑一些每天都会用到的东西。每一件都经过简单筛选，不追新品，只留耐用的。
          </p>

          <form
            action="/"
            method="get"
            className="mt-8 flex max-w-xl items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm"
          >
            {activeCategory ? (
              <input type="hidden" name="category" value={category} />
            ) : null}
            {sort !== "latest" ? (
              <input type="hidden" name="sort" value={sort} />
            ) : null}
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="搜索商品，例如：耳机"
              aria-label="搜索商品"
              className="min-w-0 flex-1 rounded-md px-3 py-2 text-base outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              搜索
            </button>
          </form>
        </section>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 py-5 text-sm">
          <Link
            href={categoryHref()}
            aria-current={!category ? "page" : undefined}
            className={
              !category
                ? "rounded-full bg-blue-600 px-3 py-1.5 text-white"
                : "rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            }
          >
            全部
            <span
              className={`ml-2 text-xs ${
                !category ? "text-blue-100" : "text-slate-400"
              }`}
            >
              {totalAll}
            </span>
          </Link>
          {categories.map((item) => {
            const active = item.slug === effectiveCategory;
            return (
              <Link
                key={item.id}
                href={categoryHref(item.slug)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-blue-600 px-3 py-1.5 text-white"
                    : "rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                }
              >
                {item.name}
                <span
                  className={`ml-2 text-xs ${
                    active ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {item.productCount}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 py-3 text-sm">
          <span className="text-slate-400">排序</span>
          {PRODUCT_SORTS.map((option) => {
            const active = option === sort;
            return (
              <Link
                key={option}
                href={buildProductListHref({
                  search: search || undefined,
                  category: effectiveCategory || undefined,
                  sort: option,
                })}
                aria-current={active ? "true" : undefined}
                className={
                  active
                    ? "font-medium text-blue-600"
                    : "text-slate-500 transition-colors hover:text-slate-900"
                }
              >
                {PRODUCT_SORT_LABELS[option]}
              </Link>
            );
          })}
        </div>

        <section id="products" className="scroll-mt-6 py-10">
          {invalidCategory ? (
            <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              分类“{category}”不存在，已显示全部商品。
            </p>
          ) : null}

          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {heading}
            </h2>
            <p className="text-sm text-slate-400">{result.total} 件</p>
          </div>

          {result.products.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 py-20 text-center">
              <p className="text-lg text-slate-900">
                没有找到符合条件的商品。
              </p>
              <p className="mt-2 text-sm text-slate-500">
                试试换个关键词，或者查看全部商品。
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                查看全部商品
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            search={search || undefined}
            category={effectiveCategory || undefined}
            sort={sort}
          />
        </section>
      </main>
    </ShopShell>
  );
}
