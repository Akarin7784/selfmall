import { describe, expect, it } from 'vitest'
import { API_BASE_PATH, type ApiResponse } from './index'

describe('@selfmall/api 骨架', () => {
  it('导出接口前缀', () => {
    expect(API_BASE_PATH).toBe('/api')
  })

  it('ApiResponse 类型可用', () => {
    const res: ApiResponse<null> = { code: 'OK', message: 'success', data: null }
    expect(res.code).toBe('OK')
  })
})
