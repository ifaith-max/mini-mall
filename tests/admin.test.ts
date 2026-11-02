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
import { createOrderFromCart } from "@/lib/orders";
import {
  GET as listProducts,
  POST as createProduct,
} from "@/app/api/admin/products/route";
import {
  DELETE as deleteProduct,
  PUT as updateProduct,
} from "@/app/api/admin/products/[id]/route";
import {
  GET as listCategories,
  POST as createCategory,
} from "@/app/api/admin/categories/route";
import { DELETE as deleteCategory } from "@/app/api/admin/categories/[id]/route";
import { GET as listOrders } from "@/app/api/admin/orders/route";
import { PUT as updateOrderStatus } from "@/app/api/admin/orders/[id]/route";

const receiver = {
  receiverName: "张三",
  receiverPhone: "13800138000",
  receiverAddr: "上海市徐汇区示例路 1 号",
};

function postJson(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

const productBody = {
  name: "测试耳机",
  slug: "test-headphones",
  description: "后台创建的商品",
  price: 19900,
  imageUrl: "https://picsum.photos/seed/admin/800/800",
  stock: 10,
  isActive: true,
  categoryId: "",
};

describe("后台管理 API", () => {
  let adminId: string;
  let userId: string;
  let categoryId: string;
  let productId: string;

  beforeEach(async () => {
    cookieStore.clear();
    await db.orderItem.deleteMany();
    await db.order.deleteMany();
    await db.cartItem.deleteMany();
    await db.product.deleteMany();
    await db.category.deleteMany();
    await db.user.deleteMany();

    const category = await db.category.create({
      data: { name: "数码", slug: "admin-digital" },
    });
    categoryId = category.id;

    const product = await db.product.create({
      data: {
        name: "商品 A",
        slug: "admin-product-a",
        description: "测试商品",
        price: 9900,
        imageUrl: "https://picsum.photos/seed/admin-a/800/800",
        stock: 5,
        categoryId,
      },
    });
    productId = product.id;

    const admin = await db.user.create({
      data: {
        email: "admin-test@example.com",
        name: "管理员",
        passwordHash: "hash",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const user = await db.user.create({
      data: {
        email: "normal-test@example.com",
        name: "普通用户",
        passwordHash: "hash",
        role: "USER",
      },
    });
    userId = user.id;
  });

  it("未登录 401，非管理员 403", async () => {
    const anonymous = await listProducts(
      new Request("http://localhost/api/admin/products"),
    );
    expect(anonymous.status).toBe(401);

    await setSession(userId, "USER");
    const forbidden = await listProducts(
      new Request("http://localhost/api/admin/products"),
    );
    expect(forbidden.status).toBe(403);
  });

  it("管理员被删除后旧 token 立即失效", async () => {
    await setSession(adminId, "ADMIN");
    await db.user.delete({ where: { id: adminId } });

    const response = await listProducts(
      new Request("http://localhost/api/admin/products"),
    );

    expect(response.status).toBe(401);
  });

  it("管理员可以获取全部商品（包含下架）", async () => {
    await db.product.create({
      data: {
        name: "下架商品",
        slug: "admin-inactive",
        description: "下架",
        price: 100,
        imageUrl: "",
        stock: 0,
        isActive: false,
        categoryId,
      },
    });
    await setSession(adminId, "ADMIN");

    const response = await listProducts(
      new Request("http://localhost/api/admin/products"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("创建商品并处理 slug 冲突", async () => {
    await setSession(adminId, "ADMIN");

    const created = await createProduct(
      postJson("/api/admin/products", { ...productBody, categoryId }),
    );
    expect(created.status).toBe(201);
    expect((await created.json()).data.slug).toBe("test-headphones");

    const duplicate = await createProduct(
      postJson("/api/admin/products", { ...productBody, categoryId }),
    );
    expect(duplicate.status).toBe(409);
  });

  it("拒绝不在白名单的图片域名", async () => {
    await setSession(adminId, "ADMIN");

    const response = await createProduct(
      postJson("/api/admin/products", {
        ...productBody,
        categoryId,
        imageUrl: "https://example.com/x.jpg",
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("允许列表");
  });

  it("更新和删除商品", async () => {
    await setSession(adminId, "ADMIN");

    const updated = await updateProduct(
      putJson("/api/admin/products/admin-product-a", {
        ...productBody,
        slug: "admin-product-a",
        name: "商品 A 已更新",
        categoryId,
      }),
      context(productId),
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).data.name).toBe("商品 A 已更新");

    const removed = await deleteProduct(
      new Request("http://localhost/api/admin/products/admin-product-a", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }),
      context(productId),
    );
    expect(removed.status).toBe(200);
    expect(await db.product.count({ where: { id: productId } })).toBe(0);
  });

  it("分类列表返回商品数，删除有商品的分类返回 409", async () => {
    await setSession(adminId, "ADMIN");

    const list = await listCategories(
      new Request("http://localhost/api/admin/categories"),
    );
    const body = await list.json();
    expect(body.data[0].productCount).toBe(1);

    const removed = await deleteCategory(
      new Request("http://localhost/api/admin/categories/admin-digital", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }),
      context(categoryId),
    );
    expect(removed.status).toBe(409);
  });

  it("创建分类并删除空分类", async () => {
    await setSession(adminId, "ADMIN");

    const created = await createCategory(
      postJson("/api/admin/categories", {
        name: "家居",
        slug: "admin-home",
        description: "家居分类",
      }),
    );
    const createdBody = await created.json();
    expect(created.status).toBe(201);

    const removed = await deleteCategory(
      new Request(`http://localhost/api/admin/categories/${createdBody.data.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }),
      context(createdBody.data.id),
    );
    expect(removed.status).toBe(200);
  });

  it("订单列表返回所有用户订单", async () => {
    await db.cartItem.create({
      data: { userId, productId, quantity: 1 },
    });
    await createOrderFromCart(userId, receiver);
    await setSession(adminId, "ADMIN");

    const response = await listOrders(
      new Request("http://localhost/api/admin/orders"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].user.email).toBe("normal-test@example.com");
  });

  it("订单状态按 PAID → SHIPPED → COMPLETED 流转", async () => {
    await db.cartItem.create({
      data: { userId, productId, quantity: 1 },
    });
    const order = await createOrderFromCart(userId, receiver);
    await db.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    await setSession(adminId, "ADMIN");

    const shipped = await updateOrderStatus(
      putJson(`/api/admin/orders/${order.id}`, { status: "SHIPPED" }),
      context(order.id),
    );
    expect(shipped.status).toBe(200);

    const completed = await updateOrderStatus(
      putJson(`/api/admin/orders/${order.id}`, { status: "COMPLETED" }),
      context(order.id),
    );
    expect(completed.status).toBe(200);

    const invalid = await updateOrderStatus(
      putJson(`/api/admin/orders/${order.id}`, { status: "SHIPPED" }),
      context(order.id),
    );
    expect(invalid.status).toBe(400);
  });

  it("管理员取消订单会恢复库存", async () => {
    await db.cartItem.create({
      data: { userId, productId, quantity: 2 },
    });
    const order = await createOrderFromCart(userId, receiver);
    await db.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    await setSession(adminId, "ADMIN");

    const response = await updateOrderStatus(
      putJson(`/api/admin/orders/${order.id}`, { status: "CANCELLED" }),
      context(order.id),
    );

    expect(response.status).toBe(200);
    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);
  });
});
