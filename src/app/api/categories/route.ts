import { NextResponse } from "next/server";
import { listCategoriesWithCounts } from "@/lib/products";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search")?.trim() || undefined;

  try {
    const categories = await listCategoriesWithCounts(search);
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("获取分类列表失败", error);
    return NextResponse.json({ error: "获取分类列表失败" }, { status: 500 });
  }
}
