/**
 * 金额工具：金额一律是十进制字符串（如 "99.00"），内部用 BigInt 以「分」计算，绝不经过 number。
 * 只接受普通十进制写法：可选负号、整数部分、可选小数部分；拒绝科学计数法、正号、空格、千分位。
 */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/** 金额字符串类型别名（语义标注，运行时就是 string）。 */
export type Money = string

const MONEY_RE = /^(-?)(\d+)(?:\.(\d+))?$/

/** 是否是合法的十进制金额字符串（不限小数位）。 */
export function isMoneyString(value: unknown): value is Money {
  return typeof value === 'string' && MONEY_RE.test(value)
}

/** 转为以分为单位的 BigInt；超过两位小数且多出部分非零时抛 MoneyError（不做隐式舍入）。 */
export function toCents(value: Money): bigint {
  if (typeof value !== 'string') throw new MoneyError('金额必须是字符串')
  const m = MONEY_RE.exec(value)
  if (!m) throw new MoneyError(`不是合法的金额：${value}`)
  const [, sign, intPart = '0', fracRaw = ''] = m
  if (fracRaw.length > 2 && /[1-9]/.test(fracRaw.slice(2))) {
    throw new MoneyError(`金额超过两位小数：${value}`)
  }
  const frac = (fracRaw + '00').slice(0, 2)
  const cents = BigInt(intPart) * 100n + BigInt(frac)
  return sign === '-' ? -cents : cents
}

/** 由分转回两位小数字符串；-0 输出 "0.00"。 */
export function fromCents(cents: bigint): Money {
  const neg = cents < 0n
  const abs = neg ? -cents : cents
  const int = (abs / 100n).toString()
  const frac = (abs % 100n).toString().padStart(2, '0')
  return `${neg ? '-' : ''}${int}.${frac}`
}

/** 规范化为两位小数：'99' → '99.00'，'99.1' → '99.10'，'007.5' → '7.50'。 */
export function formatMoney(value: Money): Money {
  return fromCents(toCents(value))
}

/** 比较两个金额：a < b 返回 -1，相等 0，a > b 返回 1。 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  const x = toCents(a)
  const y = toCents(b)
  return x < y ? -1 : x > y ? 1 : 0
}

/** 金额相加，结果为两位小数。总价以服务端 totalAmount 为准，本函数只用于展示性汇总。 */
export function addMoney(...values: Money[]): Money {
  return fromCents(values.reduce((sum, v) => sum + toCents(v), 0n))
}
