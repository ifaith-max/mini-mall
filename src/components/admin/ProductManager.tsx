"use client";

import { useEffect, useState, type FormEvent } from "react";
import { assertAdminResponse } from "@/lib/admin-client";
import { formatPrice } from "@/lib/price";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string; slug: string };
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  priceYuan: string;
  imageUrl: string;
  stock: string;
  isActive: boolean;
  categoryId: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  priceYuan: "",
  imageUrl: "",
  stock: "0",
  isActive: true,
  categoryId: "",
};

async function fetchAdminData() {
  const [productResponse, categoryResponse] = await Promise.all([
    fetch("/api/admin/products", { credentials: "same-origin" }),
    fetch("/api/admin/categories", { credentials: "same-origin" }),
  ]);
  const productBody = (await productResponse.json().catch(() => ({}))) as {
    data?: AdminProduct[];
    error?: string;
  };
  const categoryBody = (await categoryResponse.json().catch(() => ({}))) as {
    data?: AdminCategory[];
    error?: string;
  };

  assertAdminResponse(
    productResponse,
    productBody.error ?? "加载后台数据失败",
  );
  assertAdminResponse(
    categoryResponse,
    categoryBody.error ?? "加载后台数据失败",
  );

  return {
    products: productBody.data ?? [],
    categories: categoryBody.data ?? [],
  };
}

export function ProductManager() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    fetchAdminData()
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setCategories(data.categories);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "加载失败",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    try {
      const data = await fetchAdminData();
      setProducts(data.products);
      setCategories(data.categories);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载失败",
      );
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? "" });
    setShowForm(true);
    setError("");
  }

  function startEdit(product: AdminProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceYuan: (product.price / 100).toFixed(2),
      imageUrl: product.imageUrl,
      stock: String(product.stock),
      isActive: product.isActive,
      categoryId: product.categoryId,
    });
    setShowForm(true);
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const price = Number(form.priceYuan);
    const stock = Number(form.stock);
    if (!form.priceYuan.trim() || !Number.isFinite(price) || price < 0) {
      setError("请输入正确的价格");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError("库存必须是非负整数");
      return;
    }
    if (!form.categoryId) {
      setError("请选择分类");
      return;
    }

    setPending(true);

    try {
      const payload = {
        name: form.name.trim(),
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
        description: form.description.trim(),
        price: Math.round(price * 100),
        imageUrl: form.imageUrl.trim(),
        stock,
        isActive: form.isActive,
        categoryId: form.categoryId,
      };

      const response = await fetch(
        editingId
          ? `/api/admin/products/${editingId}`
          : "/api/admin/products",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      assertAdminResponse(response, body.error ?? "保存失败，请重试");

      closeForm();
      await refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(product: AdminProduct) {
    if (!window.confirm(`确定删除「${product.name}」吗？`)) return;

    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      assertAdminResponse(response, body.error ?? "删除失败，请重试");

      await refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            商品管理
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            共 {products.length} 件商品（含下架）。
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          新增商品
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? "编辑商品" : "新增商品"}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-600">名称</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">slug（可选，留空自动生成）</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                placeholder="例如 wireless-headphones"
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">分类</span>
              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.target.value })
                }
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              >
                <option value="">请选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">价格（元）</span>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.priceYuan}
                onChange={(event) =>
                  setForm({ ...form, priceYuan: event.target.value })
                }
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">库存</span>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  setForm({ ...form, stock: event.target.value })
                }
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">图片 URL</span>
              <input
                type="text"
                required
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
                placeholder="/images/products/xxx.png 或 https://..."
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm text-slate-600">描述</span>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-2 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
              />
              上架销售
            </label>
          </div>

          {categories.length === 0 ? (
            <p className="mt-3 text-sm text-blue-600">
              还没有分类，请先到分类管理中创建。
            </p>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-normal">商品</th>
              <th className="px-4 py-3 font-normal">分类</th>
              <th className="px-4 py-3 font-normal">价格</th>
              <th className="px-4 py-3 font-normal">库存</th>
              <th className="px-4 py-3 font-normal">状态</th>
              <th className="px-4 py-3 font-normal">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="font-mono text-xs text-slate-400">
                    {product.slug}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {product.category.name}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {formatPrice(product.price)}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {product.stock}
                </td>
                <td className="px-4 py-3">
                  {product.isActive ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      上架
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      下架
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(product)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void handleDelete(product)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            暂无商品，点击“新增商品”创建。
          </p>
        ) : null}
      </div>
    </div>
  );
}
