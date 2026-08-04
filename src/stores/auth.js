import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const username = ref('')
  const checked = ref(false)   // 是否已完成初始状态检查

  const isLoggedIn = computed(() => authenticated.value)

  async function checkStatus() {
    try {
      const { data } = await api.get('/auth/status')
      authenticated.value = data?.authenticated || false
      username.value = data?.username || ''
    } catch {
      authenticated.value = false
    } finally {
      checked.value = true
    }
  }

  async function login(loginForm) {
    const { data } = await api.post('/auth/login', loginForm)
    if (data?.status === 'success') {
      authenticated.value = true
      username.value = data.username || loginForm.username
      return true
    }
    return false
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch { /* ignore */ }
    authenticated.value = false
    username.value = ''
  }

  return { authenticated, username, checked, isLoggedIn, checkStatus, login, logout }
})
