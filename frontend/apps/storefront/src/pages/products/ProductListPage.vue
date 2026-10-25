<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { useApiClient } from '@/api/client'
import ErrorState from '@/components/ErrorState.vue'
import ProductCard from '@/components/ProductCard.vue'
import { hasNextPage, PAGE_SIZE, parsePageQuery } from './pagination'

const api = useApiClient()
const route = useRoute()
const router = useRouter()

const parsed = computed(() => parsePageQuery(route.query.page))
const page = computed(() => parsed.value.page)

watchEffect(() => {
  if (parsed.value.normalized) {
    void router.replace({ query: { ...route.query, page: String(parsed.value.page) } })
  }
})

const query = useQuery({
  queryKey: computed(() => ['products', 'list', page.value, PAGE_SIZE] as const),
  queryFn: () => api.listProducts({ page: page.value - 1, size: PAGE_SIZE }),
  placeholderData: keepPreviousData,
})

const items = computed(() => query.data.value ?? [])
const showSkeleton = computed(() => query.isPending.value)
const canPrev = computed(() => page.value > 1)
const canNext = computed(
  () => !query.isPlaceholderData.value && hasNextPage(items.value.length, page.value),
)

function go(target: number): void {
  void router.push({ query: { ...route.query, page: String(target) } })
}
</script>

<template>
  <section class="page">
    <h1 class="page__title" tabindex="-1">商品列表</h1>

    <div
      v-if="showSkeleton"
      class="grid"
      aria-busy="true"
      role="status"
      aria-label="商品加载中"
      data-test="loading"
    >
      <div v-for="n in 8" :key="n" class="skeleton-card" aria-hidden="true">
        <div class="placeholder"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line--short"></div>
      </div>
    </div>

    <ErrorState
      v-else-if="query.isError.value"
      :error="query.error.value"
      :retrying="query.isFetching.value"
      @retry="query.refetch()"
    />

    <div v-else-if="items.length === 0" class="state" role="status" data-test="empty-state">
      <p class="state__text">{{ page > 1 ? '这一页没有商品了' : '暂无商品' }}</p>
      <RouterLink v-if="page > 1" class="touch link" :to="{ query: { page: '1' } }"
        >回到第一页</RouterLink
      >
    </div>

    <ul v-else class="grid" :aria-busy="query.isFetching.value" data-test="product-grid">
      <li v-for="p in items" :key="p.id">
        <ProductCard :product="p" />
      </li>
    </ul>

    <nav v-if="!showSkeleton" class="pager" aria-label="分页">
      <el-button class="touch" :disabled="!canPrev" data-test="prev" @click="go(page - 1)"
        >上一页</el-button
      >
      <span class="pager__current" aria-live="polite" data-test="page-indicator"
        >第 {{ page }} 页</span
      >
      <el-button class="touch" :disabled="!canNext" data-test="next" @click="go(page + 1)"
        >下一页</el-button
      >
    </nav>
  </section>
</template>
