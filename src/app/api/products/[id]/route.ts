import { NextResponse } from "next/server";
import { getProductById } from "@/lib/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }
    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("获取商品详情失败", error);
    return NextResponse.json({ error: "获取商品详情失败" }, { status: 500 });
  }
}
