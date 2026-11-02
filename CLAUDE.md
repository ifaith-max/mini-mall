
# Mini Mall

微型电商示例项目，用于学习 Next.js 16 全栈开发。前台包含商品浏览、搜索筛选、注册登录、购物车、下单与模拟支付；后台包含商品/分类/订单管理。

## 技术栈

- Next.js 16.4（App Router + Turbopack 默认构建）+ React 19 + TypeScript
- Tailwind CSS 4（CSS-first，无 `tailwind.config`；通过 `@tailwindcss/turbopack` 加载器接入）
- Prisma 5.22 + SQLite
- 自建 Session：`jose`（JWT）+ `bcryptjs`（密码哈希）+ httpOnly cookie
- `zod` 做服务端校验；前台写操作走 Server Actions，公开只读接口与后台管理 CRUD 走 Route Handlers

## 常用命令

```bash
npm run dev                  # 开发服务器
npm run build                # 生产构建（含类型检查）
npm run lint                 # ESLint
npm test                     # Vitest（API 集成测试）
npm run images:generate      # 重新生成商品卡通插画

npx prisma migrate dev       # 创建/应用迁移
npx prisma db seed           # 填充种子数据
npx prisma studio            # 可视化查看数据库
```

`.env` 中需要 `DATABASE_URL`（SQLite）和 `SESSION_SECRET`（至少 32 字节）。除 `NODE_ENV=development` 外，执行 seed 必须设置 `SEED_ADMIN_PASSWORD`；部署在反向代理后需按实际层数设置 `TRUSTED_PROXY_HOPS`（默认 0，不信任 `x-forwarded-for`）。`.env.example` 是模板，`.env` 不入库。

## 目录结构

```
src/
├── proxy.ts                  # 粗粒度页面守卫：未登录/非管理员提前重定向
├── app/
│   ├── layout.tsx            # 根布局 + AuthProvider / CartProvider
│   ├── globals.css           # Tailwind 主题变量
│   ├── page.tsx              # 首页：搜索 + 分类 + 排序 + 分页 + 商品网格
│   ├── products/[slug]/page.tsx      # 商品详情 + 加购
│   ├── products/[slug]/not-found.tsx
│   ├── login/page.tsx        # 登录页
│   ├── register/page.tsx     # 注册页
│   ├── cart/page.tsx         # 购物车页
│   ├── checkout/page.tsx     # 确认订单页
│   ├── orders/page.tsx       # 我的订单
│   ├── orders/[id]/page.tsx  # 订单详情
│   ├── orders/[id]/not-found.tsx
│   ├── admin/                # 后台：layout 守卫 + 概览 / 商品 / 分类 / 订单
│   └── api/
│       ├── auth/             # register / login / me / logout
│       ├── cart/route.ts + [id]/route.ts      # 购物车 CRUD
│       ├── orders/route.ts + [id]/route.ts    # 下单 / 列表 / 详情 / 支付 / 取消
│       ├── products/route.ts + [id]/route.ts  # 公开只读（支持 sort）
│       ├── categories/route.ts                 # 公开只读
│       └── admin/            # 商品/分类/订单后台 CRUD（withAdmin）
├── components/
│   ├── shop/ShopShell.tsx + SiteHeader.tsx + SiteFooter.tsx
│   ├── product/ProductCard.tsx + AddToCartButton.tsx + Pagination.tsx
│   ├── auth/AuthProvider.tsx + LoginForm.tsx + RegisterForm.tsx + HeaderAuth.tsx
│   ├── cart/CartProvider.tsx + CartClient.tsx + CartBadge.tsx
│   ├── checkout/CheckoutForm.tsx
│   ├── order/OrderStatusBadge.tsx + OrderActions.tsx
│   ├── admin/ProductManager.tsx + CategoryManager.tsx + OrderManager.tsx
│   └── ui/                   # 基础组件（待补）
├── lib/
│   ├── db.ts                 # PrismaClient 单例
│   ├── auth.ts               # bcrypt / Cookie 会话 / 当前用户 / requireAdmin
│   ├── session-token.ts      # 可复用的 JWT 签发与校验（Edge 兼容）
│   ├── api.ts                # checkJsonRequest + withAdmin + revalidatePaths
│   ├── rate-limit.ts         # 进程内固定窗口限流
│   ├── constants.ts          # Role / OrderStatus / MembershipLevel 常量
│   ├── products.ts           # 商品/分类查询（页面与 API 共用）
│   ├── product-sort.ts       # 商品排序枚举与解析
│   ├── cart.ts               # 购物车查询、库存校验与合计
│   ├── cart-storage.ts       # 游客购物车读写、校验与库存封顶
│   ├── orders.ts             # 下单事务、支付、取消、订单查询
│   ├── date.ts               # 日期时间格式化
│   ├── image-hosts.ts        # 图片域名白名单（与 next.config 共用）
│   ├── images.ts             # 图片 URL 校验与回退
│   ├── pagination.ts         # 分页窗口计算
│   ├── product-href.ts       # 商品列表链接构造
│   ├── search-params.ts      # 重复查询参数处理
│   ├── membership.ts         # 心悦等级配置 + 等级/折扣计算
│   ├── price.ts              # 分 <-> 元
│   └── validators.ts         # 邮箱 / 密码 zod schema
└── actions/                  # 预留：未来前台 Server Actions
tests/
├── global-setup.ts           # 测试库 prisma/test.db
├── products.test.ts          # 公开 API 与排序测试
├── helpers.test.ts           # 工具函数测试
├── auth.test.ts              # 认证与会话测试
├── cart.test.ts              # 购物车 API 测试
├── orders.test.ts            # 订单 API 测试
├── admin.test.ts             # 后台权限与 CRUD 测试
└── proxy.test.ts             # 页面守卫重定向测试
public/images/products/       # 商品卡通插画（<slug>.png）
scripts/generate-product-images.mjs  # 插画生成脚本
vitest.config.mts
next.config.ts
prisma/schema.prisma
prisma/seed.ts
```

