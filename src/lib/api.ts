import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { db } from "./db";

/**
 * 写接口只接受同源 JSON。
 * - Origin 存在时必须与 Host 一致（防止同站不同端口的 CSRF）
 * - Content-Type 必须是 application/json（避免 text/plain 绕过预检）
 */
export function checkJsonRequest(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json(
          { error: "请求来源不合法" },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "请求来源不合法" },
        { status: 403 },
      );
    }
  }

  const contentType =
    request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return NextResponse.json(
      { error: "请求格式不正确" },
      { status: 415 },
    );
  }

  return null;
}

/** 在 Next 请求上下文之外（脚本/测试）调用时不抛错。 */
export function revalidatePaths(paths: string[]): void {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // 测试环境没有 static generation store
    }
  }
}

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type AdminHandler = (
  request: Request,
  context: RouteContext,
  session: SessionPayload,
) => Promise<NextResponse>;

/**
 * 后台 Route Handler 统一鉴权：未登录 401，非 ADMIN 403。
 * 以数据库中的实时角色为准，避免降权/删号后旧 JWT 继续拥有后台权限。
 */
export function withAdmin(handler: AdminHandler) {
  return async (
    request: Request,
    context: RouteContext = {
      params: Promise.resolve({} as Record<string, string>),
    },
  ): Promise<NextResponse> => {
    try {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }

      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true },
      });
      if (!user) {
        return NextResponse.json(
          { error: "登录已失效，请重新登录" },
          { status: 401 },
        );
      }
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }

      return await handler(
        request,
        context,
        { userId: user.id, role: "ADMIN" },
      );
    } catch (error) {
      console.error("后台接口失败", error);
      return NextResponse.json(
        { error: "服务器错误，请稍后重试" },
        { status: 500 },
      );
    }
  };
}
