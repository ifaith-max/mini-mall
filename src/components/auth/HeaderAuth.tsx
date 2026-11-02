"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function HeaderAuth() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        setError("退出失败，请重试");
        return;
      }
      setUser(null);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPending(false);
    }
  };

  if (user === undefined) {
    return <span className="inline-block w-10" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        登录
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-3">
      {user.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="text-blue-600 transition-colors hover:text-blue-700"
        >
          管理后台
        </Link>
      ) : null}
      <span className="max-w-24 truncate rounded bg-yellow-300 px-2 py-0.5 text-xs text-slate-900">
        {user.name}
      </span>
      {error ? (
        <span role="status" className="text-xs text-red-500">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        {pending ? "退出中…" : "退出"}
      </button>
    </span>
  );
}
