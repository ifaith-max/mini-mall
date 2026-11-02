import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "数码", slug: "digital", description: "耳机、键盘与随身设备" },
  { name: "家居", slug: "home", description: "让日常更舒服的小物" },
  { name: "服饰", slug: "apparel", description: "简单耐穿的日常穿着" },
  { name: "食品", slug: "food", description: "认真挑选的风味" },
];

const products = [
  {
    name: "云感降噪耳机",
    slug: "cloud-anc-headphones",
    description: "轻量头梁与柔软耳罩，通勤时也能安静下来。支持主动降噪与 30 小时续航。",
    price: 89900,
    stock: 32,
    categorySlug: "digital",
  },
  {
    name: "逐光机械键盘",
    slug: "light-mech-keyboard",
    description: "75% 配列，热插拔轴体，白色背光。适合桌面空间有限又想要手感的人。",
    price: 49900,
    stock: 18,
    categorySlug: "digital",
  },
  {
    name: "方寸蓝牙音箱",
    slug: "cube-speaker",
    description: "掌心大小，声音却不单薄。IPX5 防水，适合厨房、阳台和短途出行。",
    price: 29900,
    stock: 40,
    categorySlug: "digital",
  },
  {
    name: "曜石智能手表",
    slug: "obsidian-watch",
    description: "全天候心率与睡眠监测，七天续航。表带可快速更换，通勤与运动都合适。",
    price: 129900,
    stock: 12,
    categorySlug: "digital",
  },
  {
    name: "亚麻云朵抱枕",
    slug: "linen-cloud-cushion",
    description: "水洗亚麻外罩，内芯蓬松回弹。放在沙发或床头，给房间一点松弛感。",
    price: 12900,
    stock: 60,
    categorySlug: "home",
  },
  {
    name: "手作陶瓷马克杯",
    slug: "ceramic-mug",
    description: "手工拉坯，釉色有细微差异。容量 320ml，适合早晨的第一杯咖啡。",
    price: 8900,
    stock: 80,
    categorySlug: "home",
  },
  {
    name: "松林香薰蜡烛",
    slug: "pine-scented-candle",
    description: "雪松、松针与一点柑橘，燃烧时间约 45 小时。大豆蜡，烟尘更少。",
    price: 15900,
    stock: 25,
    categorySlug: "home",
  },
  {
    name: "原木抽屉收纳盒",
    slug: "wooden-storage-box",
    description: "榉木分格设计，适合收纳文具、首饰和零碎小物。可叠放，不占桌面。",
    price: 23900,
    stock: 15,
    categorySlug: "home",
  },
  {
    name: "重磅纯棉 T 恤",
    slug: "heavyweight-cotton-tee",
    description: "260g 精梳棉，领口不易变形。版型略宽，单穿或叠穿都稳妥。",
    price: 9900,
    stock: 100,
    categorySlug: "apparel",
  },
  {
    name: "厚帆布托特包",
    slug: "canvas-tote-bag",
    description: "16 安帆布，内置拉链口袋。能装下 14 寸电脑和一天的随身物品。",
    price: 13900,
    stock: 45,
    categorySlug: "apparel",
  },
  {
    name: "岩灰羊毛围巾",
    slug: "wool-scarf",
    description: "美利奴羊毛混纺，轻暖不扎。低饱和岩灰色，适合大多数外套。",
    price: 26900,
    stock: 20,
    categorySlug: "apparel",
  },
  {
    name: "手冲咖啡豆 250g",
    slug: "pour-over-coffee-beans",
    description: "中度烘焙，坚果与黑巧风味。适合手冲与法压，建议开封后两周内喝完。",
    price: 11800,
    stock: 50,
    categorySlug: "food",
  },
  {
    name: "海盐黄油曲奇",
    slug: "sea-salt-butter-cookies",
    description: "发酵黄油与海盐的咸甜平衡，酥而不碎。独立小包装，适合分享。",
    price: 6800,
    stock: 70,
    categorySlug: "food",
  },
];

// 管理员口令必须来自环境变量。只有显式 NODE_ENV=development 才允许默认口令：
// `prisma db seed` 通常不会设置 NODE_ENV，不能把“未设置”误当成开发环境。
const isProduction = process.env.NODE_ENV === "production";
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminPassword) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "执行 seed 前必须设置 SEED_ADMIN_PASSWORD（仅 NODE_ENV=development 可使用默认开发口令）",
    );
  }
  console.warn("NODE_ENV=development，使用默认开发管理员口令");
}

const adminUser = {
  email: "admin@minimall.dev",
  name: "管理员",
  password: adminPassword ?? "Admin123!",
  role: "ADMIN",
  membershipLevel: "XINYUE_0",
  totalSpent: 0,
};

// 演示账号使用公开口令，只能在非生产环境创建
const demoUsers = [
  {
    email: "user@minimall.dev",
    name: "普通用户",
    password: "User123!",
    role: "USER",
    membershipLevel: "XINYUE_0",
    totalSpent: 0,
  },
  {
    email: "vip@minimall.dev",
    name: "心悦会员",
    password: "Vip123!",
    role: "USER",
    membershipLevel: "XINYUE_2",
    totalSpent: 5_000_000,
  },
];

const users = isProduction ? [adminUser] : [adminUser, ...demoUsers];

async function main() {
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categoryIds.set(category.slug, saved.id);
  }

  for (const product of products) {
    const { categorySlug, ...data } = product;
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) {
      throw new Error(`分类不存在: ${categorySlug}`);
    }

    const imageUrl = `/images/products/${product.slug}.png`;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { ...data, categoryId, imageUrl },
      create: { ...data, categoryId, imageUrl },
    });
  }

  for (const user of users) {
    const passwordHash = await hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        membershipLevel: user.membershipLevel,
        totalSpent: user.totalSpent,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        membershipLevel: user.membershipLevel,
        totalSpent: user.totalSpent,
      },
    });
  }

  console.log(
    `种子数据完成：${categories.length} 个分类、${products.length} 件商品、${users.length} 个用户。`,
  );
  console.log("管理员账号：admin@minimall.dev（口令不输出）");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
