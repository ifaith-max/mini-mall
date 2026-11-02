import Image from "next/image";
import Link from "next/link";
import { getSafeImageUrl } from "@/lib/images";
import { formatPrice } from "@/lib/price";
import type { ProductWithCategory } from "@/lib/products";

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const imageSrc = getSafeImageUrl(product.imageUrl);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            暂无图片
          </div>
        )}
        {product.stock === 0 ? (
          <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs text-slate-700">
            售罄
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{product.category.name}</p>
          <h2 className="mt-1 truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-blue-600">
            {product.name}
          </h2>
        </div>
        <p className="shrink-0 font-mono text-sm text-slate-900">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
