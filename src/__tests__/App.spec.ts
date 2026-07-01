import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { ref } from 'vue'
import App from '../App.vue'
import { useCVStore } from '../stores/cv'

// Mock fetch to avoid relative URL issues in Vitest Node environment
beforeAll(() => {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve([])
  } as unknown as Response))
})

// Mock vue-router to prevent navigation menu / links errors in the test environment
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    resolve: vi.fn(() => ({ href: '' }))
  }),
  useRoute: () => ({
    path: '/'
  }),
  useLink: () => ({
    route: ref({}),
    href: ref(''),
    isActive: ref(false),
    isExactActive: ref(false),
    navigate: vi.fn()
  }),
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

describe('App', () => {
  it('renders app title properly', () => {
    const pinia = createPinia()
    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          RouterLink: true
        }
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
        stubs: {
          RouterLink: true
        }
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
