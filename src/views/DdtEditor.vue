<template>
  <el-dialog
    v-model="visible"
    :title="`编辑数据驱动用例 — ${fileName}`"
    width="900px"
    :close-on-click-modal="false"
    @closed="resetState"
  >
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
      <el-button size="small" @click="addRow"><el-icon><Plus /></el-icon> 添加行</el-button>
      <el-button size="small" type="danger" :disabled="!selectedRows.length" @click="deleteSelected">
        <el-icon><Delete /></el-icon> 删除选中 ({{ selectedRows.length }})
      </el-button>
      <span style="margin-left:auto;font-size:13px;color:#64748B">共 {{ rows.length }} 组参数</span>
    </div>

    <div style="max-height:460px;overflow:auto;border:1px solid #E2E8F0;border-radius:6px">
      <table class="ddt-table">
        <thead>
          <tr>
            <th style="width:40px">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            </th>
            <th v-for="p in paramNames" :key="p" :style="{ minWidth: colWidth(p) }">
              {{ p }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in rows" :key="ri" :class="{ selected: selectedRows.includes(ri) }">
            <td>
              <input type="checkbox" :checked="selectedRows.includes(ri)" @change="toggleRow(ri)" />
            </td>
            <td v-for="(col, ci) in paramNames" :key="ci">
              <!-- JSON 字段用 textarea 编辑 -->
              <template v-if="isJsonField(col)">
                <div v-if="editingCell?.ri === ri && editingCell?.ci === ci" style="position:relative">
                  <textarea
                    ref="jsonInput"
                    v-model="editValue"
                    :rows="3"
                    style="width:100%;font-family:monospace;font-size:12px;resize:vertical"
                    @keydown.escape="finishEdit(true)"
                  />
                  <div style="display:flex;gap:4px;margin-top:2px">
                    <el-button size="small" type="primary" @click="finishEdit(true)">确定</el-button>
                    <el-button size="small" @click="finishEdit(false)">取消</el-button>
                  </div>
                </div>
                <div v-else class="cell-preview json-cell" @dblclick="startEdit(ri, ci, formatJson(row[ci]))">
                  {{ formatJson(row[ci]) }}
                </div>
              </template>
              <!-- 普通字段用 input 编辑 -->
              <template v-else>
                <div v-if="editingCell?.ri === ri && editingCell?.ci === ci">
                  <input
                    ref="textInput"
                    v-model="editValue"
                    style="width:100%;padding:4px 6px;border:1px solid #3B82F6;border-radius:4px;font-size:13px"
                    @keydown.enter="finishEdit(true)"
                    @keydown.escape="finishEdit(false)"
                    @blur="finishEdit(true)"
                  />
                </div>
                <div v-else class="cell-preview" @dblclick="startEdit(ri, ci, formatDisplay(row[ci]))">
                  {{ formatDisplay(row[ci]) }}
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length" style="text-align:center;padding:40px;color:#94A3B8">暂无数据</div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">保存到文件</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getDdtData, updateDdtData } from '@/api'

const props = defineProps({
  modelValue: Boolean,
  file: String,
})
const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const fileName = computed(() => props.file || '')
const paramNames = ref([])
const rows = ref([])
const selectedRows = ref([])
const saving = ref(false)
const editingCell = ref(null)
const editValue = ref('')
const textInput = ref(null)
const jsonInput = ref(null)

const allSelected = computed(() => rows.value.length > 0 && selectedRows.value.length === rows.value.length)

async function loadData() {
  if (!props.file) return
  try {
    const { data } = await getDdtData(props.file)
    paramNames.value = data.param_names || []
    rows.value = (data.rows || []).map(r => [...r])
    selectedRows.value = []
    editingCell.value = null
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载数据失败')
    visible.value = false
  }
}

function resetState() {
  paramNames.value = []
  rows.value = []
  selectedRows.value = []
  editingCell.value = null
}

function colWidth(name) {
  return name === 'headers' || name === 'body' ? '200px' : name === 'url' ? '180px' : '120px'
}

function isJsonField(name) {
  return name === 'headers' || name === 'body'
}

function formatJson(val) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'object') {
    try { return JSON.stringify(val, null, 2) } catch { return String(val) }
  }
  return String(val)
}

function formatDisplay(val) {
  if (val === null || val === undefined) return '∅'
  if (typeof val === 'object') {
    try { return JSON.stringify(val) } catch { return '…' }
  }
  const s = String(val)
  return s.length > 40 ? s.slice(0, 40) + '…' : s
}

function toggleRow(ri) {
  const idx = selectedRows.value.indexOf(ri)
  if (idx > -1) selectedRows.value.splice(idx, 1)
  else selectedRows.value.push(ri)
  selectedRows.value = [...selectedRows.value]
}

function toggleAll() {
  if (allSelected.value) selectedRows.value = []
  else selectedRows.value = rows.value.map((_, i) => i)
}

function addRow() {
  const newRow = paramNames.value.map(p => isJsonField(p) ? {} : '')
  rows.value = [...rows.value, newRow]
}

function deleteSelected() {
  const sorted = [...selectedRows.value].sort((a, b) => b - a)
  for (const ri of sorted) rows.value.splice(ri, 1)
  rows.value = [...rows.value]
  selectedRows.value = []
}

async function startEdit(ri, ci, currentVal) {
  editingCell.value = { ri, ci }
  editValue.value = currentVal
  await nextTick()
  if (isJsonField(paramNames.value[ci])) {
    jsonInput.value?.[0]?.focus()
  } else {
    textInput.value?.[0]?.focus()
  }
}

function finishEdit(save) {
  if (!editingCell.value) return
  if (save) {
    const { ri, ci } = editingCell.value
    const col = paramNames.value[ci]
    if (isJsonField(col)) {
      try {
        rows.value[ri][ci] = JSON.parse(editValue.value)
      } catch {
        ElMessage.warning('JSON 格式错误，未保存')
        return
      }
    } else if (col === 'expected_status') {
      rows.value[ri][ci] = parseInt(editValue.value) || 200
    } else {
      rows.value[ri][ci] = editValue.value
    }
    rows.value = [...rows.value] // 触发响应式
  }
  editingCell.value = null
}

async function handleSave() {
  saving.value = true
  try {
    await updateDdtData({
      file: props.file,
      param_names: paramNames.value,
      rows: rows.value.map(r => [...r]),
    })
    ElMessage.success('数据驱动用例已更新')
    visible.value = false
    emit('saved')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 打开时加载数据
watch(() => props.modelValue, (v) => {
  if (v && props.file) loadData()
})
</script>

<style scoped>
.ddt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ddt-table th,
.ddt-table td {
  padding: 6px 8px;
  border: 1px solid #E2E8F0;
  text-align: left;
  white-space: nowrap;
}
.ddt-table th {
  background: #F8FAFC;
  font-weight: 600;
  color: #475569;
  position: sticky;
  top: 0;
  z-index: 1;
}
.ddt-table tr:hover td {
  background: #F1F5F9;
}
.ddt-table tr.selected td {
  background: #EFF6FF;
}
.cell-preview {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  min-height: 20px;
}
.cell-preview:hover {
  background: #DBEAFE;
}
.json-cell {
  font-family: monospace;
  font-size: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
