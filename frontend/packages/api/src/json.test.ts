import { describe, expect, it } from 'vitest'
import { parseJsonPreservingMoney, quoteMoneyFields } from './json'

describe('无损 JSON 解析（验收 5）', () => {
  it('金额数字原样转成字符串', () => {
    const v = parseJsonPreservingMoney(
      '{"code":"OK","message":"success","data":{"id":1,"skuCode":"SELF-001","name":"x","price":99.00}}',
    ) as { data: { id: number; price: string } }
    expect(v.data.price).toBe('99.00')
    expect(v.data.id).toBe(1) // 非金额字段仍是数字
  })

  it('99.1 保持 "99.1"，负数与空白也保留原文', () => {
    expect(parseJsonPreservingMoney('{"price" : 99.1}')).toEqual({ price: '99.1' })
    expect(parseJsonPreservingMoney('{"price":\n -0.50 }')).toEqual({ price: '-0.50' })
  })

  it('大额数字原文保留，不经过浮点', () => {
    expect(parseJsonPreservingMoney('{"price":12345678901.99}')).toEqual({
      price: '12345678901.99',
    })
    // 超过 Number 安全整数精度：若经过浮点会变成 1.2345678901234568e+23
    expect(parseJsonPreservingMoney('{"price":123456789012345678901234.50}')).toEqual({
      price: '123456789012345678901234.50',
    })
  })

  it('已是字符串的金额原样保留', () => {
    expect(parseJsonPreservingMoney('{"price":"1299.00"}')).toEqual({ price: '1299.00' })
  })

  it('数组和嵌套对象里的金额都处理，unitPrice/totalAmount 也处理', () => {
    const v = parseJsonPreservingMoney(
      '{"data":[{"price":1.00},{"price":2.50}],"q":{"unitPrice":99.00,"totalAmount":198.00,"quantity":2}}',
    )
    expect(v).toEqual({
      data: [{ price: '1.00' }, { price: '2.50' }],
      q: { unitPrice: '99.00', totalAmount: '198.00', quantity: 2 },
    })
  })

  it('跳过字符串字面量内部的内容（含转义引号）', () => {
    const text = '{"name":"\\"price\\":12.30 是商品名","note":"a\\\\","price":5.00}'
    expect(parseJsonPreservingMoney(text)).toEqual({
      name: '"price":12.30 是商品名',
      note: 'a\\',
      price: '5.00',
    })
  })

  it('转义写法的键名也能识别', () => {
    expect(parseJsonPreservingMoney('{"\\u0070rice":3.10}')).toEqual({ price: '3.10' })
  })

  it('null、对象值不改写；字段名列表可配置', () => {
    expect(parseJsonPreservingMoney('{"price":null}')).toEqual({ price: null })
    expect(parseJsonPreservingMoney('{"amount":1.10,"price":2.20}', ['amount'])).toEqual({
      amount: '1.10',
      price: 2.2,
    })
    expect(quoteMoneyFields('{"price":1.00}', [])).toBe('{"price":1.00}')
  })

  it('非法 JSON 仍抛 SyntaxError（由客户端转换）', () => {
    expect(() => parseJsonPreservingMoney('<html>')).toThrow(SyntaxError)
    expect(() => parseJsonPreservingMoney('{"price":1.0')).toThrow(SyntaxError)
    expect(() => parseJsonPreservingMoney('{"a":"unterminated')).toThrow(SyntaxError)
  })
})
