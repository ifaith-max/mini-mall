import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ShopShell } from "@/components/shop/ShopShell";
import { firstParam, safeNextPath } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "注册",
};

type RegisterPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(firstParam(params.next));
  const loginHref =
    nextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <ShopShell>
      <main className="mx-auto w-full max-w-md px-5 py-16 sm:px-8 sm:py-24">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            注册
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            创建账号，保存购物车和订单记录。
          </p>

          <RegisterForm nextPath={nextPath} />

          <p className="mt-6 text-sm text-slate-500">
            已有账号？
            <Link
              href={loginHref}
              className="ml-1 font-medium text-blue-600 hover:text-blue-700"
            >
              登录
            </Link>
          </p>
        </div>
      </main>
    </ShopShell>
  );
}
