import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "./constants";
import { db } from "./db";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-token";

export { SESSION_COOKIE_NAME };
export type { SessionPayload };

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

/** 签发 7 天有效的 JWT，并写入 httpOnly Cookie。 */
export async function setSession(userId: string, role: Role): Promise<void> {
  const token = await signSessionToken(userId, role);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

/** 返回当前用户完整信息，但绝不包含 passwordHash。 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      membershipLevel: true,
      totalSpent: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  // 不能用 delete()：它生成的清除 Cookie 不带 Secure，浏览器会忽略 __Host- 前缀的删除
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/** 页面守卫：未登录跳登录，非 ADMIN 回首页。 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}
