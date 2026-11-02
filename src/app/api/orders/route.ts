import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createOrderFromCart,
  listOrdersForUser,
  OrderError,
} from "@/lib/orders";

const receiverSchema = z.object({
  receiverName: z.string().trim().min(1, "请输入收货人").max(30, "收货人姓名过长"),
  receiverPhone: z.string().trim().min(5, "请输入有效手机号").max(20, "手机号过长"),
  receiverAddr: z.string().trim().min(5, "请输入详细地址").max(200, "地址过长"),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const orders = await listOrdersForUser(session.userId);
    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error("获取订单列表失败", error);
    return NextResponse.json({ error: "获取订单列表失败" }, { status: 500 });
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

  const parsed = receiverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数不正确" },
      { status: 400 },
    );
  }

  try {
    const order = await createOrderFromCart(session.userId, parsed.data);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("创建订单失败", error);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
