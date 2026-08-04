<template>
  <div>

    <!-- 标签页切�?-->
    <el-tabs v-model="activeTab" type="border-card" @tab-change="onTabChange">
      <!-- ========== API 测试 ========== -->
      <el-tab-pane label="API 测试" name="api">
        <div>
          <el-form :model="apiForm" label-width="100px">
            <el-form-item label="测试范围">
              <el-radio-group v-model="apiForm.mode">
                <el-radio-button value="all">全部 API 用例</el-radio-button>
                <el-radio-button value="selected">指定用例</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="选择环境" v-if="envNames.length">
              <el-select v-model="apiForm.env_name" placeholder="可选环�? clearable style="width:220px">
                <el-option v-for="n in envNames" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>

            <el-form-item label="断言规则">
              <el-select v-model="apiForm.assert_ids" multiple placeholder="可选断言规则" style="width:320px">
                <el-option v-for="r in assertRules" :key="r.id" :label="r.name" :value="r.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="选择用例" v-if="apiForm.mode === 'selected'">
              <el-select
                v-model="apiForm.markers"
                multiple filterable
                placeholder="搜索并选择 API 测试用例"
                style="width:100%"
                collapse-tags collapse-tags-tooltip
              >
                <el-option
                  v-for="t in tests.api_tests"
                  :key="t.module"
                  :label="`${t.name} (${t.module})`"
                  :value="t.module"
                />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" @click="startApiRun" :loading="starting" :disabled="taskRunning">
                <el-icon><VideoPlay /></el-icon> 执行 API 测试
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- ========== UI 测试 ========== -->
      <el-tab-pane label="UI 测试" name="ui">
        <div>
          <el-form :model="uiForm" label-width="100px">
            <el-form-item label="测试范围">
              <el-radio-group v-model="uiForm.mode">
                <el-radio-button value="all">全部 UI 用例</el-radio-button>
                <el-radio-button value="selected">指定用例</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="选择环境" v-if="envNames.length">
              <el-select v-model="uiForm.env_name" placeholder="可选环�? clearable style="width:220px">
                <el-option v-for="n in envNames" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>

            <el-form-item label="选择用例" v-if="uiForm.mode === 'selected'">
              <el-select
                v-model="uiForm.markers"
                multiple filterable
                placeholder="搜索并选择 UI 测试用例"
                style="width:100%"
                collapse-tags collapse-tags-tooltip
              >
                <el-option
                  v-for="t in tests.ui_tests"
                  :key="t.module"
                  :label="`${t.name} (${t.module})`"
                  :value="t.module"
                />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" @click="startUiRun" :loading="starting" :disabled="taskRunning">
                <el-icon><VideoPlay /></el-icon> 执行 UI 测试
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 停止按钮（全局�?-->
    <div v-if="taskRunning" style="margin-top:12px;text-align:center">
      <el-button type="danger" size="large" @click="stopRun" :loading="stopping">
        <el-icon><VideoPause /></el-icon> 停止执行
      </el-button>
    </div>

    <!-- 当前任务进度（共享） -->
    <div v-if="task" style="margin-top:16px">
      <h3 style="margin-bottom:16px;font-weight:600">
        <el-tag :type="statusTagType" size="large">{{ statusText }}</el-tag>
        <span style="margin-left:8px">{{ task.test_type?.toUpperCase() }} �?{{ task.id }}</span>
      </h3>

      <div class="progress-card" style="margin-bottom:20px">
        <el-progress
          :percentage="task.progress || 0"
          :status="task.status === 'failed' ? 'exception' : task.status === 'completed' ? 'success' : ''"
          :stroke-width="20"
        />
        <div class="progress-label">
          进度 {{ task.progress || 0 }}% �?{{ task.passed || 0 }} 通过 / {{ task.failed || 0 }} 失败 /
          {{ task.errors || 0 }} 错误 / {{ task.skipped || 0 }} 跳过
        </div>
        <div v-if="task.current_test" class="current-test">
          当前: {{ task.current_test }}
        </div>
      </div>

      <el-row :gutter="16" style="margin-bottom:16px">
        <el-col :span="6"><el-statistic title="总数" :value="task.total_tests || 0" /></el-col>
        <el-col :span="6"><el-statistic title="通过" :value="task.passed || 0">
          <template #suffix><el-icon color="#67c23a"><CircleCheck /></el-icon></template>
        </el-statistic></el-col>
        <el-col :span="6"><el-statistic title="失败" :value="task.failed || 0">
          <template #suffix><el-icon color="#f56c6c"><CircleClose /></el-icon></template>
        </el-statistic></el-col>
        <el-col :span="6"><el-statistic title="错误" :value="task.errors || 0">
          <template #suffix><el-icon color="#e6a23c"><Warning /></el-icon></template>
        </el-statistic></el-col>
      </el-row>

      <div class="log-terminal" ref="logContainer">
        <div v-for="(entry, idx) in displayLogs" :key="idx" class="log-line">
          <span class="log-time">{{ formatLogTime(entry.time) }}</span>
          <span :class="logClass(entry.msg)">{{ entry.msg }}</span>
        </div>
        <div v-if="!displayLogs.length" style="color:#666">等待日志输出...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { runTests, getTaskStatus, stopTask, getTests, getEnvNames, getAssertList } from '@/api'

