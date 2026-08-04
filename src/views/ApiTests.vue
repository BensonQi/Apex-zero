<template>
  <div class="scroll-page">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="执行测试" name="run">

        <!-- 配置 & 用例选择：左右双栏 -->
        <div class="dual-panel">
          <!-- 左侧：执行配置 -->
          <div class="page-card">
            <h3 style="margin-bottom:20px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px">
              <el-icon :size="18" color="#3B82F6"><Setting /></el-icon> 执行配置
            </h3>
            <el-form :model="apiForm" label-width="100px">
              <el-form-item label="执行策略">
                <div>
                  <el-radio-group v-model="apiForm.execution_mode">
                    <el-radio-button value="parallel">⚡ 并行执行</el-radio-button>
                    <el-radio-button value="serial">🔗 串行执行</el-radio-button>
                  </el-radio-group>
                  <p style="margin:8px 0 0;font-size:12px;color:#64748B">
                    {{ apiForm.execution_mode === 'parallel' ? '多 worker 并发，适合大批量用例' : '单 worker 顺序执行，日志清晰适合调试' }}
                  </p>
                </div>
              </el-form-item>
              <el-form-item label="选择环境" v-if="envNames.length">
                <el-select v-model="apiForm.env_name" placeholder="可选环境" clearable style="width:220px">
                  <el-option v-for="n in envNames" :key="n" :label="n" :value="n" />
                </el-select>
              </el-form-item>
              <el-form-item label="断言规则">
                <el-select v-model="apiForm.assert_ids" multiple placeholder="可选断言规则" style="width:260px">
                  <el-option v-for="r in assertRules" :key="r.id" :label="r.name" :value="r.id" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button :type="taskRunning || !markers.length ? 'info' : 'success'" size="large" @click="startRun" :loading="starting" :disabled="taskRunning || !markers.length">
                  <el-icon><VideoPlay /></el-icon> 执行测试
                </el-button>
                <el-button v-if="taskRunning" type="danger" size="large" @click="stopRun" :loading="stopping" style="margin-left:12px">
                  <el-icon><VideoPause /></el-icon> 停止
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 右侧：用例选择面板（常驻） -->
          <div class="page-card" style="display:flex;flex-direction:column;overflow:hidden;min-height:0">
            <h3 style="margin-bottom:12px;font-weight:600;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:8px;flex-shrink:0">
              <el-icon :size="18" color="#22C55E"><List /></el-icon> 选择用例
              <span style="margin-left:auto;font-size:13px;font-weight:400;color:#64748B">
                已选 {{ markers.length }} / {{ apiTests.length }}
              </span>
            </h3>
            <div style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden">
              <el-tabs v-model="selectTab" type="card" style="display:flex;flex-direction:column;flex:1;min-height:0">
                <!-- 普通用例 -->
                <el-tab-pane label="普通用例" name="reg">
                  <div style="display:flex;flex-direction:column;height:calc(100vh - 340px);min-height:200px">
                    <el-input v-model="selectRegSearch" placeholder="搜索..." clearable style="margin-bottom:8px;flex-shrink:0">
                      <template #prefix><el-icon><Search /></el-icon></template>
                    </el-input>
                    <div style="display:flex;gap:8px;margin-bottom:8px;flex-shrink:0">
                      <el-button size="small" @click="selectAllRegCases">全选</el-button>
                      <el-button size="small" @click="invertRegSelection">反选</el-button>
                      <el-button size="small" @click="clearRegMarkers">清空本页</el-button>
                    </div>
                    <div style="flex:1;overflow-y:auto;min-height:0">
                      <template v-for="group in filteredRegGroups" :key="group.file">
                        <div class="group-header" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#3B82F6;font-weight:600;padding:8px 4px 4px;border-bottom:1px solid #E2E8F0;margin-bottom:4px;user-select:none">
                          <span class="group-check" :class="groupCheckClass(group)" @click.stop="toggleGroupSelection(group)" style="width:14px;height:14px;border:2px solid #CBD5E1;border-radius:3px;cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;transition:all 0.15s">
                            <template v-if="isGroupAllSelected(group)">✓</template><template v-else-if="isGroupIndeterminate(group)">−</template>
                          </span>
                          <el-icon :size="14" style="transition:transform 0.2s;cursor:pointer" :style="{ transform: collapsedGroups.has(group.file) ? '' : 'rotate(90deg)' }" @click.stop="toggleGroup(group.file)"><ArrowRight /></el-icon>
                          <span style="flex:1;cursor:pointer" @click="toggleGroup(group.file)">{{ group.file }}</span>
                          <span style="font-weight:400;color:#94A3B8;font-size:11px">{{ group.cases.length }} 条</span>
                        </div>
                        <template v-if="!collapsedGroups.has(group.file)">
                          <label v-for="t in group.cases" :key="t.module" class="case-check-label" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:2px;padding:4px 8px;border-radius:6px;cursor:pointer">
                            <input type="checkbox" :checked="markers.includes(caseId(t))" @change="(e) => toggleCaseMarker(caseId(t), e.target.checked)" style="margin-top:3px;accent-color:#3B82F6;width:14px;height:14px;cursor:pointer;flex-shrink:0" />
                            <div><div style="font-size:13px;font-weight:500;color:#0F172A">{{ shortName(t) }}</div><div style="font-size:11px;color:#94A3B8">{{ t.module }}</div></div>
                          </label>
                        </template>
                      </template>
                    </div>
                    <div v-if="!filteredRegGroups.length" style="text-align:center;padding:30px 0;color:#94A3B8;flex-shrink:0">暂无普通用例</div>
                  </div>
                </el-tab-pane>

                <!-- 数据驱动用例 -->
                <el-tab-pane label="数据驱动" name="ddt">
                  <div style="display:flex;flex-direction:column;height:calc(100vh - 340px);min-height:200px">
                    <el-input v-model="selectDdtSearch" placeholder="搜索合集名或参数..." clearable style="margin-bottom:8px;flex-shrink:0">
                      <template #prefix><el-icon><Search /></el-icon></template>
                    </el-input>
                    <div style="display:flex;gap:8px;margin-bottom:8px;flex-shrink:0">
                      <el-button size="small" @click="selectAllDdtCases">全选</el-button>
                      <el-button size="small" @click="invertDdtSelection">反选</el-button>
                      <el-button size="small" @click="clearDdtMarkers">清空本页</el-button>
                    </div>
                    <div style="flex:1;overflow-y:auto;min-height:0">
                      <template v-for="group in filteredDdtGroups" :key="group.file">
                        <div class="group-header" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#22C55E;font-weight:600;padding:8px 4px 4px;border-bottom:1px solid #E2E8F0;margin-bottom:4px;user-select:none">
                          <span class="group-check" :class="groupCheckClass(group)" @click.stop="toggleGroupSelection(group)" style="width:14px;height:14px;border:2px solid #CBD5E1;border-radius:3px;cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;transition:all 0.15s">
                            <template v-if="isGroupAllSelected(group)">✓</template><template v-else-if="isGroupIndeterminate(group)">−</template>
                          </span>
                          <el-icon :size="14" style="transition:transform 0.2s;cursor:pointer" :style="{ transform: collapsedGroups.has(group.file) ? '' : 'rotate(90deg)' }" @click.stop="toggleGroup(group.file)"><ArrowRight /></el-icon>
                          <span style="flex:1;cursor:pointer" @click="toggleGroup(group.file)">{{ group.file }}</span>
                          <span style="font-weight:400;color:#94A3B8;font-size:11px">{{ group.cases.length }} 组</span>
                        </div>
                        <template v-if="!collapsedGroups.has(group.file)">
                          <label v-for="t in group.cases" :key="t.module" class="case-check-label" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:2px;padding:4px 8px;border-radius:6px;cursor:pointer">
                            <input type="checkbox" :checked="markers.includes(caseId(t))" @change="(e) => toggleCaseMarker(caseId(t), e.target.checked)" style="margin-top:3px;accent-color:#22C55E;width:14px;height:14px;cursor:pointer;flex-shrink:0" />
                            <div><div style="font-size:13px;font-weight:500;color:#0F172A">{{ ddtParamLabel(t) }}</div><div style="font-size:11px;color:#94A3B8">{{ t.module }}</div></div>
                          </label>
                        </template>
                      </template>
                    </div>
                    <div v-if="!filteredDdtGroups.length" style="text-align:center;padding:30px 0;color:#94A3B8;flex-shrink:0">暂无数据驱动用例</div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </div>

        <!-- 任务执行状态（全宽） -->
        <div v-if="task" style="margin-top:16px">
          <h3 style="margin-bottom:16px"><el-tag :type="statusTagType" size="large">{{ statusText }}</el-tag> {{ task.id }}</h3>
          <el-progress :percentage="task.progress||0" :status="task.status==='failed'?'exception':task.status==='completed'?'success':''" :stroke-width="20"/>
          <div class="progress-label">进度 {{ task.progress||0 }}% | {{ task.passed||0 }} 通过 / {{ task.failed||0 }} 失败 / {{ task.errors||0 }} 错误</div>
          <el-row :gutter="16" style="margin:16px 0">
            <el-col :span="6"><el-statistic title="总数" :value="task.total_tests||0"/></el-col>
            <el-col :span="6"><el-statistic title="通过" :value="task.passed||0"><template #suffix><el-icon color="#67c23a"><CircleCheck /></el-icon></template></el-statistic></el-col>
            <el-col :span="6"><el-statistic title="失败" :value="task.failed||0"><template #suffix><el-icon color="#f56c6c"><CircleClose /></el-icon></template></el-statistic></el-col>
            <el-col :span="6"><el-statistic title="错误" :value="task.errors||0"><template #suffix><el-icon color="#e6a23c"><Warning /></el-icon></template></el-statistic></el-col>
          </el-row>

          <!-- 任务执行工作流 -->
          <div style="margin:20px 0">
            <el-steps :active="workflowStep" finish-status="success" align-center>
              <el-step title="任务创建" description="提交测试任务" />
              <el-step title="用例准备" description="收集匹配用例" />
              <el-step title="执行测试" description="运行 API 测试" />
              <el-step title="结果汇总" description="生成测试报告" />
            </el-steps>
          </div>

          <div class="log-terminal" ref="logContainer" style="height:300px;overflow-y:auto;background:#1e1e1e;color:#d4d4d4;border-radius:6px;padding:12px;font:13px monospace">
            <div v-for="(e,i) in displayLogs" :key="i"><span style="color:#888">{{ formatLogTime(e.time) }}</span> <span :class="logClass(e.msg)">{{ e.msg }}</span></div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="普通用例" name="regular">
        <div>
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
                  <el-button type="primary" @click="showCreateDialog">
                    <el-icon><Plus /></el-icon> 新建用例
                  </el-button>
                  <el-upload
                    :show-file-list="false"
                    :before-upload="(f) => handleImport(f, 'split')"
                    accept=".xlsx,.xls,.json,.csv"
                  >
                    <el-button><el-icon><Upload /></el-icon> 导入用例</el-button>
                  </el-upload>
                  <el-button @click="handleExportTemplate('excel')">
                    <el-icon><Download /></el-icon> Excel 模板
                  </el-button>
                  <el-button v-if="selectedRegTests.length" type="danger" @click="handleBatchDelete('regular')" style="margin-left:auto">
                    <el-icon><Delete /></el-icon> 批量删除 ({{ selectedRegTests.length }})
                  </el-button>
                </div>
                <el-form :inline="true" style="margin-bottom:12px">
                  <el-form-item label="用例名称">
                    <el-input v-model="regSearchName" placeholder="搜索..." clearable style="width:200px" />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="regSearchName = regSearchName"><el-icon><Search /></el-icon> 查询</el-button>
                    <el-button @click="regSearchName = ''">重置</el-button>
                  </el-form-item>
                </el-form>
                <el-table :data="regTreeData" row-key="id" border stripe max-height="calc(100vh - 260px)"
                  :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
                  @selection-change="onRegSelection">
                  <el-table-column type="selection" width="40" />
                  <el-table-column label="用例名称 / 合集" min-width="260" show-overflow-tooltip>
                    <template #default="{ row }">
                      <template v-if="row.children">
                        <span style="font-weight:600;color:#3B82F6">{{ row.name }}</span>
                        <el-tag size="small" round type="info" style="margin-left:8px">{{ row.children.length }} 条</el-tag>
                      </template>
                      <template v-else>{{ shortName(row) }}</template>
                    </template>
                  </el-table-column>
                  <el-table-column prop="module" label="模块路径" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }"><span v-if="!row.children">{{ row.module }}</span></template>
                  </el-table-column>
                  <el-table-column label="操作" width="80" fixed="right">
                    <template #default="{ row }">
                      <template v-if="!row.children">
                        <el-button size="small" type="primary" @click="showEditDialog(row)"><el-icon><Edit /></el-icon></el-button>
                      </template>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <!-- ====== 数据驱动用例 ====== -->
            <el-tab-pane label="数据驱动用例" name="ddt">
              <div>
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
                  <el-button type="success" @click="showDdtDialog">
                    <el-icon><Grid /></el-icon> 新建数据驱动
                  </el-button>
                  <el-upload
                    :show-file-list="false"
                    :before-upload="(f) => handleImport(f, 'ddt')"
                    accept=".xlsx,.xls,.json,.csv"
                  >
                    <el-button><el-icon><Upload /></el-icon> 导入数据驱动</el-button>
                  </el-upload>
                  <el-button @click="handleExportTemplate('ddt')">
                    <el-icon><Download /></el-icon> CSV 模板
                  </el-button>
                  <el-button v-if="selectedDdtTests.length" type="danger" @click="handleBatchDelete('ddt')" style="margin-left:auto">
                    <el-icon><Delete /></el-icon> 批量删除 ({{ selectedDdtTests.length }})
                  </el-button>
                </div>
                <el-form :inline="true" style="margin-bottom:12px">
                  <el-form-item label="合集名称">
                    <el-input v-model="ddtSearchName" placeholder="搜索..." clearable style="width:200px" />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="ddtSearchName = ddtSearchName"><el-icon><Search /></el-icon> 查询</el-button>
                    <el-button @click="ddtSearchName = ''">重置</el-button>
                  </el-form-item>
                </el-form>
                <el-table :data="ddtTreeData" row-key="id" border stripe max-height="calc(100vh - 260px)"
                  :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
                  @selection-change="onDdtSelection">
                  <el-table-column type="selection" width="40" />
                  <el-table-column label="合集名称 / 参数行" min-width="300" show-overflow-tooltip>
                    <template #default="{ row }">
                      <template v-if="row.children">
                        <span style="font-weight:600;color:#22C55E">{{ row.name }}</span>
                        <el-tag size="small" round type="success" style="margin-left:8px">{{ row.children.length }} 组参数</el-tag>
                        <el-button size="small" type="warning" style="margin-left:6px" @click.stop="openDdtEditor(row.name)" title="编辑数据">
                          📊 编辑数据
                        </el-button>
                      </template>
                      <template v-else>
                        <span style="font-size:13px;color:#0F172A">{{ ddtParamLabel(row) }}</span>
                      </template>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="80" fixed="right">
                    <template #default="{ row }">
                      <template v-if="row.children">
                        <el-popconfirm title="确定删除此合集？" @confirm="handleDeleteFile(row.name)">
                          <template #reference>
                            <el-button size="small" type="danger"><el-icon><Delete /></el-icon></el-button>
                          </template>
                        </el-popconfirm>
                      </template>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
      </el-tab-pane>

      <!-- 新建/编辑用例弹窗 -->
      <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑用例' : '新建用例'"
        width="650px"
        @closed="resetCaseForm"
      >
        <el-form :model="caseForm" label-width="100px">
          <el-form-item label="用例名称" required>
            <el-input v-model="caseForm.name" placeholder="例如: test_login_success" />
          </el-form-item>
          <el-form-item label="请求方法" required>
            <el-select v-model="caseForm.method" style="width:180px">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="PATCH" value="PATCH" />
            </el-select>
          </el-form-item>
          <el-form-item label="URL" required>
            <el-input v-model="caseForm.url" placeholder="例如: /api/users/login" />
          </el-form-item>
          <el-form-item label="请求头(JSON)">
            <el-input v-model="caseForm.headers" type="textarea" :rows="3" placeholder='{"Content-Type":"application/json"}' style="font-family:monospace;font-size:13px" />
          </el-form-item>
          <el-form-item label="请求体(JSON)">
            <el-input v-model="caseForm.body" type="textarea" :rows="4" placeholder='{"username":"admin"}' style="font-family:monospace;font-size:13px" />
          </el-form-item>
          <el-form-item label="预期状态码">
            <el-input-number v-model="caseForm.expected_status" :min="100" :max="599" />
          </el-form-item>
          <el-form-item label="断言内容">
            <el-input v-model="caseForm.assert_text" placeholder="断言响应中的关键字段或文本，如: code == 0" />
          </el-form-item>
          <el-form-item label="所属文件" v-if="!isEdit">
            <el-select v-model="caseForm.file" placeholder="新建文件（默认）" clearable style="width:100%" filterable allow-create>
              <el-option v-for="f in existingFiles" :key="f" :label="f" :value="f" />
            </el-select>
            <p style="margin:4px 0 0;font-size:11px;color:#94A3B8">留空则自动创建文件，选择已有文件则追加，输入新名称则创建指定合集</p>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveCase" :loading="caseSaving">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </template>
      </el-dialog>

      <el-tab-pane label="日志解析" name="parser">
        <LogParser @renamed="fetchMeta" />
      </el-tab-pane>
    </el-tabs>

    <!-- 数据驱动编辑器 -->
    <DdtEditor v-model="ddtVisible" :file="ddtFile" @saved="fetchMeta" />

    <!-- 新建数据驱动合集对话框 -->
    <el-dialog v-model="ddtDialogVisible" title="新建数据驱动合集" width="420px">
      <el-form label-width="80px">
        <el-form-item label="合集名称" required>
          <el-input v-model="ddtNewName" placeholder="例如: 登录接口测试" />
        </el-form-item>
        <p style="color:#64748B;font-size:12px;margin-left:80px">
          创建后将生成含一条示例数据的数据驱动文件，可通过 📊 按钮编辑参数。
        </p>
      </el-form>
      <template #footer>
        <el-button @click="ddtDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateDdt" :loading="ddtCreating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { runTests, getTaskStatus, stopTask, getTests, createTest, updateTest, getTestDetail, deleteTest, importCases, downloadTemplate, getEnvNames, getAssertList, createDdtTest } from '@/api'
