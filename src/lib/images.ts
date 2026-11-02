import { ALLOWED_IMAGE_HOSTS } from "./image-hosts";

/**
 * next/image 的 remotePatterns 是白名单；未知域名会让整个页面在渲染时抛错。
 * 这里提前过滤，非法地址由组件渲染占位符。
 */
const allowedHosts = new Set<string>(ALLOWED_IMAGE_HOSTS);

export function getSafeImageUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/")) {
    // 拒绝 //host 与 /\host：浏览器会把它们解析成跨域地址
    return /^\/[/\\]/.test(url) ? null : url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return allowedHosts.has(parsed.hostname) ? url : null;
  } catch {
    return null;
  }
}
