/**
 * 令牌存储：只存 localStorage（固定 key），没有 localStorage（SSR、测试、隐私模式抛错）时退回内存。
 * 本模块不打印令牌，也不提供把令牌写进日志的方法。
 */
export const TOKEN_STORAGE_KEY = 'selfmall.accessToken'

export interface TokenStore {
  get(): string | null
  set(token: string): void
  clear(): void
}

/** 与 Web Storage 兼容的最小接口，便于测试注入。 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createMemoryTokenStore(): TokenStore {
  let token: string | null = null
  return {
    get: () => token,
    set: (t) => {
      token = t
    },
    clear: () => {
      token = null
    },
  }
}

function detectLocalStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage
    if (!ls) return null
    const probe = `${TOKEN_STORAGE_KEY}.__probe__`
    ls.setItem(probe, '1')
    ls.removeItem(probe)
    return ls
  } catch {
    return null
  }
}

/**
 * 创建令牌存储。storage 不传时自动探测 localStorage；探测失败或读写抛错时退回内存，不崩溃。
 */
export function createTokenStore(storage: StorageLike | null = detectLocalStorage()): TokenStore {
  const memory = createMemoryTokenStore()
  if (!storage) return memory
  return {
    get() {
      try {
        const v = storage.getItem(TOKEN_STORAGE_KEY)
        return v === null || v === '' ? null : v
      } catch {
        return memory.get()
      }
    },
    set(token) {
      try {
        storage.setItem(TOKEN_STORAGE_KEY, token)
      } catch {
        memory.set(token)
      }
    },
    clear() {
      memory.clear()
      try {
        storage.removeItem(TOKEN_STORAGE_KEY)
      } catch {
        // 忽略：内存副本已清除
      }
    },
  }
}