const activeTab = ref('api')
const tests = ref({ api_tests: [], ui_tests: [] })
const envNames = ref([])
const assertRules = ref([])
const starting = ref(false)
const stopping = ref(false)
const task = ref(null)
const displayLogs = ref([])
const logContainer = ref(null)
let pollTimer = null

// API 表单
const apiForm = reactive({
  mode: 'all',
  markers: [],
  assert_ids: [],
  env_name: '',
})

// UI 表单
const uiForm = reactive({
  mode: 'all',
  markers: [],
  env_name: '',
})

const taskRunning = computed(() => task.value && ['pending', 'running'].includes(task.value.status))
const statusText = computed(() => {
  const map = { pending: '等待�?, running: '执行�?, completed: '已完�?, failed: '失败', stopped: '已停�? }
  return map[task.value?.status] || '未知'
})
const statusTagType = computed(() => {
  const map = { pending: 'info', running: 'warning', completed: 'success', failed: 'danger', stopped: 'info' }
  return map[task.value?.status] || 'info'
})

function formatLogTime(t) {
  if (!t) return ''
  try { return new Date(t).toLocaleTimeString('zh-CN') } catch { return '' }
}

function logClass(msg) {
  if (!msg) return ''
  if (/错误|失败|error|fail|异常/i.test(msg)) return 'log-error'
  if (/警告|warn/i.test(msg)) return 'log-warn'
  if (/成功|完成|通过|ok|success/i.test(msg)) return 'log-success'
  return ''
}

function onTabChange() {
  // 切换标签页时不清除已有任务状�?
}

async function fetchMeta() {
  try {
    const [t, e, a] = await Promise.all([getTests(), getEnvNames(), getAssertList()])
    tests.value = t.data
    envNames.value = e.data?.data || []
    assertRules.value = a.data || []
  } catch { /* ignore */ }
}

// ---- 启动测试 ----
async function startApiRun() {
  if (apiForm.mode === 'selected' && !apiForm.markers.length) {
    ElMessage.warning('请选择至少一�?API 测试用例')
    return
  }
  await doStartRun({
    type: apiForm.mode === 'selected' ? 'selected' : 'api',
    markers: apiForm.markers,
    assert_ids: apiForm.assert_ids,
    env_name: apiForm.env_name,
  })
}

async function startUiRun() {
  if (uiForm.mode === 'selected' && !uiForm.markers.length) {
    ElMessage.warning('请选择至少一�?UI 测试用例')
    return
  }
  await doStartRun({
    type: uiForm.mode === 'selected' ? 'selected' : 'ui',
    markers: uiForm.markers,
    assert_ids: [],
    env_name: uiForm.env_name,
  })
}

async function doStartRun(payload) {
  starting.value = true
  try {
    const { data } = await runTests(payload)
    task.value = { id: data.task_id, status: 'pending', progress: 0, passed: 0, failed: 0, errors: 0, skipped: 0, total_tests: 0, current_test: '', test_type: payload.type }
    displayLogs.value = []
    startPolling(data.task_id)
    ElMessage.success(`任务已启�? ${data.task_id}`)
  } finally {
    starting.value = false
  }
}

function startPolling(taskId) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const { data } = await getTaskStatus(taskId)
      task.value = { ...data, test_type: task.value?.test_type || data.test_type }
      if (data.logs) {
        displayLogs.value = [...data.logs]
        await nextTick()
        if (logContainer.value) {
          logContainer.value.scrollTop = logContainer.value.scrollHeight
        }
      }
      if (['completed', 'failed', 'stopped'].includes(data.status)) {
        stopPolling()
        ElMessage[data.status === 'completed' ? 'success' : 'warning'](
          `任务${data.status === 'completed' ? '完成' : '结束'}: ${taskId}`
        )
      }
    } catch {
      stopPolling()
    }
  }, 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function stopRun() {
  if (!task.value?.id) return
  stopping.value = true
  try {
    await stopTask(task.value.id)
    ElMessage.success('正在停止任务...')
  } finally {
    stopping.value = false
  }
}

watch(displayLogs, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

onMounted(fetchMeta)
onUnmounted(stopPolling)
</script>