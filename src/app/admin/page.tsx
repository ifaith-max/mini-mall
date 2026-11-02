import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "后台管理",
};

const cards = [
  {
    href: "/admin/products",
    icon: "📦",
    title: "商品管理",
    description: "查看、新增、编辑、删除商品",
    className: "border-blue-200 bg-blue-50 hover:border-blue-300",
  },
  {
    href: "/admin/orders",
    icon: "📋",
    title: "订单管理",
    description: "查看所有订单，更新订单状态",
    className: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
  },
  {
    href: "/admin/categories",
    icon: "🏷️",
    title: "分类管理",
    description: "管理商品分类，新增和删除分类",
    className: "border-purple-200 bg-purple-50 hover:border-purple-300",
  },
];

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            后台管理
          </h1>
          <p className="mt-2 text-sm text-slate-500">欢迎，{user.name}</p>
        </div>
        <Link
          href="/"
          className="text-sm text-slate-500 transition-colors hover:text-blue-600"
        >
          返回商城 →
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`rounded-lg border p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${card.className}`}
          >
            <span className="text-2xl" aria-hidden="true">
              {card.icon}
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
