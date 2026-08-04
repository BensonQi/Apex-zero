<template>
  <div class="scroll-page">

    <!-- ====== KPI 卡片行（含微趋势图） ====== -->
    <div class="stats-row">
      <!-- 总用例数 -->
      <div class="stat-card stagger-1">
        <div class="stat-icon-wrap" style="background:#EFF6FF;color:#3B82F6">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.api_total_tests + stats.ui_total_tests }}</div>
          <div class="stat-label">总用例数</div>
          <div class="stat-sparkline">
            <v-chart ref="sparkTotalCases" :option="sparkOptions.totalCases" style="height:32px" manual-update />
          </div>
        </div>
      </div>

      <!-- 今日执行次数 -->
      <div class="stat-card stagger-2">
        <div class="stat-icon-wrap" style="background:#F0FDF4;color:#22C55E">
          <el-icon :size="24"><VideoPlay /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.api_total_tasks + stats.ui_total_tasks }}</div>
          <div class="stat-label">今日执行次数</div>
          <div class="stat-sparkline">
            <v-chart ref="sparkTodayRuns" :option="sparkOptions.todayRuns" style="height:32px" manual-update />
          </div>
        </div>
      </div>

      <!-- 通过率 -->
      <div class="stat-card stagger-3">
        <div class="stat-icon-wrap" style="background:#FFF7ED;color:#F59E0B">
          <el-icon :size="24"><CircleCheck /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">
            {{ overallPassRate }}<small>%</small>
          </div>
          <div class="stat-label">综合通过率</div>
          <div class="stat-sparkline">
            <v-chart ref="sparkPassRate" :option="sparkOptions.passRate" style="height:32px" manual-update />
          </div>
        </div>
      </div>

      <!-- 平均响应时间 -->
      <div class="stat-card stagger-4">
        <div class="stat-icon-wrap" style="background:#F3E8FF;color:#9333EA">
          <el-icon :size="24"><Timer /></el-icon>
        </div>
        <div class="stat-body">
          <div class="stat-value">
            {{ avgTime }}<small>ms</small>
          </div>
          <div class="stat-label">平均响应时间</div>
          <div class="stat-sparkline">
            <v-chart ref="sparkAvgTime" :option="sparkOptions.avgTime" style="height:32px" manual-update />
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 中部双栏：API 趋势 + UI 趋势 ====== -->
    <div class="dual-panel">
      <div class="page-card stagger-5">
        <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
          <el-icon :size="18" color="#3B82F6"><Connection /></el-icon>
          API 通过率趋势
        </h3>
        <v-chart ref="apiTrendChart" :option="apiTrendOpt" style="height:300px" manual-update />
      </div>

      <div class="page-card stagger-6">
        <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
          <el-icon :size="18" color="#22C55E"><Monitor /></el-icon>
          UI 通过率趋势
        </h3>
        <v-chart ref="uiTrendChart" :option="uiTrendOpt" style="height:300px" manual-update />
      </div>
    </div>

    <!-- ====== 底部全宽：任务概览 + 最近活动 ====== -->
    <div class="dual-panel">
      <div class="page-card stagger-7">
        <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A">
          <el-icon :size="18"><List /></el-icon> 任务概览
        </h3>
        <el-row :gutter="24">
          <el-col :span="8">
            <el-statistic title="API 任务数" :value="stats.api_total_tasks || 0">
              <template #prefix>
                <el-icon :size="18" color="#3B82F6"><Connection /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="8">
            <el-statistic title="UI 任务数" :value="stats.ui_total_tasks || 0">
              <template #prefix>
                <el-icon :size="18" color="#22C55E"><Monitor /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="8">
            <el-statistic title="总任务数" :value="(stats.api_total_tasks || 0) + (stats.ui_total_tasks || 0)">
              <template #prefix>
                <el-icon :size="18" color="#9333EA"><TrendCharts /></el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </div>

      <div class="page-card stagger-8">
        <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
          <el-icon :size="18"><Clock /></el-icon> 通过率对比
        </h3>
        <v-chart ref="compareChart" :option="compareOption" style="height:240px" manual-update />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { getDashboardStats } from '@/api'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

const loading = ref(false)
// 图表 refs
const sparkTotalCases = ref(null)
const sparkTodayRuns = ref(null)
const sparkPassRate = ref(null)
const sparkAvgTime = ref(null)
const apiTrendChart = ref(null)
const uiTrendChart = ref(null)
const compareChart = ref(null)
const stats = ref({
  api_pass_rate: 0, api_total_tests: 0, api_total_tasks: 0,
  ui_pass_rate: 0, ui_total_tests: 0, ui_total_tasks: 0,
  api_trend: [], ui_trend: [],
})

// 综合通过率
const overallPassRate = computed(() => {
  const api = stats.value.api_pass_rate || 0
  const ui = stats.value.ui_pass_rate || 0
  if (api + ui === 0) return 0
  return Math.round((api + ui) / 2)
})

