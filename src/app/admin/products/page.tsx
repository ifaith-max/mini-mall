import type { Metadata } from "next";
import { ProductManager } from "@/components/admin/ProductManager";

export const metadata: Metadata = {
  title: "商品管理",
};

export default function AdminProductsPage() {
  return <ProductManager />;
}
