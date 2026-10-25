/**
 * onUnauthorized 的应用层接线：客户端（src/api/client.ts）在 401 / 无令牌时先清令牌，
 * 再调用 notifyUnauthorized()；App.vue 挂载时用 setUnauthorizedHandler() 注册实际处理（同步会话并跳登录页）。
 */
type Handler = () => void

let handler: Handler | null = null

export function setUnauthorizedHandler(fn: Handler | null): void {
  handler = fn
}

export function notifyUnauthorized(): void {
  handler?.()
}
