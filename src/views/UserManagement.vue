<template>
  <div class="table-page">
    <!-- 查询筛选区 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-input v-model="filter.username" placeholder="账户名" clearable size="default" class="filter-input" />
        <el-input v-model="filter.display_name" placeholder="使用人" clearable size="default" class="filter-input" />
        <el-input v-model="filter.email" placeholder="邮箱" clearable size="default" class="filter-input" />
        <el-select v-model="filter.role" placeholder="角色" clearable size="default" class="filter-select">
          <el-option label="管理员" value="admin" />
          <el-option label="普通用户" value="user" />
        </el-select>
        <el-select v-model="filter.is_active" placeholder="状态" clearable size="default" class="filter-select">
          <el-option label="启用" value="1" />
          <el-option label="禁用" value="0" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button type="primary" size="default" @click="handleSearch">
          <el-icon><Search /></el-icon> 查询
        </el-button>
        <el-button size="default" @click="resetFilter">
          <el-icon><RefreshRight /></el-icon> 重置
        </el-button>
        <el-button type="success" size="default" @click="showCreateDialog">
          <el-icon><Plus /></el-icon> 新增用户
        </el-button>
      </div>
    </div>

    <div class="page-card table-content" v-loading="loading">
      <el-table :data="users" stripe empty-text="暂无匹配数据" height="100%">
        <el-table-column type="index" width="50" label="#" :index="indexMethod" />
        <el-table-column prop="username" label="账户名" width="140" />
        <el-table-column prop="display_name" label="用户名" width="120" show-overflow-tooltip />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" type="primary" @click="showEditDialog(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-popconfirm title="确定删除该用户？" @confirm="handleDelete(row)">
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

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
          @size-change="fetchUsers"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <!-- 新增/编辑 对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="480px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="80px" ref="formRef">
        <el-form-item label="账户名" required>
          <el-input v-model="form.username" placeholder="登录账户名" />
        </el-form-item>
        <el-form-item label="用户名" required>
          <el-input v-model="form.display_name" placeholder="使用人姓名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" :required="!isEdit">
          <el-input
            v-model="form.password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.role" placeholder="请选择角色" style="width:100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.is_active" active-text="启用" inactive-text="禁用" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserList, getUserDetail, createUser, updateUser, deleteUser } from '@/api'
import { sha256 } from '@/utils/crypto'

// ---- 分页 ----
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function indexMethod(idx) {
  return (page.value - 1) * pageSize.value + idx + 1
}

// ---- 筛选 ----
const filter = reactive({
  username: '',
  display_name: '',
  email: '',
  role: '',
  is_active: '',
})

function resetFilter() {
  Object.assign(filter, { username: '', display_name: '', email: '', role: '', is_active: '' })
  page.value = 1
  fetchUsers()
}

function handleSearch() {
  page.value = 1
  fetchUsers()
}

// ---- 状态 ----
const users = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const form = reactive({
  id: null,
  username: '',
  display_name: '',
  password: '',
  role: 'user',
  email: '',
  phone: '',
  is_active: true,
})

// ---- 方法 ----
async function fetchUsers() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
    }
    if (filter.username) params.username = filter.username
    if (filter.display_name) params.display_name = filter.display_name
    if (filter.email) params.email = filter.email
    if (filter.role) params.role = filter.role
    if (filter.is_active) params.is_active = filter.is_active
    const { data } = await getUserList(params)
    // 后端返回格式兼容：
    //   有筛选: { data: { list: [], total, ... }, status: "success" }
    //   无筛选: { data: [], status: "success" }
    const body = data?.data || data
    if (Array.isArray(body)) {
      users.value = body
      total.value = body.length
    } else {
      users.value = body?.list || []
      total.value = body?.total || 0
    }
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    id: null, username: '', display_name: '', password: '',
    role: 'user', email: '', phone: '', is_active: true,
  })
  isEdit.value = false
}

function showCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

async function showEditDialog(row) {
  isEdit.value = true
  loading.value = true
  try {
    const { data } = await getUserDetail(row.id)
    const u = data?.data || data || row
    Object.assign(form, {
      id: u.id,
      username: u.username,
      display_name: u.display_name || '',
      password: '',
      role: u.role || 'user',
      email: u.email || '',
      phone: u.phone || '',
      is_active: u.is_active !== false,
    })
    dialogVisible.value = true
  } catch {
    ElMessage.error('获取用户详情失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.username) { ElMessage.warning('用户名不能为空'); return }
  if (!isEdit.value && !form.password) { ElMessage.warning('密码不能为空'); return }
  saving.value = true
  try {
    const payload = { ...form }
    if (payload.password) payload.password = await sha256(payload.password)
    if (isEdit.value && !payload.password) delete payload.password
    isEdit.value ? await updateUser(payload) : await createUser(payload)
    ElMessage.success(isEdit.value ? '用户更新成功' : '用户创建成功')
    dialogVisible.value = false
    await fetchUsers()
  } finally {
    saving.value = false
  }
}

async function handleDelete(row) {
  try {
    await deleteUser({ id: row.id, username: row.username })
    ElMessage.success('用户已删除')
    await fetchUsers()
  } catch { /* 拦截器已提示 */ }
}

// ---- 生命周期 ----
onMounted(() => {
  fetchUsers()
})
</script>
