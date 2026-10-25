<script setup lang="ts">
import type { Product } from '@selfmall/api'
import { displayPrice } from '@/api/price'

defineProps<{ product: Product }>()
</script>

<template>
  <RouterLink
    class="card"
    :to="{ name: 'product-detail', params: { id: product.id } }"
    data-test="product-card"
  >
    <div class="placeholder" aria-hidden="true"></div>
    <span class="card__name">{{ product.name }}</span>
    <span class="card__sku">SKU：{{ product.skuCode }}</span>
    <span class="card__price" data-test="price">{{ displayPrice(product.price) }}</span>
  </RouterLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  min-height: 44px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  text-decoration: none;
}
.card:hover {
  border-color: var(--color-primary);
}
.card__name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.card__sku {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
.card__price {
  color: var(--color-price);
  font-size: 1.125rem;
  font-weight: 700;
}
</style>
