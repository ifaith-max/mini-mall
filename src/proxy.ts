import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session-token";

const PROTECTED_PREFIXES = ["/admin", "/cart", "/checkout", "/orders"];
const AUTH_PAGES = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 粗粒度页面守卫：只负责提前重定向，改善未登录/无权限时的体验。
 * 真正的授权仍由页面 `requireAdmin()` 与 API `withAdmin()` 在服务端数据层完成。
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  // 密钥配置错误直接抛出；只有 token 无效/过期才视为未登录
  const session = token ? await verifySessionToken(token) : null;

  if (isProtectedPath(pathname) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (
    session &&
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (session && AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/cart",
    "/checkout",
    "/orders",
    "/orders/:path*",
    "/login",
    "/register",
  ],
};
