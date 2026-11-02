"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { CartItemWithProduct, CartSummary } from "@/lib/cart";
import { getSafeImageUrl } from "@/lib/images";
import { formatPrice } from "@/lib/price";

type CartClientProps = {
  initialCart: CartSummary;
};

export function CartClient({ initialCart }: CartClientProps) {
  const { refresh: refreshCart } = useCart();
  const [items, setItems] = useState<CartItemWithProduct[]>(initialCart.items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const hasIssue = items.some(
    (item) =>
      !item.product.isActive || item.product.stock < item.quantity,
  );

  async function updateQuantity(item: CartItemWithProduct, quantity: number) {
    if (quantity < 1 || pendingId) return;
    setError("");
    setPendingId(item.id);

    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: CartItemWithProduct;
        error?: string;
      };

      if (!response.ok || !body.data) {
        setError(body.error ?? "修改失败，请重试");
        return;
      }

      const updated = body.data;
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? updated : entry)),
      );
      refreshCart();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPendingId(null);
    }
  }

  async function removeItem(item: CartItemWithProduct) {
    if (pendingId) return;
    setError("");
    setPendingId(item.id);

    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "删除失败，请重试");
        return;
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      refreshCart();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 py-20 text-center">
        <p className="text-lg text-slate-900">购物车是空的。</p>
        <p className="mt-2 text-sm text-slate-500">去挑几件日常好物吧。</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          去逛逛
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {items.map((item) => {
          const imageSrc = getSafeImageUrl(item.product.imageUrl);
          const maxQuantity = Math.min(99, item.product.stock);

          return (
            <li key={item.id} className="flex gap-4 p-4">
              <Link
                href={`/products/${item.product.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100"
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-slate-400">
                    暂无图片
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-medium text-slate-900 hover:text-blue-600"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 font-mono text-sm text-slate-500">
                    {formatPrice(item.product.price)}
                  </p>
                  {!item.product.isActive ? (
                    <p className="mt-2 text-xs text-red-600">商品已下架</p>
                  ) : item.product.stock < item.quantity ? (
                    <p className="mt-2 text-xs text-red-600">库存不足</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                  <div className="flex items-center overflow-hidden rounded-md border border-slate-200">
                    <button
                      type="button"
                      aria-label={`减少${item.product.name}数量`}
                      disabled={item.quantity <= 1 || pendingId === item.id}
                      onClick={() => updateQuantity(item, item.quantity - 1)}
                      className="h-8 w-8 text-base text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-mono text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`增加${item.product.name}数量`}
                      disabled={
                        item.quantity >= maxQuantity ||
                        !item.product.isActive ||
                        pendingId === item.id
                      }
                      onClick={() => updateQuantity(item, item.quantity + 1)}
                      className="h-8 w-8 text-base text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <p className="font-mono text-sm text-slate-900">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>

                  <button
                    type="button"
                    disabled={pendingId === item.id}
                    onClick={() => removeItem(item)}
                    className="text-xs text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">共 {totalQuantity} 件商品</p>
        <div className="flex flex-wrap items-center gap-5">
          <p className="font-mono text-lg text-slate-900">
            合计 {formatPrice(totalAmount)}
          </p>
          {hasIssue ? (
            <span className="cursor-not-allowed rounded-md bg-slate-100 px-6 py-3 text-sm text-slate-400">
              提交订单
            </span>
          ) : (
            <Link
              href="/checkout"
              className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              提交订单
            </Link>
          )}
        </div>
      </div>
      {hasIssue ? (
        <p className="mt-3 text-right text-xs text-red-600">
          请先调整已下架或库存不足的商品。
        </p>
      ) : null}
    </div>
  );
}
