import { NextResponse } from "next/server";
import { parseProductSort } from "@/lib/product-sort";
import { listProducts } from "@/lib/products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const category = searchParams.get("category")?.trim() || undefined;
  const sort = parseProductSort(searchParams.get("sort"));
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  try {
    const result = await listProducts({ search, category, page, sort });
    return NextResponse.json({
      data: result.products,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
        sort: result.sort,
      },
    });
  } catch (error) {
    console.error("获取商品列表失败", error);
    return NextResponse.json({ error: "获取商品列表失败" }, { status: 500 });
  }
}
