"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";

type AddToCartButtonProps = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
};

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  imageUrl,
  stock,
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { addItem, refresh: refreshCart } = useCart();
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const authLoading = user === undefined;

  if (stock <= 0) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-md bg-slate-100 px-6 py-3.5 text-sm text-slate-400"
      >
        已售罄
      </button>
    );
  }

  const handleClick = async () => {
    if (authLoading) return;

    setStatus("idle");
    setMessage("");
    setPending(true);

    try {
      if (user) {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, quantity: 1 }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          setStatus("error");
          setMessage(body.error ?? "加入失败，请重试");
          return;
        }

        refreshCart();
      } else {
        addItem({ productId, slug, name, price, imageUrl, stock }, 1);
      }

      setStatus("added");
    } catch {
      setStatus("error");
      setMessage("网络错误，请重试");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || authLoading}
        className="w-full rounded-md bg-blue-600 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {authLoading
          ? "加载中…"
          : pending
            ? "加入中…"
            : status === "added"
              ? "已加入购物车"
              : "加入购物车"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-xs ${
          status === "error" ? "text-red-600" : "text-slate-500"
        }`}
      >
        {authLoading
          ? "正在确认登录状态…"
          : status === "added"
            ? "已加入购物车，可以继续选购。"
            : status === "error"
              ? message
              : "每次加入 1 件"}
      </p>
    </div>
  );
}
