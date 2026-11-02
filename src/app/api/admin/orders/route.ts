import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";
import { listAllOrders } from "@/lib/orders";

export const GET = withAdmin(async () => {
  const orders = await listAllOrders();
  return NextResponse.json({ data: orders });
});
