import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTaskStore = defineStore('task', () => {
  const runningTask = ref(null)
  const taskLogs = ref([])
  const pollingTimer = ref(null)

  function startPolling(taskId) {
    stopPolling()
    runningTask.value = { id: taskId, status: 'running', progress: 0 }
    taskLogs.value = []
  }

  function stopPolling() {
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  function updateTask(data) {
    if (runningTask.value) {
      Object.assign(runningTask.value, data)
      if (data.logs) {
        taskLogs.value = [...data.logs]
      }
    }
  }

  function clearTask() {
    runningTask.value = null
    taskLogs.value = []
    stopPolling()
  }

  return { runningTask, taskLogs, pollingTimer, startPolling, stopPolling, updateTask, clearTask }
})
