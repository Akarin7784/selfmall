<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginErrorText } from '@/session/loginErrorText'
import { safeRedirect } from '@/session/redirect'
import { useSessionStore } from '@/session/store'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

// 密码只保存在本组件的表单状态里，提交后立即清空；不进 Pinia、不打日志。
const username = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const usernameError = ref('')
const passwordError = ref('')

const usernameInput = ref<HTMLInputElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)
const errorBox = ref<HTMLElement | null>(null)

const expired = computed(() => route.query.reason === 'expired')

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  errorMessage.value = ''
  usernameError.value = username.value.trim() === '' ? '请输入用户名' : ''
  passwordError.value = password.value === '' ? '请输入密码' : ''
  if (usernameError.value || passwordError.value) {
    await nextTick()
    ;(usernameError.value ? usernameInput.value : passwordInput.value)?.focus()
    return
  }
  submitting.value = true
  const pwd = password.value
  try {
    await session.login({ username: username.value.trim(), password: pwd })
    password.value = ''
    await router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    // 登录页上的 401（用户名或密码错误）不清令牌、不跳转，只显示文案。
    errorMessage.value = loginErrorText(error)
    password.value = ''
    await nextTick()
    errorBox.value?.focus()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="page auth" data-test="page-login">
    <h1 class="page__title" tabindex="-1">演示登录</h1>
    <p class="auth__note" data-test="demo-note">
      这是本地开发用的演示登录（后端 local 模式的 demo 用户），不是真实账号体系，暂不支持注册。
    </p>
    <p v-if="expired" class="auth__notice" role="status" data-test="expired-notice">
      登录已过期，请重新登录
    </p>
    <form class="auth__form" novalidate data-test="login-form" @submit.prevent="onSubmit">
      <div class="field">
        <label class="field__label" for="login-username">用户名</label>
        <input
          id="login-username"
          ref="usernameInput"
          v-model="username"
          class="field__input touch"
          name="username"
          type="text"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          :aria-invalid="usernameError ? 'true' : undefined"
          :aria-describedby="usernameError ? 'login-username-error' : undefined"
          data-test="username"
        />
        <p v-if="usernameError" id="login-username-error" class="field__error">
          {{ usernameError }}
        </p>
      </div>
      <div class="field">
        <label class="field__label" for="login-password">密码</label>
        <input
          id="login-password"
          ref="passwordInput"
          v-model="password"
          class="field__input touch"
          name="password"
          type="password"
          autocomplete="current-password"
          :aria-invalid="passwordError ? 'true' : undefined"
          :aria-describedby="passwordError ? 'login-password-error' : undefined"
          data-test="password"
        />
        <p v-if="passwordError" id="login-password-error" class="field__error">
          {{ passwordError }}
        </p>
      </div>
      <div class="auth__live" aria-live="assertive" data-test="login-live">
        <p
          v-if="errorMessage"
          ref="errorBox"
          class="auth__error"
          role="alert"
          tabindex="-1"
          data-test="login-error"
        >
          {{ errorMessage }}
        </p>
      </div>
      <el-button
        class="touch auth__submit"
        type="primary"
        native-type="submit"
        :loading="submitting"
        :disabled="submitting"
        data-test="submit"
      >
        {{ submitting ? '登录中…' : '登录' }}
      </el-button>
    </form>
    <p class="auth__hint">演示账号与密码请向后端维护者索取。</p>
  </section>
</template>