## 核心约定

### 金额
- 所有金额用**整数分（Int）**存储和计算，禁止用浮点数。
- 展示统一走 `lib/price.ts` 的 `formatPrice(cents)`。
- 下单时保存原价、折扣比例、实付金额三个字段，便于对账和展示优惠。

### 数据库
- SQLite **不支持 Prisma `enum`**：`role`、`status`、`membershipLevel` 用 String 存储，取值范围由 `src/lib/constants.ts` 的常量与 zod 约束。
- 迁移文件入库；`prisma/dev.db`、`prisma/test.db` 等数据库文件不入库。
- 种子数据在 `prisma/seed.ts`，通过 `npm run db:seed` 执行。

### 图片
- 种子商品图片为本地卡通插画：`public/images/products/<slug>.png`，由 `scripts/generate-product-images.mjs` 生成（`npm run images:generate`）。
- 商品图片只存 URL；远程图片域名由 `lib/images.ts` 维护（当前为 picsum / fastly.picsum）。新增远程域名必须同步 `next.config.ts` 的 `images.remotePatterns`，否则组件会显示“暂无图片”。

### 认证
- 密码：bcryptjs（cost 10），只存 hash；`hashPassword` / `verifyPassword`；注册密码至少 8 位。
- 登录/注册接口按 IP 限流（登录额外按 IP + 邮箱组合），进程内固定窗口，多实例部署需换共享存储。
- **bcrypt 只处理前 72 字节**：注册按 UTF-8 字节数拒绝超长密码，登录侧同样按 72 字节拒绝。
- Session：jose 签 HS256 JWT，payload `{ userId, role }`，7 天有效；`setSession` / `getSession` / `clearSession` / `getCurrentUser`（均 async）。
- Cookie：`httpOnly`、`sameSite=lax`、`path=/`；`secure` 仅在 `NODE_ENV === "production"` 时开启。
- 登录失败统一返回“邮箱或密码错误”，不区分用户不存在与密码错误。
- API：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`POST /api/auth/logout`；响应统一 `{ data } | { error }`。
- **认证、购物车、订单 API 是前台 REST 的明确例外**：表单/页面直接 `fetch /api/auth/*`、`/api/cart/*`、`/api/orders/*`（含模拟支付与取消）。接口只接受同源 JSON，Cookie 使用 sameSite=lax。
- 页面守卫 `requireAdmin()`（未登录跳登录，非 ADMIN 回首页）；API 使用 `withAdmin()`，未登录 401、非 ADMIN 403。
- `src/proxy.ts` 对 `/admin`、`/cart`、`/checkout`、`/orders` 做粗粒度重定向：未登录跳 `/login?next=...`，普通用户访问后台跳首页，已登录访问登录/注册页跳首页。
- **权限必须在服务端数据层校验**（Server Action / 页面 / Route Handler），`proxy.ts` 只做体验优化，不作为授权依据。
- 任何查询都不得把 `passwordHash` 返回给客户端，必要时显式 `select` 字段。

### 商品浏览与排序
- 首页支持 `search`、`category`、`page`、`sort` 查询参数；`sort` 取值为 `latest`（默认）、`price-asc`、`price-desc`，非法值回退默认。
- `lib/products.ts` 的价格排序追加 `id` 作为稳定次序；切换排序时回到第 1 页。
- 公开 API `/api/products` 同样支持 `sort`，`meta.sort` 返回实际生效的排序。

