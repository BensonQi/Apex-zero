import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 响应拦截器
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败'
    // 401 未登录时弹窗提示并跳转登录页
    if (err.response?.status === 401) {
      ElMessage({ message: msg, type: 'error', duration: 3000 })
      const authStore = useAuthStore()
      authStore.authenticated = false
      authStore.username = ''
      router.replace('/login')
      return Promise.reject(err)
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  }
)

// ==================== 驾驶舱 ====================
export const getDashboardStats = () => api.get('/dashboard/stats')

// ==================== 测试用例 ====================
export const getTests = () => api.get('/tests')
export const createTest = (data) => api.post('/tests/create', data)
export const updateTest = (data) => api.put('/tests/update', data)
export const getTestDetail = (params) => api.get('/tests/detail', { params })
export const deleteTest = (modules) => api.post('/tests/delete', Array.isArray(modules) ? { modules } : { module: modules })
export const uploadPlaywrightCode = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload_code', fd)
}
export const startCodegen = (data) => api.post('/codegen/start', data)
export const getCodegenStatus = (taskId) => api.get(`/codegen/status/${taskId}`)
export const downloadTemplate = (type = 'excel') =>
  api.get('/template/download', { params: { type }, responseType: 'blob' })
export const importCases = (file, ddt = false) => {
  const fd = new FormData()
  fd.append('file', file)
  if (ddt) fd.append('ddt', '1')
  return api.post('/cases/import', fd)
}

// ==================== 测试任务 ====================
export const runTests = (data) => api.post('/run', data)
export const getTaskStatus = (taskId) => api.get(`/run/status/${taskId}`)
export const stopTask = (taskId) => api.post(`/run/stop/${taskId}`)

// ==================== 报告 ====================
export const getReports = (params = {}) => api.get('/reports', { params })
export const deleteReport = (data) => api.post('/reports/delete', data)
export const exportReports = (files) =>
  api.post('/reports/export', { files }, { responseType: 'blob' })
export const generateAllureReport = (dirName) =>
  api.post('/allure/generate', { dir_name: dirName })

// ==================== 历史 ====================
export const getHistory = (params = {}) => api.get('/history', { params })
export const getHistoryDetail = (taskId) => api.get(`/history/${taskId}`)
export const deleteHistory = (data) => api.post('/history/delete', data)

// ==================== 截图 ====================
export const getScreenshots = () => api.get('/screenshots')
export const deleteScreenshot = (data) => api.post('/screenshots/delete', data)

// ==================== 环境变量 ====================
export const getEnvList = (envName = '') =>
  api.get('/env/list', { params: { env_name: envName } })
export const getEnvNames = () => api.get('/env/names')
export const createEnvVar = (data) => api.post('/env/create', data)
export const updateEnvVar = (data) => api.put('/env/update', data)
export const deleteEnvVar = (data) => api.post('/env/delete', data)

// ==================== 断言规则 ====================
export const getAssertList = () => api.get('/assert/list')
export const createAssertRule = (data) => api.post('/assert/create', data)
export const updateAssertRule = (data) => api.put('/assert/update', data)
export const deleteAssertRule = (data) => api.post('/assert/delete', data)

// ==================== 数据库配置 ====================
export const getDbConfig = () => api.get('/db/config')
export const setDbConfig = (data) => api.post('/db/config', data)
export const testDbConnection = (data) => api.post('/db/test', data)
export const initDb = (data) => api.post('/db/init', data)
export const getDbSchema = () => api.get('/db/schema')

// ==================== 系统配置 ====================
export const getConfigList = () => api.get('/config/list')
export const setConfig = (data) => api.post('/config/set', data)
export const setConfigBatch = (data) => api.post('/config/batch', data)

// ==================== 日志解析 ====================
export const parseLogSync = (data) => api.post('/parsed/generate', data)
export const parseLogAsync = (data) => api.post('/parsed/generate_async', data)
export const getParseProgress = (taskId) => api.get(`/parsed/progress/${taskId}`)
export const getParsedList = () => api.get('/parsed/list')
export const deleteParsedFile = (filename) => api.delete(`/parsed/delete/${filename}`)
export const renameParsedTest = (data) => api.post('/parsed/rename_test', data)

// ==================== 数据驱动（DDT） ====================
export const getDdtData = (file) => api.get('/tests/ddt-data', { params: { file } })
export const updateDdtData = (data) => api.put('/tests/ddt-data', data)
export const createDdtTest = (data) => api.post('/tests/create-ddt', data)

// ==================== 健康检查 ====================
export const healthCheck = () => api.get('/health')
export const clearCache = () => api.post('/cache/clear')

// ==================== 用户管理 ====================
export const getUserList = (params) => api.get('/users/list', { params })
export const getUserDetail = (id) => api.get(`/users/${id}`)
export const createUser = (data) => api.post('/users/create', data)
export const updateUser = (data) => api.put('/users/update', data)
export const deleteUser = (data) => api.post('/users/delete', data)

// ==================== 个人设置 ====================
export const getProfile = () => api.get('/profile')
export const changePassword = (data) => api.post('/profile/password', data)

// 默认导出 axios 实例，供 auth store 等直接使用
export default api
