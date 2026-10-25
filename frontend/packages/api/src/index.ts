/**
 * @selfmall/api：类型化接口客户端（FE-03 实现）。
 * 本包目前只是骨架，仅导出与后端 ApiResponse 对齐的最小类型和常量。
 */

/** 后端统一响应包装，见 mall-common-core 的 ApiResponse。 */
export interface ApiResponse<T> {
  code: string
  message: string
  data: T
}

/** 所有接口的统一前缀，开发期由 Vite 代理转发到网关。 */
export const API_BASE_PATH = '/api'
