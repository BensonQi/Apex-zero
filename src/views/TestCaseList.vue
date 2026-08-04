<template>
  <div>
    <!-- 查询条件 -->
    <div class="page-card">
      <el-form :model="query" inline>
        <el-form-item label="用例名称">
          <el-input v-model="query.name" placeholder="输入名称搜索" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="用例类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width:140px">
            <el-option label="API" value="api" />
            <el-option label="UI" value="ui" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search"><el-icon><Search /></el-icon> 查询</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button type="success" @click="exportExcel"><el-icon><Download /></el-icon> 导出 Excel</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 查询结果 -->
    <div class="page-card" style="height:520px;display:flex;flex-direction:column">
      <el-table :data="pagedData" border stripe v-loading="loading" max-height="420" empty-text="暂无数据">
        <el-table-column type="index" width="55" label="#" />
        <el-table-column prop="name" label="用例名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }"><el-tag :type="row._type==='api'?'primary':'success'" size="small">{{ row._type?.toUpperCase() }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="module" label="模块路径" min-width="280" show-overflow-tooltip />
        <el-table-column prop="file" label="文件名" width="180" show-overflow-tooltip />
      </el-table>
      <el-pagination
        v-model:current-page="page" :page-size="pageSize" :total="filteredData.length"
        layout="total, prev, pager, next, jumper"
        style="margin-top:auto;padding-top:12px;justify-content:center"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTests } from '@/api'
import * as XLSX from 'xlsx'

const loading = ref(false)
const allTests = ref([])
const page = ref(1)
const pageSize = ref(15)

const query = reactive({ name: '', type: '' })

const filteredData = computed(() => {
  let data = allTests.value
  if (query.name) {
    const kw = query.name.toLowerCase()
    data = data.filter(t => t.name?.toLowerCase().includes(kw) || t.module?.toLowerCase().includes(kw))
  }
  if (query.type) {
    data = data.filter(t => t._type === query.type)
  }
  return data
})

const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

function search() { page.value = 1 }
function reset() { query.name = ''; query.type = ''; page.value = 1 }

function exportExcel() {
  if (!filteredData.value.length) { ElMessage.warning('无数据可导出'); return }
  const rows = filteredData.value.map((t, i) => ({ '序号': i + 1, '用例名称': t.name, '类型': t._type?.toUpperCase(), '模块路径': t.module, '文件名': t.file }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用例列表')
  XLSX.writeFile(wb, `用例列表_${new Date().toISOString().slice(0,10)}.xlsx`)
  ElMessage.success('导出成功')
}

async function fetchTests() {
  loading.value = true
  try {
    const { data } = await getTests()
    const api = (data.api_tests || []).map(t => ({ ...t, _type: 'api', file: t.module?.split('.').pop() + '.py' || '' }))
    const ui = (data.ui_tests || []).map(t => ({ ...t, _type: 'ui', file: t.module?.split('.').pop() + '.py' || '' }))
    allTests.value = [...api, ...ui]
  } finally { loading.value = false }
}

onMounted(fetchTests)
</script>