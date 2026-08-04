<template>
  <router-view v-if="isLoginPage" />
  <div v-else class="app-layout">
    <div v-if="!authStore.checked || !authStore.authenticated" class="app-loading">
      <div class="skeleton-ring"></div>
    </div>

    <aside v-show="authStore.checked && authStore.authenticated" class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <img class="sidebar-logo" src="/images/logo.png" alt="logo" />
          <span class="sidebar-title">APEX 测试平台</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div
          class="nav-item"
          :class="{ active: route.name === 'Dashboard' }"
          @click="goDashboard"
        >
          <el-icon><Odometer /></el-icon>
          <span class="nav-label">驾驶舱</span>
        </div>
        <router-link to="/api-tests" class="nav-item" active-class="active">
          <el-icon><Connection /></el-icon>
          <span class="nav-label">API 测试</span>
        </router-link>
        <router-link to="/ui-tests" class="nav-item" active-class="active">
          <el-icon><Monitor /></el-icon>
          <span class="nav-label">UI 测试</span>
        </router-link>
        <router-link to="/history" class="nav-item" active-class="active">
          <el-icon><Clock /></el-icon>
          <span class="nav-label">执行历史</span>
        </router-link>
        <router-link to="/reports" class="nav-item" active-class="active">
          <el-icon><DataAnalysis /></el-icon>
          <span class="nav-label">测试报告</span>
        </router-link>
        <router-link to="/env-manager" class="nav-item" active-class="active">
          <el-icon><Tools /></el-icon>
          <span class="nav-label">环境变量</span>
        </router-link>
        <router-link to="/assert-rules" class="nav-item" active-class="active">
          <el-icon><CircleCheck /></el-icon>
          <span class="nav-label">断言规则</span>
        </router-link>
        <div class="nav-spacer"></div>
        <div class="nav-item nav-sub-parent" :class="{ open: systemMenuOpen }" @click="systemMenuOpen = !systemMenuOpen">
          <el-icon><Setting /></el-icon>
          <span class="nav-label">系统管理</span>
          <el-icon class="nav-arrow"><ArrowRight /></el-icon>
        </div>
        <div class="nav-sub-items" :class="{ open: systemMenuOpen }">
          <router-link to="/settings" class="nav-item nav-sub-item" active-class="active">
            <span class="nav-label">系统设置</span>
          </router-link>
          <router-link to="/user-management" class="nav-item nav-sub-item" active-class="active">
            <span class="nav-label">用户管理</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <el-dropdown trigger="click" @command="handleUserCmd" class="sidebar-user">
          <div class="sidebar-user-info">
            <span class="sidebar-avatar">{{ (authStore.username || "A").charAt(0).toUpperCase() }}</span>
            <div class="sidebar-user-text">
              <span class="sidebar-username">{{ authStore.username || "admin" }}</span>
              <span class="sidebar-role">管理员</span>
            </div>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人设置</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="sidebar-status">
          <span class="breathing-dot" :class="{ error: healthStatus !== 'ok' }"></span>
          <span class="status-text">{{ healthStatus === "ok" ? "系统运行正常" : "系统异常" }}</span>
          <span class="sidebar-time">{{ currentTimeShort }}</span>
        </div>
      </div>

      <!-- 侧边栏边缘折叠按钮 -->
      <div
        class="sidebar-edge-toggle"
        :class="{ hover: edgeHover }"
        @click="sidebarCollapsed = !sidebarCollapsed"
        @mouseenter="edgeHover = true"
        @mouseleave="edgeHover = false"
      >
        <el-icon :size="16">
          <ArrowRight v-if="sidebarCollapsed" />
          <ArrowLeft v-else />
        </el-icon>
      </div>
    </aside>

    <main class="app-main">
      <div class="app-content">
        <div class="content-topbar">
          <Breadcrumb />
        </div>
        <router-view v-slot="{ Component }">
          <component :is="Component" ref="currentPage" />
        </router-view>
      </div>
    </main>

    <el-dialog v-model="showLogoutConfirm" title="确认退出" width="360px" :close-on-click-modal="false" align-center>
      <div class="empty-state" style="padding:1px 0">
        <p style="font-size:15px;color:#475569">确定要退出当前账户吗？</p>
      </div>
      <template #footer>
        <el-button @click="showLogoutConfirm = false" round>取消</el-button>
        <el-button type="danger" @click="handleLogout" round>确认退出</el-button>
      </template>
    </el-dialog>

    <!-- 个人设置弹窗 -->
    <el-dialog v-model="showProfile" title="个人设置" width="480px" :close-on-click-modal="false" align-center @closed="resetProfileForm">
      <el-form :model="profileForm" label-width="80px" v-if="!profilePwdMode">
        <el-form-item label="账户名">
          <el-input :model-value="profileForm.username" disabled />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input :model-value="profileForm.display_name" disabled />
        </el-form-item>
        <el-form-item label="角色">
          <el-tag :type="profileForm.role==='admin'?'danger':'primary'" size="small">{{ profileForm.role==='admin'?'管理员':'普通用户' }}</el-tag>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input :model-value="profileForm.email" disabled />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input :model-value="profileForm.phone" disabled />
        </el-form-item>
      </el-form>

      <el-form :model="pwdForm" label-width="80px" v-else>
        <el-form-item label="旧密码" required>
          <el-input v-model="pwdForm.old_password" placeholder="请输入旧密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="pwdForm.new_password" placeholder="请输入新密码（至少6位）" show-password />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="pwdForm.confirm_password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>

      <template #footer>
        <template v-if="!profilePwdMode">
          <el-button @click="showProfile = false">关闭</el-button>
          <el-button type="warning" @click="profilePwdMode = true">修改密码</el-button>
        </template>
        <template v-else>
          <el-button @click="profilePwdMode = false">返回</el-button>
          <el-button type="primary" @click="handleChangePwd" :loading="pwdSaving">确认修改</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, onErrorCaptured } from "vue"
