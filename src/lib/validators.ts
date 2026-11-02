import { z } from "zod";

/** bcrypt 只处理前 72 字节，必须在入口按字节数限制。 */
export const MAX_PASSWORD_BYTES = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("邮箱格式不正确"));

export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES,
    "密码不能超过 72 字节",
  );
