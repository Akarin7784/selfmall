import type { RequestHandler } from 'msw'
import { createProductHandlers } from './products'

/**
 * Mock handlers 汇总（仅 VITE_ENABLE_MOCK=true 时加载）。
 * FE-09：只 mock 商品列表与详情（电脑配件示例数据，非真实商品）。
 * 登录、订单试算、会员等其他请求不拦截，照常经 Vite 代理走真实后端。
 * 规则：响应必须带 `X-Mock: true`，页面必须显示 MOCK 徽标。
 */
export const handlers: RequestHandler[] = [...createProductHandlers()]
