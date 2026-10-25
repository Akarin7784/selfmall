import { describe, expect, it } from 'vitest'
import {
  addMoney,
  compareMoney,
  formatMoney,
  fromCents,
  isMoneyString,
  MoneyError,
  toCents,
} from './money'

describe('money 工具（验收 5）', () => {
  it('格式化为两位小数', () => {
    expect(formatMoney('99')).toBe('99.00')
    expect(formatMoney('99.1')).toBe('99.10')
    expect(formatMoney('99.00')).toBe('99.00')
    expect(formatMoney('007.5')).toBe('7.50')
  })

  it('0 与 -0', () => {
    expect(formatMoney('0')).toBe('0.00')
    expect(formatMoney('-0.00')).toBe('0.00')
  })

  it('负数', () => {
    expect(formatMoney('-1.5')).toBe('-1.50')
    expect(addMoney('1.00', '-2.50')).toBe('-1.50')
  })

  it('很大的数不丢精度', () => {
    const big = '123456789012345678901234567890.99'
    expect(formatMoney(big)).toBe(big)
    expect(addMoney(big, '0.01')).toBe('123456789012345678901234567891.00')
  })

  it('拒绝科学计数法、正号、空格、空串、非字符串', () => {
    for (const bad of ['1e3', '1E-2', '+1.00', ' 1.00', '1,000.00', '', '.5', '1.', 'abc', 'NaN']) {
      expect(isMoneyString(bad)).toBe(false)
      expect(() => toCents(bad)).toThrow(MoneyError)
    }
    expect(() => toCents(99 as unknown as string)).toThrow(MoneyError)
  })

  it('超过两位小数：多出部分为 0 可接受，非 0 拒绝（不隐式舍入）', () => {
    expect(formatMoney('1.2300')).toBe('1.23')
    expect(() => formatMoney('1.234')).toThrow(MoneyError)
    expect(() => formatMoney('0.005')).toThrow(MoneyError)
  })

  it('比较与加法', () => {
    expect(compareMoney('99.00', '99')).toBe(0)
    expect(compareMoney('99.01', '99.1')).toBe(-1)
    expect(compareMoney('100', '99.99')).toBe(1)
    expect(compareMoney('-1', '0')).toBe(-1)
    expect(addMoney('0.10', '0.20')).toBe('0.30') // 浮点会得到 0.30000000000000004
    expect(addMoney()).toBe('0.00')
    expect(toCents('198.00')).toBe(19800n)
    expect(fromCents(-5n)).toBe('-0.05')
  })
})
