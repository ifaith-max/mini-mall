/** 后台客户端请求统一处理 401/403。 */
export function assertAdminResponse(
  response: Response,
  fallbackMessage: string,
): void {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.replace(`/login?next=${next}`);
    }
    throw new Error("登录已过期，正在跳转登录页");
  }

  if (response.status === 403) {
    throw new Error("无权限访问后台");
  }

  if (!response.ok) {
    throw new Error(fallbackMessage);
  }
}