import LogParser from './LogParser.vue'
import DdtEditor from './DdtEditor.vue'

const activeTab = ref('run')
const selectTab = ref('reg')
const apiTests = ref([])
const envNames = ref([])
const assertRules = ref([])
const starting = ref(false)
const stopping = ref(false)
const task = ref(null)
const displayLogs = ref([])
const logContainer = ref(null)
const selectRegSearch = ref('')
const selectDdtSearch = ref('')
const regSearchName = ref('')
const ddtSearchName = ref('')
const ddtVisible = ref(false)
const ddtFile = ref('')
const ddtDialogVisible = ref(false)
const ddtNewName = ref('')
const ddtCreating = ref(false)
const selectedRegTests = ref([])
const selectedDdtTests = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const caseSaving = ref(false)
const caseForm = reactive({ name: '', method: 'GET', url: '', headers: '', body: '', expected_status: 200, assert_text: '', file: '' })
const editOldName = ref('')
const editModule = ref('')
let pollTimer = null

const apiForm = reactive({ mode: 'all', assert_ids: [], env_name: '', execution_mode: 'parallel' })

// 选中的用例 markers：独立 ref 确保响应式可靠（Vue3 最佳实践）
const markers = ref([])

// 简化用例名：去掉类名前缀（如 TestImportedAPICases.xxx → xxx）
function shortName(t) {
  const name = t?.name || ''
  const idx = name.indexOf('.')
  return idx > -1 ? name.slice(idx + 1) : name
}

