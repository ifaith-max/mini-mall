import Link from "next/link";
import { getPaginationItems } from "@/lib/pagination";
import { buildProductListHref } from "@/lib/product-href";
import type { ProductSort } from "@/lib/product-sort";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  search?: string;
  category?: string;
  sort?: ProductSort;
};

export function Pagination({
  currentPage,
  totalPages,
  search,
  category,
  sort,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) =>
    buildProductListHref({ search, category, page, sort });

  const items = getPaginationItems(currentPage, totalPages);

  return (
    <nav
      aria-label="分页"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm"
    >
      <div>
        {currentPage > 1 ? (
          <Link
            href={hrefFor(currentPage - 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            上一页
          </Link>
        ) : (
          <span className="rounded-md border border-slate-100 px-3 py-1.5 text-slate-300">
            上一页
          </span>
        )}
      </div>

      <ol className="flex items-center gap-2 font-mono text-xs">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-2 text-slate-400"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === currentPage ? "page" : undefined}
                className={
                  item === currentPage
                    ? "rounded-md bg-blue-600 px-3 py-1.5 text-white"
                    : "rounded-md px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                }
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      <div>
        {currentPage < totalPages ? (
          <Link
            href={hrefFor(currentPage + 1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            下一页
          </Link>
        ) : (
          <span className="rounded-md border border-slate-100 px-3 py-1.5 text-slate-300">
            下一页
          </span>
        )}
      </div>
    </nav>
  );
}
