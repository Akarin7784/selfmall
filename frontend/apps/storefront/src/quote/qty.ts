/** 试算数量的范围与校验（FE-06）。数量全程按整数字符串校验，不做浮点运算。 */
export const QTY_MIN = 1
export const QTY_MAX = 99
export const QTY_DEFAULT = 1

const QTY_RE = /^[1-9][0-9]?$/

/** 是否是合法数量文本：只接受 1–99 的十进制整数字符串（无前导零、无空格、无符号、无小数、无科学计数法）。 */
export function isValidQtyText(value: unknown): value is string {
  return typeof value === 'string' && QTY_RE.test(value) && Number(value) <= QTY_MAX
}

/**
 * 解析登录回跳带回的 `qty` query：只接受 1–99 的整数字符串，
 * 其他（缺失、数组形式、'0'、'100'、'1.5'、' 2'、'02'、'1e1'、超长串等）一律回退为 1。
 */
export function parseQtyQuery(raw: unknown): number {
  return isValidQtyText(raw) ? Number(raw) : QTY_DEFAULT
}
