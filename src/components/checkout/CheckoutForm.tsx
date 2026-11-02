"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { CartSummary } from "@/lib/cart";
import { formatDiscount, formatPrice } from "@/lib/price";

type CheckoutFormProps = {
  cart: CartSummary;
  discountBps: number;
  payableAmount: number;
};

export function CheckoutForm({
  cart,
  discountBps,
  payableAmount,
}: CheckoutFormProps) {
  const router = useRouter();
  const { refresh: refreshCart } = useCart();
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddr, setReceiverAddr] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          receiverName,
          receiverPhone,
          receiverAddr,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { id: string };
        error?: string;
      };

      if (!response.ok || !body.data) {
        setError(body.error ?? "下单失败，请重试");
        return;
      }

      refreshCart();
      router.push(`/orders/${body.data.id}`);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7"
      >
        <h2 className="text-lg font-semibold text-slate-900">收货信息</h2>

        <label className="block">
          <span className="text-sm text-slate-600">收货人</span>
          <input
            type="text"
            required
            autoComplete="name"
            value={receiverName}
            onChange={(event) => setReceiverName(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">手机号</span>
          <input
            type="tel"
            required
            autoComplete="tel"
            value={receiverPhone}
            onChange={(event) => setReceiverPhone(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">详细地址</span>
          <textarea
            required
            rows={3}
            autoComplete="street-address"
            value={receiverAddr}
            onChange={(event) => setReceiverAddr(event.target.value)}
            className="mt-2 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "提交中…" : "提交订单"}
        </button>

        <Link
          href="/cart"
          className="inline-block text-sm text-slate-500 underline-offset-4 hover:text-blue-600 hover:underline"
        >
          返回购物车
        </Link>
      </form>

      <aside className="rounded-lg border border-slate-200 bg-slate-50 p-6 lg:col-span-5">
        <h2 className="text-lg font-semibold text-slate-900">订单摘要</h2>

        <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {cart.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate text-slate-600">
                {item.product.name} × {item.quantity}
              </span>
              <span className="shrink-0 font-mono text-slate-900">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">商品总额</dt>
            <dd className="font-mono text-slate-900">
              {formatPrice(cart.totalAmount)}
            </dd>
          </div>
          {discountBps < 10000 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                会员折扣（{formatDiscount(discountBps)}）
              </dt>
              <dd className="font-mono text-slate-900">
                -{formatPrice(cart.totalAmount - payableAmount)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
            <dt className="text-slate-900">应付总额</dt>
            <dd className="font-mono text-slate-900">
              {formatPrice(payableAmount)}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
