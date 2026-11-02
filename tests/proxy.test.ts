import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/session-token";

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : undefined,
  });
}

describe("proxy 页面守卫", () => {
  it("未登录访问后台跳转登录并保留 next", async () => {
    const response = await proxy(request("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fadmin",
    );
  });

  it("未登录访问订单详情时保留完整路径", async () => {
    const response = await proxy(request("/orders/abc?tab=1"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Forders%2Fabc%3Ftab%3D1",
    );
  });

  it("普通用户访问后台重定向首页", async () => {
    const token = await signSessionToken("user-1", "USER");
    const response = await proxy(request("/admin/products", token));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("管理员可以通过后台守卫", async () => {
    const token = await signSessionToken("admin-1", "ADMIN");
    const response = await proxy(request("/admin/products", token));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("已登录访问登录页跳回首页", async () => {
    const token = await signSessionToken("user-1", "USER");
    const response = await proxy(request("/login", token));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("无效 token 按未登录处理", async () => {
    const response = await proxy(request("/cart", "invalid-token"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fcart",
    );
  });
});
