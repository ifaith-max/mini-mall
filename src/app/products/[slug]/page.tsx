import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ShopShell } from "@/components/shop/ShopShell";
import { getSafeImageUrl } from "@/lib/images";
import { formatPrice } from "@/lib/price";
import { getProductBySlug } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const getProduct = cache(async (slug: string) => getProductBySlug(slug));

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "商品不存在" };
  }

  return {
    title: product.name,
    description: product.description.slice(0, 100),
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const imageSrc = getSafeImageUrl(product.imageUrl);

  return (
    <ShopShell>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <nav
          aria-label="面包屑"
          className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
        >
          <Link href="/" className="hover:text-blue-600">
            首页
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/?category=${product.category.slug}#products`}
            className="hover:text-blue-600"
          >
            {product.category.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt={product.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  暂无图片
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
            <Link
              href={`/?category=${product.category.slug}#products`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {product.category.name}
            </Link>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-6 font-mono text-2xl text-slate-900">
              {formatPrice(product.price)}
            </p>
            <p className="mt-6 text-base leading-7 text-slate-600">
              {product.description}
            </p>

            <div className="mt-8 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">库存</span>
                <span className="text-slate-900">
                  {product.stock > 0 ? `${product.stock} 件` : "暂时售罄"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">发货</span>
                <span className="text-slate-900">付款后 48 小时内</span>
              </div>
            </div>

            <div className="mt-8">
              <AddToCartButton
                productId={product.id}
                slug={product.slug}
                name={product.name}
                price={product.price}
                imageUrl={product.imageUrl}
                stock={product.stock}
              />
            </div>

            <ul className="mt-8 space-y-2 text-sm text-slate-500">
              <li>支持 7 天无理由退货</li>
              <li>满 ¥199 包邮</li>
              <li>客服工作时间 9:00–18:00</li>
            </ul>
          </div>
        </div>
      </main>
    </ShopShell>
  );
}
