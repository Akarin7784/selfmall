import type { RequestHandler } from 'msw'

/**
 * Mock handlers 汇总。FE-01 不提供任何接口 mock。
 * 规则：只 mock 后端未实现的接口；响应必须带 `X-Mock: true`，页面必须显示 MOCK 徽标。
 */
export const handlers: RequestHandler[] = []
