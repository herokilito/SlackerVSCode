<script setup lang="ts">
import { ref } from 'vue'
import { ICONS } from '@renderer/lib/icons'
import { useUiStore } from '@renderer/stores/ui'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { usePersistStore } from '@renderer/stores/persist'

const ui = useUiStore()
const books = useBooksStore()
const tabs = useTabsStore()
const persist = usePersistStore()

const logoSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path fill="#0e7fd6" d="M75 8 L92 16 L92 84 L75 92 L40 60 L18 78 L10 72 L30 50 L10 28 L18 22 L40 40 Z"/>
  <path fill="#fff" d="M75 24 L52 44 L62 50 L75 60 Z" opacity=".9"/>
</svg>`

interface MenuItem {
  label: string
  shortcut?: string
  disabled?: boolean
  sep?: boolean
  act?: string
  check?: () => boolean
}

interface Menu {
  label: string
  items: MenuItem[]
}

const MENUS: Menu[] = [
  {
    label: 'File',
    items: [
      { label: 'New Text File', shortcut: 'Ctrl+N', disabled: true },
      { label: 'New File...', shortcut: 'Ctrl+Alt+N', disabled: true },
      { label: 'Open File...', shortcut: 'Ctrl+O', act: 'open' },
      { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', disabled: true },
      { sep: true },
      { label: 'Auto Save', disabled: true },
      { sep: true },
      { label: 'Exit', act: 'exit' }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
      { label: 'Redo', shortcut: 'Ctrl+Y', disabled: true },
      { sep: true },
      { label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
      { label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
      { label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
      { sep: true },
      { label: 'Find', shortcut: 'Ctrl+F', act: 'find' }
    ]
  },
  {
    label: 'Selection',
    items: [
      { label: 'Select All', shortcut: 'Ctrl+A', disabled: true },
      { label: 'Expand Selection', shortcut: 'Shift+Alt+→', disabled: true }
    ]
  },
  {
    label: 'View',
    items: [
      { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', act: 'palette' },
      { sep: true },
      { label: 'Toggle Side Bar', shortcut: 'Ctrl+B', act: 'toggleSidebar' },
      { label: 'Reading Mode', act: 'toggleReading', check: () => ui.readingMode },
      { sep: true },
      { label: 'Zoom In', shortcut: 'Ctrl+=', act: 'zoomIn' },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', act: 'zoomOut' },
      { label: 'Reset Zoom', shortcut: 'Ctrl+0', act: 'zoomReset' }
    ]
  },
  {
    label: 'Go',
    items: [
      { label: 'Back', shortcut: 'Alt+←', act: 'prev' },
      { label: 'Forward', shortcut: 'Alt+→', act: 'next' },
      { sep: true },
      { label: 'Go to Chapter...', shortcut: 'Ctrl+P', act: 'quickOpen' }
    ]
  },
  { label: 'Run', items: [{ label: 'Start Debugging', shortcut: 'F5', disabled: true }] },
  { label: 'Terminal', items: [{ label: 'New Terminal', shortcut: 'Ctrl+`', disabled: true }] },
  {
    label: 'Help',
    items: [
      { label: 'Welcome', act: 'welcome' },
      { sep: true },
      { label: 'About', act: 'about' }
    ]
  }
]

const openMenuIndex = ref<number | null>(null)

function toggleMenu(i: number, anchor: HTMLElement): void {
  closeMenus()
  openMenuIndex.value = i
  const dd = document.createElement('div')
  dd.className = 'menu-dropdown'
  const rect = anchor.getBoundingClientRect()
  dd.style.left = rect.left + 'px'
  dd.style.top = rect.bottom + 'px'
  const m = MENUS[i]
  m.items.forEach((it) => {
    if (it.sep) {
      const s = document.createElement('div')
      s.className = 'menu-sep'
      dd.appendChild(s)
      return
    }
    const row = document.createElement('div')
    row.className = 'menu-row' + (it.disabled ? ' disabled' : '')
    if (it.check && it.check()) row.classList.add('checked')
    row.innerHTML = `<span>${it.label}</span>${it.shortcut ? `<span class="shortcut">${it.shortcut}</span>` : ''}`
    if (!it.disabled && it.act) {
      row.addEventListener('click', () => {
        closeMenus()
        handleMenuAct(it.act!)
      })
    }
    dd.appendChild(row)
  })
  const layer = document.getElementById('menuLayer')
  if (layer) {
    layer.classList.remove('hidden')
    layer.appendChild(dd)
  }
}

