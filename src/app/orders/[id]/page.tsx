import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderActions } from "@/components/order/OrderActions";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { ShopShell } from "@/components/shop/ShopShell";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { getSafeImageUrl } from "@/lib/images";
import {
  getOrderForUser,
  PENDING_ORDER_TTL_MINUTES,
} from "@/lib/orders";
import { formatDiscount, formatPrice } from "@/lib/price";

export const metadata: Metadata = {
  title: "订单详情",
};

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
  }

  const order = await getOrderForUser(session.userId, id);
  if (!order) {
    notFound();
  }

  const discountAmount = order.originalAmount - order.totalAmount;

  return (
    <ShopShell>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <nav
          aria-label="面包屑"
          className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
        >
          <Link href="/orders" className="hover:text-blue-600">
            我的订单
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900">{order.orderNo}</span>
        </nav>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {order.orderNo}
            </h1>
            <p className="mt-2 text-xs text-slate-400">
              下单时间 {formatDateTime(order.createdAt)}
            </p>
            {order.status === "PENDING" ? (
              <p className="mt-2 text-xs text-amber-600">
                请在 {PENDING_ORDER_TTL_MINUTES} 分钟内完成支付，超时订单会自动取消并释放库存。
              </p>
            ) : null}
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap gap-x-10 gap-y-2">
            <p>
              <span className="text-slate-500">收货人</span>
              <span className="ml-3 text-slate-900">{order.receiverName}</span>
            </p>
            <p>
              <span className="text-slate-500">电话</span>
              <span className="ml-3 text-slate-900">{order.receiverPhone}</span>
            </p>
          </div>
          <p className="mt-2">
            <span className="text-slate-500">地址</span>
            <span className="ml-3 text-slate-900">{order.receiverAddr}</span>
          </p>
        </section>

        <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {order.items.map((item) => {
            const imageSrc = getSafeImageUrl(item.productImage);

            return (
              <li key={item.id} className="flex gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={item.productName}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-slate-400">
                      暂无图片
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.productName}
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-500">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-slate-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 ml-auto max-w-sm space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-6">
            <span className="text-slate-500">商品总额</span>
            <span className="font-mono text-slate-900">
              {formatPrice(order.originalAmount)}
            </span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex justify-between gap-6">
              <span className="text-slate-500">
                会员折扣（{formatDiscount(order.discountBps)}）
              </span>
              <span className="font-mono text-slate-900">
                -{formatPrice(discountAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-6 border-t border-slate-200 pt-3 text-base">
            <span className="text-slate-900">应付总额</span>
            <span className="font-mono text-slate-900">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
          {order.paidAt ? (
            <p className="pt-2 text-xs text-slate-400">
              支付时间 {formatDateTime(order.paidAt)}
            </p>
          ) : null}
        </div>

        <OrderActions orderId={order.id} status={order.status} />
      </main>
    </ShopShell>
  );
}
