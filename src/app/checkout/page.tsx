import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ShopShell } from "@/components/shop/ShopShell";
import { getCurrentUser, getSession } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { isMembershipLevel } from "@/lib/constants";
import { getDiscountBps } from "@/lib/membership";

export const metadata: Metadata = {
  title: "确认订单",
};

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/checkout");
  }

  const [cart, user] = await Promise.all([
    getCart(session.userId),
    getCurrentUser(),
  ]);

  if (cart.items.length === 0) {
    redirect("/cart");
  }
  if (!user) {
    redirect("/login");
  }

  const level = isMembershipLevel(user.membershipLevel)
    ? user.membershipLevel
    : "XINYUE_0";
  const discountBps = getDiscountBps(level);
  const payableAmount = Math.round((cart.totalAmount * discountBps) / 10000);

  return (
    <ShopShell>
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          确认订单
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          填写收货信息后提交，库存会在下单时扣减。
        </p>

        <div className="mt-8">
          <CheckoutForm
            cart={cart}
            discountBps={discountBps}
            payableAmount={payableAmount}
          />
        </div>
      </main>
    </ShopShell>
  );
}
