import { describe, expect, it } from "vitest";
import { mergeGuestCart, normalizeGuestCart } from "@/lib/cart-storage";
import { getSafeImageUrl } from "@/lib/images";
import { getPaginationItems } from "@/lib/pagination";
import { buildProductListHref } from "@/lib/product-href";
import { formatDiscount } from "@/lib/price";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimit,
} from "@/lib/rate-limit";
import { firstParam, safeNextPath } from "@/lib/search-params";

const baseItem = {
  productId: "p1",
  slug: "p1",
  name: "测试商品",
  price: 100,
  imageUrl: "https://picsum.photos/seed/p1/800/800",
  stock: 2,
};

describe("firstParam", () => {
  it("重复查询参数时取第一项", () => {
    expect(firstParam(["a", "b"])).toBe("a");
  });

  it("undefined 返回空字符串", () => {
    expect(firstParam(undefined)).toBe("");
  });

  it("去除首尾空格", () => {
    expect(firstParam("  x ")).toBe("x");
  });
});

describe("safeNextPath", () => {
  it("允许站内路径", () => {
    expect(safeNextPath("/cart?page=1")).toBe("/cart?page=1");
  });

  it("拒绝协议相对地址", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
  });

  it("拒绝反斜杠绕过", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("/%5Cevil.com")).toBe("/");
  });
});

describe("formatDiscount", () => {
  it("无折扣", () => {
    expect(formatDiscount(10000)).toBe("无折扣");
  });

  it("保留非整数折扣精度", () => {
    expect(formatDiscount(9800)).toBe("9.8 折");
    expect(formatDiscount(9990)).toBe("9.99 折");
    expect(formatDiscount(9999)).toBe("9.999 折");
  });
});

describe("buildProductListHref", () => {
  it("无筛选时返回首页", () => {
    expect(buildProductListHref({})).toBe("/");
  });

  it("保留搜索、分类和页码", () => {
    expect(
      buildProductListHref({ search: "耳机", category: "digital", page: 2 }),
    ).toBe("/?search=%E8%80%B3%E6%9C%BA&category=digital&page=2");
  });

  it("第 1 页不写入 page 参数", () => {
    expect(buildProductListHref({ category: "digital", page: 1 })).toBe(
      "/?category=digital",
    );
  });

  it("保留非默认排序参数", () => {
    expect(
      buildProductListHref({ search: "耳机", sort: "price-asc" }),
    ).toBe("/?search=%E8%80%B3%E6%9C%BA&sort=price-asc");
  });

  it("默认排序不写入参数", () => {
    expect(buildProductListHref({ sort: "latest" })).toBe("/");
  });
});

describe("getSafeImageUrl", () => {
  it("允许配置过的图片域名", () => {
    expect(
      getSafeImageUrl("https://picsum.photos/seed/a/800/800"),
    ).toBe("https://picsum.photos/seed/a/800/800");
  });

  it("未知域名返回 null，避免 next/image 让整页崩溃", () => {
    expect(getSafeImageUrl("https://cdn.example.com/a.jpg")).toBeNull();
  });

  it("非法 URL 返回 null", () => {
    expect(getSafeImageUrl("not-a-url")).toBeNull();
  });

  it("允许站内绝对路径", () => {
    expect(getSafeImageUrl("/images/a.png")).toBe("/images/a.png");
  });

  it("拒绝协议相对地址与反斜杠绕过", () => {
    expect(getSafeImageUrl("//evil.com/a.png")).toBeNull();
    expect(getSafeImageUrl("/\\evil.com/a.png")).toBeNull();
  });
});

describe("checkRateLimit", () => {
  it("窗口内超过上限后拒绝并给出重试时间", () => {
    const key = `test:${Math.random()}`;
    const now = 1_000_000;

    expect(checkRateLimit(key, 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, now + 1).allowed).toBe(true);

    const blocked = checkRateLimit(key, 2, 60_000, now + 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("窗口结束后重新计数", () => {
    const key = `test:${Math.random()}`;
    const now = 2_000_000;

    expect(checkRateLimit(key, 1, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000, now + 1).allowed).toBe(false);
    expect(checkRateLimit(key, 1, 60_000, now + 60_000).allowed).toBe(true);
  });

  it("resetRateLimit 可清空指定计数", () => {
    const key = `test:${Math.random()}`;
    const now = 3_000_000;

    expect(checkRateLimit(key, 1, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000, now + 1).allowed).toBe(false);

    resetRateLimit(key);
    expect(checkRateLimit(key, 1, 60_000, now + 2).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("未配置可信代理时忽略可伪造的 x-forwarded-for", () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    expect(getClientIp(request)).toBe("unknown");
  });

  it("配置可信代理后取代理写入的真实客户端地址", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    try {
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-for": "203.0.113.9, 198.51.100.7" },
      });

      expect(getClientIp(request)).toBe("198.51.100.7");
    } finally {
      delete process.env.TRUSTED_PROXY_HOPS;
    }
  });
});

describe("getPaginationItems", () => {
  it("页数较少时全部展示", () => {
    expect(getPaginationItems(1, 2)).toEqual([1, 2]);
  });

  it("页数较多时只展示当前页附近与首尾页", () => {
    expect(getPaginationItems(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  it("首页附近不生成多余省略号", () => {
    expect(getPaginationItems(1, 10)).toEqual([
      1,
      2,
      3,
      4,
      "ellipsis",
      10,
    ]);
  });
});

describe("normalizeGuestCart", () => {
  it("过滤负数和小数数量", () => {
    const raw = JSON.stringify([
      { ...baseItem, productId: "negative", quantity: -5 },
      { ...baseItem, productId: "fraction", quantity: 1.5 },
      { ...baseItem, productId: "valid", quantity: 2 },
    ]);

    expect(normalizeGuestCart(raw).map((item) => item.productId)).toEqual([
      "valid",
    ]);
  });

  it("旧数据缺少 stock 时按 99 处理", () => {
    const raw = JSON.stringify([
      { productId: "p1", slug: "p1", name: "旧商品", price: 100, imageUrl: "", quantity: 1 },
    ]);

    expect(normalizeGuestCart(raw)[0]?.stock).toBe(99);
  });

  it("损坏的 JSON 返回空数组", () => {
    expect(normalizeGuestCart("{broken")).toEqual([]);
  });
});

describe("mergeGuestCart", () => {
  it("同商品累加但不超过库存", () => {
    const once = mergeGuestCart([], baseItem, 1);
    const twice = mergeGuestCart(once, baseItem, 5);

    expect(twice).toHaveLength(1);
    expect(twice[0]?.quantity).toBe(2);
  });

  it("库存为 0 时不加入购物车", () => {
    expect(mergeGuestCart([], { ...baseItem, stock: 0 }, 1)).toEqual([]);
  });

  it("新商品的小数数量向下取整，至少为 1", () => {
    expect(mergeGuestCart([], baseItem, 1.7)[0]?.quantity).toBe(1);
    expect(mergeGuestCart([], baseItem, 0)[0]?.quantity).toBe(1);
  });
});
