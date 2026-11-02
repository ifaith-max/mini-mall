import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addToCart, CartError, getCart } from "@/lib/cart";

const addSchema = z.object({
  productId: z.string().min(1, "缺少商品 ID"),
  quantity: z.number().int().min(1, "数量至少为 1").max(99, "单件商品最多 99 件").default(1),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const cart = await getCart(session.userId);
    return NextResponse.json({ data: cart });
  } catch (error) {
    console.error("获取购物车失败", error);
    return NextResponse.json({ error: "获取购物车失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  try {
    const item = await addToCart(
      session.userId,
      parsed.data.productId,
      parsed.data.quantity,
    );
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("加入购物车失败", error);
    return NextResponse.json({ error: "加入购物车失败" }, { status: 500 });
  }
}
