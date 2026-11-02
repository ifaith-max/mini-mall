import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest, revalidatePaths, withAdmin } from "@/lib/api";
import { db } from "@/lib/db";
import { getSafeImageUrl } from "@/lib/images";

const productSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(80, "商品名称过长"),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
  description: z.string().trim().min(1, "请输入商品描述").max(2000, "描述过长"),
  price: z.number().int("价格必须是整数分").min(0, "价格不能为负"),
  imageUrl: z
    .string()
    .trim()
    .min(1, "请输入图片地址")
    .max(500)
    .refine(
      (value) => getSafeImageUrl(value) !== null,
      "图片地址域名不在允许列表",
    ),
  stock: z.number().int("库存必须是整数").min(0, "库存不能为负"),
  isActive: z.boolean(),
  categoryId: z.string().min(1, "请选择分类"),
});

export const GET = withAdmin(async (_request, context) => {
  const { id } = await context.params;
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }
  return NextResponse.json({ data: product });
});

export const PUT = withAdmin(async (request, context) => {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const { id } = await context.params;
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }

  try {
    const product = await db.product.update({
      where: { id },
      data: {
        ...parsed.data,
        slug: parsed.data.slug ?? existing.slug,
      },
      include: { category: true },
    });

    revalidatePaths([
      "/",
      "/admin/products",
      `/products/${existing.slug}`,
      `/products/${product.slug}`,
    ]);
    return NextResponse.json({ data: product });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "slug 已存在" }, { status: 409 });
    }
    throw error;
  }
});

export const DELETE = withAdmin(async (request, context) => {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const { id } = await context.params;
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  await db.product.delete({ where: { id } });

  revalidatePaths([
    "/",
    "/admin/products",
    `/products/${existing.slug}`,
  ]);
  return NextResponse.json({ data: { ok: true } });
});
