import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest } from "@/lib/api";
import { setSession, verifyPassword } from "@/lib/auth";
import { isRole } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimit,
} from "@/lib/rate-limit";
import { emailSchema, MAX_PASSWORD_BYTES } from "@/lib/validators";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "请输入密码"),
});

// 用户不存在时也执行一次 bcrypt，避免通过响应时间枚举邮箱。
const DUMMY_PASSWORD_HASH =
  "$2b$10$k9hnylwoF2YDA2n/iEB15uqqnJqx6hlMTDZ8bhdzZMGVulF5/fVui";

const LOGIN_IP_LIMIT = 10;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const ip = getClientIp(request);
  const ipKey = `login:ip:${ip}`;
  // 按 IP + 邮箱组合计数：攻击者无法单独打满他人邮箱的额度
  const attemptKey = `login:ip-email:${ip}:${email}`;

  // 测试环境直接调用 handler，没有真实 IP，跳过限流避免互相干扰
  if (process.env.NODE_ENV !== "test") {
    const ipLimit = checkRateLimit(
      ipKey,
      LOGIN_IP_LIMIT,
      LOGIN_WINDOW_MS,
    );
    const attemptLimit = checkRateLimit(
      attemptKey,
      LOGIN_ATTEMPT_LIMIT,
      LOGIN_WINDOW_MS,
    );

    if (!ipLimit.allowed || !attemptLimit.allowed) {
      return NextResponse.json(
        { error: "尝试过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(
                ipLimit.retryAfterSeconds,
                attemptLimit.retryAfterSeconds,
              ),
            ),
          },
        },
      );
    }
  }

  // 超过 72 字节的密码会被 bcrypt 静默截断，直接按登录失败处理
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return NextResponse.json(
      { error: "邮箱或密码错误" },
      { status: 401 },
    );
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    // 无论用户是否存在都执行 bcrypt，保证两条路径耗时接近
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    // 用户不存在与密码错误必须返回同一信息，避免撞库时被枚举邮箱
    if (!user || !valid) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 },
      );
    }

    // 成功登录不累积计数，避免正常用户反复登录被误伤
    if (process.env.NODE_ENV !== "test") {
      resetRateLimit(ipKey);
      resetRateLimit(attemptKey);
    }

    const role = isRole(user.role) ? user.role : "USER";
    await setSession(user.id, role);

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        membershipLevel: user.membershipLevel,
        totalSpent: user.totalSpent,
      },
    });
  } catch (error) {
    console.error("登录失败", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 },
    );
  }
}