### 购物车
- 游客：localStorage + `CartProvider`（`useSyncExternalStore`）。
- 登录成功：`LoginForm` 把游客购物车逐项 `POST /api/cart`；全部成功才清空 localStorage，失败项保留。
- 已登录：`GET/POST /api/cart`、`PUT/DELETE /api/cart/[id]`；库存与数量在服务端校验。
- 下架商品只允许减少数量或删除，不允许继续增加。
- `/cart` 页面由 Server Component 读取初始数据，`CartClient` 负责加减数量、删除与合计。
- 页头 `CartBadge`：游客取 localStorage 数量，登录用户从 `GET /api/cart` 拉取 `totalQuantity`；加购、改数量、删除、下单、登录后都会刷新。
- 购物车 API 是前台 REST 的明确例外（与认证 API 相同）。

### 订单
- 下单：`POST /api/orders` 在**数据库事务**中校验库存 → 扣库存 → 创建订单与明细快照 → 清空购物车；库存不足会返回具体商品名。
- 金额：`originalAmount`（折前）+ `discountBps`（会员折扣）+ `totalAmount`（实付）。
- 状态机：`PENDING → PAID → SHIPPED → COMPLETED`；`CANCELLED` 可从任意未取消状态转入。
- 取消订单恢复库存；已支付订单取消时回滚 `totalSpent` 并按剩余金额重算会员等级（可能降级）。
- `PENDING` 订单 30 分钟未支付会按取消处理（下单/订单列表时惰性清理），释放库存。
- 支付成功（`PENDING → PAID`）时累计 `totalSpent` 并按门槛升级会员；状态与消费更新使用条件更新/原子增减，避免并发重复处理。
- API：`POST/GET /api/orders`、`GET/PUT /api/orders/[id]`；`PUT` 只接受 `PAID`（仅 PENDING）或 `CANCELLED`。

### 心悦会员
- 正常支付按累计实付金额升级；取消已支付订单会回滚 `totalSpent` 并按剩余金额重算等级（可能降级，防止“支付后取消”刷等级）。配置集中在 `lib/membership.ts`。
- 新用户默认**心悦0级**，无折扣。

| 等级 | 累计实付门槛 | 折扣（discountBps） |
| --- | --- | --- |
| 心悦0级 | 无消费（¥0）；未达 1 级门槛时保持 0 级 | 无折扣（10000） |
| 心悦1级 | ≥ ¥6,000 | 9.8 折（9800） |
| 心悦2级 | ≥ ¥50,000 | 9.6 折（9600） |
| 心悦3级 | ≥ ¥150,000 | 9.1 折（9100） |

- `discountBps` 是支付比例（万分比），10000 表示原价；实付 = `round(originalAmount * discountBps / 10000)`。
- 支付成功后更新 `User.totalSpent`，再按新金额重算 `membershipLevel`。

### 数据访问
- 前台读取：Server Component 直接查 Prisma。
- 前台写入：
  - 认证：`/api/auth/*`（表单直接 fetch）
  - 购物车：`/api/cart/*`（页面客户端交互）
  - 订单与支付：`/api/orders/*`（结算/订单页客户端交互）
- 公开只读 API：`/api/products`、`/api/products/[id]`、`/api/categories`，仅 GET；前台页面直接查 Prisma，不依赖这些接口。
- 后台管理 CRUD：`/api/admin/*` Route Handlers + 客户端管理页 fetch，已由 `api-crud-generator` 生成并按下方清单改造。
- 写操作后按需 `revalidatePath()`（前台页面）或 `router.refresh()`（后台页面），让数据即时刷新。
- 所有写接口统一使用 `lib/api.ts` 的 `checkJsonRequest()`：Origin 必须与 Host 一致，Content-Type 必须是 `application/json`，避免同站 CSRF 与 text/plain 绕过预检。
- 认证、购物车、订单是前台 REST 写接口的明确范围；不要为其他新功能新增并行写入通道。

### 后台 CRUD（api-crud-generator）

生成范围固定为：

| 模型 | API 路径 | 页面路由 | 允许操作 |
| --- | --- | --- | --- |
| Product | `/api/admin/products` | `/admin/products` | 列表 / 详情 / 创建 / 更新 / 删除 |
| Category | `/api/admin/categories` | `/admin/categories` | 列表 / 创建 / 删除；有商品时拒绝删除 |
| Order | `/api/admin/orders` | `/admin/orders` | 列表 / 状态更新（SHIPPED / COMPLETED / CANCELLED）；禁止创建、删除 |
| User | 不生成 | — | 避免暴露 `passwordHash`、`role` |

生成后必须逐条完成的改造清单：

