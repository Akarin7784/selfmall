<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isApiError } from '@selfmall/api'
import ErrorState from '@/components/ErrorState.vue'
import { useApiClient } from '@/api/client'
import { useSessionStore } from '@/session/store'

const router = useRouter()
const session = useSessionStore()
const api = useApiClient()

// 只显示后端返回的 memberId；不做会员等级与积分。401/无令牌由 onUnauthorized 统一跳登录页。
const memberId = ref<string | null>(null)
const loading = ref(false)
const error = ref<unknown>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    memberId.value = (await api.getCurrentMember()).memberId
  } catch (e) {
    if (isApiError(e) && (e.kind === 'unauthorized' || e.kind === 'unauthenticated')) return
    error.value = e
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onLogout(): Promise<void> {
  session.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <section class="page auth" data-test="page-me">
    <h1 class="page__title" tabindex="-1">我的</h1>
    <p class="state__text" data-test="login-status">
      {{ session.isLoggedIn ? '已登录（演示账号）' : '未登录' }}
    </p>
    <p v-if="loading" class="state__text" role="status" aria-busy="true" data-test="member-loading">
      正在加载会员信息…
    </p>
    <ErrorState v-else-if="error" :error="error" @retry="load" />
    <p v-else-if="memberId" class="state__text" data-test="member-id">会员 ID：{{ memberId }}</p>
    <el-button class="touch" data-test="logout" @click="onLogout">退出登录</el-button>
  </section>
</template>
