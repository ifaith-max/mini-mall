import { execSync } from "node:child_process";

/** 为测试准备独立的 SQLite 数据库（prisma/test.db）。 */
export default function setup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./test.db",
    },
  });
}
