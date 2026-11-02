import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest, revalidatePaths, withAdmin } from "@/lib/api";
import { db } from "@/lib/db";

const categorySchema = z.object({
  name: z.string().trim().min(1, "请输入分类名称").max(40, "分类名称过长"),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
  description: z.string().trim().max(200, "描述过长").optional(),
});

export const GET = withAdmin(async () => {
  const categories = await db.category.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({
    data: categories.map(({ _count, ...category }) => ({
      ...category,
      productCount: _count.products,
    })),
  });
});

export const POST = withAdmin(async (request) => {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  const slug =
    parsed.data.slug ?? `category-${Date.now().toString(36)}`;

  try {
    const category = await db.category.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
      },
      include: { _count: { select: { products: true } } },
    });

    revalidatePaths(["/", "/admin/categories"]);
    return NextResponse.json(
      {
        data: {
          ...category,
          productCount: category._count.products,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "分类名称或 slug 已存在" },
        { status: 409 },
      );
    }
    throw error;
  }
});
