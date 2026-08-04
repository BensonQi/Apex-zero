<template>
  <div>

    <div v-loading="loading">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- MySQL -->
        <el-tab-pane label="MySQL" name="mysql">
          <el-form :model="dbForm" label-width="140px" size="default">
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

        <!-- Redis -->
        <el-tab-pane label="Redis" name="redis">
          <el-form :model="dbForm" label-width="140px" size="default">
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
              <el-input-number v-model="dbForm.redis_db" :min="0" :max="15" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- MinIO -->
        <el-tab-pane label="MinIO" name="minio">
          <el-form :model="dbForm" label-width="140px" size="default">
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
              <el-switch
                v-model="dbForm.minio_secure"
                active-value="true"
                inactive-value="false"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div style="margin-top:20px;display:flex;gap:12px">
        <el-button type="primary" @click="saveConfig" :loading="saving">
          <el-icon><Check /></el-icon> 保存配置
        </el-button>
        <el-button type="success" @click="testConnection" :loading="testing">
          <el-icon><Connection /></el-icon> 测试连接
        </el-button>
        <el-button type="warning" @click="initDatabase" :loading="initializing">
          <el-icon><MagicStick /></el-icon> 初始化数据库
        </el-button>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult" style="margin-top:20px">
        <el-alert
          v-for="(v, k) in testResult"
          :key="k"
          :title="`${k.toUpperCase()}: ${v.message || v}`"
          :type="v.success ? 'success' : 'error'"
          :closable="false"
          style="margin-bottom:8px"
        />
      </div>
    </div>

    <!-- 数据库 Schema -->
    <div>
      <h3 style="margin-bottom:12px;font-weight:600">
        <el-icon :size="18"><Document /></el-icon> 数据库表结构
      </h3>
      <el-input
        :model-value="schema"
        type="textarea"
        :rows="20"
        readonly
        style="font-family:monospace;font-size:12px"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDbConfig, setDbConfig, testDbConnection, initDb, getDbSchema } from '@/api'

const activeTab = ref('mysql')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const initializing = ref(false)
const testResult = ref(null)
const schema = ref('')

const dbForm = reactive({
  mysql_host: '127.0.0.1',
  mysql_port: '3306',
  mysql_user: 'root',
  mysql_password: '',
  mysql_db: 'autotest',
  redis_host: '127.0.0.1',
  redis_port: '6379',
  redis_password: '',
  redis_db: 0,
  minio_endpoint: '127.0.0.1:9000',
  minio_access_key: '',
  minio_secret_key: '',
  minio_secure: 'false',
  minio_bucket: 'autotest',
})

async function fetchConfig() {
  loading.value = true
  try {
    const { data } = await getDbConfig()
    Object.keys(dbForm).forEach((k) => {
      if (k in data) {
        dbForm[k] = k === 'redis_db' ? Number(data[k] ?? 0) : String(data[k] ?? '')
      }
    })
    const { data: s } = await getDbSchema()
    schema.value = s?.sql || ''
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await setDbConfig({ ...dbForm })
    ElMessage.success('配置已保存，缓存已刷新')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    const { data } = await testDbConnection({ ...dbForm })
    testResult.value = data
  } finally {
    testing.value = false
  }
}

async function initDatabase() {
  initializing.value = true
  testResult.value = null
  try {
    const { data } = await initDb({ ...dbForm })
    testResult.value = data
    ElMessage.success('数据库初始化完成')
    // 刷新 schema
    const { data: s } = await getDbSchema()
    schema.value = s?.sql || ''
  } finally {
    initializing.value = false
  }
}

onMounted(fetchConfig)
</script>