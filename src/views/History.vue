<template>
  <div class="table-page">

    <!-- 测试结果概览环形图 -->
    <div class="page-card" style="margin-bottom:12px;flex-shrink:0">
      <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
        <el-icon :size="18" color="#3B82F6"><PieChart /></el-icon> 测试结果概览
        <span style="margin-left:auto;font-size:13px;font-weight:400;color:#64748B">所有任务汇总</span>
      </h3>
      <div style="display:flex;align-items:center;gap:40px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:24px">
          <v-chart :option="historyRingOption" style="width:200px;height:200px" autoresize />
          <div class="ring-legend">
            <div class="legend-item"><span class="legend-dot" style="background:#22C55E"></span>通过 <b>{{ historySummary.passed }}</b></div>
            <div class="legend-item"><span class="legend-dot" style="background:#EF4444"></span>失败 <b>{{ historySummary.failed }}</b></div>
            <div class="legend-item"><span class="legend-dot" style="background:#F59E0B"></span>错误 <b>{{ historySummary.errors }}</b></div>
            <div style="font-size:12px;color:#64748B;margin-top:6px">总任务: {{ history.length }} | 总用例: {{ historySummary.total }}</div>
          </div>
        </div>
        <v-chart :option="dailyLineOption" style="flex:1;min-width:360px;height:200px" autoresize />
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-input v-model="query.task_id" placeholder="任务ID" clearable size="default" class="filter-input" />
        <el-select v-model="query.test_type" placeholder="测试类型" clearable size="default" class="filter-select">
          <el-option label="API" value="api" />
          <el-option label="UI" value="ui" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable size="default" class="filter-select">
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
          <el-option label="执行中" value="running" />
          <el-option label="已停止" value="stopped" />
        </el-select>
        <el-date-picker
          v-model="query.start_date"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
          size="default"
          class="filter-date"
        />
      </div>
      <div class="filter-right">
        <el-button type="danger" size="default" @click="handleBatchDelete" :disabled="!selectedIds.length">
          <el-icon><Delete /></el-icon> 批量删除 ({{ selectedIds.length }})
        </el-button>
        <el-button type="primary" size="default" @click="handleSearch">
          <el-icon><Search /></el-icon> 查询
        </el-button>
        <el-button size="default" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 历史表格 -->
    <div class="page-card table-content" v-loading="loading">
      <el-table
        :data="paginatedHistory"
        stripe
        @selection-change="onSelectionChange"
        height="100%"
      >
        <template #empty>
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 120 120" fill="none">
              <rect x="25" y="20" width="70" height="80" rx="6" stroke="#CBD5E1" stroke-width="2" fill="#F8FAFC"/>
              <circle cx="48" cy="48" r="12" stroke="#94A3B8" stroke-width="2" fill="none"/>
              <path d="M57 57L68 68" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
              <line x1="35" y1="85" x2="85" y2="85" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <div class="empty-title">暂无执行记录</div>
            <div class="empty-desc">执行测试后，记录将显示在这里</div>
          </div>
        </template>

        <el-table-column type="selection" width="45" />
        <el-table-column prop="id" label="任务 ID" width="120" />
        <el-table-column prop="test_type" label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="row.test_type==='api'?'primary':'success'" size="small" round effect="light">
              {{ row.test_type?.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status==='completed'?'success':row.status==='failed'?'danger':row.status==='running'?'warning':'info'"
              size="small" round effect="dark"
            >
              {{ statusMap[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="通过率" width="110">
          <template #default="{ row }">
            <div v-if="row.total_tests" style="display:flex;align-items:center;gap:8px">
              <el-progress
                :percentage="calcRate(row)"
                :stroke-width="8"
                :color="calcRate(row)>=80?'#22C55E':calcRate(row)>=50?'#F59E0B':'#EF4444'"
                style="flex:1"
              />
              <span style="font-size:13px;font-weight:600;color:#0F172A;white-space:nowrap">{{ calcRate(row) }}%</span>
            </div>
            <span v-else style="color:#94A3B8">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="start_time" label="开始时间" width="180">
          <template #default="{ row }">{{ formatTime(row.start_time) }}</template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="{ row }">{{ formatTime(row.end_time) }}</template>
        </el-table-column>
        <el-table-column label="详情" min-width="200">
          <template #default="{ row }">
            <span style="font-size:13px;color:#475569">
              通过 <b style="color:#22C55E">{{ row.passed||0 }}</b>
              &nbsp;失败 <b style="color:#EF4444">{{ row.failed||0 }}</b>
              &nbsp;错误 <b style="color:#F59E0B">{{ row.errors||0 }}</b>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="showDetail(row)">
              <el-icon><View /></el-icon> 详情
            </el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDeleteById(row.id)">
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
          :total="history.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="任务详情" width="800px" align-center>
      <template v-if="detail">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="任务 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ detail.test_type }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detail.status==='completed'?'success':'danger'" size="small" round>
              {{ statusMap[detail.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="通过"><b style="color:#22C55E">{{ detail.passed }}</b></el-descriptions-item>
          <el-descriptions-item label="失败"><b style="color:#EF4444">{{ detail.failed }}</b></el-descriptions-item>
          <el-descriptions-item label="错误"><b style="color:#F59E0B">{{ detail.errors }}</b></el-descriptions-item>
          <el-descriptions-item label="跳过">{{ detail.skipped }}</el-descriptions-item>
          <el-descriptions-item label="总数"><b>{{ detail.total_tests }}</b></el-descriptions-item>
          <el-descriptions-item label="开始">{{ formatTime(detail.start_time) }}</el-descriptions-item>
          <el-descriptions-item label="结束" :span="2">{{ formatTime(detail.end_time) }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detail.logs?.length" class="log-terminal" style="margin-top:20px;max-height:350px">
          <div v-for="(entry, idx) in detail.logs" :key="idx" class="log-line">
            <span class="log-time">{{ formatTime(entry.time) }}</span>
            <span class="log-msg">{{ entry.msg }}</span>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getHistory, getHistoryDetail, deleteHistory } from '@/api'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, LineChart, TooltipComponent, GridComponent])

const query = reactive({ task_id: '', test_type: '', status: '', start_date: '' })
const history = ref([])
const loading = ref(false)
const selectedIds = ref([])
const detailVisible = ref(false)
const detail = ref(null)
const currentPage = ref(1)
const pageSize = ref(20)

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return history.value.slice(start, start + pageSize.value)
})

const statusMap = { pending: '等待中', running: '执行中', completed: '已完成', failed: '失败', stopped: '已停止' }

function formatTime(t) {
  if (!t) return '-'
  try { return new Date(t).toLocaleString('zh-CN') } catch { return t }
}
function calcRate(row) {
  const passed = row.passed || 0
  const total = (row.passed || 0) + (row.failed || 0) + (row.errors || 0)
  return total > 0 ? Math.round((passed / total) * 100) : 0
}

// 所有任务汇总
const historySummary = computed(() => {
  let passed = 0, failed = 0, errors = 0, skipped = 0
  for (const h of history.value) {
    passed += h.passed || 0
    failed += h.failed || 0
    errors += h.errors || 0
    skipped += h.skipped || 0
  }
  const total = passed + failed + errors + skipped
  return {
    passed, failed, errors, skipped, total,
    passRate: total ? Math.round((passed / total) * 100) : 0,
    failRate: total ? Math.round((failed / total) * 100) : 0,
    errorRate: total ? Math.round((errors / total) * 100) : 0,
  }
})

const historyRingOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { show: false },
  series: [{
    type: 'pie',
    radius: ['55%', '80%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' }, scaleSize: 8 },
    data: [
      { value: historySummary.value.passed, name: '通过', itemStyle: { color: '#22C55E' } },
      { value: historySummary.value.failed, name: '失败', itemStyle: { color: '#EF4444' } },
      { value: historySummary.value.errors, name: '错误', itemStyle: { color: '#F59E0B' } },
    ],
  }],
}))

