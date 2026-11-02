import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { emailSchema, passwordSchema } from "@/lib/validators";

const REGISTER_IP_LIMIT = 5;
const REGISTER_WINDOW_MS = 60_000;

const registerSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .trim()
    .min(1, "昵称不能为空")
    .max(30, "昵称不能超过 30 个字符")
    .optional(),
  password: passwordSchema,
});

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  membershipLevel: true,
  totalSpent: true,
  createdAt: true,
} as const;

export async function POST(request: Request) {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const name = parsed.data.name ?? email.split("@")[0];

  // 测试环境直接调用 handler，没有真实 IP，跳过限流避免互相干扰
  if (process.env.NODE_ENV !== "test") {
    const limit = checkRateLimit(
      `register:ip:${getClientIp(request)}`,
      REGISTER_IP_LIMIT,
      REGISTER_WINDOW_MS,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "注册过于频繁，请稍后再试" },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
  }

  try {
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 409 },
      );
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
      },
      select: publicUserSelect,
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    // 并发注册时唯一索引仍可能冲突
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 409 },
      );
    }

    console.error("注册失败", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 },
    );
  }
}
