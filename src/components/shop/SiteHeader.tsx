import Link from "next/link";
import { HeaderAuth } from "@/components/auth/HeaderAuth";
import { CartBadge } from "@/components/cart/CartBadge";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:h-16 sm:flex-nowrap sm:px-8 sm:py-0">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          Mini Mall
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm sm:gap-5">
          <Link
            href="/#products"
            className="text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            全部商品
          </Link>
          <Link
            href="/orders"
            className="text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            我的订单
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            购物车
            <CartBadge />
          </Link>
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
