<template>
  <div class="scroll-page">
    <el-tabs v-model="activeTabName" type="border-card" class="ui-test-tabs">
      <!-- ====== Tab 1：执行测试 ====== -->
      <el-tab-pane label="执行测试" name="run">
        <div class="dual-panel">
          <!-- 左侧：执行测试配置区 -->
          <div class="page-card">
            <h3 style="margin-bottom:24px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
              <el-icon :size="18" color="#3B82F6"><VideoPlay /></el-icon> 执行测试
              <el-tag :type="taskRunning ? 'warning' : 'success'" effect="light" round style="margin-left:auto">
                {{ taskRunning ? '任务执行中' : '就绪' }}
              </el-tag>
            </h3>
            <el-form :model="uiForm" label-position="top">
              <el-form-item label="测试范围">
                <el-radio-group v-model="uiForm.mode" size="large">
                  <el-radio-button value="all">全部 UI 用例</el-radio-button>
                  <el-radio-button value="selected">指定用例</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="执行策略">
                <div>
                  <el-radio-group v-model="uiForm.execution_mode" size="default">
                    <el-radio-button value="parallel">⚡ 并行执行</el-radio-button>
                    <el-radio-button value="serial">🔗 串行执行</el-radio-button>
                  </el-radio-group>
                  <p style="margin:8px 0 0;font-size:12px;color:#64748B">
                    {{ uiForm.execution_mode === 'parallel' ? '多 worker 并发，适合大批量用例' : '单 worker 顺序执行，日志清晰适合调试' }}
                  </p>
                </div>
              </el-form-item>

              <el-form-item label="选择用例" v-if="uiForm.mode === 'selected'">
                <div class="case-actions" style="margin-bottom:8px">
                  <el-button size="small" @click="uiForm.markers = uiTests.map(t => t.module)">全选</el-button>
                  <el-button size="small" @click="invertUiSelection">反选</el-button>
                  <el-button size="small" @click="uiForm.markers = []">清空</el-button>
                  <span style="margin-left:auto;font-size:12px;color:#94A3B8">已选 {{ uiForm.markers.length }} / {{ uiTests.length }}</span>
                </div>
                <el-select
                  v-model="uiForm.markers" multiple filterable
                  placeholder="搜索并选择 UI 用例"
                  style="width:100%"
                  collapse-tags collapse-tags-tooltip
                >
                  <el-option v-for="t in uiTests" :key="t.module" :label="shortName(t)" :value="t.module" />
                </el-select>
              </el-form-item>

              <el-form-item style="margin-top:8px">
                <el-button
                  class="btn-primary-gradient"
                  size="large"
                  style="width:100%;height:48px;font-size:16px"
                  @click="startRun"
                  :loading="starting"
                  :disabled="taskRunning"
                >
                  <template v-if="starting">
                    <span class="skeleton-ring" style="width:20px;height:20px;border-width:2px;margin-right:8px;display:inline-block;vertical-align:middle"></span>
                    执行中...
                  </template>
                  <template v-else>
                    <el-icon :size="20"><VideoPlay /></el-icon> 执行测试
                  </template>
                </el-button>
              </el-form-item>
            </el-form>

            <div v-if="taskRunning" style="text-align:center;margin-top:8px">
              <el-button type="danger" size="large" @click="stopRun" :loading="stopping" round>
                <el-icon><VideoPause /></el-icon> 停止任务
              </el-button>
            </div>
          </div>

          <!-- 右侧：最近执行历史 -->
          <div class="page-card">
            <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
              <el-icon :size="18" color="#F59E0B"><Clock /></el-icon> 最近执行历史
            </h3>
            <div v-if="recentHistory.length" class="timeline-wrap">
              <div v-for="item in recentHistory" :key="item.id" class="timeline-item"
                :class="{ 'status-success': item.status === 'completed', 'status-failed': item.status === 'failed', 'status-running': ['pending','running'].includes(item.status) }"
                @click="showHistoryDetail(item)" style="cursor:pointer">
                <div class="tl-time">{{ formatTime(item.start_time) }}</div>
                <div class="tl-title">{{ item.id }}</div>
                <div class="tl-desc">
                  <el-tag :type="item.status==='completed'?'success':item.status==='failed'?'danger':'warning'" size="small" round>{{ statusMap[item.status] }}</el-tag>
                  <span style="margin-left:8px" v-if="item.total_tests">通过 {{ item.passed }}/{{ item.total_tests }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <svg class="empty-icon" viewBox="0 0 120 120" fill="none"><rect x="20" y="30" width="80" height="60" rx="8" stroke="#CBD5E1" stroke-width="2" fill="#F8FAFC"/><line x1="35" y1="48" x2="85" y2="48" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/><line x1="35" y1="58" x2="70" y2="58" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/><line x1="35" y1="68" x2="60" y2="68" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="65" r="30" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/></svg>
              <div class="empty-title">暂无执行记录</div>
              <div class="empty-desc">执行测试后，历史记录将在此显示</div>
            </div>
          </div>
        </div>

        <!-- 任务进度（执行中显示） -->
        <div v-if="task" class="page-card full-width-section" style="animation:fadeUp 0.4s ease-out both">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <h3 style="font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
              <el-tag :type="statusTagType" size="large" round effect="dark">{{ statusText }}</el-tag>
              {{ task.id }}
            </h3>
            <span style="font-size:24px;font-weight:700;color:#3B82F6">{{ task.progress || 0 }}%</span>
          </div>
          <el-progress :percentage="task.progress || 0" :status="task.status==='failed'?'exception':task.status==='completed'?'success':''" :stroke-width="16" :color="task.status==='failed'?'#EF4444':{ color: '#3B82F6', stopColor: '#60A5FA' }" />
          <div style="margin-top:12px;font-size:13px;color:#64748B;text-align:center">通过 {{ task.passed || 0 }} / 失败 {{ task.failed || 0 }} / 错误 {{ task.errors || 0 }}</div>
          <el-row :gutter="20" style="margin:20px 0">
            <el-col :span="6"><el-statistic title="总数" :value="task.total_tests || 0" /></el-col>
            <el-col :span="6"><el-statistic title="通过" :value="task.passed || 0"><template #suffix><span style="color:#22C55E;font-size:14px"><el-icon><CircleCheck /></el-icon></span></template></el-statistic></el-col>
            <el-col :span="6"><el-statistic title="失败" :value="task.failed || 0"><template #suffix><span style="color:#EF4444;font-size:14px"><el-icon><CircleClose /></el-icon></span></template></el-statistic></el-col>
            <el-col :span="6"><el-statistic title="错误" :value="task.errors || 0"><template #suffix><span style="color:#F59E0B;font-size:14px"><el-icon><Warning /></el-icon></span></template></el-statistic></el-col>
          </el-row>
          <div class="log-terminal" ref="logContainer">
            <div v-for="(e, i) in displayLogs" :key="i" class="log-line">
              <span class="log-time">{{ formatLogTime(e.time) }}</span>
              <span :class="logClass(e.msg)">{{ e.msg }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ====== Tab 2：用例列表 ====== -->
      <el-tab-pane label="用例列表" name="cases">
        <div class="page-card">
          <el-form :model="caseQuery" inline>
            <el-form-item label="用例名称">
              <el-input v-model="caseQuery.name" placeholder="输入名称搜索" clearable style="width:200px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="caseSearch"><el-icon><Search /></el-icon> 查询</el-button>
              <el-button @click="caseReset">重置</el-button>
              <el-button type="success" @click="exportExcel"><el-icon><Download /></el-icon> 导出 Excel</el-button>
              <el-button v-if="selectedCases.length" type="danger" @click="handleBatchDelete" style="margin-left:8px">
                <el-icon><Delete /></el-icon> 批量删除 ({{ selectedCases.length }})
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="page-card" style="display:flex;flex-direction:column">
          <el-table :data="pagedCaseData" border stripe v-loading="caseLoading" max-height="420" empty-text="暂无数据" @selection-change="onCaseSelection">
            <el-table-column type="selection" width="45" />
            <el-table-column type="index" width="55" label="#" />
            <el-table-column label="用例名称" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ shortName(row) }}</template>
            </el-table-column>
            <el-table-column label="类型" width="80">
              <template #default="{ row }"><el-tag :type="row._type==='api'?'primary':'success'" size="small">{{ row._type?.toUpperCase() }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="module" label="模块路径" min-width="280" show-overflow-tooltip />
            <el-table-column prop="file" label="文件名" width="180" show-overflow-tooltip />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-popconfirm title="确定删除该用例？" @confirm="handleDeleteCase(row)">
                  <template #reference>
                    <el-button size="small" type="danger">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <div style="display:flex;justify-content:flex-end;padding:16px 0 0">
            <el-pagination
              v-model:current-page="casePage"
              v-model:page-size="casePageSize"
              :page-sizes="[10, 15, 20, 50, 100]"
              :total="filteredCaseData.length"
              layout="total, sizes, prev, pager, next, jumper"
              background
              small
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- ====== Tab 3：脚本录制 ====== -->
      <el-tab-pane label="脚本录制" name="record">
        <div class="page-card" style="padding:24px">
          <div style="display:flex;flex-direction:column;gap:16px">

            <!-- 录制指南 -->
            <el-collapse v-model="guideOpen">
              <el-collapse-item title="📖 Playwright Codegen 录制指南" name="guide">
                <div style="padding:12px;background:#F8FAFC;border-radius:8px;font-size:13px;color:#475569;line-height:2">
                  <p><strong>步骤 1：</strong>在下方输入目标网址，点击「启动录制」自动打开 Playwright 录制窗口。</p>
                  <p><strong>步骤 2：</strong>在打开的浏览器中操作页面，右侧实时生成 Python 代码。</p>
                  <p><strong>步骤 3：</strong>选择 <strong>Python</strong> 语言，<strong>Copy</strong> 复制全部代码。</p>
                  <p><strong>步骤 4：</strong>粘贴到文本文件，保存为 <code>.py</code> 文件。</p>
                  <p><strong>步骤 5：</strong>使用下方上传功能，自动添加标记并保存到测试目录。</p>
                </div>
              </el-collapse-item>
            </el-collapse>

            <!-- 一键启动录制 -->
            <div style="background:#fff;border:2px solid #E2E8F0;border-radius:12px;padding:24px">
              <p style="font-size:14px;font-weight:600;color:#0F172A;margin-bottom:16px">
                <el-icon :size="16" color="#3B82F6"><VideoPlay /></el-icon> 一键启动录制
              </p>
              <el-form :inline="true" size="default">
                <el-form-item label="目标网址">
                  <el-input v-model="codegenUrl" placeholder="https://example.com" style="width:320px" clearable />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="startCodegen" :loading="codegenRunning" :disabled="!codegenUrl">
                    <el-icon><VideoPlay /></el-icon> 启动录制
                  </el-button>
                </el-form-item>
              </el-form>
              <div v-if="codegenStatus" style="margin-top:8px;font-size:13px;color:#3B82F6">
                {{ codegenStatus }}
              </div>
            </div>

            <!-- 上传区域 -->
            <div style="background:#fff;border:2px dashed #D0D7E2;border-radius:12px;padding:32px;text-align:center">
              <el-icon :size="48" color="#94A3B8" style="margin-bottom:12px"><UploadFilled /></el-icon>
              <p style="font-size:14px;color:#64748B;margin-bottom:16px">选择 Playwright 生成的 Python 脚本文件</p>
              <el-upload
                :show-file-list="false"
                :before-upload="handleCodeUpload"
                accept=".py"
                drag
              >
                <el-button type="success" size="large" :loading="codeUploading" round>
                  <el-icon><Upload /></el-icon> 上传并生成测试用例
                </el-button>
              </el-upload>
              <div v-if="codeUploadMsg" style="margin-top:12px;font-size:13px" :style="{ color: codeUploadOk ? '#22C55E' : '#EF4444' }">
                {{ codeUploadMsg }}
              </div>
            </div>

          </div>
        </div>
      </el-tab-pane>

      <!-- ====== Tab 4：截图管理 ====== -->
      <el-tab-pane label="截图管理" name="screenshots">
        <div v-loading="ssLoading">
          <div v-if="!screenshots.length && !ssLoading" class="empty-state">
            <svg class="empty-icon" viewBox="0 0 120 120" fill="none">
              <rect x="15" y="20" width="90" height="70" rx="8" stroke="#CBD5E1" stroke-width="2" fill="#F8FAFC"/>
              <circle cx="45" cy="48" r="14" stroke="#94A3B8" stroke-width="2" fill="none"/>
              <path d="M55 58L70 73" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
              <rect x="72" y="55" width="24" height="18" rx="3" stroke="#CBD5E1" stroke-width="1.5" fill="#F1F5F9"/>
              <line x1="20" y1="100" x2="100" y2="100" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <div class="empty-title">暂无截图</div>
            <div class="empty-desc">执行 UI 测试后，截图将自动显示在这里</div>
          </div>
          <div v-else class="screenshot-grid">
            <div v-for="(img, idx) in screenshots" :key="idx" class="screenshot-item">
              <div class="screenshot-delete" @click.stop="handleDeleteScreenshot(img, idx)">
                <el-icon :size="16"><Close /></el-icon>
              </div>
              <el-image :src="`/api/screenshot/${img.date}/${img.name}`" fit="cover" class="screenshot-thumb" lazy @click="openPreview(idx)">
                <template #error>
                  <div style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:#F1F5F9;color:#CBD5E1">
                    <el-icon :size="36"><PictureFilled /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="screenshot-info">
                <div class="screenshot-name" :title="img.name">{{ img.name }}</div>
                <div class="screenshot-meta">{{ img.date }} · {{ formatSize(img.size) }}</div>
              </div>
            </div>
          </div>
        </div>

        <el-dialog v-model="previewVisible" title="截图预览" width="80%" align-center destroy-on-close>
          <el-image
            v-if="previewIdx !== null"
            :src="`/api/screenshot/${screenshots[previewIdx]?.date}/${screenshots[previewIdx]?.name}`"
            fit="contain"
            style="width:100%;max-height:70vh"
            :preview-src-list="screenshots.map(img => `/api/screenshot/${img.date}/${img.name}`)"
            :initial-index="previewIdx"
          />
        </el-dialog>
      </el-tab-pane>
    </el-tabs>

    <!-- 历史详情弹窗 -->
    <el-dialog v-model="historyDetailVisible" title="执行日志" width="750px" align-center>
      <template v-if="historyDetail">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="任务 ID">{{ historyDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ historyDetail.test_type }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="historyDetail.status==='completed'?'success':'danger'" size="small" round>
              {{ statusMap[historyDetail.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="通过"><b style="color:#22C55E">{{ historyDetail.passed }}</b></el-descriptions-item>
          <el-descriptions-item label="失败"><b style="color:#EF4444">{{ historyDetail.failed }}</b></el-descriptions-item>
          <el-descriptions-item label="错误"><b style="color:#F59E0B">{{ historyDetail.errors }}</b></el-descriptions-item>
          <el-descriptions-item label="总数"><b>{{ historyDetail.total_tests }}</b></el-descriptions-item>
          <el-descriptions-item label="开始">{{ formatTime(historyDetail.start_time) }}</el-descriptions-item>
          <el-descriptions-item label="结束">{{ formatTime(historyDetail.end_time) }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="historyDetail.logs?.length" class="log-terminal" style="margin-top:20px;max-height:350px">
          <div v-for="(entry, idx) in historyDetail.logs" :key="idx" class="log-line">
            <span class="log-time">{{ formatLogTime(entry.time) }}</span>
            <span :class="logClass(entry.msg)">{{ entry.msg }}</span>
          </div>
        </div>
        <div v-else-if="historyDetailLoading" style="text-align:center;padding:40px;color:#94A3B8">
          加载中...
        </div>
        <div v-else style="text-align:center;padding:40px;color:#94A3B8">
          暂无执行日志
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { runTests, getTaskStatus, stopTask, getTests, getEnvNames, getHistory, getHistoryDetail, getScreenshots, deleteScreenshot, uploadPlaywrightCode, deleteTest, startCodegen as startCodegenAPI, getCodegenStatus } from '@/api'
import * as XLSX from 'xlsx'

// ---- Tab 状态 ----
const activeTabName = ref('run')

// ---- 执行测试 ----
const uiTests = ref([])
const envNames = ref([])
const starting = ref(false)
const stopping = ref(false)
const task = ref(null)
const displayLogs = ref([])
const logContainer = ref(null)
const recentHistory = ref([])
const historyDetailVisible = ref(false)
const historyDetail = ref(null)
const historyDetailLoading = ref(false)

// ---- 脚本录制 ----
const guideOpen = ref(['guide'])
const codeUploading = ref(false)
const codeUploadMsg = ref('')
const codeUploadOk = ref(false)
const codegenUrl = ref('')
const codegenRunning = ref(false)
const codegenStatus = ref('')

let pollTimer = null

const uiForm = reactive({ mode: 'all', markers: [], execution_mode: 'parallel' })
const statusMap = { pending: '等待中', running: '执行中', completed: '已完成', failed: '失败', stopped: '已停止' }

const taskRunning = computed(() => task.value && ['pending', 'running'].includes(task.value.status))
const statusText = computed(() => statusMap[task.value?.status] || '未知')
const statusTagType = computed(() =>
  ({ pending: 'info', running: 'warning', completed: 'success', failed: 'danger', stopped: 'info' }[task.value?.status] || 'info')
)

function formatTime(t) { try { return new Date(t).toLocaleString('zh-CN') } catch { return '' } }
function formatLogTime(t) { try { return new Date(t).toLocaleTimeString('zh-CN') } catch { return '' } }

// 简化用例名：去掉类名前缀
function shortName(t) {
  const name = t?.name || ''
  const idx = name.indexOf('.')
  return idx > -1 ? name.slice(idx + 1) : name
}
function logClass(m) {
  if (!m) return 'log-msg'
  if (/错误|失败|error|fail|异常/i.test(m)) return 'log-error'
  if (/警告|warn/i.test(m)) return 'log-warn'
  if (/通过|成功|ok|pass/i.test(m)) return 'log-success'
  return 'log-msg'
}

async function fetchMeta() {
  try {
    const [t, e, h] = await Promise.all([getTests(), getEnvNames(), getHistory()])
    uiTests.value = t.data?.ui_tests || []
    envNames.value = e.data?.data || []
    recentHistory.value = (h.data || []).filter((r) => r.test_type === 'ui').slice(0, 8)
  } catch {}
}

async function showHistoryDetail(item) {
  historyDetail.value = item
  historyDetailVisible.value = true
  historyDetailLoading.value = true
  try {
    const { data } = await getHistoryDetail(item.id)
    if (data && data.logs) {
      historyDetail.value = { ...item, logs: data.logs }
    }
  } catch { /* 回退 */ }
  historyDetailLoading.value = false
}

async function startRun() {
  if (uiForm.mode === 'selected' && !uiForm.markers.length) { ElMessage.warning('请选择用例'); return }
  starting.value = true
  try {
    const { data } = await runTests({ type: 'ui', markers: uiForm.markers, assert_ids: [], execution_mode: uiForm.execution_mode })
    task.value = { id: data.task_id, status: 'pending', progress: 0, passed: 0, failed: 0, errors: 0, total_tests: 0, test_type: 'ui' }
    displayLogs.value = []
    startPolling(data.task_id)
  } finally { starting.value = false }
}

function startPolling(id) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const { data } = await getTaskStatus(id)
      task.value = { ...data, test_type: 'ui' }
      if (data.logs) { displayLogs.value = [...data.logs]; await nextTick(); logContainer.value && (logContainer.value.scrollTop = logContainer.value.scrollHeight) }
      if (['completed', 'failed', 'stopped'].includes(data.status)) {
        stopPolling()
        ElMessage[data.status === 'completed' ? 'success' : 'warning']('任务结束')
        fetchMeta()
      }
    } catch { stopPolling() }
  }, 1000)
}
function stopPolling() { pollTimer && clearInterval(pollTimer); pollTimer = null }
function invertUiSelection() {
  const all = new Set(uiTests.value.map(t => t.module))
  for (const m of uiForm.markers) all.delete(m)
  uiForm.markers = [...all]
}
async function stopRun() { stopping.value = true; try { await stopTask(task.value.id) } finally { stopping.value = false } }

// ---- 用例列表 ----
const caseLoading = ref(false)
const allCaseTests = ref([])
const casePage = ref(1)
const casePageSize = ref(15)
const selectedCases = ref([])
const caseQuery = reactive({ name: '', type: '' })

const filteredCaseData = computed(() => {
  let data = allCaseTests.value
  if (caseQuery.name) {
    const kw = caseQuery.name.toLowerCase()
    data = data.filter(t => t.name?.toLowerCase().includes(kw) || t.module?.toLowerCase().includes(kw))
  }
  if (caseQuery.type) data = data.filter(t => t._type === caseQuery.type)
  return data
})
const pagedCaseData = computed(() => {
  const start = (casePage.value - 1) * casePageSize.value
  return filteredCaseData.value.slice(start, start + casePageSize.value)
})

function caseSearch() { casePage.value = 1 }
function caseReset() { caseQuery.name = ''; caseQuery.type = ''; casePage.value = 1 }

function exportExcel() {
  if (!filteredCaseData.value.length) { ElMessage.warning('无数据可导出'); return }
  const rows = filteredCaseData.value.map((t, i) => ({ '序号': i + 1, '用例名称': t.name, '类型': t._type?.toUpperCase(), '模块路径': t.module, '文件名': t.file }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用例列表')
  XLSX.writeFile(wb, `用例列表_${new Date().toISOString().slice(0, 10)}.xlsx`)
  ElMessage.success('导出成功')
}

async function fetchCaseTests() {
  caseLoading.value = true
  try {
    const { data } = await getTests()
    const api = (data.api_tests || []).map(t => ({ ...t, _type: 'api', file: t.module?.split('.').pop() + '.py' || '' }))
    const ui = (data.ui_tests || []).map(t => ({ ...t, _type: 'ui', file: t.module?.split('.').pop() + '.py' || '' }))
    allCaseTests.value = ui
  } finally { caseLoading.value = false }
}

// ---- 脚本录制上传 ----
async function startCodegen() {
  if (!codegenUrl.value) return
  codegenRunning.value = true
  codegenStatus.value = '正在启动录制窗口，请稍候...'
  try {
    const { data } = await startCodegenAPI({ url: codegenUrl.value })
    codegenStatus.value = data.message
    ElMessage.success('录制已启动，关闭录制窗口后将自动保存脚本')

    // 轮询任务状态
    const taskId = data.task_id
    const poller = setInterval(async () => {
      try {
        const { data: status } = await getCodegenStatus(taskId)
        if (status.status === 'recording') {
          codegenStatus.value = '🔴 录制中... 请在浏览器中操作页面'
        } else if (status.status === 'completed') {
          clearInterval(poller)
          codegenStatus.value = `✅ ${status.message}`
          codegenRunning.value = false
          ElMessage.success('脚本已自动保存到用例列表')
          await fetchMeta()
          await fetchCaseTests()
        } else if (status.status === 'failed') {
          clearInterval(poller)
          codegenStatus.value = `❌ ${status.message}`
          codegenRunning.value = false
          ElMessage.error(status.message || '录制失败')
        }
      } catch {
        clearInterval(poller)
        codegenRunning.value = false
      }
    }, 2000)
  } catch {
    codegenStatus.value = ''
    codegenRunning.value = false
    ElMessage.error('启动录制失败，请检查服务端是否安装 Playwright')
  }
}

async function handleCodeUpload(file) {
  codeUploading.value = true
  codeUploadMsg.value = ''
  try {
    const { data } = await uploadPlaywrightCode(file)
    codeUploadOk.value = true
    codeUploadMsg.value = data?.message || `上传成功: ${file.name}`
    ElMessage.success(codeUploadMsg.value)
    // 刷新用例列表
    await fetchMeta()
    await fetchCaseTests()
  } catch {
    codeUploadOk.value = false
    codeUploadMsg.value = `上传失败: ${file.name}`
  } finally {
    codeUploading.value = false
  }
  return false // 阻止默认上传行为
}

// ---- 截图管理 ----
const screenshots = ref([])
const ssLoading = ref(false)
const previewVisible = ref(false)
const previewIdx = ref(null)

function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function openPreview(idx) { previewIdx.value = idx; previewVisible.value = true }

async function fetchScreenshots() {
  ssLoading.value = true
  try {
    const { data } = await getScreenshots()
    screenshots.value = data || []
  } finally { ssLoading.value = false }
}

async function handleDeleteScreenshot(img, idx) {
  try {
    await ElMessageBox.confirm(`确定要删除截图「${img.name}」吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteScreenshot({ date: img.date, name: img.name })
    screenshots.value.splice(idx, 1)
    ElMessage.success('截图已删除')
  } catch { /* 用户取消或删除失败 */ }
}

// ---- 用例删除 ----
function onCaseSelection(rows) {
  selectedCases.value = rows
}

async function handleBatchDelete() {
  if (!selectedCases.value.length) return
  try {
    await deleteTest(selectedCases.value.map(r => r.module))
    ElMessage.success(`已删除 ${selectedCases.value.length} 个用例`)
    selectedCases.value = []
    await fetchCaseTests()
  } catch { /* ignore */ }
}

async function handleDeleteCase(row) {
  try {
    await deleteTest(row.module)
    ElMessage.success('用例已删除')
    await fetchCaseTests()
  } catch { /* ignore */ }
}

// ---- 生命周期 ----
onMounted(() => {
  fetchMeta()
  fetchCaseTests()
  fetchScreenshots()
})
onUnmounted(stopPolling)
</script>
