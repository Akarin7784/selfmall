import { formatMoney, MoneyError, type Money } from '@selfmall/api'

/** 价格展示：按 money 工具规范成两位小数并加「¥」，全程字符串，不经过浮点数。 */
export function displayPrice(price: Money): string {
  try {
    return `¥${formatMoney(price)}`
  } catch (e) {
    // 超过两位小数等非法金额：不做隐式舍入，原样展示。
    if (e instanceof MoneyError) return `¥${price}`
    throw e
  }
}
