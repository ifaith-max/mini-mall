"use client";

import { useEffect, useState, type FormEvent } from "react";
import { assertAdminResponse } from "@/lib/admin-client";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
};

const EMPTY_FORM: FormState = { name: "", slug: "", description: "" };

async function fetchCategories() {
  const response = await fetch("/api/admin/categories", {
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: AdminCategory[];
    error?: string;
  };
  assertAdminResponse(response, body.error ?? "加载分类失败");
  return body.data ?? [];
}

export function CategoryManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    fetchCategories()
      .then((data) => {
        if (active) setCategories(data);
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
      setCategories(await fetchCategories());
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载失败",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: form.name.trim(),
          ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
          description: form.description.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      assertAdminResponse(response, body.error ?? "创建失败，请重试");

      setForm(EMPTY_FORM);
      await refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(category: AdminCategory) {
    if (!window.confirm(`确定删除分类「${category.name}」吗？`)) return;

    setError("");
    setPending(true);

    try {
      const response = await fetch(
        `/api/admin/categories/${category.id}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
        },
      );
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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        分类管理
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        共 {categories.length} 个分类。分类下有商品时不能删除。
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">新增分类</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
            <span className="text-sm text-slate-600">slug（可选）</span>
            <input
              type="text"
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
              placeholder="例如 home"
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-600">描述（可选）</span>
            <input
              type="text"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-5 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "提交中…" : "创建分类"}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-normal">分类</th>
              <th className="px-4 py-3 font-normal">slug</th>
              <th className="px-4 py-3 font-normal">描述</th>
              <th className="px-4 py-3 font-normal">商品数</th>
              <th className="px-4 py-3 font-normal">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {category.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {category.slug}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {category.description ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {category.productCount}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pending || category.productCount > 0}
                    onClick={() => void handleDelete(category)}
                    className="text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            暂无分类。
          </p>
        ) : null}
      </div>
    </div>
  );
}
