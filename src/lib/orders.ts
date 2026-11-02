import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { isMembershipLevel } from "./constants";
import { db } from "./db";
import {
  getDiscountBps,
  getLevelForSpent,
  upgradeLevel,
} from "./membership";

export class OrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrderError";
    this.status = status;
  }
}

/** 待付款订单的支付窗口；超时后按取消处理并释放库存。 */
export const PENDING_ORDER_TTL_MINUTES = 30;
const PENDING_ORDER_TTL_MS = PENDING_ORDER_TTL_MINUTES * 60 * 1000;

export type ReceiverInfo = {
  receiverName: string;
  receiverPhone: string;
  receiverAddr: string;
};

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

function generateOrderNo(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  return `MM${stamp}${randomInt(100000, 1000000)}`;
}

/**
 * 在同一个事务里完成：校验库存 → 扣库存 → 创建订单快照 → 清空购物车。
 * 任一步失败都会整体回滚。
 */
export async function createOrderFromCart(
  userId: string,
  receiver: ReceiverInfo,
): Promise<OrderWithItems> {
  // 惰性清理过期未支付订单，避免它们长期占用库存
  await expireStaleOrders();

  return db.$transaction(async (tx) => {
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            stock: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (cartItems.length === 0) {
      throw new OrderError("购物车是空的", 400);
    }

    for (const item of cartItems) {
      if (!item.product.isActive) {
        throw new OrderError(`商品「${item.product.name}」已下架`, 400);
      }
      if (item.product.stock < item.quantity) {
        throw new OrderError(
          `商品「${item.product.name}」库存不足，仅剩 ${item.product.stock} 件`,
          400,
        );
      }
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { membershipLevel: true },
    });
    if (!user) {
      throw new OrderError("用户不存在", 401);
    }

    const level = isMembershipLevel(user.membershipLevel)
      ? user.membershipLevel
      : "XINYUE_0";
    const discountBps = getDiscountBps(level);
    const originalAmount = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const totalAmount = Math.round((originalAmount * discountBps) / 10000);

    for (const item of cartItems) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new OrderError(`商品「${item.product.name}」库存不足`, 409);
      }
    }

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        userId,
        status: "PENDING",
        originalAmount,
        discountBps,
        totalAmount,
        receiverName: receiver.receiverName,
        receiverPhone: receiver.receiverPhone,
        receiverAddr: receiver.receiverAddr,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            productImage: item.product.imageUrl,
            price: item.product.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // 只删除本次下单快照里的项，避免吞掉并发加入的其他商品
    await tx.cartItem.deleteMany({
      where: { userId, id: { in: cartItems.map((item) => item.id) } },
    });
    return order;
  });
}

export async function listOrdersForUser(userId: string) {
  await expireStaleOrders();

  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllOrders() {
  return db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
    },
  });
}

export type AdminOrderStatus = "SHIPPED" | "COMPLETED" | "CANCELLED";

/** 后台状态流转：PAID → SHIPPED → COMPLETED；CANCELLED 可从任意状态。 */
export async function adminUpdateOrderStatus(
  orderId: string,
  nextStatus: AdminOrderStatus,
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!order) {
    throw new OrderError("订单不存在", 404);
  }

  if (nextStatus === "CANCELLED") {
    return cancelOrder(order.userId, orderId);
  }

  const requiredStatus = nextStatus === "SHIPPED" ? "PAID" : "SHIPPED";
  if (order.status !== requiredStatus) {
    throw new OrderError(
      nextStatus === "SHIPPED"
        ? "只有已支付订单可以发货"
        : "只有已发货订单可以完成",
      400,
    );
  }

  const updated = await db.order.updateMany({
    where: { id: orderId, status: requiredStatus },
    data: { status: nextStatus },
  });
  if (updated.count === 0) {
    throw new OrderError("订单状态已变化，请刷新后重试", 409);
  }

  return db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/** 取消超过支付窗口的 PENDING 订单；并发下已处理的订单会被跳过。 */
export async function expireStaleOrders(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PENDING_ORDER_TTL_MS);
  const stale = await db.order.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true, userId: true },
    take: 100,
  });

  let count = 0;
  for (const order of stale) {
    try {
      await cancelOrder(order.userId, order.id);
      count += 1;
    } catch {
      // 已被其他请求取消或状态已变化
    }
  }
  return count;
}

export async function getOrderForUser(
  userId: string,
  orderId: string,
): Promise<OrderWithItems | null> {
  // 查看详情时也清理过期订单，避免页面继续展示可支付状态
  await expireStaleOrders();

  return db.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
}

export async function payOrder(
  userId: string,
  orderId: string,
): Promise<OrderWithItems> {
  const existing = await db.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, status: true, createdAt: true },
  });
  if (!existing) {
    throw new OrderError("订单不存在", 404);
  }

  const cutoff = Date.now() - PENDING_ORDER_TTL_MS;
  if (
    existing.status === "PENDING" &&
    existing.createdAt.getTime() < cutoff
  ) {
    // 先释放库存，再把超时结果返回给用户
    await cancelOrder(userId, orderId).catch(() => {});
    throw new OrderError("订单已超时并自动取消，请重新下单", 400);
  }

  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, totalAmount: true, createdAt: true },
    });
    if (!order) {
      throw new OrderError("订单不存在", 404);
    }
    if (order.createdAt.getTime() < cutoff) {
      throw new OrderError("订单已超时并自动取消，请重新下单", 400);
    }

    // 条件更新保证并发重复支付只有一个成功，同时再次锁定支付窗口
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: "PENDING",
        createdAt: { gte: new Date(cutoff) },
      },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new OrderError("订单状态不可支付", 400);
    }

    // 原子累加，避免并发读改写互相覆盖
    const user = await tx.user.update({
      where: { id: userId },
      data: { totalSpent: { increment: order.totalAmount } },
      select: { totalSpent: true, membershipLevel: true },
    });
    const currentLevel = isMembershipLevel(user.membershipLevel)
      ? user.membershipLevel
      : "XINYUE_0";
    const nextLevel = upgradeLevel(
      currentLevel,
      getLevelForSpent(user.totalSpent),
    );
    if (nextLevel !== user.membershipLevel) {
      await tx.user.update({
        where: { id: userId },
        data: { membershipLevel: nextLevel },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
  });
}

/** 任意状态都可取消；恢复库存，已支付订单回滚消费并重算会员等级。 */
export async function cancelOrder(
  userId: string,
  orderId: string,
): Promise<OrderWithItems> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) {
      throw new OrderError("订单不存在", 404);
    }
    if (order.status === "CANCELLED") {
      throw new OrderError("订单已取消", 400);
    }

    // 条件更新抢占取消权，避免并发取消重复恢复库存
    const claimed = await tx.order.updateMany({
      where: { id: orderId, userId, status: order.status },
      data: { status: "CANCELLED" },
    });
    if (claimed.count === 0) {
      throw new OrderError("订单状态已变化，请刷新后重试", 409);
    }

    for (const item of order.items) {
      if (item.productId) {
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    if (order.status !== "PENDING") {
      // 原子扣减后再按剩余金额重算等级，防止“支付后取消”保留高等级
      const user = await tx.user.update({
        where: { id: userId },
        data: { totalSpent: { decrement: order.totalAmount } },
        select: { totalSpent: true },
      });
      const nextTotal = Math.max(0, user.totalSpent);
      const nextLevel = getLevelForSpent(nextTotal);
      await tx.user.update({
        where: { id: userId },
        data: { totalSpent: nextTotal, membershipLevel: nextLevel },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
  });
}
