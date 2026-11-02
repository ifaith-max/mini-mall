import { isOrderStatus, ORDER_STATUS_LABELS } from "@/lib/constants";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-violet-50 text-violet-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
  const style = statusStyles[status] ?? "bg-slate-100 text-slate-500";

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs ${style}`}>
      {label}
    </span>
  );
}
