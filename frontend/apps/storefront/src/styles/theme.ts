/** 主题色（与 main.css 中 :root:root 的 --el-color-primary 系列保持一致，见 theme.test.ts）。 */
export const THEME = {
  primary: '#1d4ed8', // 主按钮默认背景
  primaryHover: '#1e40af', // --el-color-primary-light-3：hover/focus 背景
  primaryActive: '#1e3a8a', // --el-color-primary-dark-2：active 背景
  primaryDisabled: '#6b7fc4', // --el-color-primary-light-5：disabled 背景（WCAG 对禁用控件不作要求）
  mockBadge: '#b42318',
  link: '#1d4ed8',
  price: '#c2410c',
} as const

/** WCAG 2.x 相对亮度。 */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`不是 #rrggbb：${hex}`)
  const n = parseInt(m[1] as string, 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/** WCAG 对比度 (L1 + 0.05) / (L2 + 0.05)。 */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((p, q) => q - p) as [
    number,
    number,
  ]
  return (x + 0.05) / (y + 0.05)
}
