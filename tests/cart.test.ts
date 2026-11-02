import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const { cookieStore } = vi.hoisted(() => {
  const store = new Map<string, { value: string }>();
  return { cookieStore: store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const entry = cookieStore.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, { value });
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

import { setSession } from "@/lib/auth";
import { GET as getCart, POST as addCart } from "@/app/api/cart/route";
import {
  DELETE as deleteCartItem,
  PUT as updateCartItem,
} from "@/app/api/cart/[id]/route";

async function createFixtures() {
  const category = await db.category.create({
    data: { name: "数码", slug: "cart-digital" },
  });
  const product = await db.product.create({
    data: {
      name: "云感降噪耳机",
      slug: "cart-headphones",
      description: "测试商品",
      price: 1000,
      imageUrl: "https://picsum.photos/seed/cart/800/800",
      stock: 5,
      categoryId: category.id,
    },
  });
  const userA = await db.user.create({
    data: { email: "cart-a@example.com", name: "用户 A", passwordHash: "hash" },
  });
  const userB = await db.user.create({
    data: { email: "cart-b@example.com", name: "用户 B", passwordHash: "hash" },
  });

  return { product, userA, userB };
}

function postJson(body: unknown) {
  return new Request("http://localhost/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(body: unknown) {
  return new Request("http://localhost/api/cart/item", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("购物车 API", () => {
  let productId: string;
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    cookieStore.clear();
    await db.cartItem.deleteMany();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.product.deleteMany();
    await db.category.deleteMany();
    await db.user.deleteMany();

    const fixtures = await createFixtures();
    productId = fixtures.product.id;
    userAId = fixtures.userA.id;
    userBId = fixtures.userB.id;
  });

  it("未登录访问返回 401", async () => {
    const response = await getCart();

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("未登录");
  });

  it("拒绝非 JSON 请求", async () => {
    await setSession(userAId, "USER");
    const request = new Request("http://localhost/api/cart", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    const response = await addCart(request);
    expect(response.status).toBe(415);
  });

  it("拒绝跨源请求", async () => {
    await setSession(userAId, "USER");
    const request = new Request("http://localhost/api/cart", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:4000",
        host: "localhost:3000",
      },
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    const response = await addCart(request);
    expect(response.status).toBe(403);
  });

  it("加入购物车并返回合计", async () => {
    await setSession(userAId, "USER");

    const added = await addCart(postJson({ productId, quantity: 2 }));
    expect(added.status).toBe(201);

    const response = await getCart();
    const body = await response.json();

    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].quantity).toBe(2);
    expect(body.data.totalQuantity).toBe(2);
    expect(body.data.totalAmount).toBe(2000);
  });

  it("并发加购不会丢失数量", async () => {
    await setSession(userAId, "USER");

    const [first, second] = await Promise.all([
      addCart(postJson({ productId, quantity: 1 })),
      addCart(postJson({ productId, quantity: 1 })),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const body = await (await getCart()).json();
    expect(body.data.items[0].quantity).toBe(2);
  });

  it("重复加入同一商品会累加数量", async () => {
    await setSession(userAId, "USER");

    await addCart(postJson({ productId, quantity: 1 }));
    await addCart(postJson({ productId, quantity: 1 }));

    const body = await (
      await getCart()
    ).json();
    expect(body.data.items[0].quantity).toBe(2);
  });

  it("累加后超过库存返回 400", async () => {
    await setSession(userAId, "USER");
    await addCart(postJson({ productId, quantity: 3 }));

    const response = await addCart(postJson({ productId, quantity: 3 }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("库存不足");
  });

  it("修改数量并校验库存", async () => {
    await setSession(userAId, "USER");
    const added = await addCart(postJson({ productId, quantity: 1 }));
    const itemId = (await added.json()).data.id;

    const updated = await updateCartItem(
      putJson({ quantity: 4 }),
      context(itemId),
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).data.quantity).toBe(4);

    const overStock = await updateCartItem(
      putJson({ quantity: 6 }),
      context(itemId),
    );
    expect(overStock.status).toBe(400);
    expect((await overStock.json()).error).toBe("库存不足");
  });

  it("删除购物车项", async () => {
    await setSession(userAId, "USER");
    const added = await addCart(postJson({ productId, quantity: 1 }));
    const itemId = (await added.json()).data.id;

    const removed = await deleteCartItem(
      new Request(`http://localhost/api/cart/${itemId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }),
      context(itemId),
    );
    expect(removed.status).toBe(200);

    const body = await (
      await getCart()
    ).json();
    expect(body.data.items).toHaveLength(0);
  });

  it("下架商品可以减少数量但不能增加", async () => {
    await setSession(userAId, "USER");
    const added = await addCart(postJson({ productId, quantity: 2 }));
    const itemId = (await added.json()).data.id;

    await db.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    const decrease = await updateCartItem(
      putJson({ quantity: 1 }),
      context(itemId),
    );
    expect(decrease.status).toBe(200);
    expect((await decrease.json()).data.quantity).toBe(1);

    const increase = await updateCartItem(
      putJson({ quantity: 2 }),
      context(itemId),
    );
    expect(increase.status).toBe(400);
    expect((await increase.json()).error).toContain("已下架");
  });

  it("DELETE 也拒绝非 JSON 请求", async () => {
    await setSession(userAId, "USER");
    const added = await addCart(postJson({ productId, quantity: 1 }));
    const itemId = (await added.json()).data.id;

    const response = await deleteCartItem(
      new Request(`http://localhost/api/cart/${itemId}`, {
        method: "DELETE",
      }),
      context(itemId),
    );

    expect(response.status).toBe(415);
  });

  it("不能修改或删除其他用户的购物车项", async () => {
    await setSession(userAId, "USER");
    const added = await addCart(postJson({ productId, quantity: 1 }));
    const itemId = (await added.json()).data.id;

    await setSession(userBId, "USER");

    const updated = await updateCartItem(
      putJson({ quantity: 2 }),
      context(itemId),
    );
    const removed = await deleteCartItem(
      new Request(`http://localhost/api/cart/${itemId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }),
      context(itemId),
    );

    expect(updated.status).toBe(404);
    expect(removed.status).toBe(404);
  });

  it("加入不存在的商品返回 404", async () => {
    await setSession(userAId, "USER");

    const response = await addCart(
      postJson({ productId: "not-exists", quantity: 1 }),
    );

    expect(response.status).toBe(404);
  });
});
