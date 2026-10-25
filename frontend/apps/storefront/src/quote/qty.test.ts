import { describe, expect, it } from 'vitest'
import { isValidQtyText, parseQtyQuery } from './qty'

describe('qty 严格校验', () => {
  it.each(['1', '2', '9', '10', '42', '99'])('合法：%s', (v) => {
    expect(isValidQtyText(v)).toBe(true)
    expect(parseQtyQuery(v)).toBe(Number(v))
  })

  it.each([
    '0',
    '100',
    '1.5',
    ' 2',
    '2 ',
    '02',
    '1e1',
    '-1',
    '+1',
    '',
    'abc',
    '0x10',
    '９',
    '9'.repeat(5000),
  ])('非法回退 1：%j', (v) => {
    expect(isValidQtyText(v)).toBe(false)
    expect(parseQtyQuery(v)).toBe(1)
  })

  it('非字符串与数组形式 query 回退 1', () => {
    expect(parseQtyQuery(undefined)).toBe(1)
    expect(parseQtyQuery(null)).toBe(1)
    expect(parseQtyQuery(5)).toBe(1)
    expect(parseQtyQuery(['5'])).toBe(1)
    expect(parseQtyQuery(['5', '6'])).toBe(1)
  })
})
