import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  cancelOrder,
  getOrderForUser,
  OrderError,
  payOrder,
} from "@/lib/orders";

const updateSchema = z.object({
  status: z.enum(["PAID", "CANCELLED"], {
    message: "不支持的订单状态",
  }),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const order = await getOrderForUser(session.userId, id);
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }
    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("获取订单详情失败", error);
    return NextResponse.json({ error: "获取订单详情失败" }, { status: 500 });
  }
}

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
    const order =
      parsed.data.status === "PAID"
        ? await payOrder(session.userId, id)
        : await cancelOrder(session.userId, id);
    return NextResponse.json({ data: order });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("更新订单状态失败", error);
    return NextResponse.json(
      { error: "更新订单状态失败" },
      { status: 500 },
    );
  }
}
