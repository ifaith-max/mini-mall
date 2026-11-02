"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderActionsProps = {
  orderId: string;
  status: string;
};

export function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: "PAID" | "CANCELLED") {
    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "操作失败，请重试");
        return;
      }

      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPending(false);
    }
  }

  if (status === "CANCELLED") {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-4">
        {status === "PENDING" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => updateStatus("PAID")}
            className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "处理中…" : "模拟支付"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("确定取消订单吗？取消后会恢复库存。")) {
              void updateStatus("CANCELLED");
            }
          }}
          className="rounded-md border border-slate-200 px-6 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          取消订单
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
