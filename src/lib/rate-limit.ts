/**
 * 进程内固定窗口限流。
 * 适合单体/本地部署；多实例部署需要换成 Redis 等共享存储，否则各实例独立计数。
 */
type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * 容量满时只清理过期项，仍不足则淘汰最旧的键。
 * 不能整体 clear，否则攻击者可用大量新键重置自己和他人的限流计数。
 */
function ensureCapacity(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  while (buckets.size >= MAX_TRACKED_KEYS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    ensureCapacity(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      ),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** 登录成功后清空计数，避免正常用户反复登录被误伤。 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * 取客户端 IP。
 * 只有显式配置 TRUSTED_PROXY_HOPS（可信反向代理层数）时才读取转发头；
 * 否则直接暴露的服务可以伪造 x-forwarded-for 绕过限流，因此返回统一的 unknown。
 */
export function getClientIp(request: Request): string {
  const rawHops = Number.parseInt(
    process.env.TRUSTED_PROXY_HOPS ?? "0",
    10,
  );
  const trustedHops =
    Number.isInteger(rawHops) && rawHops > 0 ? rawHops : 0;

  if (trustedHops > 0) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const chain = forwarded
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      // 从右往左数过可信代理后，再往左一跳才是客户端地址
      const index = chain.length - trustedHops;
      const candidate = index >= 0 ? chain[index] : undefined;
      if (candidate) return candidate;
    }

    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  return "unknown";
}
