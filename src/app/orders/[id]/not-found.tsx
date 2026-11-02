import Link from "next/link";
import { ShopShell } from "@/components/shop/ShopShell";

export default function OrderNotFound() {
  return (
    <ShopShell>
      <main className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
        <p className="text-sm text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          订单不存在
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          它可能已被删除，或者不属于当前账号。
        </p>
        <Link
          href="/orders"
          className="mt-8 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          返回我的订单
        </Link>
      </main>
    </ShopShell>
  );
}
