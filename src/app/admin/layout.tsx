import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:h-16 sm:flex-nowrap sm:px-8 sm:py-0">
          <Link
            href="/admin"
            className="text-lg font-bold tracking-tight text-blue-600"
          >
            Mini Mall
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm sm:gap-5">
            <Link
              href="/cart"
              className="text-slate-500 transition-colors hover:text-slate-900"
            >
              购物车
            </Link>
            <Link
              href="/orders"
              className="text-slate-500 transition-colors hover:text-slate-900"
            >
              我的订单
            </Link>
            <Link href="/admin" className="font-medium text-slate-900">
              后台
            </Link>
            <span className="rounded bg-yellow-300 px-2 py-0.5 text-xs text-slate-900">
              {user.name}
            </span>
            <AdminLogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}
