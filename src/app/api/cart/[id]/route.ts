import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { CartError, removeCartItem, updateCartItem } from "@/lib/cart";

const updateSchema = z.object({
  quantity: z.number().int().min(1, "数量至少为 1").max(99, "单件商品最多 99 件"),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const item = await updateCartItem(session.userId, id, parsed.data.quantity);
    return NextResponse.json({ data: item });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("修改购物车失败", error);
    return NextResponse.json({ error: "修改购物车失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await removeCartItem(session.userId, id);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("删除购物车项失败", error);
    return NextResponse.json({ error: "删除购物车项失败" }, { status: 500 });
  }
}
