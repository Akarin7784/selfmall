// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio, THEME } from './theme'

const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8')

describe('主按钮与关键色对比度（WCAG 相对亮度公式）', () => {
  it('公式自检：黑白 21:1、同色 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
  })

  it('Element Plus 默认主色 #409eff 白字不达标（修复前）', () => {
    expect(contrastRatio('#409eff', '#ffffff')).toBeLessThan(4.5)
  })

  it.each([
    ['默认', THEME.primary],
    ['hover', THEME.primaryHover],
    ['active', THEME.primaryActive],
  ])('主按钮 %s 白字 ≥ 4.5:1', (_s, bg) => {
    expect(contrastRatio(bg, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('MOCK 徽标、链接、价格色在白底 ≥ 4.5:1', () => {
    for (const c of [THEME.mockBadge, THEME.link, THEME.price]) {
      expect(contrastRatio(c, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('main.css 的主题变量与 THEME 一致（全局覆盖，不逐处改）', () => {
    expect(css).toMatch(/:root:root\s*\{[^}]*--el-color-primary:\s*#1d4ed8;/)
    expect(css).toContain(`--el-color-primary-light-3: ${THEME.primaryHover};`)
    expect(css).toContain(`--el-color-primary-dark-2: ${THEME.primaryActive};`)
    expect(css).toContain(`--el-color-primary-light-5: ${THEME.primaryDisabled};`)
    expect(css).toContain(`--color-primary: ${THEME.link};`)
    expect(css).toContain(`--color-price: ${THEME.price};`)
  })
})
