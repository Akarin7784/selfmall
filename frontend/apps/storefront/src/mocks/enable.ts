/** mock 开关：仅 VITE_ENABLE_MOCK === 'true' 时开启，默认关闭。 */
export function isMockEnabled(env: { VITE_ENABLE_MOCK?: string } = import.meta.env): boolean {
  return env.VITE_ENABLE_MOCK === 'true'
}

type WorkerLike = { start: (options?: { onUnhandledFrame?: 'bypass' }) => Promise<unknown> }

/**
 * 开关打开时动态加载并启动 MSW worker；关闭时不加载 msw、不注册 worker。
 * 未匹配的请求一律放行（bypass），不拦截真实接口。
 */
export async function enableMocking(
  enabled: boolean = isMockEnabled(),
  load: () => Promise<{ worker: WorkerLike }> = () => import('./browser'),
): Promise<boolean> {
  if (!enabled) return false
  const { worker } = await load()
  await worker.start({ onUnhandledFrame: 'bypass' })
  return true
}