// 合集折叠状态：Set 中存放已折叠的合集文件名
const collapsedGroups = ref(new Set())

function toggleGroup(file) {
  const s = collapsedGroups.value
  if (s.has(file)) {
    s.delete(file)
  } else {
    s.add(file)
  }
  // 触发响应式更新
  collapsedGroups.value = new Set(s)
}

// 用例唯一 NodeID: test_api/{file}::{name}（pytest 格式）
function caseId(t) {
  return `test_api/${t.file || 'unknown.py'}::${t.name}`
}

// 合集全选/反选（使用 caseId 作为唯一标识）
function toggleGroupSelection(group) {
  const ids = group.cases.map(caseId)
  const allSelected = ids.every(id => markers.value.includes(id))
  if (allSelected) {
    markers.value = markers.value.filter(m => !ids.includes(m))
  } else {
    const toAdd = ids.filter(id => !markers.value.includes(id))
    markers.value = [...markers.value, ...toAdd]
  }
}

function toggleCaseMarker(id, checked) {
  if (checked) {
    if (!markers.value.includes(id)) {
      markers.value = [...markers.value, id]
    }
  } else {
    markers.value = markers.value.filter(m => m !== id)
  }
}

function isGroupAllSelected(group) {
  if (!group.cases.length) return false
  return group.cases.every(t => markers.value.includes(caseId(t)))
}

