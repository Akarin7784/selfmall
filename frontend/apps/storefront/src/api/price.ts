import { formatMoney, MoneyError, type Money } from '@selfmall/api'

/**
 * 价格展示（FE-04 起，FE-06 统一口径）：纯字符串补零到两位并加「¥」——
 * 不足两位小数补到两位（'199' → '¥199.00'、'99.5' → '¥99.50'），超过两位原样保留（不四舍五入、不截断），
 * 全程字符串/BigInt，不经过浮点数；非法金额原样展示。
 */
export function displayPrice(price: Money): string {
  const dot = price.indexOf('.')
  if (dot !== -1 && price.length - dot - 1 > 2) return `¥${price}`
  try {
    return `¥${formatMoney(price)}`
  } catch (e) {
    // 超过两位小数等非法金额：不做隐式舍入，原样展示。
    if (e instanceof MoneyError) return `¥${price}`
    throw e
  }
}
