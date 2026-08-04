<template>
  <div class="scroll-page">
    <div class="page-card" style="padding:24px 28px" v-loading="dbLoading">
      <h3 style="margin-bottom:24px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
        <el-icon :size="18" color="#3B82F6"><Setting /></el-icon> 数据库连接配置
      </h3>

      <el-tabs v-model="dbSubTab" class="db-tabs">
        <el-tab-pane label="MySQL" name="mysql">
          <el-form :model="dbForm" label-width="100px" size="default" class="db-form">
            <el-form-item label="主机地址">
              <el-input v-model="dbForm.mysql_host" placeholder="127.0.0.1" />
            </el-form-item>
            <el-form-item label="端口">
              <el-input v-model="dbForm.mysql_port" placeholder="3306" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="dbForm.mysql_user" placeholder="root" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="dbForm.mysql_password" placeholder="密码" show-password />
            </el-form-item>
            <el-form-item label="数据库名">
              <el-input v-model="dbForm.mysql_db" placeholder="autotest" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Redis" name="redis">
          <el-form :model="dbForm" label-width="100px" size="default" class="db-form">
            <el-form-item label="主机地址">
              <el-input v-model="dbForm.redis_host" placeholder="127.0.0.1" />
            </el-form-item>
            <el-form-item label="端口">
              <el-input v-model="dbForm.redis_port" placeholder="6379" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="dbForm.redis_password" placeholder="密码（可选）" show-password />
            </el-form-item>
            <el-form-item label="数据库编号">
              <el-input-number v-model="dbForm.redis_db" :min="0" :max="15" style="width:200px" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="MinIO" name="minio">
          <el-form :model="dbForm" label-width="100px" size="default" class="db-form">
            <el-form-item label="Endpoint">
              <el-input v-model="dbForm.minio_endpoint" placeholder="127.0.0.1:9000" />
            </el-form-item>
            <el-form-item label="Access Key">
              <el-input v-model="dbForm.minio_access_key" placeholder="minioadmin" />
            </el-form-item>
            <el-form-item label="Secret Key">
              <el-input v-model="dbForm.minio_secret_key" placeholder="密钥" show-password />
            </el-form-item>
            <el-form-item label="Bucket">
              <el-input v-model="dbForm.minio_bucket" placeholder="autotest" />
            </el-form-item>
            <el-form-item label="HTTPS">
              <el-switch v-model="dbForm.minio_secure" active-value="true" inactive-value="false" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="db-actions">
        <el-button type="primary" @click="saveDbConfig" :loading="dbSaving">
          <el-icon><Check /></el-icon> 保存配置
        </el-button>
        <el-button type="success" @click="testDbConnection" :loading="dbTesting">
          <el-icon><Connection /></el-icon> 测试连接
        </el-button>
        <el-button type="warning" @click="initDb" :loading="dbInitializing">
          <el-icon><MagicStick /></el-icon> 初始化数据库
        </el-button>
      </div>

      <div class="db-result">
        <template v-if="dbTestResult">
          <div v-for="(v, k) in dbTestResult" :key="k" class="db-result-item">
            <span class="db-result-label">{{ k.toUpperCase() }}</span>
            <el-tag :type="v.success ? 'success' : 'danger'" size="small" effect="dark">{{ v.success ? '✓' : '✗' }}</el-tag>
            <span style="color:#64748B;font-size:13px;margin-left:8px">{{ v.message || v }}</span>
          </div>
        </template>
        <div v-else class="db-result-item" style="color:#94A3B8;font-size:13px">
          暂无测试结果，点击「测试连接」或「初始化数据库」查看
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getDbConfig, setDbConfig, testDbConnection as testDb, initDb as initDatabase,
} from '@/api'

// ==================== 数据库配置 ====================
const dbSubTab = ref('mysql')
const dbLoading = ref(false)
const dbSaving = ref(false)
const dbTesting = ref(false)
const dbInitializing = ref(false)
const dbTestResult = ref(null)
const dbForm = reactive({
  mysql_host: '127.0.0.1', mysql_port: '3306', mysql_user: 'root', mysql_password: '', mysql_db: 'autotest',
  redis_host: '127.0.0.1', redis_port: '6379', redis_password: '', redis_db: 0,
  minio_endpoint: '127.0.0.1:9000', minio_access_key: '', minio_secret_key: '', minio_secure: 'false', minio_bucket: 'autotest',
})

async function fetchDbConfig() {
  dbLoading.value = true
  try {
    const { data } = await getDbConfig()
    Object.keys(dbForm).forEach(k => {
      if (k in data) {
        // redis_db 需要保持 Number 类型，其他字段转 String
        dbForm[k] = k === 'redis_db' ? Number(data[k] ?? 0) : String(data[k] ?? '')
      }
    })
  } finally { dbLoading.value = false }
}

async function saveDbConfig() {
  dbSaving.value = true
  try {
    await setDbConfig({ ...dbForm })
    ElMessage.success('配置已保存，缓存已刷新')
  } finally { dbSaving.value = false }
}

async function testDbConnection() {
  dbTesting.value = true
  dbTestResult.value = null
  try {
    const { data } = await testDb({ ...dbForm })
    dbTestResult.value = data
  } finally { dbTesting.value = false }
}

async function initDb() {
  dbInitializing.value = true
  dbTestResult.value = null
  try {
    const { data } = await initDatabase({ ...dbForm })
    dbTestResult.value = data
    ElMessage.success('数据库初始化完成')
  } finally { dbInitializing.value = false }
}

// ---- 生命周期 ----
onMounted(() => {
  fetchDbConfig()
})
</script>
