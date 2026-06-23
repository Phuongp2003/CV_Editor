import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import { useCVStore } from '../stores/cv'

describe('App', () => {
  it('renders app title properly', () => {
    const pinia = createPinia()
    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    })
    expect(wrapper.text()).toContain('Workspace')
    wrapper.unmount()
  })

  it('switches workspaces when activeWorkspace is toggled', async () => {
    const pinia = createPinia()
    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    })
    const store = useCVStore(pinia)

    expect(store.activeWorkspace).toBe('cv')

    // Switch to Cover Letter workspace
    store.activeWorkspace = 'cover-letter'
    await wrapper.vm.$nextTick()

    // Assert that the cover letter editor details are now displayed
    expect(wrapper.text()).toContain('Cover Letter')
    wrapper.unmount()
  })
})
