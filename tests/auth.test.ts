import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const { cookieStore } = vi.hoisted(() => {
  const store = new Map<
    string,
    { value: string; options?: Record<string, unknown> }
  >();
  return { cookieStore: store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const entry = cookieStore.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      // 浏览器语义：maxAge=0 的 Set-Cookie 表示删除
      if (options?.maxAge === 0) {
        cookieStore.delete(name);
        return;
      }
      cookieStore.set(name, { value, options });
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

import {
  clearSession,
  getCurrentUser,
  getSession,
  hashPassword,
  setSession as setSessionHelper,
  verifyPassword,
} from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as register } from "@/app/api/auth/register/route";

const BASE = "http://localhost/api/auth";

function postJson(path: string, body: unknown) {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createUser(
  email = "user@example.com",
  password = "secret123",
  name = "测试用户",
) {
  return db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
    },
  });
}

describe("密码与会话", () => {
  beforeEach(async () => {
    cookieStore.clear();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.cartItem.deleteMany();
    await db.user.deleteMany();
  });

  it("hashPassword 生成不可逆哈希，verifyPassword 能验证", async () => {
    const hash = await hashPassword("secret123");

    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("setSession / getSession / clearSession 读写并清除 Cookie", async () => {
    await clearSession();
    expect(await getSession()).toBeNull();

    await setSessionHelper("user-1", "USER");
    const session = await getSession();
    expect(session).toEqual({ userId: "user-1", role: "USER" });

    const cookie = cookieStore.get("session");
    expect(cookie?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    await clearSession();
    expect(await getSession()).toBeNull();
  });

  it("getCurrentUser 不返回 passwordHash", async () => {
    const user = await createUser();
    await setSessionHelper(user.id, "USER");

    const current = await getCurrentUser();
    expect(current?.email).toBe(user.email);
    expect(current).not.toHaveProperty("passwordHash");
  });
});

describe("认证 API", () => {
  beforeEach(async () => {
    cookieStore.clear();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.cartItem.deleteMany();
    await db.user.deleteMany();
  });

  it("POST /api/auth/register 创建用户且不返回密码哈希", async () => {
    const response = await register(
      postJson("/register", {
        email: "new@example.com",
        name: "新用户",
        password: "secret123",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.email).toBe("new@example.com");
    expect(body.data).not.toHaveProperty("passwordHash");

    const saved = await db.user.findUnique({
      where: { email: "new@example.com" },
    });
    expect(saved?.passwordHash).not.toBe("secret123");
    expect(await verifyPassword("secret123", saved!.passwordHash)).toBe(true);
  });

  it("注册时邮箱已存在返回 409", async () => {
    await createUser("dup@example.com");

    const response = await register(
      postJson("/register", {
        email: "dup@example.com",
        password: "secret123",
      }),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("该邮箱已被注册");
  });

  it("注册密码少于 8 位返回 400", async () => {
    const response = await register(
      postJson("/register", { email: "short@example.com", password: "12345" }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("至少 8 位");
  });

  it("注册密码超过 72 字节返回 400", async () => {
    const response = await register(
      postJson("/register", {
        email: "long@example.com",
        password: "中".repeat(25),
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("72");
  });

  it("登录密码超过 72 字节返回通用 401", async () => {
    await createUser("long-login@example.com", "secret123");

    const response = await login(
      postJson("/login", {
        email: "long-login@example.com",
        password: "中".repeat(25),
      }),
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("邮箱或密码错误");
  });

  it("登录成功写入 httpOnly Cookie", async () => {
    const user = await createUser("login@example.com", "secret123");

    const response = await login(
      postJson("/login", { email: "login@example.com", password: "secret123" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.email).toBe(user.email);
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(cookieStore.get("session")?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
  });

  it("用户不存在与密码错误返回相同的 401 信息", async () => {
    await createUser("known@example.com", "secret123");

    const wrongPassword = await login(
      postJson("/login", {
        email: "known@example.com",
        password: "wrong-password",
      }),
    );
    const unknownUser = await login(
      postJson("/login", {
        email: "unknown@example.com",
        password: "wrong-password",
      }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect((await wrongPassword.json()).error).toBe("邮箱或密码错误");
    expect((await unknownUser.json()).error).toBe("邮箱或密码错误");
  });

  it("GET /api/auth/me 返回当前用户，logout 后返回 401", async () => {
    await createUser("me@example.com", "secret123");
    await login(
      postJson("/login", { email: "me@example.com", password: "secret123" }),
    );

    const meResponse = await me();
    const meBody = await meResponse.json();
    expect(meResponse.status).toBe(200);
    expect(meBody.data.email).toBe("me@example.com");
    expect(meBody.data).not.toHaveProperty("passwordHash");

    const logoutResponse = await logout(postJson("/logout", {}));
    expect(logoutResponse.status).toBe(200);
    expect(cookieStore.has("session")).toBe(false);

    const afterLogout = await me();
    expect(afterLogout.status).toBe(401);
  });

  it("logout 拒绝非 JSON 写请求", async () => {
    const response = await logout(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
    );

    expect(response.status).toBe(415);
  });
});