import { ElMessage } from "element-plus"

onErrorCaptured(() => false)

import { useRoute, useRouter } from "vue-router"
import { Odometer, Connection, Monitor, Clock, DataAnalysis, Setting, Tools, CircleCheck, ArrowRight, ArrowLeft } from "@element-plus/icons-vue"
import { healthCheck, getProfile as fetchProfile, changePassword as changePwd } from "@/api"
import { sha256 } from "@/utils/crypto"
import { useAuthStore } from "@/stores/auth"
import Breadcrumb from "@/components/Breadcrumb.vue"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sidebarCollapsed = ref(false)
const systemMenuOpen = ref(false)
const showLogoutConfirm = ref(false)
const showProfile = ref(false)
const profilePwdMode = ref(false)
const pwdSaving = ref(false)
const profileForm = reactive({ username: '', display_name: '', email: '', phone: '', role: '' })
const pwdForm = reactive({ old_password: '', new_password: '', confirm_password: '' })

// 当路由到系统管理子页面时自动展开菜单
const isSystemPage = computed(() => ['Settings', 'UserManagement'].includes(route.name))
const healthStatus = ref("ok")
const edgeHover = ref(false)
const currentPage = ref(null)

let healthTimer = null

const isLoginPage = computed(() => route.name === "Login")
const currentTimeShort = computed(() => {
  const d = new Date()
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
})

// 路由到系统管理页面时自动展开，离开时保持用户手动状态
watch(isSystemPage, (val) => {
  if (val) systemMenuOpen.value = true
})

async function checkHealth() {
  try {
    const { data } = await healthCheck()
    healthStatus.value = data?.status || "ok"
  } catch {
    healthStatus.value = "error"
  }
}

function goDashboard() {
  if (route.name === 'Dashboard') {
    currentPage.value?.refresh()
  } else {
    router.push('/dashboard')
  }
}

function handleUserCmd(cmd) {
  if (cmd === "logout") {
    showLogoutConfirm.value = true
  } else if (cmd === "profile") {
    openProfile()
  }
}

async function handleLogout() {
  showLogoutConfirm.value = false
  await authStore.logout()
  router.replace("/login")
}

async function openProfile() {
  try {
    const { data } = await fetchProfile()
    const u = data?.data || {}
    Object.assign(profileForm, {
      username: u.username || authStore.username || '',
      display_name: u.display_name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || '',
    })
  } catch { /* fallback */ }
  profilePwdMode.value = false
  showProfile.value = true
}

function resetProfileForm() {
  pwdForm.old_password = ''
  pwdForm.new_password = ''
  pwdForm.confirm_password = ''
  profilePwdMode.value = false
}

async function handleChangePwd() {
  if (!pwdForm.old_password) { ElMessage.warning('请输入旧密码'); return }
  if (!pwdForm.new_password) { ElMessage.warning('请输入新密码'); return }
  if (pwdForm.new_password.length < 6) { ElMessage.warning('新密码至少6位'); return }
  if (pwdForm.new_password !== pwdForm.confirm_password) { ElMessage.warning('两次输入的新密码不一致'); return }
  pwdSaving.value = true
  try {
    await changePwd({
      old_password: await sha256(pwdForm.old_password),
      new_password: await sha256(pwdForm.new_password),
    })
    ElMessage.success('密码修改成功，请重新登录')
    showProfile.value = false
    await authStore.logout()
    router.replace('/login')
  } catch {
    // 错误已由 axios 拦截器提示，不自动退出
  } finally {
    pwdSaving.value = false
  }
}

