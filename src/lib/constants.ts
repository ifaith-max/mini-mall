export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return value === "USER" || value === "ADMIN";
}

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已支付",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export const MEMBERSHIP_LEVELS = [
  "XINYUE_0",
  "XINYUE_1",
  "XINYUE_2",
  "XINYUE_3",
] as const;
export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];

export function isMembershipLevel(value: unknown): value is MembershipLevel {
  return (
    typeof value === "string" &&
    (MEMBERSHIP_LEVELS as readonly string[]).includes(value)
  );
}
