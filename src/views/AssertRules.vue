<template>
  <div class="table-page">

    <div style="margin-bottom:12px;flex-shrink:0">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon> 新增规则
      </el-button>
    </div>

    <div class="page-card table-content" v-loading="loading">
      <el-table :data="paginatedRules" stripe empty-text="暂无断言规则" height="100%">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="name" label="规则名称" width="180" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="timeout" label="超时(s)" width="80" />
        <el-table-column prop="retry" label="重试" width="70" />
        <el-table-column label="失败截图" width="90">
          <template #default="{ row }">
            <el-tag :type="row.screenshot_on_fail ? 'success' : 'info'" size="small">
              {{ row.screenshot_on_fail ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详细日志" width="90">
          <template #default="{ row }">
            <el-tag :type="row.verbose_log ? 'success' : 'info'" size="small">
              {{ row.verbose_log ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="系统预置" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.is_system" type="warning" size="small">系统</el-tag>
            <el-tag v-else size="small">自定义</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="table-actions" v-if="!row.is_system">
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
            <span v-else style="color:#909399;font-size:12px">不可编辑</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="rulePage"
          v-model:page-size="rulePageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="rules.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </div>

    <!-- 新增/编辑 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑规则' : '新增规则'"
      width="550px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="规则名称" required>
          <el-input v-model="form.name" placeholder="断言规则名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="规则描述" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="超时时间(秒)">
          <el-input-number v-model="form.timeout" :min="1" :max="300" />
        </el-form-item>
        <el-form-item label="重试次数">
          <el-input-number v-model="form.retry" :min="0" :max="10" />
        </el-form-item>
        <el-form-item label="失败截图">
          <el-switch v-model="form.screenshot_on_fail" />
        </el-form-item>
        <el-form-item label="详细日志">
          <el-switch v-model="form.verbose_log" />
        </el-form-item>
        <el-form-item label="自定义规则">
          <el-input v-model="form.custom_rules" placeholder="JSON 格式的自定义断言规则" type="textarea" :rows="4" />
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
import { getAssertList, createAssertRule, updateAssertRule, deleteAssertRule } from '@/api'

const rules = ref([])
const loading = ref(false)
const saving = ref(false)
const rulePage = ref(1)
const rulePageSize = ref(20)

const paginatedRules = computed(() => {
  const start = (rulePage.value - 1) * rulePageSize.value
  return rules.value.slice(start, start + rulePageSize.value)
})
const dialogVisible = ref(false)
const isEdit = ref(false)

const form = reactive({
  id: null,
  name: '',
  description: '',
  timeout: 10,
  retry: 0,
  screenshot_on_fail: true,
  verbose_log: false,
  custom_rules: '',
})

async function fetchList() {
  loading.value = true
  try {
    const { data } = await getAssertList()
    rules.value = data || []
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, { id: null, name: '', description: '', timeout: 10, retry: 0, screenshot_on_fail: true, verbose_log: false, custom_rules: '' })
  isEdit.value = false
}

function showCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function showEditDialog(row) {
  isEdit.value = true
  Object.assign(form, {
    id: row.id, name: row.name, description: row.description || '',
    timeout: row.timeout || 10, retry: row.retry || 0,
    screenshot_on_fail: row.screenshot_on_fail, verbose_log: row.verbose_log,
    custom_rules: row.custom_rules || '',
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name) { ElMessage.warning('规则名称不能为空'); return }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateAssertRule({ ...form })
      ElMessage.success('更新成功')
    } else {
      await createAssertRule({ ...form })
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
    await deleteAssertRule({ id: row.id })
    ElMessage.success('删除成功')
    await fetchList()
  } catch { /* ignore */ }
}

onMounted(fetchList)
</script>
