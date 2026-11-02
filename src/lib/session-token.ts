import { SignJWT, jwtVerify } from "jose";
import { isRole, type Role } from "./constants";

// 生产环境使用 __Host- 前缀，防止同站子域写入同名 Cookie。
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-session" : "session";

const MIN_SECRET_BYTES = 32;
const INSECURE_SECRET_PLACEHOLDER = "replace-with-a-random-32-byte-hex-string";

export type SessionPayload = {
  userId: string;
  role: Role;
};

/** Edge 与 Node 运行时都可用的密钥校验。 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("缺少 SESSION_SECRET 环境变量");
  }
  if (
    secret === INSECURE_SECRET_PLACEHOLDER ||
    new TextEncoder().encode(secret).length < MIN_SECRET_BYTES
  ) {
    throw new Error(
      "SESSION_SECRET 至少需要 32 字节，且不能使用 .env.example 中的占位符",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  userId: string,
  role: Role,
): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

/**
 * 校验 JWT 并返回 payload。
 * 密钥配置错误直接抛出；只有 token 无效/过期才返回 null。
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  const secretKey = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    const userId = payload.userId;
    const role = payload.role;

    if (typeof userId !== "string" || !isRole(role)) {
      return null;
    }
    return { userId, role };
  } catch {
    return null;
  }
}
