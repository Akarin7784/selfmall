<script setup lang="ts">
import { computed } from 'vue'
import { errorText } from '@/api/errorText'

const props = defineProps<{ error: unknown; retrying?: boolean }>()
defineEmits<{ retry: [] }>()
const text = computed(() => errorText(props.error))
</script>

<template>
  <div class="state state--error" role="alert" data-test="error-state">
    <p class="state__text">{{ text }}</p>
    <el-button
      class="touch"
      type="primary"
      :loading="retrying"
      data-test="retry"
      @click="$emit('retry')"
    >
      重试
    </el-button>
  </div>
</template>
