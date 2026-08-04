import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', noAuth: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '驾驶舱', icon: 'Odometer' },
  },
  {
    path: '/api-tests',
    name: 'ApiTests',
    component: () => import('@/views/ApiTests.vue'),
    meta: { title: 'API 测试', icon: 'Connection' },
  },
  {
    path: '/ui-tests',
    name: 'UiTests',
    component: () => import('@/views/UiTests.vue'),
    meta: { title: 'UI 测试', icon: 'Monitor' },
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue'),
    meta: { title: '测试报告', icon: 'DataAnalysis' },
  },
  {
    path: '/env-manager',
    name: 'EnvManager',
    component: () => import('@/views/EnvManager.vue'),
    meta: { title: '环境变量', icon: 'Tools' },
  },
  {
    path: '/assert-rules',
    name: 'AssertRules',
    component: () => import('@/views/AssertRules.vue'),
    meta: { title: '断言规则', icon: 'CircleCheck' },
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/History.vue'),
    meta: { title: '执行历史', icon: 'Clock' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '系统设置', icon: 'Setting' },
  },
  {
    path: '/db-config',
    name: 'DbConfig',
    component: () => import('@/views/DbConfig.vue'),
    meta: { title: '数据库配置', icon: 'DataBoard' },
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: () => import('@/views/UserManagement.vue'),
    meta: { title: '系统用户管理', icon: 'User' },
  },
  {
    path: '/log-parser',
    name: 'LogParser',
    component: () => import('@/views/LogParser.vue'),
    meta: { title: '日志解析', icon: 'Tickets' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局路由守卫：未登录跳转登录页
router.beforeEach(async (to, _from, next) => {
  if (to.meta.noAuth) {
    next()
    return
  }

  const authStore = useAuthStore()

  // 首次访问时检查登录状态
  if (!authStore.checked) {
    await authStore.checkStatus()
  }

  if (authStore.isLoggedIn) {
    next()
  } else {
    next({ path: '/login', query: { redirect: to.fullPath } })
  }
})

export default router
