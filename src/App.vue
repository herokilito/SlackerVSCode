<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { useUiStore } from '@renderer/stores/ui'
import { usePersistStore } from '@renderer/stores/persist'
import TitleBar from '@renderer/components/TitleBar.vue'
import ActivityBar from '@renderer/components/ActivityBar.vue'
import Sidebar from '@renderer/components/Sidebar.vue'
import EditorArea from '@renderer/components/EditorArea.vue'
import StatusBar from '@renderer/components/StatusBar.vue'
import QuickOpen from '@renderer/components/QuickOpen.vue'
import ContextMenu from '@renderer/components/ContextMenu.vue'
import Toast from '@renderer/components/Toast.vue'
import { useGlobalKeys } from '@renderer/composables/useGlobalKeys'

const books = useBooksStore()
const tabs = useTabsStore()
const ui = useUiStore()
const persist = usePersistStore()

const quickOpenVisible = ref(false)

function showQuickOpen(): void {
  quickOpenVisible.value = true
}

function closeQuickOpen(): void {
  quickOpenVisible.value = false
}

async function nextChapter(delta: number): Promise<void> {
  const t = tabs.activeTab
  if (!t) return
  const book = books.findBook(t.bookId)
  if (!book) return
  const data = await books.ensureBookLoaded(book)
  if (!data) return
  const ni = t.chapterIndex + delta
  if (ni < 0) {
    ui.showToast('已是第一章')
    return
  }
  if (ni >= data.chapters.length) {
    ui.showToast('已是最后一章')
    return
  }
  await tabs.openChapter(t.bookId, ni)
  persist.scheduleSave()
}

useGlobalKeys([
  { ctrl: true, key: 'o', handler: (e) => { e.preventDefault(); books.pickAndAddBooks().then(() => persist.scheduleSave()) } },
  { ctrl: true, key: 'p', handler: (e) => { e.preventDefault(); showQuickOpen() } },
  { ctrl: true, shift: true, key: 'p', handler: (e) => { e.preventDefault(); showQuickOpen() } },
  { ctrl: true, key: 'f', handler: (e) => { e.preventDefault(); ui.setSidebarPanel('search') } },
  { ctrl: true, key: 'b', handler: (e) => { e.preventDefault(); ui.toggleSidebar(); persist.scheduleSave() } },
  { ctrl: true, key: '=', handler: (e) => { e.preventDefault(); ui.zoom(1); persist.scheduleSave() } },
  { ctrl: true, key: '+', handler: (e) => { e.preventDefault(); ui.zoom(1); persist.scheduleSave() } },
  { ctrl: true, key: '-', handler: (e) => { e.preventDefault(); ui.zoom(-1); persist.scheduleSave() } },
  { ctrl: true, key: '0', handler: (e) => { e.preventDefault(); ui.resetZoom(); persist.scheduleSave() } },
  { alt: true, key: 'arrowleft', handler: (e) => { e.preventDefault(); nextChapter(-1) } },
  { alt: true, key: 'arrowright', handler: (e) => { e.preventDefault(); nextChapter(1) } },
  { key: 'escape', handler: () => { closeQuickOpen() } }
])

const sashStyle = computed(() => ({
  display: ui.sidebarVisible ? 'block' : 'none'
}))

// Sash drag resize
let dragging = false
let startX = 0
let startW = 0
function onSashMouseDown(e: MouseEvent): void {
  dragging = true
  startX = e.clientX
  startW = ui.sidebarWidth
  document.body.style.cursor = 'col-resize'
  e.preventDefault()
}
function onMouseMove(e: MouseEvent): void {
  if (!dragging) return
  let w = startW + (e.clientX - startX)
  w = Math.max(170, Math.min(560, w))
  ui.sidebarWidth = w
}
function onMouseUp(): void {
  if (!dragging) return
  dragging = false
  document.body.style.cursor = ''
  persist.scheduleSave()
}
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

// Boot: load persisted store
onMounted(async () => {
  const store = await persist.load()
  if (store.books) books.loadFromStore(store)
  if (store.settings) ui.applySettings(store.settings)
  // Restore last reading session
  if (books.books.length) {
    const last = [...books.books].sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0]
    books.expandedBookId = last.id
    if (last.progress && last.progress.chapterIndex != null) {
      await tabs.openChapter(last.id, last.progress.chapterIndex)
    }
  }
})

// Persist on close — use sync IPC so the write finishes before the window closes
window.addEventListener('beforeunload', () => {
  persist.saveSync()
})
</script>

<template>
  <div class="app-root">
    <TitleBar />
    <div id="body">
      <ActivityBar />
      <Sidebar />
      <div id="sash" :style="sashStyle" @mousedown="onSashMouseDown"></div>
      <EditorArea />
    </div>
    <StatusBar />
    <QuickOpen v-model:visible="quickOpenVisible" />
    <ContextMenu />
    <Toast />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>
