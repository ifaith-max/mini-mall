import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = {
  title: "分类管理",
};

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
