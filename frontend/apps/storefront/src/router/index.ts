import { nextTick } from 'vue'
import { createRouter, createWebHistory, type Router, type RouterHistory } from 'vue-router'

export const SITE_NAME = 'SelfMall'

export const routes = [
  { path: '/', redirect: '/products' },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/pages/products/ProductListPage.vue'),
    meta: { title: '商品列表' },
  },
  {
    path: '/products/:id',
    name: 'product-detail',
    component: () => import('@/pages/products/ProductDetailPage.vue'),
    meta: { title: '商品详情' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: '页面不存在' },
  },
]

/** 路由切换后：更新 document.title，并把焦点移到页面 h1（没有则 main）。 */
export function moveFocusToMain(): void {
  const target =
    document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
  target?.focus({ preventScroll: true })
}

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  const r = createRouter({ history, routes, scrollBehavior: () => ({ top: 0 }) })
  let first = true
  r.afterEach((to, _from, failure) => {
    if (failure) return
    const title = to.meta.title as string | undefined
    document.title = title ? `${title} - ${SITE_NAME}` : SITE_NAME
    // 首次加载不抢焦点；同一路由仅查询参数变化（翻页）也移到 h1，便于读屏。
    if (first) {
      first = false
      return
    }
    void nextTick(() => setTimeout(moveFocusToMain, 0))
  })
  return r
}

export const router = createAppRouter()
