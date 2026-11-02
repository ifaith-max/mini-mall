export type SearchParamValue = string | string[] | undefined;

/** Next 16 允许重复查询参数；统一取第一个值并 trim。 */
export function firstParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return (value[0] ?? "").trim();
  }
  return (value ?? "").trim();
}

/** 只允许站内绝对路径，防止登录后的 next 参数造成开放重定向。 */
export function safeNextPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/";
  }

  // 反斜杠会被浏览器/Next 解析成协议相对地址，例如 /\evil.com
  if (decoded.includes("\\")) {
    return "/";
  }

  try {
    const base = "http://localhost";
    const url = new URL(decoded, base);
    if (url.origin !== base) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
