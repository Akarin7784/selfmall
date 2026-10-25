import type { Money } from './money'

/** 后端统一响应包装，见 mall-common-core 的 ApiResponse。 */
export interface ApiResponse<T> {
  code: string
  message: string
  data: T
}

export interface LoginRequest {
  username: string
  password: string
}

/** 演示登录返回；没有刷新令牌。 */
export interface TokenResponse {
  accessToken: string
  tokenType: 'Bearer'
  /** 有效期（秒）。 */
  expiresIn: number
}

export interface Product {
  id: number
  skuCode: string
  name: string
  /** 金额原文字符串，如 "99.00"。 */
  price: Money
}

export interface ListProductsParams {
  /** 0–10000，默认 0。 */
  page?: number
  /** 1–100，默认 20。 */
  size?: number
}

export interface QuoteRequest {
  /** > 0 的整数。 */
  productId: number
  /** 1–99 的整数。 */
  quantity: number
}

export interface OrderQuote {
  memberId: string
  productId: number
  quantity: number
  unitPrice: Money
  /** 以服务端为准，前端不自己乘。 */
  totalAmount: Money
}

export interface MemberProfile {
  memberId: string
}
