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
import { expireStaleOrders } from "@/lib/orders";
import {
  GET as listOrders,
  POST as createOrder,
} from "@/app/api/orders/route";
import {
  GET as getOrder,
  PUT as updateOrder,
} from "@/app/api/orders/[id]/route";

const receiver = {
  receiverName: "张三",
  receiverPhone: "13800138000",
  receiverAddr: "上海市徐汇区示例路 1 号",
};

function postJson(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(body: unknown) {
  return new Request("http://localhost/api/orders/order", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function createFixtures() {
  const category = await db.category.create({
    data: { name: "数码", slug: "order-digital" },
  });
  const product = await db.product.create({
    data: {
      name: "云感降噪耳机",
      slug: "order-headphones",
      description: "测试商品",
      price: 1000,
      imageUrl: "https://picsum.photos/seed/order/800/800",
      stock: 5,
      categoryId: category.id,
    },
  });
  const user = await db.user.create({
    data: {
      email: "order-user@example.com",
      name: "下单用户",
      passwordHash: "hash",
      totalSpent: 0,
    },
  });
  const other = await db.user.create({
    data: {
      email: "order-other@example.com",
      name: "其他用户",
      passwordHash: "hash",
    },
  });

  return { product, user, other };
}

async function addCartItem(userId: string, productId: string, quantity: number) {
  await db.cartItem.create({ data: { userId, productId, quantity } });
}

describe("订单 API", () => {
  let productId: string;
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    cookieStore.clear();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.cartItem.deleteMany();
    await db.product.deleteMany();
    await db.category.deleteMany();
    await db.user.deleteMany();

    const fixtures = await createFixtures();
    productId = fixtures.product.id;
    userId = fixtures.user.id;
    otherUserId = fixtures.other.id;
  });

  it("未登录创建订单返回 401", async () => {
    const response = await createOrder(postJson(receiver));
    expect(response.status).toBe(401);
  });

  it("购物车为空返回 400", async () => {
    await setSession(userId, "USER");
    const response = await createOrder(postJson(receiver));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("购物车是空的");
  });

  it("拒绝非 JSON 下单请求", async () => {
    await setSession(userId, "USER");
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify(receiver),
    });

    const response = await createOrder(request);
    expect(response.status).toBe(415);
  });

  it("创建订单时扣库存、清空购物车并保存快照", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);

    const response = await createOrder(postJson(receiver));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.orderNo.startsWith("MM")).toBe(true);
    expect(body.data.status).toBe("PENDING");
    expect(body.data.originalAmount).toBe(2000);
    expect(body.data.discountBps).toBe(10000);
    expect(body.data.totalAmount).toBe(2000);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      productName: "云感降噪耳机",
      price: 1000,
      quantity: 2,
    });

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(3);
    expect(await db.cartItem.count({ where: { userId } })).toBe(0);
  });

  it("库存不足时整笔事务回滚，并指出缺货商品", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 6);

    const response = await createOrder(postJson(receiver));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("云感降噪耳机");
    expect(body.error).toContain("库存不足");
    expect(await db.order.count()).toBe(0);
    expect(await db.cartItem.count({ where: { userId } })).toBe(1);

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });

  it("按会员等级计算订单折扣", async () => {
    await db.user.update({
      where: { id: userId },
      data: { membershipLevel: "XINYUE_1" },
    });
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);

    const body = await (await createOrder(postJson(receiver))).json();

    expect(body.data.discountBps).toBe(9800);
    expect(body.data.totalAmount).toBe(1960);
  });

  it("订单列表只返回当前用户的订单", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 1);
    await createOrder(postJson(receiver));

    await setSession(otherUserId, "USER");
    await addCartItem(otherUserId, productId, 1);
    await createOrder(postJson(receiver));

    await setSession(userId, "USER");
    const response = await listOrders();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].userId).toBe(userId);
  });

  it("订单详情只能查看自己的订单", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 1);
    const created = await (await createOrder(postJson(receiver))).json();
    const orderId = created.data.id;

    const own = await getOrder(new Request("http://localhost"), context(orderId));
    expect(own.status).toBe(200);

    await setSession(otherUserId, "USER");
    const other = await getOrder(
      new Request("http://localhost"),
      context(orderId),
    );
    expect(other.status).toBe(404);
  });

  it("模拟支付后状态变为 PAID 并累计消费升级会员", async () => {
    await db.user.update({
      where: { id: userId },
      data: { totalSpent: 599_000, membershipLevel: "XINYUE_0" },
    });
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);
    const created = await (await createOrder(postJson(receiver))).json();

    const response = await updateOrder(
      putJson({ status: "PAID" }),
      context(created.data.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("PAID");
    expect(body.data.paidAt).not.toBeNull();

    const user = await db.user.findUnique({ where: { id: userId } });
    expect(user?.totalSpent).toBe(601_000);
    expect(user?.membershipLevel).toBe("XINYUE_1");
  });

  it("过期未支付订单不能支付并释放库存", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);
    const created = await (await createOrder(postJson(receiver))).json();

    await db.order.update({
      where: { id: created.data.id },
      data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) },
    });

    const response = await updateOrder(
      putJson({ status: "PAID" }),
      context(created.data.id),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("超时");

    const order = await db.order.findUnique({
      where: { id: created.data.id },
    });
    expect(order?.status).toBe("CANCELLED");

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });

  it("重复支付返回 400", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 1);
    const created = await (await createOrder(postJson(receiver))).json();

    await updateOrder(putJson({ status: "PAID" }), context(created.data.id));
    const response = await updateOrder(
      putJson({ status: "PAID" }),
      context(created.data.id),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("订单状态不可支付");

    const user = await db.user.findUnique({ where: { id: userId } });
    expect(user?.totalSpent).toBe(1000);
  });

  it("取消待付款订单会恢复库存", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);
    const created = await (await createOrder(postJson(receiver))).json();

    const response = await updateOrder(
      putJson({ status: "CANCELLED" }),
      context(created.data.id),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("CANCELLED");
    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });

  it("已支付订单取消后回滚累计消费并重算会员等级", async () => {
    await db.user.update({
      where: { id: userId },
      data: { totalSpent: 599_000, membershipLevel: "XINYUE_0" },
    });
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);
    const created = await (await createOrder(postJson(receiver))).json();

    await updateOrder(putJson({ status: "PAID" }), context(created.data.id));
    let user = await db.user.findUnique({ where: { id: userId } });
    expect(user?.totalSpent).toBe(601_000);
    expect(user?.membershipLevel).toBe("XINYUE_1");

    const response = await updateOrder(
      putJson({ status: "CANCELLED" }),
      context(created.data.id),
    );

    expect(response.status).toBe(200);
    user = await db.user.findUnique({ where: { id: userId } });
    expect(user?.totalSpent).toBe(599_000);
    expect(user?.membershipLevel).toBe("XINYUE_0");

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });

  it("重复取消只会恢复一次库存", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);
    const created = await (await createOrder(postJson(receiver))).json();

    const first = await updateOrder(
      putJson({ status: "CANCELLED" }),
      context(created.data.id),
    );
    const second = await updateOrder(
      putJson({ status: "CANCELLED" }),
      context(created.data.id),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });

  it("超过支付窗口的 PENDING 订单会自动取消并释放库存", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 2);
    const created = await (await createOrder(postJson(receiver))).json();

    await db.order.update({
      where: { id: created.data.id },
      data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) },
    });

    const expired = await expireStaleOrders();
    expect(expired).toBeGreaterThanOrEqual(1);

    const order = await db.order.findUnique({
      where: { id: created.data.id },
    });
    expect(order?.status).toBe("CANCELLED");

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });

  it("已发货订单也可以取消（任意状态可取消）", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 1);
    const created = await (await createOrder(postJson(receiver))).json();

    await db.order.update({
      where: { id: created.data.id },
      data: { status: "SHIPPED" },
    });
    const response = await updateOrder(
      putJson({ status: "CANCELLED" }),
      context(created.data.id),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("CANCELLED");
  });

  it("不能支付或取消其他用户的订单", async () => {
    await setSession(userId, "USER");
    await addCartItem(userId, productId, 1);
    const created = await (await createOrder(postJson(receiver))).json();

    await setSession(otherUserId, "USER");
    const paid = await updateOrder(
      putJson({ status: "PAID" }),
      context(created.data.id),
    );
    const cancelled = await updateOrder(
      putJson({ status: "CANCELLED" }),
      context(created.data.id),
    );

    expect(paid.status).toBe(404);
    expect(cancelled.status).toBe(404);
  });
});
