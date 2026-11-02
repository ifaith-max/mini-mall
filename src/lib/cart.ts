import { Prisma } from "@prisma/client";
import { db } from "./db";

export const CART_MAX_QUANTITY = 99;

export class CartError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CartError";
    this.status = status;
  }
}

const cartItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      imageUrl: true,
      stock: true,
      isActive: true,
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude;
}>;

export type CartSummary = {
  items: CartItemWithProduct[];
  totalQuantity: number;
  totalAmount: number;
};

function summarize(items: CartItemWithProduct[]): CartSummary {
  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ),
  };
}

export async function getCart(userId: string): Promise<CartSummary> {
  const items = await db.cartItem.findMany({
    where: { userId },
    include: cartItemInclude,
    orderBy: { createdAt: "asc" },
  });
  return summarize(items);
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartItemWithProduct> {
  const product = await db.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, stock: true },
  });
  if (!product) {
    throw new CartError("商品不存在或已下架", 404);
  }

  const maxAllowed = Math.min(product.stock, CART_MAX_QUANTITY);
  if (quantity > maxAllowed) {
    throw new CartError(
      product.stock < quantity ? "库存不足" : "单件商品最多购买 99 件",
      400,
    );
  }

  // 已有项用原子累加，避免并发读改写丢失数量
  const incremented = await db.cartItem.updateMany({
    where: {
      userId,
      productId,
      quantity: { lte: maxAllowed - quantity },
    },
    data: { quantity: { increment: quantity } },
  });
  if (incremented.count > 0) {
    return db.cartItem.findUniqueOrThrow({
      where: { userId_productId: { userId, productId } },
      include: cartItemInclude,
    });
  }

  const existing = await db.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { quantity: true },
  });
  if (existing) {
    throw new CartError(
      existing.quantity + quantity > product.stock
        ? "库存不足"
        : "单件商品最多购买 99 件",
      400,
    );
  }

  try {
    return await db.cartItem.create({
      data: { userId, productId, quantity },
      include: cartItemInclude,
    });
  } catch (error) {
    // 并发创建撞上唯一索引时，退回原子累加
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const retried = await db.cartItem.updateMany({
        where: {
          userId,
          productId,
          quantity: { lte: maxAllowed - quantity },
        },
        data: { quantity: { increment: quantity } },
      });
      if (retried.count > 0) {
        return db.cartItem.findUniqueOrThrow({
          where: { userId_productId: { userId, productId } },
          include: cartItemInclude,
        });
      }
      throw new CartError("库存不足", 400);
    }
    throw error;
  }
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number,
): Promise<CartItemWithProduct> {
  const item = await db.cartItem.findFirst({
    where: { id: itemId, userId },
    select: {
      id: true,
      quantity: true,
      product: { select: { stock: true, isActive: true } },
    },
  });
  if (!item) {
    throw new CartError("购物车项不存在", 404);
  }
  if (!item.product.isActive) {
    // 下架商品仍允许减少数量，只是不能继续增加
    if (quantity > item.quantity) {
      throw new CartError("商品已下架，只能减少数量", 400);
    }
  } else if (quantity > item.quantity && quantity > item.product.stock) {
    throw new CartError("库存不足", 400);
  }
  if (quantity > CART_MAX_QUANTITY) {
    throw new CartError("单件商品最多购买 99 件", 400);
  }

  return db.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: cartItemInclude,
  });
}

export async function removeCartItem(
  userId: string,
  itemId: string,
): Promise<void> {
  const result = await db.cartItem.deleteMany({
    where: { id: itemId, userId },
  });
  if (result.count === 0) {
    throw new CartError("购物车项不存在", 404);
  }
}
