<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const inProducts = computed(() => route.path === '/products' || route.path.startsWith('/products/'))
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
    <!-- 预留：「我的」（FE-05 起） -->
  </nav>
</template>
