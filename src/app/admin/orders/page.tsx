import type { Metadata } from "next";
import { OrderManager } from "@/components/admin/OrderManager";

export const metadata: Metadata = {
  title: "订单管理",
};

export default function AdminOrdersPage() {
  return <OrderManager />;
}
