/** Generic UI helpers (toast, etc). */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastState {
  msg: string
  visible: boolean
}

export const useUiStore = defineStore('ui', () => {
  const sidebarVisible = ref(true)
  const sidebarWidth = ref(260)
  const sidebarPanel = ref<'explorer' | 'search'>('explorer')
  const readingMode = ref(false)
  const fontSize = ref(14)

  const toastMsg = ref('')
  const toastVisible = ref(false)
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(msg: string, ms = 2000): void {
    toastMsg.value = msg
    toastVisible.value = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastVisible.value = false
    }, ms)
  }

  function toggleSidebar(): void {
    sidebarVisible.value = !sidebarVisible.value
  }

  function setSidebarPanel(panel: 'explorer' | 'search'): void {
    sidebarPanel.value = panel
    if (!sidebarVisible.value) sidebarVisible.value = true
  }

  function toggleReadingMode(): void {
    readingMode.value = !readingMode.value
  }

  function zoom(dir: number): void {
    fontSize.value = Math.max(10, Math.min(28, fontSize.value + dir))
  }

  function resetZoom(): void {
    fontSize.value = 14
  }

  function applySettings(s: {
    fontSize?: number
    sidebarWidth?: number
    sidebarVisible?: boolean
    readingMode?: boolean
  }): void {
    if (s.fontSize != null) fontSize.value = s.fontSize
    if (s.sidebarWidth != null) sidebarWidth.value = s.sidebarWidth
    if (s.sidebarVisible != null) sidebarVisible.value = s.sidebarVisible
    if (s.readingMode != null) readingMode.value = s.readingMode
  }

  return {
    sidebarVisible,
    sidebarWidth,
    sidebarPanel,
    readingMode,
    fontSize,
    toastMsg,
    toastVisible,
    showToast,
    toggleSidebar,
    setSidebarPanel,
    toggleReadingMode,
    zoom,
    resetZoom,
    applySettings
  }
})
