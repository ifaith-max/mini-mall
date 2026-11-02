import { MEMBERSHIP_LEVELS, type MembershipLevel } from "./constants";

export type MembershipTier = {
  level: MembershipLevel;
  label: string;
  minSpent: number;
  discountBps: number;
};

/** 累计实付门槛为分；discountBps 为支付比例（万分比）。 */
export const MEMBERSHIP_TIERS: MembershipTier[] = [
  { level: "XINYUE_0", label: "心悦0级", minSpent: 0, discountBps: 10000 },
  { level: "XINYUE_1", label: "心悦1级", minSpent: 600_000, discountBps: 9800 },
  { level: "XINYUE_2", label: "心悦2级", minSpent: 5_000_000, discountBps: 9600 },
  { level: "XINYUE_3", label: "心悦3级", minSpent: 15_000_000, discountBps: 9100 },
];

export function getTier(level: MembershipLevel): MembershipTier {
  return MEMBERSHIP_TIERS.find((tier) => tier.level === level) ?? MEMBERSHIP_TIERS[0];
}

/** 按累计实付金额取等级；未达 1 级门槛时保持 0 级。 */
export function getLevelForSpent(totalSpentCents: number): MembershipLevel {
  let current: MembershipLevel = "XINYUE_0";
  for (const tier of MEMBERSHIP_TIERS) {
    if (totalSpentCents >= tier.minSpent) {
      current = tier.level;
    }
  }
  return current;
}

export function getDiscountBps(level: MembershipLevel): number {
  return getTier(level).discountBps;
}

/** 只升不降：返回两者中更高的等级。 */
export function upgradeLevel(
  current: MembershipLevel,
  next: MembershipLevel,
): MembershipLevel {
  const currentIndex = MEMBERSHIP_LEVELS.indexOf(current);
  const nextIndex = MEMBERSHIP_LEVELS.indexOf(next);
  return nextIndex > currentIndex ? next : current;
}
