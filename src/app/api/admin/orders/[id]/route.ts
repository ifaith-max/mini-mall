import { NextResponse } from "next/server";
import { z } from "zod";
import { checkJsonRequest, withAdmin } from "@/lib/api";
import {
  adminUpdateOrderStatus,
  OrderError,
  type AdminOrderStatus,
} from "@/lib/orders";

const updateSchema = z.object({
  status: z.enum(["SHIPPED", "COMPLETED", "CANCELLED"], {
    message: "不支持的订单状态",
  }),
});

export const PUT = withAdmin(async (request, context) => {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const { id } = await context.params;

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

  try {
    const order = await adminUpdateOrderStatus(
      id,
      parsed.data.status as AdminOrderStatus,
    );
    return NextResponse.json({ data: order });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }
});
