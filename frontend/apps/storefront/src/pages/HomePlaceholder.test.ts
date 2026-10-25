import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HomePlaceholder from './HomePlaceholder.vue'
import { BREAKPOINTS } from '@/styles/breakpoints'

describe('storefront 骨架', () => {
  it('渲染占位首页', () => {
    const wrapper = mount(HomePlaceholder)
    expect(wrapper.text()).toContain('工程骨架')
  })

  it('断点常量', () => {
    expect(BREAKPOINTS).toEqual({ tablet: 768, desktop: 1200 })
  })
})