onMounted(async () => {
  if (!authStore.checked) await authStore.checkStatus()
  checkHealth()
  healthTimer = setInterval(checkHealth, 30000)
})

onUnmounted(() => clearInterval(healthTimer))
</script>

<style scoped>
.app-loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F8FAFC;
}

.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.app-sidebar {
  position: relative;
  width: 240px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #FFFFFF 0%, #E3EEFA 60%, #C5D9F0 100%);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.app-sidebar.collapsed {
  width: 64px;
  min-width: 64px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(36, 120, 229, 0.18);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo {
  width: 42px;
  height: 42px;
  border-radius: 0px;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  /* 加深起点蓝色，冷暖层次拉开，和左侧LOGO色调统一 */
  background: linear-gradient(90deg, #4681ce 0%, #1c64c1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.app-sidebar.collapsed .sidebar-title,
.app-sidebar.collapsed .sidebar-user-text,
.app-sidebar.collapsed .status-text,
.app-sidebar.collapsed .sidebar-time {
  display: none;
}

.app-sidebar.collapsed .sidebar-header {
  padding: 20px 0;
}

.app-sidebar.collapsed .sidebar-brand {
  justify-content: center;
  gap: 0;
}

.app-sidebar.collapsed .sidebar-user {
  display: flex;
  justify-content: center;
}

.app-sidebar.collapsed .sidebar-user-info {
  justify-content: center;
  gap: 0;
  padding-left: 0;
  padding-right: 0;
}

.app-sidebar.collapsed .sidebar-footer {
  padding: 12px 0;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 8px;
  padding: 0 16px;
  height: 44px;
  border-radius: 8px;
  color: #060606;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #93a9e6;
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.18);
  color: #3f46d1;
  font-weight: 600;
}
/* ====== 菜单图标大小 ====== */
.nav-item .el-icon {
  font-size: 18px;
}

.nav-spacer {
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin: 4px 16px 0;
}

.nav-sub-parent {
  cursor: pointer;
  user-select: none;
}

.nav-sub-parent .nav-arrow {
  margin-left: auto;
  font-size: 12px;
  transition: transform 0.2s;
}

.nav-sub-parent.open .nav-arrow {
  transform: rotate(90deg);
}

.nav-sub-items {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease;
}

.nav-sub-items.open {
  max-height: 120px;
}

.nav-sub-item {
  padding-left: 52px;
  height: 38px;
  font-size: 13px;
}

.app-sidebar.collapsed .nav-item {
  justify-content: center;
  margin-left: 0;
  margin-right: 0;
  padding: 0;
}

.app-sidebar.collapsed .nav-label {
  display: none;
}

.app-sidebar.collapsed .nav-arrow {
  display: none;
}

.app-sidebar.collapsed .nav-sub-items {
  display: none;
}

.app-sidebar.collapsed .nav-spacer {
  margin: 4px 0 0;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(36, 120, 229, 0.18);
}

.sidebar-user {
  width: 100%;
}

.sidebar-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-user-info:hover {
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.sidebar-user-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.sidebar-username {
  font-size: 13px;
  font-weight: 600;
  color: #2c53dd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-role {
  font-size: 11px;
  color: #64748B;
}

.sidebar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 0 8px;
}

.breathing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22C55E;
  flex-shrink: 0;
  animation: breathe 2s ease-in-out infinite;
}

.breathing-dot.error {
  background: #EF4444;
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-size: 12px;
  color: #94A3B8;
  white-space: nowrap;
}

.sidebar-time {
  margin-left: auto;
  font-size: 12px;
  color: #64748B;
  font-variant-numeric: tabular-nums;
}

/* ====== 侧边栏边缘折叠按钮 ====== */
.sidebar-edge-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(11px, -50%);
  width: 13px;
  height: 96px;
  border-radius: 13px 0 0 13px;
  background: rgba(36, 120, 229, 0.06);
  color: #2478E5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 101;
  transition: transform 220ms ease-out, background 220ms ease-out, color 220ms ease-out;
  border: none;
}

/* 扩展hover感应热区（关键） */
.sidebar-edge-toggle::after {
  content: "";
  position: absolute;
  left: -6px;
  right: 0;
  top: 0;
  bottom: 0;
}

.sidebar-edge-toggle.hover {
  transform: translate(0, -50%);
  background: rgba(36, 120, 229, 0.14);
  color: #1a5cb8;
}

/* 折叠状态下按钮定位微调 */
.app-sidebar.collapsed .sidebar-edge-toggle {
  right: 0;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #F8FAFC;
}

.app-content {
  min-height: 100%;
  padding: 24px;
}

.content-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
</style>