function isGroupIndeterminate(group) {
  if (!group.cases.length) return false
  const selected = group.cases.filter(t => markers.value.includes(caseId(t))).length
  return selected > 0 && selected < group.cases.length
}

function groupCheckClass(group) {
  if (isGroupAllSelected(group)) return 'checked'
  if (isGroupIndeterminate(group)) return 'indeterminate'
  return ''
}

// 判断是否为数据驱动用例
function isDdtCase(t) {
  return t.name?.includes('test_imported_ddt')
}

// DDT 参数行显示标签（去掉类名前缀，显示 parametrize 参数组名）
function ddtParamLabel(t) {
  const name = shortName(t)
  // test_imported_ddt[管理员登录] → 管理员登录
  const m = name.match(/\[(.+)\]$/)
  return m ? m[1] : name
}

// 按文件分组的用例列表
const groupedCases = computed(() => {
  const map = {}
  for (const t of apiTests.value) {
    const file = t.file || '未分组'
    if (!map[file]) map[file] = []
    map[file].push(t)
  }
  return Object.entries(map).map(([file, cases]) => ({ file, cases }))
})

// 普通用例分组（排除 DDT）
const regGroupedCases = computed(() => {
  const kw = regSearchName.value.toLowerCase().trim()
  return groupedCases.value
    .map(g => ({ file: g.file, cases: g.cases.filter(t => !isDdtCase(t) && (kw ? (t.name?.toLowerCase().includes(kw) || t.module?.toLowerCase().includes(kw)) : true)) }))
    .filter(g => g.cases.length)
})

