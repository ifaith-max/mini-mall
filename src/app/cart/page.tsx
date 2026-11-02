import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartClient } from "@/components/cart/CartClient";
import { ShopShell } from "@/components/shop/ShopShell";
import { getSession } from "@/lib/auth";
import { getCart } from "@/lib/cart";

export const metadata: Metadata = {
  title: "购物车",
};

export default async function CartPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/cart");
  }

  const cart = await getCart(session.userId);

  return (
    <ShopShell>
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          购物车
        </h1>
        <p className="mt-3 text-sm text-slate-500">调整数量后会自动保存。</p>

        <div className="mt-8">
          <CartClient initialCart={cart} />
        </div>
      </main>
    </ShopShell>
  );
}
