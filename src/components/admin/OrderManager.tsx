"use client";

import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { assertAdminResponse } from "@/lib/admin-client";
import { formatDateTime } from "@/lib/date";
import { formatPrice } from "@/lib/price";

type AdminOrder = {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  _count: { items: number };
};

type NextStatus = "SHIPPED" | "COMPLETED" | "CANCELLED";

async function fetchOrders() {
  const response = await fetch("/api/admin/orders", {
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: AdminOrder[];
    error?: string;
  };
  assertAdminResponse(response, body.error ?? "加载订单失败");
  return body.data ?? [];
}

export function OrderManager() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchOrders()
      .then((data) => {
        if (active) setOrders(data);
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
      setOrders(await fetchOrders());
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载失败",
      );
    }
  }

  async function updateStatus(order: AdminOrder, status: NextStatus) {
    if (
      status === "CANCELLED" &&
      !window.confirm(`确定取消订单 ${order.orderNo} 吗？`)
    ) {
      return;
    }

    setError("");
    setPendingId(order.id);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      assertAdminResponse(response, body.error ?? "更新失败，请重试");

      await refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        订单管理
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        共 {orders.length} 笔订单。发货与完成由管理员操作，取消会恢复库存。
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-normal">订单号</th>
              <th className="px-4 py-3 font-normal">用户</th>
              <th className="px-4 py-3 font-normal">金额</th>
              <th className="px-4 py-3 font-normal">状态</th>
              <th className="px-4 py-3 font-normal">时间</th>
              <th className="px-4 py-3 font-normal">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {order.orderNo}
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-900">{order.user.name}</p>
                  <p className="text-xs text-slate-400">{order.user.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {formatPrice(order.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {formatDateTime(order.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {order.status === "PAID" ? (
                      <button
                        type="button"
                        disabled={pendingId === order.id}
                        onClick={() => void updateStatus(order, "SHIPPED")}
                        className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        发货
                      </button>
                    ) : null}

                    {order.status === "SHIPPED" ? (
                      <button
                        type="button"
                        disabled={pendingId === order.id}
                        onClick={() => void updateStatus(order, "COMPLETED")}
                        className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        完成
                      </button>
                    ) : null}

                    {order.status !== "CANCELLED" ? (
                      <button
                        type="button"
                        disabled={pendingId === order.id}
                        onClick={() => void updateStatus(order, "CANCELLED")}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        取消
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            暂无订单。
          </p>
        ) : null}
      </div>
    </div>
  );
}