// 数据驱动用例分组
const ddtGroupedCases = computed(() => {
  const kw = ddtSearchName.value.toLowerCase().trim()
  return groupedCases.value
    .map(g => ({ file: g.file, cases: g.cases.filter(t => isDdtCase(t) && (kw ? (t.name?.toLowerCase().includes(kw) || t.module?.toLowerCase().includes(kw) || g.file.toLowerCase().includes(kw)) : true)) }))
    .filter(g => g.cases.length)
})

// 普通用例树形数据
const regTreeData = computed(() =>
  regGroupedCases.value.map((g, gi) => ({
    id: `reg-${gi}`,
    name: g.file,
    children: g.cases.map((t, ci) => ({ ...t, id: caseId(t) || `reg-case-${gi}-${ci}` })),
    hasChildren: true,
  }))
)

// 数据驱动用例树形数据
const ddtTreeData = computed(() =>
  ddtGroupedCases.value.map((g, gi) => ({
    id: `ddt-${gi}`,
    name: g.file,
    children: g.cases.map((t, ci) => ({ ...t, id: caseId(t) || `ddt-case-${gi}-${ci}` })),
    hasChildren: true,
  }))
)

// 执行测试 — 普通用例分组（已过滤 DDT + 搜索）
const filteredRegGroups = computed(() => {
  const kw = selectRegSearch.value.toLowerCase().trim()
  return groupedCases.value
    .map(g => ({
      file: g.file,
      cases: g.cases.filter(t => !isDdtCase(t) && (kw ? (t.name?.toLowerCase().includes(kw) || t.module?.toLowerCase().includes(kw)) : true)),
    }))
    .filter(g => g.cases.length)
})

