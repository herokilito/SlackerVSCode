<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

let lastSelectedText = ''

function getSelectionText(): string {
  const sel = window.getSelection()
  return sel ? sel.toString().trim() : ''
}

const visible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const queryDisplay = ref('')

function hide(): void {
  visible.value = false
}

function show(x: number, y: number, text: string): void {
  queryDisplay.value = text.length > 28 ? text.slice(0, 28) + '…' : text
  visible.value = true
  // After visible toggle, position the menu and adjust for overflow.
  requestAnimationFrame(() => {
    const menu = document.getElementById('contextMenu')
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = x
    let top = y
    if (left + rect.width > vw - 4) left = Math.max(4, vw - rect.width - 4)
    if (top + rect.height > vh - 4) top = Math.max(4, vh - rect.height - 4)
    menuX.value = left
    menuY.value = top
  })
  // initial position to avoid flicker
  menuX.value = x
  menuY.value = y
}

function onContextMenu(e: MouseEvent): void {
  const text = getSelectionText()
  if (!text) return
  // Only inside the editor area
  const editorArea = document.getElementById('editorArea')
  if (!editorArea || !editorArea.contains(e.target as Node)) return
  e.preventDefault()
  lastSelectedText = text
  show(e.clientX, e.clientY, text)
}

function onCopy(): void {
  const text = getSelectionText() || lastSelectedText
  hide()
  if (!text) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch (_) {
      /* ignore */
    }
    ta.remove()
  }
}

function onSearchWeb(): void {
  const text = getSelectionText() || lastSelectedText
  hide()
  if (!text) return
  const url = 'https://www.bing.com/search?q=' + encodeURIComponent(text)
  window.api.shell.openExternal(url).then((ok) => {
    if (!ok) {
      /* silent fail; could toast */
    }
  })
}

function onDocClick(e: MouseEvent): void {
  if (!visible.value) return
  const menu = document.getElementById('contextMenu')
  if (menu && !menu.contains(e.target as Node)) hide()
}

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu, true)
  document.addEventListener('click', onDocClick)
  document.addEventListener('scroll', hide, true)
})
onUnmounted(() => {
  document.removeEventListener('contextmenu', onContextMenu, true)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('scroll', hide, true)
})
</script>

<template>
  <div
    v-if="visible"
    id="contextMenu"
    class="context-menu"
    :style="{ left: menuX + 'px', top: menuY + 'px' }"
  >
    <div class="menu-row" @click="onCopy">复制</div>
    <div class="menu-sep"></div>
    <div class="menu-row search-row" @click="onSearchWeb">
      在 Web 中搜索 “<span id="cmQuery">{{ queryDisplay }}</span>”
    </div>
  </div>
</template>
