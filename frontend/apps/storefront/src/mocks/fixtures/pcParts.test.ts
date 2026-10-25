import { describe, expect, it } from 'vitest'
import { PART_CATEGORIES, PC_PARTS } from './pcParts'

const BRAND_WORDS = [
  'intel',
  'amd',
  'ryzen',
  'core i',
  'nvidia',
  'geforce',
  'rtx',
  'gtx',
  'radeon',
  'asus',
  'msi',
  'gigabyte',
  'asrock',
  'corsair',
  'kingston',
  'samsung',
  'western digital',
  'wd',
  'seagate',
  'crucial',
  'g.skill',
  'seasonic',
  'cooler master',
  'noctua',
  'nzxt',
  'lian li',
  'dell',
  'lg',
  'aoc',
  'benq',
  'philips',
  '华硕',
  '微星',
  '技嘉',
  '七彩虹',
  '影驰',
  '金士顿',
  '三星',
  '海盗船',
  '英特尔',
  '英伟达',
  '酷冷',
  '利民',
  '九州风神',
  '长城',
  '航嘉',
]

describe('PC 配件示例数据', () => {
  it('条数 20–30', () => {
    expect(PC_PARTS.length).toBeGreaterThanOrEqual(20)
    expect(PC_PARTS.length).toBeLessThanOrEqual(30)
  })
  it('9 类都在', () => {
    expect(PART_CATEGORIES).toHaveLength(9)
    for (const c of PART_CATEGORIES) {
      expect(PC_PARTS.some((p) => p.skuCode.startsWith(`MOCK-${c}-`))).toBe(true)
    }
  })
  it('字段集合恰好是 id/skuCode/name/price', () => {
    for (const p of PC_PARTS)
      expect(Object.keys(p).sort()).toEqual(['id', 'name', 'price', 'skuCode'])
  })
  it('id 为唯一正整数，skuCode 唯一', () => {
    const ids = PC_PARTS.map((p) => p.id)
    expect(ids.every((id) => Number.isSafeInteger(id) && id > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(PC_PARTS.map((p) => p.skuCode)).size).toBe(ids.length)
  })
  it('price 是两位小数字符串', () => {
    for (const p of PC_PARTS) expect(String(p.price)).toMatch(/^\d+\.\d{2}$/)
    for (const p of PC_PARTS) expect(typeof p.price).toBe('string')
  })
  it('名称不含常见真实品牌词', () => {
    for (const p of PC_PARTS) {
      const name = p.name.toLowerCase()
      for (const w of BRAND_WORDS) {
        const hit = /^[a-z. ]+$/.test(w)
          ? new RegExp(`\\b${w.replace('.', '\\.')}\\b`).test(name)
          : name.includes(w)
        expect(hit, `${p.name} 含品牌词 ${w}`).toBe(false)
      }
    }
  })
})
