import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LoginRequest } from '@selfmall/api'
import { useApiClient } from '@/api/client'

/**
 * 会话 store。是否已登录以 @selfmall/api 的 token store 为准；store 本身不保存令牌和密码。
 * 不解码 JWT，身份与权限一律以后端为准。
 */
export const useSessionStore = defineStore('session', () => {
  const api = useApiClient()
  const hasToken = ref(api.tokenStore.get() !== null)
  const isLoggedIn = computed(() => hasToken.value)

  /** 重新从 token store 同步登录状态（例如 401 已由客户端清令牌后）。 */
  function sync(): void {
    hasToken.value = api.tokenStore.get() !== null
  }

  /** 演示登录。密码只透传给接口，不保存；失败时抛出 ApiError，由页面按 kind 显示文案。 */
  async function login(req: LoginRequest): Promise<void> {
    try {
      await api.login(req)
    } finally {
      sync()
    }
  }

  function logout(): void {
    api.logout()
    sync()
  }

  return { isLoggedIn, sync, login, logout }
})
