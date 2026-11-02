import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { ShopShell } from "@/components/shop/ShopShell";
import { firstParam, safeNextPath } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "登录",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(firstParam(params.next));
  const registerHref =
    nextPath === "/" ? "/register" : `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <ShopShell>
      <main className="mx-auto w-full max-w-md px-5 py-16 sm:px-8 sm:py-24">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            登录
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            登录后可以同步购物车、查看订单。
          </p>

          <LoginForm nextPath={nextPath} />

          <p className="mt-6 text-sm text-slate-500">
            还没有账号？
            <Link
              href={registerHref}
              className="ml-1 font-medium text-blue-600 hover:text-blue-700"
            >
              注册
            </Link>
          </p>
        </div>
      </main>
    </ShopShell>
  );
}
