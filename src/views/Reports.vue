<template>
  <div class="table-page">
    <!-- 查询筛选区 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-input v-model="query.task_id" placeholder="任务ID" clearable size="default" class="filter-input" />
        <el-select v-model="query.test_type" placeholder="测试类型" clearable size="default" class="filter-select">
          <el-option label="API" value="API" />
          <el-option label="UI" value="UI" />
        </el-select>
        <el-select v-model="query.type" placeholder="报告格式" clearable size="default" class="filter-select">
          <el-option label="HTML" value="html" />
          <el-option label="ALLURE" value="allure" />
        </el-select>
        <el-date-picker
          v-model="query.date"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
          size="default"
          class="filter-date"
        />
      </div>
      <div class="filter-right">
        <el-button type="primary" size="default" @click="handleSearch">
          <el-icon><Search /></el-icon> 查询
        </el-button>
        <el-button size="default" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 报告列表 -->
    <div class="page-card table-content" v-loading="loading">
      <el-table
        :data="paginatedReports"
        stripe
        border
        height="100%"
      >
        <template #empty>
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 120 120" fill="none">
              <rect x="20" y="15" width="80" height="90" rx="6" stroke="#CBD5E1" stroke-width="2" fill="#F8FAFC"/>
              <rect x="30" y="30" width="60" height="12" rx="3" fill="#E2E8F0"/>
              <rect x="30" y="50" width="45" height="8" rx="2" fill="#E2E8F0"/>
              <rect x="30" y="65" width="55" height="8" rx="2" fill="#E2E8F0"/>
              <rect x="30" y="80" width="35" height="8" rx="2" fill="#E2E8F0"/>
            </svg>
            <div class="empty-title">暂无测试报告</div>
            <div class="empty-desc">执行测试后将自动生成报告</div>
          </div>
        </template>


        <el-table-column prop="name" label="报告名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="任务ID" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.task_id" size="small" type="info" effect="plain">{{ row.task_id }}</el-tag>
            <span v-else style="color:#94A3B8;font-size:12px">—</span>
          </template>
        </el-table-column>
        <el-table-column label="测试类型" width="90">
          <template #default="{ row }">
            <el-tag
              v-if="row.test_type"
              :type="row.test_type==='UI'?'warning':row.test_type==='API'?'primary':'info'"
              size="small"
              effect="light"
              round
            >{{ row.test_type }}</el-tag>
            <span v-else style="color:#94A3B8;font-size:12px">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="格式" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type==='html'?'primary':'success'" size="small" round effect="light">
              {{ row.type.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="datetime" label="生成时间" width="170" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.type==='html'" size="small" type="primary" link @click="openReport(row)">
              <el-icon><View /></el-icon> 查看
            </el-button>
            <el-button v-if="row.type==='html'" size="small" type="warning" link @click="downloadReport(row)" :loading="downloading===row.file_name">
              <el-icon><Download /></el-icon> 下载
            </el-button>
            <el-button v-if="row.type==='allure'" size="small" type="success" link @click="generateAllure(row)" :loading="generating===row.dir_name">
              <el-icon><MagicStick /></el-icon> 生成
            </el-button>
            <el-popconfirm title="确定删除该报告？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button size="small" type="danger" link>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="table-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="reports.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getReports, deleteReport, generateAllureReport } from '@/api'

const query = reactive({ task_id: '', test_type: '', type: '', date: '' })
const reports = ref([])
const loading = ref(false)
const generating = ref(null)
const downloading = ref(null)
const currentPage = ref(1)
const pageSize = ref(20)

const paginatedReports = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return reports.value.slice(start, start + pageSize.value)
})

async function fetchReports() {
  loading.value = true
  try {
    const params = {}
    if (query.task_id) params.task_id = query.task_id
    if (query.test_type) params.test_type = query.test_type
    if (query.type) params.type = query.type
    if (query.date) params.date = query.date
    const { data } = await getReports(params)
    reports.value = data
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchReports()
}

function handleReset() {
  query.task_id = ''
  query.test_type = ''
  query.type = ''
  query.date = ''
  currentPage.value = 1
  fetchReports()
}

function openReport(row) {
  window.open(`/reports/html/${row.file_name}`, '_blank')
}

async function generateAllure(row) {
  generating.value = row.dir_name
  try {
    const { data } = await generateAllureReport(row.dir_name)
    if (data?.url) {
      window.open(data.url, '_blank')
    }
    ElMessage.success(data?.message || '报告已生成')
  } catch (e) {
    // 错误已由 axios 拦截器提示
  } finally {
    generating.value = null
  }
}

async function handleDelete(row) {
  try {
    await deleteReport({ type: row.type, name: row.file_name || row.dir_name })
    ElMessage.success('已删除')
    await fetchReports()
  } catch { /* ignore */ }
}

async function downloadReport(row) {
  downloading.value = row.file_name
  try {
    const response = await fetch(`/reports/html/${row.file_name}`)
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = row.file_name
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch { /* ignore */ }
  finally { downloading.value = null }
}

onMounted(fetchReports)
</script>