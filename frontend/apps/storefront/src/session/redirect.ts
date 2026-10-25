/** 登录后默认回到的页面。 */
export const DEFAULT_AFTER_LOGIN = '/products'

/**
 * 校验登录后的回跳地址：只接受站内路径，防止开放重定向。
 * 规则：必须是字符串、以单个 `/` 开头；拒绝 `//`、反斜杠、协议（`http:`、`javascript:` 等）、
 * 控制字符和空白；对百分号编码解码后（最多 3 轮）同样检查，防止 `%2F%2F`、`%5C` 之类绕过。
 * 路径首段含冒号（如 `/javascript:x`）也拒绝。指向登录页本身也视为非法。非法时返回 DEFAULT_AFTER_LOGIN。
 */
export function safeRedirect(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string' || value === '' || value.length > 2048) return DEFAULT_AFTER_LOGIN
  let current = value
  for (let i = 0; i < 4; i++) {
    if (!isSafePath(current)) return DEFAULT_AFTER_LOGIN
    let decoded: string
    try {
      decoded = decodeURIComponent(current)
    } catch {
      return DEFAULT_AFTER_LOGIN
    }
    if (decoded === current) break
    current = decoded
  }
  if (/^\/login(?:[/?#]|$)/.test(current)) return DEFAULT_AFTER_LOGIN
  return value
}

function isSafePath(p: string): boolean {
  if (!p.startsWith('/')) return false
  if (p.startsWith('//')) return false
  if (p.includes('\\')) return false
  // 控制字符与空白（浏览器会剥掉制表符/换行，可能拼出 //）
  if (/[\u0000-\u0020\u007f]/.test(p)) return false
  // 路径首段（到下一个 / ? # 为止）含冒号一律拒绝，如 /javascript:x、/http:evil（FE-06 收紧）
  const firstSegment = p.slice(1).split(/[/?#]/, 1)[0] ?? ''
  if (firstSegment.includes(':')) return false
  return true
}
