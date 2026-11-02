import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { ShopShell } from "@/components/shop/ShopShell";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { listOrdersForUser } from "@/lib/orders";
import { formatPrice } from "@/lib/price";

export const metadata: Metadata = {
  title: "我的订单",
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/orders");
  }

  const orders = await listOrdersForUser(session.userId);

  return (
    <ShopShell>
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          我的订单
        </h1>
        <p className="mt-3 text-sm text-slate-500">共 {orders.length} 笔订单。</p>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 py-20 text-center">
            <p className="text-lg text-slate-900">还没有订单。</p>
            <p className="mt-2 text-sm text-slate-500">
              去挑几件日常好物吧。
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              去逛逛
            </Link>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm text-slate-900">
                      {order.orderNo}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <OrderStatusBadge status={order.status} />
                    <p className="font-mono text-sm text-slate-900">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ShopShell>
  );
}
