import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { GET as getProductList } from "@/app/api/products/route";
import { GET as getProductDetail } from "@/app/api/products/[id]/route";
import { GET as getCategoryList } from "@/app/api/categories/route";
import { listProducts } from "@/lib/products";

let digitalId: string;
let firstProductId: string;

async function resetData() {
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  const digital = await db.category.create({
    data: { name: "数码", slug: "digital" },
  });
  const home = await db.category.create({
    data: { name: "家居", slug: "home" },
  });
  digitalId = digital.id;

  for (let i = 1; i <= 12; i += 1) {
    const product = await db.product.create({
      data: {
        name: i === 1 ? "云感降噪耳机" : `数码商品 ${i}`,
        slug: `digital-${i}`,
        description: `数码商品描述 ${i}`,
        price: 10_000 + i,
        imageUrl: `https://picsum.photos/seed/digital-${i}/800/800`,
        stock: 10,
        categoryId: digital.id,
      },
    });
    if (i === 1) firstProductId = product.id;
  }

  await db.product.create({
    data: {
      name: "亚麻云朵抱枕",
      slug: "linen-cloud-cushion",
      description: "家居商品描述",
      price: 12_900,
      imageUrl: "https://picsum.photos/seed/home-1/800/800",
      stock: 5,
      categoryId: home.id,
    },
  });

  await db.product.create({
    data: {
      name: "已下架商品",
      slug: "inactive-product",
      description: "不应出现在列表和分类计数中",
      price: 100,
      imageUrl: "https://picsum.photos/seed/inactive/800/800",
      stock: 0,
      isActive: false,
      categoryId: home.id,
    },
  });
}

describe("商品公开 API", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("GET /api/products 默认返回第一页 9 条", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(9);
    expect(body.meta).toMatchObject({
      page: 1,
      pageSize: 9,
      total: 13,
      totalPages: 2,
    });
  });

  it("GET /api/products?page=2 返回剩余 4 条", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?page=2"),
    );
    const body = await response.json();

    expect(body.data).toHaveLength(4);
    expect(body.meta.page).toBe(2);
  });

  it("GET /api/products?page=999 钳制到最后一页", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?page=999"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.page).toBe(2);
    expect(body.data).toHaveLength(4);
  });

  it("GET /api/products?page=1e21 不因 skip 溢出而 500", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?page=1e21"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.page).toBe(2);
  });

  it("相同 createdAt 时分页不重复、不遗漏", async () => {
    await db.product.updateMany({
      data: { createdAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    const first = await listProducts({ page: 1 });
    const second = await listProducts({ page: 2 });
    const ids = [...first.products, ...second.products].map(
      (product) => product.id,
    );

    expect(ids).toHaveLength(13);
    expect(new Set(ids).size).toBe(13);
  });

  it("GET /api/products?search=耳机 只返回名称匹配的商品", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?search=耳机"),
    );
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("云感降噪耳机");
  });

  it("GET /api/products?category=digital 按分类 slug 过滤", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?category=digital"),
    );
    const body = await response.json();

    expect(body.meta.total).toBe(12);
    expect(body.data.every((item: { category: { id: string } }) => item.category.id === digitalId)).toBe(true);
  });

  it("GET /api/products?sort=price-asc 按价格升序", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?sort=price-asc"),
    );
    const body = await response.json();
    const prices = body.data.map((item: { price: number }) => item.price);

    expect(response.status).toBe(200);
    expect(body.meta.sort).toBe("price-asc");
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[0]).toBe(10_001);
  });

  it("GET /api/products?sort=price-desc 按价格降序", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?sort=price-desc"),
    );
    const body = await response.json();
    const prices = body.data.map((item: { price: number }) => item.price);

    expect(body.meta.sort).toBe("price-desc");
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(prices[0]).toBe(12_900);
  });

  it("GET /api/products?sort=unknown 回退最新排序", async () => {
    const response = await getProductList(
      new Request("http://localhost/api/products?sort=unknown"),
    );
    const body = await response.json();

    expect(body.meta.sort).toBe("latest");
  });

  it("GET /api/products/[id] 返回商品详情和分类信息", async () => {
    const response = await getProductDetail(
      new Request(`http://localhost/api/products/${firstProductId}`),
      { params: Promise.resolve({ id: firstProductId }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(firstProductId);
    expect(body.data.category).toMatchObject({ id: digitalId, name: "数码", slug: "digital" });
  });

  it("GET /api/products/[id] 商品不存在时返回 404", async () => {
    const response = await getProductDetail(
      new Request("http://localhost/api/products/not-exists"),
      { params: Promise.resolve({ id: "not-exists" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("商品不存在");
  });

  it("GET /api/categories 返回分类及在售商品数量", async () => {
    const response = await getCategoryList(
      new Request("http://localhost/api/categories"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    const digital = body.data.find((item: { slug: string }) => item.slug === "digital");
    const home = body.data.find((item: { slug: string }) => item.slug === "home");

    expect(digital.productCount).toBe(12);
    expect(home.productCount).toBe(1);
  });

  it("GET /api/categories?search=耳机 分类计数跟随搜索", async () => {
    const response = await getCategoryList(
      new Request(
        "http://localhost/api/categories?search=%E8%80%B3%E6%9C%BA",
      ),
    );
    const body = await response.json();
    const digital = body.data.find((item: { slug: string }) => item.slug === "digital");
    const home = body.data.find((item: { slug: string }) => item.slug === "home");

    expect(digital.productCount).toBe(1);
    expect(home.productCount).toBe(0);
  });
});
