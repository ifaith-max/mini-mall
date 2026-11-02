"use client";

import { useCart } from "./CartProvider";

/** 页头购物车数量角标；0 件时不渲染。 */
export function CartBadge() {
  const { totalCount } = useCart();

  if (totalCount <= 0) return null;

  return (
    <span
      aria-label={`购物车共 ${totalCount} 件商品`}
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
    >
      {totalCount > 99 ? "99+" : totalCount}
    </span>
  );
}
