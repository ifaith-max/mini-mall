"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function AdminLogoutButton() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        setError("退出失败");
        return;
      }
      setUser(null);
      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {error ? (
        <span className="text-xs text-red-500">{error}</span>
      ) : null}
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="text-sm text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-60"
      >
        {pending ? "退出中…" : "退出"}
      </button>
    </span>
  );
}
