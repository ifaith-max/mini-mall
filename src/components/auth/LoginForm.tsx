"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import {
  clearGuestCart,
  readGuestCart,
  writeGuestCart,
  type GuestCartItem,
} from "@/lib/cart-storage";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath = "/" }: LoginFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const { refresh: refreshCart } = useCart();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "登录失败，请稍后重试");
        return;
      }

      // 游客购物车合并到当前账号；每成功一项就立即从本地移除，避免重复合并
      const guestItems = readGuestCart();
      if (guestItems.length > 0) {
        const remaining: GuestCartItem[] = [...guestItems];

        try {
          for (const item of guestItems) {
            const cartResponse = await fetch("/api/cart", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                productId: item.productId,
                quantity: item.quantity,
              }),
            });

            if (cartResponse.ok) {
              const index = remaining.findIndex(
                (entry) => entry.productId === item.productId,
              );
              if (index >= 0) remaining.splice(index, 1);
              writeGuestCart(remaining);
            }
          }
        } catch {
          // 合并失败不影响登录结果，剩余项继续留在本地
        } finally {
          if (remaining.length === 0) {
            clearGuestCart();
          } else {
            writeGuestCart(remaining);
          }
          refreshCart();
        }
      }

      await refresh();
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm text-slate-600">邮箱</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-600">密码</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
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
        {pending ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
