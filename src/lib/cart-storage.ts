export const GUEST_CART_STORAGE_KEY = "mini-mall-cart";
export const MAX_CART_QUANTITY = 99;
const UNKNOWN_STOCK = 99;

export type GuestCartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  quantity: number;
};

function normalizeStock(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : UNKNOWN_STOCK;
}

function normalizeQuantity(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : null;
}

/** 解析并清洗 localStorage 数据，过滤负数量、小数、损坏条目。 */
export function normalizeGuestCart(raw: string | null): GuestCartItem[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;

      if (
        typeof item.productId !== "string" ||
        typeof item.slug !== "string" ||
        typeof item.name !== "string" ||
        typeof item.price !== "number" ||
        typeof item.imageUrl !== "string"
      ) {
        return [];
      }

      const quantity = normalizeQuantity(item.quantity);
      if (quantity === null) return [];

      const stock = normalizeStock(item.stock);
      const safeQuantity = Math.min(quantity, stock, MAX_CART_QUANTITY);
      if (safeQuantity < 1) return [];

      return [
        {
          productId: item.productId,
          slug: item.slug,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          stock,
          quantity: safeQuantity,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    return normalizeGuestCart(
      window.localStorage.getItem(GUEST_CART_STORAGE_KEY),
    );
  } catch {
    // 禁用站点数据时访问 localStorage 会抛 SecurityError
    return [];
  }
}

/** 合并加购：同商品累加，数量不超过库存和单件上限。 */
export function mergeGuestCart(
  cart: GuestCartItem[],
  item: Omit<GuestCartItem, "quantity">,
  quantity = 1,
): GuestCartItem[] {
  const stock = Math.max(0, Math.floor(item.stock));
  if (stock <= 0) return cart;

  const maxQuantity = Math.min(MAX_CART_QUANTITY, stock);
  const delta = Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1));
  const next = cart.map((entry) => ({ ...entry }));
  const existing = next.find((entry) => entry.productId === item.productId);

  if (existing) {
    existing.stock = stock;
    existing.quantity = Math.min(maxQuantity, existing.quantity + delta);
  } else {
    next.push({
      ...item,
      stock,
      quantity: Math.min(maxQuantity, delta),
    });
  }

  return next;
}

export function writeGuestCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 存储不可用时保持静默，页面仍可正常渲染
  }
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // 同上
  }
}

export function addGuestCartItem(
  item: Omit<GuestCartItem, "quantity">,
  quantity = 1,
): void {
  writeGuestCart(mergeGuestCart(readGuestCart(), item, quantity));
}
