<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Disguise } from '@renderer/lib/disguise'
import { ICONS, fileTypeIcon } from '@renderer/lib/icons'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { useUiStore } from '@renderer/stores/ui'
import { usePersistStore } from '@renderer/stores/persist'
import TabsBar from './TabsBar.vue'
import Breadcrumbs from './Breadcrumbs.vue'

const books = useBooksStore()
const tabs = useTabsStore()
const ui = useUiStore()
const persist = usePersistStore()

const scrollEl = ref<HTMLElement | null>(null)
const editorEl = ref<HTMLElement | null>(null)
const lines = ref<{ kind: 'header' | 'code' | 'comment'; html: string; raw: string }[]>([])

const activeTab = computed(() => tabs.activeTab)

const welcomeHtml = `
  <div class="welcome">
    <div class="welcome-inner">
      <div class="welcome-logo">${ICONS.extensions}</div>
      <h1>Visual Studio Code</h1>
      <p class="welcome-sub">Editing evolved</p>
      <div class="welcome-actions">
        <button class="wa" @click="books.pickAndAddBooks()">Open a Novel…</button>
        <button class="wa">Clone from library…</button>
      </div>
      <p class="welcome-tip">Tip: 按下 Ctrl+P 快速跳转章节 · Alt+←/→ 翻页</p>
    </div>
  </div>`

async function renderChapter(): Promise<void> {
  const t = activeTab.value
  if (!t) {
    lines.value = []
    return
  }
  const book = books.findBook(t.bookId)
  if (!book) return
  const data = await books.ensureBookLoaded(book)
  if (!data) return
  const ch = data.chapters[t.chapterIndex]
  if (!ch) return
  const rawLines = Disguise.buildDisguisedLines(book.id, t.chapterIndex, ch)
  lines.value = rawLines.map((l) => ({
    kind: l.kind,
    raw: l.text,
    html:
      l.kind === 'code'
        ? l.text
          ? Disguise.highlightCode(l.text)
          : '&nbsp;'
        : '<span class="tok-com">' + Disguise.escapeHtml(l.text) + '</span>'
  }))
  // Restore scroll position saved for this specific chapter (0 = top).
  const pct = books.getChapterScroll(book, t.chapterIndex)
  await nextTick()
  if (scrollEl.value) {
    const max = scrollEl.value.scrollHeight - scrollEl.value.clientHeight
    scrollEl.value.scrollTop = Math.max(0, Math.round(max * pct))
  }
}

watch(activeTab, renderChapter, { immediate: true })
watch(() => books.cache, renderChapter)

// Save scroll progress on scroll.
let scrollTimer: ReturnType<typeof setTimeout> | null = null
function onScroll(): void {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const t = activeTab.value
    if (!t || !scrollEl.value) return
    const book = books.findBook(t.bookId)
    if (!book) return
    const max = scrollEl.value.scrollHeight - scrollEl.value.clientHeight
    const pct = max > 0 ? scrollEl.value.scrollTop / max : 0
    books.ensureProgress(book)
    book.progress.chapterIndex = t.chapterIndex
    books.setChapterScroll(book, t.chapterIndex, pct)
    persist.scheduleSave()
  }, 300)
}

const editorClass = computed(() => ({
  'reading-mode': ui.readingMode
}))

const editorStyle = computed(() => ({
  fontSize: ui.fontSize + 'px'
}))

async function openWelcome(): Promise<void> {
  await books.pickAndAddBooks()
  persist.scheduleSave()
}
</script>

<template>
  <div id="editorArea">
    <TabsBar />
    <Breadcrumbs />
    <div v-if="!activeTab" ref="editorEl" class="editor" :class="editorClass" :style="editorStyle">
      <div class="welcome">
        <div class="welcome-inner">
          <div class="welcome-logo" v-html="ICONS.extensions"></div>
          <h1>Visual Studio Code</h1>
          <p class="welcome-sub">Editing evolved</p>
          <div class="welcome-actions">
            <button class="wa" @click="openWelcome">Open a Novel…</button>
            <button class="wa" @click="openWelcome">Clone from library…</button>
          </div>
          <p class="welcome-tip">Tip: 按下 Ctrl+P 快速跳转章节 · Alt+←/→ 翻页</p>
        </div>
      </div>
    </div>
    <div
      v-else
      ref="scrollEl"
      id="editorScroll"
      class="editor-scroll"
      @scroll="onScroll"
    >
      <div ref="editorEl" class="editor" :class="editorClass" :style="editorStyle">
        <div class="novel">
          <div
            v-for="(l, i) in lines"
            :key="i"
            class="novel-line"
            :class="{ 'novel-header': l.kind === 'header', 'novel-comment': l.kind === 'comment', empty: l.kind === 'code' && l.raw === '' }"
          >
            <span class="ln">{{ i + 1 }}</span>
            <span class="tx" v-html="l.html"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
