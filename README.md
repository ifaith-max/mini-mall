# Mini Mall

一个用于学习 Next.js 16 全栈开发的微型电商示例项目。前台覆盖商品浏览、搜索筛选、注册登录、购物车、下单与模拟支付；后台覆盖商品、分类和订单管理。

## 功能

- 商品列表：搜索、分类筛选、价格排序、分页
- 商品详情与加入购物车
- 游客购物车（localStorage）与登录后合并
- 注册 / 登录 / 登出，httpOnly Cookie 会话
- 结算下单、模拟支付、订单列表与详情、取消订单
- 心悦会员等级与折扣（按累计实付自动升级）
- 后台管理：商品 / 分类 CRUD、订单状态流转
- 本地卡通商品插画，不依赖外部图床

## 技术栈

- Next.js 16（App Router + Turbopack）+ React 19 + TypeScript
- Tailwind CSS 4（CSS-first）
- Prisma 5 + SQLite
- jose（JWT）、bcryptjs（密码哈希）、zod（服务端校验）
- Vitest（API 集成测试）

## 快速开始

```bash
npm install

# 复制环境变量模板，并填入至少 32 字节的 SESSION_SECRET
cp .env.example .env

npx prisma migrate dev
npm run db:seed
npm run dev
```

打开终端输出的地址（默认 http://localhost:3000）。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | SQLite 文件路径，默认 `file:./dev.db` |
| `SESSION_SECRET` | 会话 JWT 密钥，至少 32 字节，可用 `openssl rand -hex 32` 生成 |
| `SEED_ADMIN_PASSWORD` | 种子管理员口令；除 `NODE_ENV=development` 外执行 seed 时必须设置 |
| `TRUSTED_PROXY_HOPS` | 可信反向代理层数。默认 0，不信任 `x-forwarded-for`；部署在 Nginx/Vercel 后通常设为 `1` |

### 开发账号

执行 seed 后可用：

| 账号 | 口令 | 说明 |
| --- | --- | --- |
| `admin@minimall.dev` | `SEED_ADMIN_PASSWORD`（显式 development 模式下默认 `Admin123!`） | 管理员 |
| `user@minimall.dev` | `User123!` | 普通用户（仅非生产环境创建） |
| `vip@minimall.dev` | `Vip123!` | 心悦 2 级用户（仅非生产环境创建） |

## 常用命令

```bash
npm run dev                  # 开发服务器
npm run build                # 生产构建（含类型检查）
npm run start                # 启动生产构建
npm run lint                 # ESLint
npm test                     # Vitest（使用 prisma/test.db）

npx prisma migrate dev       # 创建/应用迁移
npm run db:seed              # 填充种子数据
npx prisma studio            # 可视化查看数据库

npm run images:generate      # 重新生成商品卡通插画
```

## 测试

```bash
npm test
```

测试使用独立的 `prisma/test.db`，不会修改开发数据库。当前覆盖公开商品 API、认证、购物车、订单、后台权限与 CRUD、页面守卫、限流与工具函数。

`npm run build` 会同时执行 TypeScript 类型检查。

## 目录与约定

详细的目录结构、业务约定和安全约定见 [CLAUDE.md](CLAUDE.md)。

## 生产部署注意

- 必须使用 HTTPS：生产环境的会话 Cookie 使用 `Secure` 与 `__Host-` 前缀。
- 设置强随机的 `SESSION_SECRET` 和 `SEED_ADMIN_PASSWORD`；不要使用 `.env.example` 中的占位符。
- 部署在反向代理后时设置 `TRUSTED_PROXY_HOPS`，否则所有请求会共用一个限流桶。
- 登录/注册限流是进程内实现；多实例部署时请替换为 Redis 等共享存储。
- 数据库文件（`prisma/*.db`）不入库，部署时需要持久化存储或改用托管数据库。