1. **鉴权**：每个 handler 用 `withAdmin()` 包装；无 session 返回 401，非 ADMIN 返回 403。API 内禁止 `redirect()`。
2. **异步 params**：签名写 `{ params }: { params: Promise<{ id: string }> }`，内部 `const { id } = await params`。
3. **输入校验**：body 用 zod `safeParse`；只接受白名单字段，拒绝 `id`、`createdAt`、`updatedAt`、`orderNo`、`totalAmount`、`paidAt`、`userId` 等客户端不该控制的字段；订单的 `status` 单独走状态机校验。
4. **响应格式**：成功 `{ data }`，失败 `{ error: "中文错误信息" }`；状态码用 400 / 401 / 403 / 404 / 409 / 500；不把 Prisma 原始错误透出。
5. **业务约束**：商品 `slug` 重复返回 409；分类下仍有商品时删除返回 409；订单只允许合法状态流转，`PUT` 只接受 `{ status }`。
6. **刷新**：写成功后 `revalidatePath()` 对应前台路径；管理页 `router.refresh()`。
7. **敏感字段**：列表和详情响应都要显式 `select`，不得返回 `passwordHash`。

分页与搜索参数统一：`page`（默认 1）、`pageSize`（默认 10，最大 100）、`q`、`category`，全部经 zod 校验后再进 Prisma。

管理页 fetch 约定：`credentials: "same-origin"`；401 跳登录，403 显示无权限，其他错误显示中文提示。

## Next.js 16 注意事项

- `params`、`searchParams`、`cookies()`、`headers()` 都是 Promise，必须 `await`；类型写 `Promise<{ id: string }>`。
- 路由守卫文件是 `proxy.ts`（不是 `middleware.ts`），导出函数名为 `proxy`。
- 本项目在 `next.config.ts` 中**关闭了 `cacheComponents` 和 `partialPrefetching`**。不要重新开启，除非同步改造所有读取 session 的页面（需加 `<Suspense>` 边界）。
- 新增 Tailwind 主题变量写在 `src/app/globals.css` 的 `@theme` 中，不创建 `tailwind.config.js`。
- 修改框架用法前，先查 `node_modules/next/dist/docs/` 下的对应文档，不要依赖旧版 Next.js 经验。

## 开发顺序

1. ✅ 脚手架与依赖
2. ✅ Prisma schema、迁移、seed
3. ✅ 基础 UI 与布局（ShopShell / Header / Footer / ProductCard / Pagination）+ `src/proxy.ts` 页面守卫
4. ✅ 认证（注册/登录/登出、Session、Header 登录态、游客购物车合并）
5. ✅ 商品浏览（列表、详情、搜索、分类、排序、分页）
6. ✅ 购物车（CartProvider、游客合并、/api/cart CRUD、/cart 页面、页头角标）
7. ✅ 结算、下单、模拟支付、订单列表与详情、取消订单
8. ✅ 后台管理（商品/分类 CRUD、订单状态流转、requireAdmin + withAdmin 双重鉴权）
9. ✅ 打磨与端到端验证（公开浏览、认证、购物车、下单/支付/取消、后台 CRUD、守卫重定向）

每完成一步先确认构建通过，再进入下一步。

## 不要做的事

- 不要引入 NextAuth 或图片上传功能。
- 除认证 `/api/auth/*`、购物车 `/api/cart/*`、订单 `/api/orders/*` 外，不要新增前台 REST 写接口。
- 不要手写后台 CRUD 绕过 `api-crud-generator`，也不要直接使用它生成的原始代码而不完成改造清单。
- 不要自动 `git commit` / `git push`（除非用户明确要求）。
- 不要删除或修改 `.env`、密钥类文件（需先询问）。
- 不要用浮点数处理金额，不要在客户端做权限判断。

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（21 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能、修改行为，或筹划任何新东西，无论是软件还是软件之外（一场分享、一门生意、一次装修）。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **diagnosing-superpowers**: 当一次 superpowers 会话出了问题、你的人类伙伴想知道原因时使用——重复劳动、无视计划、磕磕绊绊、结果质量差、某个技能没触发、"太慢了"、"为什么这么贵"、"它到底在干什么"——或者想给 superpowers 维护者整理一份 bug 报告；适用于当前会话，或按 id / 路径指定的过往会话，任何工具均可
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你要在当前会话里亲自担任实现者执行一份实现计划时使用——你的人类伙伴选择了内联执行，或者没有可用的子智能体工具
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成这份工作时使用
- **mcp-builder**: 在构建 MCP 服务器或 MCP 工具时使用 —— 系统化的生产级 MCP 构建方法论，覆盖工具设计、错误处理、传输层选择与测试，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