// 模拟平均响应时间
const avgTime = computed(() => Math.floor(Math.random() * 200 + 120))

// ---- 微趋势图（Sparkline）选项 ----
const sparkOptions = computed(() => {
  const trend = stats.value.api_trend || []
  const vals = trend.map((t) => t.pass_rate || 0)
  const dates = trend.map((t) => t.date || '')
  const makeSpark = (data, color) => ({
    grid: { top: 0, right: 0, bottom: 0, left: 0 },
    xAxis: { type: 'category', data: dates, show: false },
    yAxis: { type: 'value', show: false, min: (v) => v.min - 5, max: (v) => v.max + 5 },
    series: [{
      type: 'line', data, smooth: true, symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: { color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: color + '30' }, { offset: 1, color: color + '05' }],
      }},
    }],
  })

  return {
    totalCases: makeSpark(vals, '#3B82F6'),
    todayRuns: makeSpark([...vals].reverse(), '#22C55E'),
    passRate: makeSpark(vals, '#F59E0B'),
    avgTime: makeSpark(trend.map(() => Math.random() * 200 + 100), '#9333EA'),
  }
})

// ---- 趋势图选项 ----
const apiTrendOpt = computed(() => {
  const trend = stats.value.api_trend || []
  const dates = trend.map((t) => t.date)
  const pass = trend.map((t) => t.pass_rate)
  return makeTrendOpt(dates, pass, '#3B82F6')
})

const uiTrendOpt = computed(() => {
  const trend = stats.value.ui_trend || []
  const dates = trend.map((t) => t.date)
  const pass = trend.map((t) => t.pass_rate)
  return makeTrendOpt(dates, pass, '#22C55E')
})

function makeTrendOpt(dates, pass, color) {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (p) => `${p[0].axisValue}<br/>通过率: <b style="color:${color}">${p[0].value}%</b>`,
    },
    grid: { top: 10, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { rotate: 45, fontSize: 11, color: '#94A3B8' },
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { formatter: '{value}%', fontSize: 11, color: '#94A3B8' },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
    },
    series: [{
      type: 'line', data: pass, smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color, width: 3 },
      itemStyle: { color },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: color + '25' }, { offset: 1, color: color + '02' }],
      }},
    }],
  }
}

// ---- 对比图 ----
const compareOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 10, right: 20, bottom: 30, left: 50 },
  xAxis: {
    type: 'category',
    data: ['API 测试', 'UI 测试'],
    axisLine: { lineStyle: { color: '#E2E8F0' } },
    axisLabel: { color: '#475569', fontSize: 13 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value', min: 0, max: 100,
    axisLabel: { formatter: '{value}%', fontSize: 11, color: '#94A3B8' },
    splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
  },
  series: [{
    type: 'bar', barWidth: 48, barGap: '30%',
    data: [
      { value: stats.value.api_pass_rate || 0, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#3B82F6' }, { offset: 1, color: '#60A5FA' }] }, borderRadius: [8, 8, 0, 0] }},
      { value: stats.value.ui_pass_rate || 0, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#22C55E' }, { offset: 1, color: '#86EFAC' }] }, borderRadius: [8, 8, 0, 0] }},
    ],
    label: { show: true, position: 'top', formatter: '{c}%', fontSize: 13, fontWeight: 600, color: '#0F172A' },
  }],
}))

// 手动更新所有图表（避免 ECharts 在渲染主流程中调用 setOption）
function applyAllChartOptions() {
  sparkTotalCases.value?.setOption(sparkOptions.value.totalCases, true)
  sparkTodayRuns.value?.setOption(sparkOptions.value.todayRuns, true)
  sparkPassRate.value?.setOption(sparkOptions.value.passRate, true)
  sparkAvgTime.value?.setOption(sparkOptions.value.avgTime, true)
  apiTrendChart.value?.setOption(apiTrendOpt.value, true)
  uiTrendChart.value?.setOption(uiTrendOpt.value, true)
  compareChart.value?.setOption(compareOption.value, true)
}

// 监听图表数据变化，通过 nextTick 延迟到渲染周期外再更新
watch(
  [sparkOptions, apiTrendOpt, uiTrendOpt, compareOption],
  () => { nextTick(applyAllChartOptions) },
  { deep: true },
)

async function refresh() {
  loading.value = true
  try {
    const { data } = await getDashboardStats()
    await nextTick()
    stats.value = data
  } finally {
    loading.value = false
  }
}

defineExpose({ refresh })

// 窗口大小变化时手动触发大图表 resize
function handleResize() {
  apiTrendChart.value?.resize()
  uiTrendChart.value?.resize()
  compareChart.value?.resize()
}

onMounted(async () => {
  await refresh()
  // 初始渲染后手动应用图表选项
  await nextTick()
  applyAllChartOptions()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>