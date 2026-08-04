<template>
  <div class="breadcrumb-bar" v-if="items.length > 0">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/dashboard' }">
        <el-icon :size="16"><HomeFilled /></el-icon>
      </el-breadcrumb-item>
      <el-breadcrumb-item
        v-for="(item, idx) in items"
        :key="idx"
        :to="idx < items.length - 1 ? { path: item.path } : undefined"
      >
        {{ item.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled } from '@element-plus/icons-vue'

const route = useRoute()

const items = computed(() => {
  const crumbs = []
  const meta = route.meta

  // 如果是登录页，不显示面包屑
  if (meta.noAuth) return crumbs

  // 首页不显示面包屑
  if (route.path === '/dashboard') return crumbs

  // 如果当前路由有 parent（属于某个子菜单），先显示父级
  if (meta.parent) {
    crumbs.push({ title: meta.parent, path: '' })
  }

  // 当前页面标题
  crumbs.push({ title: meta.title || route.name, path: route.path })

  return crumbs
})
</script>

<style scoped>
.breadcrumb-bar {
  padding: 0;
  flex: 1;
  min-width: 0;
}

.breadcrumb-bar :deep(.el-breadcrumb) {
  font-size: 13px;
}

.breadcrumb-bar :deep(.el-breadcrumb__inner) {
  color: #64748B;
  font-weight: 400;
  transition: color 0.2s;
}

.breadcrumb-bar :deep(.el-breadcrumb__inner.is-link:hover) {
  color: #3B82F6;
}

.breadcrumb-bar :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #0F172A;
  font-weight: 600;
  cursor: default;
}

.breadcrumb-bar :deep(.el-breadcrumb__separator) {
  color: #CBD5E1;
  margin: 0 8px;
}
</style>
