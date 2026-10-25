import { describe, expect, it } from 'vitest'
import { DEFAULT_AFTER_LOGIN, safeRedirect } from './redirect'

describe('safeRedirect 回跳白名单', () => {
  it.each([
    '/products',
    '/products/3?x=1',
    '/me',
    '/products?page=2#top',
    '/products/3?qty=7',
    '/products/a?t=1:2',
    '/products/x:y',
  ])('站内路径放行：%s', (p) => {
    expect(safeRedirect(p)).toBe(p)
  })

  it.each([
    '//evil.example',
    '///evil.example',
    'http://evil.example',
    'https://evil.example/products',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,x',
    '/\\evil.example',
    '\\\\evil.example',
    '/%2F%2Fevil.example',
    '%2F%2Fevil.example',
    '/%5Cevil.example',
    '/%252F%252Fevil.example',
    '/%E0%A4%A',
    '/\tevil',
    ' /products',
    'products',
    '',
    '/login',
    '/login?redirect=/me',
    // FE-06：路径首段含冒号一律拒绝
    '/javascript:x',
    '/JavaScript:alert(1)',
    '/http:evil.example',
    '/a:b/c',
    '/javascript%3Ax',
    '/javascript%253Ax',
  ])('非法回跳退回默认页：%s', (p) => {
    expect(safeRedirect(p)).toBe(DEFAULT_AFTER_LOGIN)
  })

  it('非字符串退回默认页，数组取第一个', () => {
    expect(safeRedirect(undefined)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect(null)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect(42)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect(['/me', '/x'])).toBe('/me')
    expect(safeRedirect(['//evil'])).toBe(DEFAULT_AFTER_LOGIN)
  })
})
