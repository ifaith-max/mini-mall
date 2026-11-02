import { NextResponse } from "next/server";
import { checkJsonRequest, revalidatePaths, withAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export const DELETE = withAdmin(async (request, context) => {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const { id } = await context.params;
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "分类不存在" }, { status: 404 });
  }
  if (category._count.products > 0) {
    return NextResponse.json(
      { error: "该分类下还有商品，无法删除" },
      { status: 409 },
    );
  }

  await db.category.delete({ where: { id } });

  revalidatePaths(["/", "/admin/categories"]);
  return NextResponse.json({ data: { ok: true } });
});