// 执行测试 — 数据驱动用例分组
const filteredDdtGroups = computed(() => {
  const kw = selectDdtSearch.value.toLowerCase().trim()
  return groupedCases.value
    .map(g => ({
      file: g.file,
      cases: g.cases.filter(t => isDdtCase(t) && (kw ? (t.name?.toLowerCase().includes(kw) || t.module?.toLowerCase().includes(kw) || g.file.toLowerCase().includes(kw)) : true)),
    }))
    .filter(g => g.cases.length)
})

// 普通用例全选/反选/清空
function selectAllRegCases() {
  const ids = filteredRegGroups.value.flatMap(g => g.cases.map(caseId))
  const newSet = new Set([...markers.value, ...ids])
  markers.value = [...newSet]
}
function invertRegSelection() {
  const all = new Set(filteredRegGroups.value.flatMap(g => g.cases.map(caseId)))
  for (const m of markers.value) all.delete(m)
  markers.value = [...all]
}
function clearRegMarkers() {
  const removeIds = new Set(filteredRegGroups.value.flatMap(g => g.cases.map(caseId)))
  markers.value = markers.value.filter(m => !removeIds.has(m))
}

// 数据驱动用例全选/反选/清空
function selectAllDdtCases() {
  const ids = filteredDdtGroups.value.flatMap(g => g.cases.map(caseId))
  const newSet = new Set([...markers.value, ...ids])
  markers.value = [...newSet]
}
function invertDdtSelection() {
  const all = new Set(filteredDdtGroups.value.flatMap(g => g.cases.map(caseId)))
  for (const m of markers.value) all.delete(m)
  markers.value = [...all]
}
function clearDdtMarkers() {
  const removeIds = new Set(filteredDdtGroups.value.flatMap(g => g.cases.map(caseId)))
  markers.value = markers.value.filter(m => !removeIds.has(m))
}

