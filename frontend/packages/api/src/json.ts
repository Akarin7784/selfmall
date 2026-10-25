/**
 * 无损 JSON 解析：在 JSON.parse 之前，把指定金额字段的数字字面量原样包成字符串，
 * 例如 {"price":99.00} → {"price":"99.00"}，避免 99.00 变成 number 99 丢失原文。
 * Node 20 的 JSON.parse reviver 不提供 source 参数，因此用字符串扫描实现。
 */

/** 默认按金额处理的字段名。 */
export const DEFAULT_MONEY_FIELDS: readonly string[] = ['price', 'unitPrice', 'totalAmount']

const WS = new Set([' ', '\t', '\n', '\r'])
const NUM_CHARS = /[-+0-9.eE]/

/** 读取从 start（指向开头引号）开始的字符串字面量，返回结束引号之后的位置；未闭合返回 -1。 */
function scanString(text: string, start: number): number {
  let i = start + 1
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '"') return i + 1
    i++
  }
  return -1
}

function skipWs(text: string, i: number): number {
  while (i < text.length && WS.has(text[i] as string)) i++
  return i
}

/** 把 fields 中字段的数字值改写成字符串字面量；其他内容（含字符串内部）原样保留。 */
export function quoteMoneyFields(
  text: string,
  fields: Iterable<string> = DEFAULT_MONEY_FIELDS,
): string {
  const names = new Set(fields)
  if (names.size === 0) return text
  let out = ''
  let last = 0
  let i = 0
  while (i < text.length) {
    if (text[i] !== '"') {
      i++
      continue
    }
    const end = scanString(text, i)
    if (end < 0) return text // 不完整的 JSON，交给 JSON.parse 报错
    const afterKey = skipWs(text, end)
    if (text[afterKey] !== ':') {
      i = end // 字符串值，不是键
      continue
    }
    let key: unknown
    try {
      key = JSON.parse(text.slice(i, end))
    } catch {
      return text
    }
    const valStart = skipWs(text, afterKey + 1)
    i = valStart
    if (typeof key !== 'string' || !names.has(key)) continue
    const first = text[valStart]
    if (first !== '-' && !(first !== undefined && first >= '0' && first <= '9')) continue
    let valEnd = valStart
    while (valEnd < text.length && NUM_CHARS.test(text[valEnd] as string)) valEnd++
    out += text.slice(last, valStart) + '"' + text.slice(valStart, valEnd) + '"'
    last = valEnd
    i = valEnd
  }
  return last === 0 ? text : out + text.slice(last)
}

/** 无损解析；非法 JSON 时抛出 SyntaxError（由调用方转成 ApiError）。 */
export function parseJsonPreservingMoney(text: string, fields?: Iterable<string>): unknown {
  return JSON.parse(quoteMoneyFields(text, fields))
}
