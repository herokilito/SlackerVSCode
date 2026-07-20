<script setup lang="ts">
import { ref } from 'vue'
import { ICONS } from '@renderer/lib/icons'
import { useSearchStore } from '@renderer/stores/search'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { usePersistStore } from '@renderer/stores/persist'
import { Disguise, escapeHtml } from '@renderer/lib/disguise'
import { fileTypeIcon } from '@renderer/lib/icons'

const search = useSearchStore()
const books = useBooksStore()
const tabs = useTabsStore()
const persist = usePersistStore()

const inputEl = ref<HTMLInputElement | null>(null)

function onInput(e: Event): void {
  search.query = (e.target as HTMLInputElement).value
  search.scheduleRun()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    search.reset()
    inputEl.value?.blur()
  } else if (e.key === 'Enter') {
    jumpToFirstResult()
  }
}

function jumpToFirstResult(): void {
  const first = search.groups[0]
  if (first) onJump(first.chapterIndex)
}

function makePreview(text: string, idx: number, qlen: number): string {
  const start = Math.max(0, idx - 12)
  const end = Math.min(text.length, idx + qlen + 20)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  const before = escapeHtml(text.slice(start, idx))
  const match = escapeHtml(text.slice(idx, idx + qlen))
  const after = escapeHtml(text.slice(idx + qlen, end))
  return prefix + before + '<mark>' + match + '</mark>' + after + suffix
}

async function onJump(chapterIndex: number): Promise<void> {
  const book =
    books.findBook(tabs.activeBookId) ||
    (tabs.activeTab && books.findBook(tabs.activeTab.bookId))
  if (!book) return
  await tabs.openChapter(book.id, chapterIndex)
  persist.scheduleSave()
  const q = search.query.trim()
  if (q) {
    setTimeout(() => scrollToMatch(q), 100)
  }
}

function scrollToMatch(q: string): void {
  const ql = q.toLowerCase()
  const editorEl = document.getElementById('editor')
  if (!editorEl) return
  const lines = Array.from(editorEl.querySelectorAll<HTMLElement>('.novel-line .tx'))
  for (const ln of lines) {
    if (ln.textContent && ln.textContent.toLowerCase().includes(ql)) {
      const scroll = document.getElementById('editorScroll')
      if (scroll) {
        const rect = ln.getBoundingClientRect()
        const containerRect = scroll.getBoundingClientRect()
        scroll.scrollTop += rect.top - containerRect.top - 80
      }
      ln.style.transition = 'background .3s'
      ln.style.background = 'rgba(255, 215, 0, .18)'
      setTimeout(() => {
        ln.style.background = ''
      }, 1200)
      break
    }
  }
}
</script>

<template>
  <div class="sb-panel">
    <div class="sb-header">
      <span>SEARCH</span>
    </div>
    <div class="search-body">
      <div class="search-input-wrap">
        <div class="search-input-row">
          <span class="search-icon" v-html="ICONS.search"></span>
          <input
            ref="inputEl"
            :value="search.query"
            class="search-input"
            placeholder="搜索当前小说"
            autocomplete="off"
            @input="onInput"
            @keydown="onKeydown"
          />
          <span class="search-count">{{ search.countText }}</span>
        </div>
        <div class="search-sub">
          <span class="search-detail">{{ search.detailText }}</span>
        </div>
      </div>
      <div class="search-results">
        <div
          v-if="search.query.trim() && search.groups.length === 0 && search.detailText === '无结果'"
          class="sr-empty"
        >
          无匹配结果
        </div>
        <div
          v-for="g in search.groups"
          :key="g.chapterIndex"
          class="sr-group"
        >
          <div
            class="sr-file"
            @click="onJump(g.chapterIndex)"
            :title="books.getCache(tabs.activeBookId || '')?.chapters[g.chapterIndex]?.title || ''"
          >
            <span class="sr-file-icon" v-html="fileTypeIcon(Disguise.fakeChapterFilename(g.chapterIndex, tabs.activeBookId || ''))"></span>
            <span class="sr-file-name">{{ Disguise.fakeChapterFilename(g.chapterIndex, tabs.activeBookId || '') }}</span>
            <span class="sr-file-count">{{ g.matches.length }}</span>
          </div>
          <div
            v-for="(m, k) in g.matches.slice(0, 3)"
            :key="k"
            class="sr-item"
            @click="onJump(g.chapterIndex)"
            v-html="makePreview(m.para, m.idx, search.query.trim().length)"
          ></div>
          <div
            v-if="g.matches.length > 3"
            class="sr-item"
            style="color:#666"
            @click="onJump(g.chapterIndex)"
          >
            …还有 {{ g.matches.length - 3 }} 处匹配
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
