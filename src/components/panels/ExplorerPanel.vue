<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@renderer/lib/icons'
import { Disguise } from '@renderer/lib/disguise'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { useUiStore } from '@renderer/stores/ui'
import { usePersistStore } from '@renderer/stores/persist'
import ChapterTree from './ChapterTree.vue'

const books = useBooksStore()
const tabs = useTabsStore()
const ui = useUiStore()
const persist = usePersistStore()

const CHAPTERS_PER_DIR = 20

const sortedBooks = computed(() => books.sortedBooks)

function bookProgressPct(bookId: string, chapterIndex: number, chapterCount: number): number {
  if (!chapterCount) return 0
  return Math.round(((chapterIndex || 0) / chapterCount) * 100)
}

function onBookClick(bookId: string): void {
  books.toggleBookExpanded(bookId)
}

function onRemoveBook(e: MouseEvent, bookId: string): void {
  e.stopPropagation()
  books.removeBook(bookId)
  tabs.closeTabsForBook(bookId)
  persist.scheduleSave()
}

async function onAddBooks(): Promise<void> {
  await books.pickAndAddBooks()
  persist.scheduleSave()
}

function onRefresh(): void {
  books.clearCache()
  ui.showToast('已刷新书架')
}
</script>

<template>
  <div class="sb-panel">
    <div class="sb-header">
      <span>EXPLORER</span>
      <span class="sb-actions">
        <span class="icon-btn" title="打开小说" @click="onAddBooks" v-html="ICONS.add"></span>
        <span class="icon-btn" title="刷新" @click="onRefresh" v-html="ICONS.refresh"></span>
      </span>
    </div>
    <div class="sb-section-label">WORKSPACE</div>
    <div class="bookshelf">
      <template v-if="sortedBooks.length === 0">
        <div class="empty-state">
          书架为空<br />添加本地 txt 小说开始摸鱼
        </div>
        <button class="add-book-btn" @click="onAddBooks">
          <span v-html="ICONS.add"></span>
          <span>打开小说…</span>
        </button>
      </template>
      <template v-else>
        <template v-for="b in sortedBooks" :key="b.id">
          <div
            class="tree-item book-row"
            :class="{ active: books.expandedBookId === b.id }"
            @click="onBookClick(b.id)"
          >
            <span class="chevron" v-html="books.expandedBookId === b.id ? ICONS.chevronDown : ICONS.chevronRight"></span>
            <span class="ti-icon" v-html="books.expandedBookId === b.id ? ICONS.folderOpen : ICONS.folder"></span>
            <span class="ti-label" :title="b.title">{{ Disguise.fakeProjectName(b.id) }}</span>
            <span class="ti-progress">{{ bookProgressPct(b.id, b.progress.chapterIndex, b.chapterCount || 0) }}%</span>
            <span class="ti-del" title="移除" @click="(e) => onRemoveBook(e, b.id)" v-html="ICONS.close"></span>
          </div>
          <ChapterTree
            v-if="books.expandedBookId === b.id"
            :book-id="b.id"
            :chapters-per-dir="CHAPTERS_PER_DIR"
          />
        </template>
      </template>
    </div>
  </div>
</template>
