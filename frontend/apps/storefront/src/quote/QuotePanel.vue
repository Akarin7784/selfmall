<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isApiError, type OrderQuote } from '@selfmall/api'
import { useApiClient } from '@/api/client'
import { displayPrice } from '@/api/price'
import { useSessionStore } from '@/session/store'
import { isValidQtyText, parseQtyQuery, QTY_MAX, QTY_MIN } from './qty'
import { isRetryable, quoteErrorText } from './quoteErrorText'

/**
 * 订单试算（FE-06）：只调 POST /api/orders/quote，不创建订单、不预占库存。
 * 金额只展示服务端原文（经 displayPrice 纯字符串补零到两位），合计以服务端 totalAmount 为准，前端不乘不算。
 */
const props = defineProps<{ productId: number }>()

const api = useApiClient()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()

// 登录回跳只恢复数量，不自动发起试算。
const qtyText = ref(String(parseQtyQuery(route.query.qty)))
const qtyError = ref('')
const pending = ref(false)
const status = ref('')
const result = ref<OrderQuote | null>(null)
const errorMessage = ref('')
const retryable = ref(false)
const qtyInput = ref<HTMLInputElement | null>(null)
const errorBox = ref<HTMLElement | null>(null)

// 每次请求自增；数量变化也自增，晚到的旧响应一律丢弃，只展示最新一次。
let seq = 0

function clearOutcome(): void {
  seq++
  pending.value = false
  result.value = null
  errorMessage.value = ''
  retryable.value = false
  status.value = ''
}

function onQtyInput(e: Event): void {
  qtyText.value = (e.target as HTMLInputElement).value
  qtyError.value = ''
  clearOutcome()
}

function step(delta: 1 | -1): void {
  const cur = isValidQtyText(qtyText.value) ? Number(qtyText.value) : QTY_MIN
  const next = Math.min(QTY_MAX, Math.max(QTY_MIN, cur + delta))
  qtyText.value = String(next)
  qtyError.value = ''
  clearOutcome()
}

async function onQuote(): Promise<void> {
  if (pending.value) return
  if (!isValidQtyText(qtyText.value)) {
    qtyError.value = `请输入 ${QTY_MIN}–${QTY_MAX} 的整数`
    await nextTick()
    qtyInput.value?.focus()
    return
  }
  const quantity = Number(qtyText.value)
  if (!session.isLoggedIn) {
    await router.push({
      name: 'login',
      query: { redirect: `/products/${props.productId}?qty=${quantity}` },
    })
    return
  }
  clearOutcome()
  const mine = seq
  pending.value = true
  status.value = '正在试算…'
  try {
    const q = await api.quoteOrder({ productId: props.productId, quantity })
    if (mine !== seq) return
    result.value = q
    status.value = '试算完成'
  } catch (error) {
    if (mine !== seq) return
    // 401：客户端已清令牌并经 onUnauthorized 跳登录页，这里不另处理。
    if (isApiError(error) && (error.kind === 'unauthorized' || error.kind === 'unauthenticated')) {
      status.value = ''
      return
    }
    errorMessage.value = quoteErrorText(error)
    retryable.value = isRetryable(error)
    status.value = '试算失败'
    await nextTick()
    errorBox.value?.focus()
  } finally {
    if (mine === seq) pending.value = false
  }
}
</script>

<template>
  <section class="quote" aria-labelledby="quote-title" data-test="quote">
    <h2 id="quote-title" class="quote__title">价格试算</h2>
    <p class="quote__note" data-test="quote-note">
      仅试算价格，不创建订单、不预占库存；未计优惠、运费、税费。需要登录。
    </p>
    <div class="field">
      <label class="field__label" for="quote-qty">数量（{{ QTY_MIN }}–{{ QTY_MAX }}）</label>
      <div class="stepper">
        <button
          type="button"
          class="stepper__btn touch"
          aria-label="减少数量"
          :disabled="qtyText === String(QTY_MIN)"
          data-test="qty-dec"
          @click="step(-1)"
        >
          −
        </button>
        <input
          id="quote-qty"
          ref="qtyInput"
          class="field__input stepper__input touch"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          maxlength="2"
          :value="qtyText"
          :aria-invalid="qtyError ? 'true' : undefined"
          :aria-describedby="qtyError ? 'quote-qty-error' : undefined"
          data-test="qty"
          @input="onQtyInput"
        />
        <button
          type="button"
          class="stepper__btn touch"
          aria-label="增加数量"
          :disabled="qtyText === String(QTY_MAX)"
          data-test="qty-inc"
          @click="step(1)"
        >
          +
        </button>
      </div>
      <p v-if="qtyError" id="quote-qty-error" class="field__error" data-test="qty-error">
        {{ qtyError }}
      </p>
    </div>
    <el-button
      class="touch quote__submit"
      type="primary"
      :loading="pending"
      :disabled="pending"
      data-test="quote-submit"
      @click="onQuote"
    >
      {{ pending ? '试算中…' : '试算' }}
    </el-button>
    <p class="visually-hidden" role="status" aria-live="polite" data-test="quote-status">
      {{ status }}
    </p>
    <div aria-live="polite" data-test="quote-result-region">
      <dl v-if="result" class="quote__result" data-test="quote-result">
        <dt>单价</dt>
        <dd data-test="quote-unit">{{ displayPrice(result.unitPrice) }}</dd>
        <dt>数量</dt>
        <dd data-test="quote-qty">{{ result.quantity }}</dd>
        <dt>合计（以服务端为准）</dt>
        <dd class="detail__price" data-test="quote-total">
          {{ displayPrice(result.totalAmount) }}
        </dd>
      </dl>
    </div>
    <div
      v-if="errorMessage"
      ref="errorBox"
      class="quote__error"
      role="alert"
      tabindex="-1"
      data-test="quote-error"
    >
      {{ errorMessage }}<template v-if="retryable">，可点击「试算」重试</template>
    </div>
  </section>
</template>
