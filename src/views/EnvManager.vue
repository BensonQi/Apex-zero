<template>
  <div class="table-page">

    <div style="margin-bottom:12px;flex-shrink:0">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon> 新增变量
      </el-button>
    </div>

    <div class="page-card table-content" v-loading="loading">
      <el-table :data="paginatedEnvVars" stripe empty-text="暂无环境变量" height="100%">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="var_key" label="变量名" width="200" />
        <el-table-column prop="var_value" label="变量值" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="!row._show">{{ maskValue(row.var_value) }}</span>
            <span v-else>{{ row.var_value }}</span>
            <el-button link size="small" @click="row._show = !row._show" style="margin-left:6px">
              {{ row._show ? '隐藏' : '显示' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="env_name" label="环境" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.env_name" size="small">{{ row.env_name }}</el-tag>
            <span v-else style="color:#909399">默认</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" type="primary" @click="showEditDialog(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-popconfirm title="确定删除？" @confirm="handleDelete(row)">
                <template #reference>
                  <el-button size="small" type="danger">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="envPage"
          v-model:page-size="envPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="envVars.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </div>

    <!-- 新增/编辑 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑变量' : '新增变量'"
      width="500px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="80px" ref="formRef">
        <el-form-item label="变量名" required>
          <el-input v-model="form.var_key" placeholder="例如: BASE_URL" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="变量值" required>
          <el-input v-model="form.var_value" placeholder="变量值" show-password />
        </el-form-item>
        <el-form-item label="环境名">
          <el-input v-model="form.env_name" placeholder="例如: production (留空为默认)" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="备注描述" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getEnvList, createEnvVar, updateEnvVar, deleteEnvVar } from '@/api'

const envVars = ref([])
const loading = ref(false)
const saving = ref(false)
const envPage = ref(1)
const envPageSize = ref(20)

const paginatedEnvVars = computed(() => {
  const start = (envPage.value - 1) * envPageSize.value
  return envVars.value.slice(start, start + envPageSize.value)
})
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const form = reactive({
  id: null,
  var_key: '',
  var_value: '',
  env_name: '',
  description: '',
})

function maskValue(v) {
  if (!v) return ''
  return v.length > 12 ? v.slice(0, 6) + '******' + v.slice(-4) : '******'
}

async function fetchList() {
  loading.value = true
  try {
    const { data } = await getEnvList()
    envVars.value = (data?.data || []).map((v) => ({ ...v, _show: false }))
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.id = null
  form.var_key = ''
  form.var_value = ''
  form.env_name = ''
  form.description = ''
  isEdit.value = false
}

function showCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function showEditDialog(row) {
  isEdit.value = true
  form.id = row.id
  form.var_key = row.var_key
  form.var_value = row.var_value
  form.env_name = row.env_name || ''
  form.description = row.description || ''
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.var_key || !form.var_value) {
    ElMessage.warning('变量名和变量值不能为空')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateEnvVar({ ...form })
      ElMessage.success('更新成功')
    } else {
      await createEnvVar({ ...form })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await fetchList()
  } finally {
    saving.value = false
  }
}

async function handleDelete(row) {
  try {
    await deleteEnvVar({ id: row.id, var_key: row.var_key })
    ElMessage.success('删除成功')
    await fetchList()
  } catch { /* ignore */ }
}

onMounted(fetchList)
</script>