function closeMenus(): void {
  openMenuIndex.value = null
  const layer = document.getElementById('menuLayer')
  if (layer) {
    layer.classList.add('hidden')
    layer.innerHTML = ''
  }
}

async function handleMenuAct(act: string): Promise<void> {
  switch (act) {
    case 'open':
      await books.pickAndAddBooks()
      persist.scheduleSave()
      break
    case 'exit':
      window.close()
      break
    case 'find':
      ui.setSidebarPanel('search')
      break
    case 'palette':
      ui.showToast('摸鱼模式下命令面板已禁用 :)')
      break
    case 'toggleSidebar':
      ui.toggleSidebar()
      persist.scheduleSave()
      break
    case 'toggleReading':
      ui.toggleReadingMode()
      persist.scheduleSave()
      ui.showToast(ui.readingMode ? '阅读模式' : '代码模式')
      break
    case 'zoomIn':
      ui.zoom(1)
      persist.scheduleSave()
      break
    case 'zoomOut':
      ui.zoom(-1)
      persist.scheduleSave()
      break
    case 'zoomReset':
      ui.resetZoom()
      persist.scheduleSave()
      break
    case 'prev':
      nextChapter(-1)
      break
    case 'next':
      nextChapter(1)
      break
    case 'quickOpen':
      ui.showToast('按 Ctrl+P 跳转章节')
      break
    case 'welcome':
      tabs.closeTab(tabs.activeTabIndex.value)
      break
    case 'about':
      ui.showToast('SlackerVSCode 1.0 — 仅供摸鱼使用')
      break
  }
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

function onMenuClick(e: MouseEvent, i: number, anchor: HTMLElement): void {
  e.stopPropagation()
  toggleMenu(i, anchor)
}

function onMenuEnter(i: number, anchor: HTMLElement): void {
  if (openMenuIndex.value !== null && openMenuIndex.value !== i) {
    toggleMenu(i, anchor)
  }
}

// Window controls — must be in script (template can't access global `window`)
function onMinimize(): void {
  window.api.window.minimize()
}
function onMaximize(): void {
  window.api.window.maximize()
}
function onCloseWindow(): void {
  window.api.window.close()
}

// close on outside click
document.addEventListener('click', closeMenus)
</script>

<template>
  <div id="titlebar">
    <div class="tb-left">
      <span class="tb-logo" v-html="logoSvg"></span>
      <span class="tb-title">Visual Studio Code</span>
      <nav id="menubar" class="menubar">
        <div
          v-for="(m, i) in MENUS"
          :key="i"
          class="menu-item"
          :class="{ open: openMenuIndex === i }"
          @click="(e) => onMenuClick(e, i, $event.currentTarget as HTMLElement)"
          @mouseenter="(e) => onMenuEnter(i, $event.currentTarget as HTMLElement)"
        >
          {{ m.label }}
        </div>
      </nav>
    </div>
    <div class="tb-center"></div>
    <div class="tb-right">
      <div class="win-controls">
        <button class="wc wc-min" title="Minimize" @click="onMinimize"></button>
        <button class="wc wc-max" title="Maximize" @click="onMaximize"></button>
        <button class="wc wc-close" title="Close" @click="onCloseWindow"></button>
      </div>
    </div>
  </div>
  <div id="menuLayer" class="menu-layer hidden"></div>
</template>
