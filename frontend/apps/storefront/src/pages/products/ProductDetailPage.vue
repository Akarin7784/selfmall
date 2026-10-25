<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { isApiError } from '@selfmall/api'
import { useApiClient } from '@/api/client'
import { displayPrice } from '@/api/price'
import ErrorState from '@/components/ErrorState.vue'
import MockBadge from '@/components/MockBadge.vue'
import QuotePanel from '@/quote/QuotePanel.vue'

const api = useApiClient()
const route = useRoute()

/** 只接受正整数 id；非法 id 直接按「不存在」处理，不发请求。 */
const id = computed(() => {
  const raw = String(route.params.id ?? '')
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : null
})

const query = useQuery({
  queryKey: computed(() => ['products', 'detail', id.value] as const),
  queryFn: () => api.getProduct(id.value as number),
  enabled: computed(() => id.value !== null),
})

const notFound = computed(
  () =>
    id.value === null ||
    (query.isError.value &&
      isApiError(query.error.value) &&
      query.error.value.kind === 'not-found'),
)
const product = computed(() => query.data.value)
</script>

<template>
  <section class="page">
    <RouterLink class="touch link back" :to="{ name: 'products' }">← 返回商品列表</RouterLink>
    <MockBadge />

    <div v-if="notFound" class="state" role="status" data-test="not-found">
      <h1 class="page__title" tabindex="-1">商品不存在或已下架</h1>
      <RouterLink class="touch link" :to="{ name: 'products' }">返回商品列表</RouterLink>
    </div>

    <template v-else>
      <h1 class="page__title" :class="{ 'visually-hidden': !product }" tabindex="-1">
        {{ product ? product.name : '商品详情' }}
      </h1>

      <div
        v-if="query.isPending.value"
        class="detail"
        aria-busy="true"
        role="status"
        aria-label="商品加载中"
        data-test="loading"
      >
        <div class="placeholder detail__media" aria-hidden="true"></div>
        <div class="detail__info" aria-hidden="true">
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

      <div v-else-if="product" class="detail" data-test="product-detail">
        <div class="placeholder detail__media" aria-hidden="true"></div>
        <dl class="detail__info">
          <dt>价格</dt>
          <dd class="detail__price" data-test="price">{{ displayPrice(product.price) }}</dd>
          <dt>SKU</dt>
          <dd data-test="sku">{{ product.skuCode }}</dd>
          <dt>商品编号</dt>
          <dd data-test="id">{{ product.id }}</dd>
        </dl>
      </div>
      <QuotePanel v-if="product" :key="product.id" :product-id="product.id" />
    </template>
  </section>
</template>
