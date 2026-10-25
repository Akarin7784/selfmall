<script setup lang="ts">
import { isMockEnabled } from '@/mocks/enable'

const props = withDefaults(defineProps<{ enabled?: boolean }>(), { enabled: undefined })
const show = props.enabled ?? isMockEnabled()
</script>

<template>
  <p v-if="show" class="mock-badge" role="note" data-test="mock-badge">
    <span aria-hidden="true">MOCK 数据</span>
    <span class="visually-hidden">MOCK 数据：当前页面显示的是示例数据，非真实商品和价格</span>
  </p>
</template>

<style scoped>
.mock-badge {
  display: inline-block;
  margin: 0 0 12px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #b42318;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  line-height: 20px;
}
</style>
