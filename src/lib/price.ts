/** 将整数分格式化为人民币展示，例如 12900 -> ¥129.00 */
export function formatPrice(cents: number): string {
  const yuan = cents / 100;
  return `¥${yuan.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 9800 -> 9.8 折；9990 -> 9.99 折；10000 表示无折扣。 */
export function formatDiscount(discountBps: number): string {
  if (discountBps >= 10000) return "无折扣";
  const discount = (discountBps / 1000)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return `${discount} 折`;
}
