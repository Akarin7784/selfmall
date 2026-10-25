<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, onBeforeUnmount } from 'vue'
import { useSessionStore } from '@/session/store'
import { setUnauthorizedHandler } from '@/session/unauthorized'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const inProducts = computed(() => route.path === '/products' || route.path.startsWith('/products/'))
const inAccount = computed(() => route.path === '/me' || route.path === '/login')
const accountTo = computed(() => (session.isLoggedIn ? '/me' : '/login'))
const accountLabel = computed(() => (session.isLoggedIn ? '我的' : '登录'))

// onUnauthorized 接线（FE-05）：客户端已清令牌；这里同步会话并跳登录页，登录后回到原页。
// 多个并发 401 只跳一次；已在登录页时不再跳。
let redirecting = false
setUnauthorizedHandler(() => {
  session.sync()
  const current = router.currentRoute.value
  if (redirecting || current.name === 'login') return
  redirecting = true
  void router
    .replace({ name: 'login', query: { redirect: current.fullPath, reason: 'expired' } })
    .finally(() => {
      redirecting = false
    })
})
onBeforeUnmount(() => setUnauthorizedHandler(null))
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header class="topbar">
    <div class="topbar__inner">
      <RouterLink class="brand touch" to="/products">SelfMall</RouterLink>
      <nav class="topnav" aria-label="主导航">
        <RouterLink
          class="nav-link touch"
          to="/products"
          :aria-current="inProducts ? 'page' : undefined"
          data-test="top-nav-products"
          >商品</RouterLink
        >
        <RouterLink
          class="nav-link touch"
          :to="accountTo"
          :aria-current="inAccount ? 'page' : undefined"
          data-test="top-nav-account"
          >{{ accountLabel }}</RouterLink
        >
      </nav>
    </div>
  </header>
  <main id="main" class="main" tabindex="-1">
    <RouterView />
  </main>
  <nav class="bottomnav" aria-label="底部导航">
    <RouterLink
      class="bottomnav__item touch"
      to="/products"
      :aria-current="inProducts ? 'page' : undefined"
      data-test="bottom-nav-products"
      >商品</RouterLink
    >
    <RouterLink
      class="bottomnav__item touch"
      :to="accountTo"
      :aria-current="inAccount ? 'page' : undefined"
      data-test="bottom-nav-account"
      >{{ accountLabel }}</RouterLink
    >
  </nav>
</template>
