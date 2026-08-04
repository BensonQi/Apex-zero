<template>
  <div class="login-page">
    <!-- 左侧：品牌展示区 -->
    <div class="login-left">
      <div class="left-overlay">
        <div class="brand-area">
          <h1 class="brand-name">Apex</h1>
          <p class="brand-desc">自动化测试平台</p>
        </div>
      </div>
    </div>

    <!-- 右侧：登录表单 -->
    <div class="login-right">
      <div class="form-wrapper">
        <div class="form-header">
          <img class="login-logo" :src="logoImage" alt="logo" />
          <h2>欢迎回来</h2>
          <p>请输入您的账户信息以登录系统</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="0"
          size="large"
          @keyup.enter="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              :prefix-icon="User"
              autocomplete="username"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              autocomplete="current-password"
            />
          </el-form-item>

          <div class="form-options">
            <el-checkbox v-model="rememberMe">记住密码</el-checkbox>
            <span class="forgot-link">忘记密码?</span>
          </div>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="errorMsg" class="login-error">
          <el-alert :title="errorMsg" type="error" :closable="false" show-icon />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { sha256 } from '@/utils/crypto'
import logoImage from '/images/login_logo.png'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const errorMsg = ref('')
const rememberMe = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''
  try {
    const ok = await authStore.login({ username: form.username, password: await sha256(form.password) })
    if (ok) {
      const redirect = route.query.redirect || '/dashboard'
      router.replace(redirect)
    } else {
      errorMsg.value = '登录失败，请检查用户名和密码'
    }
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || '登录失败，服务器异常'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  overflow: hidden;
  background-image: url('@/assets/images/login-bg.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* ====== 左侧品牌区 ====== */
.login-left {
  flex: 1;
  position: relative;
  min-width: 0;
}
.left-overlay {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.70) 0%, rgba(30, 58, 138, 0.55) 100%);
}
.brand-area {
  text-align: center;
  color: #fff;
}
.brand-name {
  font-size: 48px;
  font-weight: 800;
  letter-spacing: 4px;
  margin-bottom: 8px;
  text-shadow: 0 2px 16px rgba(0,0,0,0.4);
}
.brand-desc {
  font-size: 16px;
  opacity: 0.85;
  letter-spacing: 2px;
}

/* ====== 右侧表单区（纯白底色）====== */
.login-right {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #ffffff;
}
.form-wrapper {
  width: 360px;
}
.form-header {
  text-align: center;
  margin-bottom: 36px;
}
.login-logo {
  width: 240px;
  height: auto;
  margin-top: -24px;
  margin-bottom: 48px;
}
.form-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}
.form-header p {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 13px;
  color: #1e293b;
}
.forgot-link {
  color: #3b82f6;
  cursor: pointer;
}
.forgot-link:hover {
  color: #2563eb;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 2px;
  border-radius: 8px;
}

.login-error {
  margin-top: 16px;
}

/* ====== Element Plus 输入框覆盖 ====== */
:deep(.el-input__wrapper) {
  background: #fff !important;
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset !important;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b82f6 inset !important;
}
:deep(.el-input__inner) {
  color: #1e293b !important;
}
:deep(.el-input__inner::placeholder) {
  color: #94a3b8 !important;
}
:deep(.el-input .el-input__prefix) {
  color: #94a3b8;
}
:deep(.el-input .el-input__suffix) {
  color: #94a3b8;
}
:deep(.el-checkbox__label) {
  color: #1e293b !important;
  font-weight: 500;
}

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .login-left {
    display: none;
  }
  .login-right {
    width: 100%;
  }
}
</style>