function onRegSelection(rows) {
  selectedRegTests.value = rows
}

function onDdtSelection(rows) {
  selectedDdtTests.value = rows
}

// 已有文件名列表（供新建时追加到已有文件）
const existingFiles = computed(() => groupedCases.value.map(g => g.file).filter(f => f !== '未分组'))

async function handleBatchDelete(type = 'regular') {
  const selected = type === 'ddt' ? selectedDdtTests.value : selectedRegTests.value
  const cases = selected.filter(r => r.module && !r.children)
  const uniqueModules = [...new Set(cases.map(r => r.module))]
  if (!uniqueModules.length) return
  try {
    await deleteTest(uniqueModules)
    ElMessage.success(`已删除 ${uniqueModules.length} 个文件`)
    if (type === 'ddt') selectedDdtTests.value = []
    else selectedRegTests.value = []
    await fetchMeta()
  } catch { /* ignore */ }
}

// 通过文件名删除数据驱动合集
async function handleDeleteFile(fileName) {
  // 从 fileName 推导 module 路径
  const module = 'testcases.test_api.' + fileName.replace('.py', '')
  try {
    await deleteTest(module)
    ElMessage.success(`已删除合集: ${fileName}`)
    await fetchMeta()
  } catch { /* ignore */ }
}

// ====== 用例 CRUD ======
function resetCaseForm() {
  caseForm.name = ''
  caseForm.method = 'GET'
  caseForm.url = ''
  caseForm.headers = ''
  caseForm.body = ''
  caseForm.expected_status = 200
  caseForm.assert_text = ''
  caseForm.file = ''
  editOldName.value = ''
  editModule.value = ''
  isEdit.value = false
}

function showCreateDialog() {
  resetCaseForm()
  dialogVisible.value = true
}

async function showEditDialog(row) {
  isEdit.value = true
  editOldName.value = row.name
  editModule.value = row.module
  // 默认值
  caseForm.name = row.name.replace(/^test_/, '')
  caseForm.method = 'GET'
  caseForm.url = ''
  caseForm.headers = ''
  caseForm.body = ''
  caseForm.expected_status = 200
  caseForm.assert_text = ''
  caseForm.file = ''
  dialogVisible.value = true

  // 异步加载详情
  try {
    const { data } = await getTestDetail({ module: row.module, name: row.name })
    if (data && data.url) {
      caseForm.name = (data.name || row.name).replace(/^test_/, '')
      caseForm.method = data.method || 'GET'
      caseForm.url = data.url || ''
      caseForm.headers = data.headers ? JSON.stringify(data.headers, null, 2) : ''
      caseForm.body = data.body ? JSON.stringify(data.body, null, 2) : ''
      caseForm.expected_status = data.expected_status || 200
      caseForm.assert_text = data.assert_text || ''
    }
  } catch {
    // 加载失败使用默认值
  }
}

async function handleSaveCase() {
  if (!caseForm.name || !caseForm.url) {
    ElMessage.warning('用例名称和URL不能为空')
    return
  }
  caseSaving.value = true
  try {
    // 解析 headers / body JSON
    let headers = {}
    let body = null
    try { if (caseForm.headers.trim()) headers = JSON.parse(caseForm.headers) } catch { ElMessage.warning('请求头 JSON 格式错误'); return }
    try { if (caseForm.body.trim()) body = JSON.parse(caseForm.body) } catch { ElMessage.warning('请求体 JSON 格式错误'); return }

    if (isEdit.value) {
      await updateTest({
        module: editModule.value,
        old_name: editOldName.value,
        name: caseForm.name,
        method: caseForm.method,
        url: caseForm.url,
        headers,
        body,
        expected_status: caseForm.expected_status,
        assert_text: caseForm.assert_text,
      })
      ElMessage.success('用例已更新')
    } else {
      await createTest({
        name: caseForm.name,
        method: caseForm.method,
        url: caseForm.url,
        headers,
        body,
        expected_status: caseForm.expected_status,
        assert_text: caseForm.assert_text,
        file: caseForm.file || undefined,
      })
      ElMessage.success('用例已创建')
    }
    dialogVisible.value = false
    await fetchMeta()
  } catch (e) {
    const msg = e?.response?.data?.message || '操作失败'
    ElMessage.error(msg)
  } finally {
    caseSaving.value = false
  }
}

