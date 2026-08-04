<template>
  <div>

    <div class="page-card" v-loading="loading">
      <!-- 空状态 -->
      <div v-if="!screenshots.length && !loading" class="empty-state">
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

      <!-- 截图网格 -->
      <div v-else class="screenshot-grid">
        <div
          v-for="(img, idx) in screenshots"
          :key="idx"
          class="screenshot-item"
          @click="previewIdx = idx"
        >
          <el-image
            :src="`/api/screenshot/${img.date}/${img.name}`"
            fit="cover"
            class="screenshot-thumb"
            lazy
          >
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

    <!-- 预览 -->
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getScreenshots } from '@/api'

const screenshots = ref([])
const loading = ref(false)
const previewVisible = ref(false)
const previewIdx = ref(null)

function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function fetchScreenshots() {
  loading.value = true
  try {
    const { data } = await getScreenshots()
    screenshots.value = data
  } finally {
    loading.value = false
  }
}

onMounted(fetchScreenshots)
</script>