"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type RegisterFormProps = {
  nextPath?: string;
};

export function RegisterForm({ nextPath = "/" }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "注册失败，请稍后重试");
        return;
      }

      setSuccess(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    const loginHref =
      nextPath === "/"
        ? "/login"
        : `/login?next=${encodeURIComponent(nextPath)}`;

    return (
      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 py-12 text-center">
        <p className="text-lg text-slate-900">注册成功</p>
        <p className="mt-2 text-sm text-slate-500">现在可以登录了。</p>
        <Link
          href={loginHref}
          className="mt-6 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm text-slate-600">昵称（可选）</span>
        <input
          type="text"
          autoComplete="nickname"
          maxLength={30}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="默认使用邮箱前缀"
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-600">邮箱</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-600">密码</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
        />
        <span className="mt-1 block text-xs text-slate-400">至少 8 位</span>
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "注册中…" : "注册"}
      </button>
    </form>
  );
}
