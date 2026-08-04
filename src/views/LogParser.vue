<template>
  <div>

    <!-- 输入区域 -->
    <div>
      <el-form label-width="80px">
        <el-form-item label="解析格式">
          <el-radio-group v-model="format">
            <el-radio-button value="csv">CSV</el-radio-button>
            <el-radio-button value="json">JSON</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="用例名称">
          <el-input v-model="customName" placeholder="用例名称（可选，如：登录接口）" clearable style="max-width:400px" />
        </el-form-item>
        <el-form-item label="日志文本">
          <el-input
            v-model="logText"
            type="textarea"
            :rows="12"
            :placeholder="uploadedFileName ? '已通过文件上传，无需手动粘贴' : '粘贴网关日志文本，支持多行...'"
            :disabled="!!uploadedFileName"
            style="font-family:monospace;font-size:12px"
          />
        </el-form-item>
        <el-form-item>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <el-upload
              :show-file-list="false"
              :before-upload="handleFileUpload"
              accept=".txt,.log,.json,.csv"
            >
              <el-button>
                <el-icon><Upload /></el-icon> 上传日志文件
              </el-button>
            </el-upload>
            <el-tag
              v-if="uploadedFileName"
              closable
              type="success"
              @close="clearUploadedFile"
            >
              <el-icon style="margin-right:4px"><Document /></el-icon>
              {{ uploadedFileName }}
            </el-tag>
            <el-button type="primary" @click="parseSync" :loading="parsing" :disabled="!hasContent">
              <el-icon><MagicStick /></el-icon> 同步解析
            </el-button>
            <el-button type="success" @click="parseAsync" :loading="parsingAsync" :disabled="!hasContent">
              <el-icon><Loading v-if="parsingAsync" /><VideoPlay v-else /></el-icon> 异步解析（大文件）
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <!-- 异步进度 -->
      <div v-if="parseTaskId" style="margin-top:16px">
        <el-alert title="解析进行中..." type="info" :closable="false" />
        <el-progress
          :percentage="parseProgress.percent"
          :status="parseProgress.status === 'done' ? 'success' : parseProgress.status === 'error' ? 'exception' : ''"
          style="margin-top:12px"
        />
      </div>

      <!-- 同步结果 -->
      <div v-if="parseResult" style="margin-top:16px">
        <el-alert
          :title="`解析完成: ${parseResult.count} 条记录`"
          type="success"
          :closable="false"
        >
          <template v-if="parseResult.test_file">
            <p style="margin-top:4px">已自动导入为测试文件: {{ parseResult.test_file }}</p>
          </template>
        </el-alert>
        <el-button style="margin-top:8px" type="primary" size="small" @click="downloadParsed(parseResult.filename)">
          <el-icon><Download /></el-icon> 下载 {{ parseResult.filename }}
        </el-button>
      </div>
    </div>

    <!-- 历史解析文件 -->
    <div>
      <h3 style="margin-bottom:16px;font-weight:600">
        <el-icon :size="18"><FolderOpened /></el-icon> 解析历史
      </h3>
      <el-table :data="paginatedParsedList" stripe empty-text="暂无解析记录" v-loading="listLoading" max-height="400">
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="格式" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'csv' ? 'success' : 'primary'" size="small">
              {{ row.type.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="条目数" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" type="primary" @click="downloadParsed(row.filename)">
                <el-icon><Download /></el-icon>
              </el-button>
              <el-popconfirm title="确定删除？" @confirm="handleDeleteParsed(row.filename)">
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

      <div style="display:flex;justify-content:flex-end;padding:16px 0 0">
        <el-pagination
          v-model:current-page="logPage"
          v-model:page-size="logPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="parsedList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </div>

    <!-- 自定义命名对话框 -->
    <el-dialog v-model="renameVisible" title="解析完成" width="460px" align-center :close-on-click-modal="false">
      <div style="text-align:center;padding:8px 0 16px">
        <p style="font-size:15px;color:#0F172A;margin:0 0 20px">
          解析完成，共 <b style="color:#3B82F6">{{ renameCount }}</b> 条用例
        </p>
        <el-input
          v-model="renameName"
          placeholder="输入用例名称"
          size="large"
          clearable
        >
          <template #prepend>test_</template>
          <template #append>.py</template>
        </el-input>
      </div>
      <template #footer>
        <el-button @click="skipRename">跳过</el-button>
        <el-button type="primary" @click="confirmRename">确认命名</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { parseLogSync, parseLogAsync, getParseProgress, getParsedList, deleteParsedFile, renameParsedTest } from '@/api'

const emit = defineEmits(['renamed'])

const logText = ref('')
const customName = ref('')
const format = ref('csv')
const parsing = ref(false)
const parsingAsync = ref(false)
const parseResult = ref(null)
const parseTaskId = ref(null)
const parseProgress = reactive({ percent: 0, status: '' })
const parsedList = ref([])
const listLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(20)

// 上传文件内容（隐藏，不显示在文本框）
const uploadedFileContent = ref('')
const uploadedFileName = ref('')

// 重命名对话框
const renameVisible = ref(false)
const renameName = ref('')
const renameFile = ref('')
const renameCount = ref(0)

const paginatedParsedList = computed(() => {
  const start = (logPage.value - 1) * logPageSize.value
  return parsedList.value.slice(start, start + logPageSize.value)
})

const hasContent = computed(() => !!logText.value || !!uploadedFileContent.value)

let progressTimer = null

function formatTime(t) {
  if (!t) return '-'
  try { return new Date(t).toLocaleString('zh-CN') } catch { return t }
}

async function handleFileUpload(file) {
  try {
    const text = await file.text()
    uploadedFileContent.value = text
    uploadedFileName.value = file.name
    logText.value = ''
    ElMessage.success(`已加载文件: ${file.name}`)
  } catch {
    ElMessage.error('读取文件失败')
  }
  return false
}

function clearUploadedFile() {
  uploadedFileContent.value = ''
  uploadedFileName.value = ''
}

function getLogContent() {
  return uploadedFileContent.value || logText.value
}

async function parseSync() {
  parsing.value = true
  try {
    const { data } = await parseLogSync({
      log_text: getLogContent(),
      format: format.value,
      source_name: 'manual_input',
      custom_name: customName.value || undefined,
    })
    parseResult.value = data
    ElMessage.success(`解析完成: ${data.count} 条`)
    await fetchParsedList()
    // 弹出自定义命名对话框
    if (data.test_file) {
      renameFile.value = data.test_file
      renameCount.value = data.count || 0
      renameName.value = (data.test_filename || '').replace(/^test_|\.py$/g, '')
      renameVisible.value = true
    }
  } finally {
    parsing.value = false
  }
}

async function parseAsync() {
  parsingAsync.value = true
  parseResult.value = null
  try {
    const { data } = await parseLogAsync({
      log_text: getLogContent(),
      format: format.value,
      source_name: 'manual_input',
      custom_name: customName.value || undefined,
    })
    parseTaskId.value = data.task_id
    startProgressPolling(data.task_id)
  } finally {
    parsingAsync.value = false
  }
}

function startProgressPolling(taskId) {
  stopProgressPolling()
  parseProgress.percent = 0
  parseProgress.status = 'parsing'
  progressTimer = setInterval(async () => {
    try {
      const { data } = await getParseProgress(taskId)
      const total = data.total || 1
      parseProgress.percent = Math.round((data.current / total) * 100)
      if (data.status === 'done') {
        parseProgress.status = 'done'
        parseProgress.percent = 100
        parseResult.value = data.result
        parseTaskId.value = null
        stopProgressPolling()
        ElMessage.success(`解析完成: ${data.result?.count || 0} 条`)
        await fetchParsedList()
        // 弹出自定义命名对话框
        if (data.result?.test_file) {
          renameFile.value = data.result.test_file
          renameCount.value = data.result.count || 0
          renameName.value = (data.result.test_filename || '').replace(/^test_|\.py$/g, '')
          renameVisible.value = true
        }
      } else if (data.status === 'error') {
        parseProgress.status = 'error'
        parseTaskId.value = null
        stopProgressPolling()
        ElMessage.error('解析失败')
      }
    } catch {
      stopProgressPolling()
    }
  }, 1500)
}

function stopProgressPolling() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function downloadParsed(filename) {
  window.open(`/api/parsed/download/${filename}`, '_blank')
}

async function confirmRename() {
  console.log('[LogParser] confirmRename called, name:', renameName.value)
  if (!renameName.value.trim()) {
    renameVisible.value = false
    return
  }
  try {
    await renameParsedTest({ test_file: renameFile.value, new_name: renameName.value.trim() })
    ElMessage.success(`已重命名为 test_${renameName.value.trim()}.py`)
    await fetchParsedList()
    emit('renamed')
  } catch {
    ElMessage.error('重命名失败')
  }
  renameVisible.value = false
}

function skipRename() {
  renameVisible.value = false
}

async function fetchParsedList() {
  listLoading.value = true
  try {
    const { data } = await getParsedList()
    parsedList.value = data || []
  } finally {
    listLoading.value = false
  }
}

async function handleDeleteParsed(filename) {
  try {
    await deleteParsedFile(filename)
    ElMessage.success('已删除')
    await fetchParsedList()
  } catch { /* ignore */ }
}

onMounted(fetchParsedList)
onUnmounted(stopProgressPolling)
</script>