async function handleImport(file, mode = 'split') {
  try {
    const isDdt = mode === 'ddt'
    const { data } = await importCases(file, isDdt)
    ElMessage.success(data?.message || `导入完成: ${data?.count || 0} 条`)
    await fetchMeta()
  } catch { /* ignore */ }
  return false
}

function openDdtEditor(fileName) {
  ddtFile.value = fileName
  ddtVisible.value = true
}

function handleExportTemplate(type) {
  const isDdt = type === 'ddt'
  downloadTemplate(isDdt ? 'ddt' : 'excel').then(({ data }) => {
    const url = URL.createObjectURL(new Blob([data]))
    const a = document.createElement('a')
    a.href = url
    a.download = isDdt ? 'api_template_ddt.csv' : 'test_case_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }).catch(() => {})
}

function showDdtDialog() {
  ddtNewName.value = ''
  ddtDialogVisible.value = true
}

async function handleCreateDdt() {
  if (!ddtNewName.value.trim()) {
    ElMessage.warning('请输入合集名称')
    return
  }
  ddtCreating.value = true
  try {
    await createDdtTest({ name: ddtNewName.value.trim() })
    ElMessage.success('数据驱动用例已创建')
    ddtDialogVisible.value = false
    await fetchMeta()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '创建失败')
  } finally {
    ddtCreating.value = false
  }
}

const taskRunning = computed(() => task.value && ['pending','running'].includes(task.value.status))
const statusText = computed(() => ({pending:'等待中',running:'执行中',completed:'已完成',failed:'失败',stopped:'已停止'}[task.value?.status]||'未知'))
const statusTagType = computed(() => ({pending:'info',running:'warning',completed:'success',failed:'danger',stopped:'info'}[task.value?.status]||'info'))
const workflowStep = computed(() => {
  if (!task.value) return 0
  const s = task.value.status
  const p = task.value.progress || 0
  if (s === 'pending') return 0
  if (s === 'running') return p < 30 ? 1 : p < 90 ? 2 : 3
  return 4 // completed / failed / stopped
})

function formatLogTime(t) { try { return new Date(t).toLocaleTimeString('zh-CN') } catch { return '' } }
function logClass(m) { if(!m) return ''; if(/错误|失败|error|fail|异常/i.test(m)) return 'log-error'; if(/警告|warn/i.test(m)) return 'log-warn'; if(/成功|完成|ok/i.test(m)) return 'log-success'; return '' }

async function fetchMeta() {
  try {
    const [t, e, a] = await Promise.all([getTests(), getEnvNames(), getAssertList()])
    apiTests.value = t.data?.api_tests || []
    envNames.value = e.data?.data || []
    assertRules.value = a.data || []
    // 默认折叠所有合集
    await nextTick()
    collapsedGroups.value = new Set(groupedCases.value.map(g => g.file))
  } catch {}
}

async function startRun() {
  if (apiForm.mode === 'selected' && !markers.value.length) { ElMessage.warning('请选择用例'); return }
  starting.value = true
  try {
    // markers 已是 pytest NodeID 格式，直接传给后端
    const { data } = await runTests({ type: 'api', markers: markers.value, assert_ids: apiForm.assert_ids, env_name: apiForm.env_name, execution_mode: apiForm.execution_mode })
    task.value = { id: data.task_id, status: 'pending', progress:0, passed:0, failed:0, errors:0, total_tests:0, test_type:'api' }
    displayLogs.value = []
    startPolling(data.task_id)
  } finally { starting.value = false }
}

function startPolling(id) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const { data } = await getTaskStatus(id)
      task.value = { ...data, test_type: 'api' }
      if (data.logs) { displayLogs.value = [...data.logs]; await nextTick(); logContainer.value && (logContainer.value.scrollTop = logContainer.value.scrollHeight) }
      if (['completed','failed','stopped'].includes(data.status)) { stopPolling(); ElMessage[data.status==='completed'?'success':'warning']('任务结束') }
    } catch { stopPolling() }
  }, 1000)
}
function stopPolling() { pollTimer && clearInterval(pollTimer); pollTimer = null }
async function stopRun() { stopping.value = true; try { await stopTask(task.value.id) } finally { stopping.value = false } }

onMounted(fetchMeta)
onUnmounted(stopPolling)
</script>

<style scoped>
.group-check.checked {
  background: #3B82F6;
  border-color: #3B82F6;
}
.group-check.indeterminate {
  background: #3B82F6;
  border-color: #3B82F6;
}
</style>
