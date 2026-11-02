"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addGuestCartItem,
  GUEST_CART_STORAGE_KEY,
  normalizeGuestCart,
  type GuestCartItem,
} from "@/lib/cart-storage";

type CartContextValue = {
  items: GuestCartItem[];
  totalCount: number;
  addItem: (item: Omit<GuestCartItem, "quantity">, quantity?: number) => void;
  refresh: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === GUEST_CART_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners = listeners.filter((item) => item !== listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? "[]";
  } catch {
    // 隐私模式或禁用站点数据时，购物车退化为空而不是让整页崩溃
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

function notify() {
  for (const listener of listeners) listener();
}

/** 购物车共享状态：游客走 localStorage，登录用户从服务端拉取数量。 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = useMemo(() => normalizeGuestCart(raw), [raw]);
  // 记录数量对应的用户，切换账号时不会短暂显示上一个账号的角标
  const [serverCart, setServerCart] = useState<{
    userId: string;
    count: number;
  } | null>(null);
  const [serverRefreshKey, setServerRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    fetch("/api/cart", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setServerCart({ userId, count: 0 });
          return;
        }
        const body = (await response.json().catch(() => ({}))) as {
          data?: { totalQuantity?: number };
        };
        if (!active) return;
        const count = body.data?.totalQuantity;
        setServerCart({
          userId,
          count: typeof count === "number" && count > 0 ? count : 0,
        });
      })
      .catch(() => {
        if (active) setServerCart({ userId, count: 0 });
      });

    return () => {
      active = false;
    };
  }, [userId, serverRefreshKey]);

  const addItem = useCallback(
    (item: Omit<GuestCartItem, "quantity">, quantity = 1) => {
      addGuestCartItem(item, quantity);
      notify();
    },
    [],
  );

  const refresh = useCallback(() => {
    notify();
    setServerRefreshKey((key) => key + 1);
  }, []);

  const guestCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const serverCount =
    userId && serverCart?.userId === userId ? serverCart.count : 0;
  const totalCount = user ? serverCount : guestCount;

  const value = useMemo(
    () => ({ items, totalCount, addItem, refresh }),
    [items, totalCount, addItem, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart 必须在 CartProvider 内使用");
  }
  return context;
}