// 按日统计通过率
const dailyStats = computed(() => {
  const map = {}
  for (const h of history.value) {
    const day = (h.start_time || '').slice(0, 10)
    if (!day) continue
    if (!map[day]) map[day] = { passed: 0, failed: 0, errors: 0 }
    map[day].passed += h.passed || 0
    map[day].failed += h.failed || 0
    map[day].errors += h.errors || 0
  }
  const days = Object.keys(map).sort()
  const recentDays = days.slice(-7)  // 最近7日
  return recentDays.map(day => {
    const d = map[day]
    const total = d.passed + d.failed + d.errors
    return {
      date: day.slice(5),   // MM-DD
      fullDate: day,
      passRate: total ? Math.round((d.passed / total) * 100) : 0,
      total,
    }
  })
})

const dailyLineOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const p = params[0]
      const d = dailyStats.value[p.dataIndex]
      return `${d.fullDate}<br/>通过率: <b>${d.passRate}%</b><br/>总用例: ${d.total}`
    },
  },
  grid: { top: 10, right: 20, bottom: 28, left: 45 },
  xAxis: {
    type: 'category',
    data: dailyStats.value.map(d => d.date),
    axisLabel: { fontSize: 11, color: '#94A3B8' },
    axisLine: { lineStyle: { color: '#E2E8F0' } },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { fontSize: 11, color: '#94A3B8', formatter: '{value}%' },
    splitLine: { lineStyle: { color: '#F1F5F9' } },
  },
  series: [{
    type: 'line',
    data: dailyStats.value.map(d => d.passRate),
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { color: '#3B82F6', width: 2 },
    itemStyle: { color: '#3B82F6' },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(59,130,246,0.25)' },
          { offset: 1, color: 'rgba(59,130,246,0.02)' },
        ],
      },
    },
    markLine: {
      silent: true,
      data: [{ yAxis: 80, label: { formatter: '80%', fontSize: 11 }, lineStyle: { color: '#E2E8F0', type: 'dashed' } }],
    },
  }],
}))

async function fetchHistory() {
  loading.value = true
  try {
    const params = {}
    if (query.task_id) params.task_id = query.task_id
    if (query.test_type) params.test_type = query.test_type
    if (query.status) params.status = query.status
    if (query.start_date) params.start_date = query.start_date
    const { data } = await getHistory(params)
    history.value = data
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchHistory()
}

function handleReset() {
  query.task_id = ''
  query.test_type = ''
  query.status = ''
  query.start_date = ''
  currentPage.value = 1
  fetchHistory()
}

function onSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id)
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 条记录吗？`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    const { data } = await deleteHistory({ ids: selectedIds.value })
    ElMessage.success(data?.message || '删除成功')
    selectedIds.value = []
    await fetchHistory()
  } catch { /* 用户取消或删除失败 */ }
}

async function handleDeleteById(id) {
  try {
    const { data } = await deleteHistory({ ids: [id] })
    ElMessage.success(data?.message || '删除成功')
    await fetchHistory()
  } catch { /* ignore */ }
}

async function showDetail(row) {
  detail.value = row
  detailVisible.value = true
  // 从详情接口拉取含日志的完整数据
  try {
    const { data } = await getHistoryDetail(row.id)
    if (data && data.logs) {
      detail.value = { ...row, logs: data.logs }
    }
  } catch { /* 回退使用 row 数据 */ }
}

onMounted(fetchHistory)
</script>