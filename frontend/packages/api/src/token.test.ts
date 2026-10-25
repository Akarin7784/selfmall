import { describe, expect, it } from 'vitest'
import {
  createMemoryTokenStore,
  createTokenStore,
  TOKEN_STORAGE_KEY,
  type StorageLike,
} from './token'

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

describe('令牌存储（验收 3）', () => {
  it('固定 key 写入 localStorage 兼容存储', () => {
    const s = fakeStorage()
    const store = createTokenStore(s)
    store.set('t-1')
    expect(s.map.get(TOKEN_STORAGE_KEY)).toBe('t-1')
    expect(TOKEN_STORAGE_KEY).toBe('selfmall.accessToken')
    expect(store.get()).toBe('t-1')
    store.clear()
    expect(s.map.has(TOKEN_STORAGE_KEY)).toBe(false)
    expect(store.get()).toBeNull()
  })

  it('没有 localStorage（node 环境）时退回内存，不崩', () => {
    expect('localStorage' in globalThis).toBe(false)
    const store = createTokenStore()
    expect(store.get()).toBeNull()
    store.set('t-2')
    expect(store.get()).toBe('t-2')
    store.clear()
    expect(store.get()).toBeNull()
  })

  it('存储读写抛错（隐私模式、配额）时退回内存', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    const store = createTokenStore(throwing)
    store.set('t-3')
    expect(store.get()).toBe('t-3')
    expect(() => store.clear()).not.toThrow()
    expect(store.get()).toBeNull()
  })

  it('内存存储', () => {
    const m = createMemoryTokenStore()
    m.set('x')
    expect(m.get()).toBe('x')
    m.clear()
    expect(m.get()).toBeNull()
  })
})
