<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@renderer/lib/icons'
import { Disguise } from '@renderer/lib/disguise'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'

const books = useBooksStore()
const tabs = useTabsStore()

const tab = computed(() => tabs.activeTab)
const book = computed(() => (tab.value ? books.findBook(tab.value.bookId) : undefined))
const data = computed(() => (tab.value ? books.getCache(tab.value.bookId) : undefined))

const totalChapters = computed(() => data.value?.chapters.length || 0)
const currentIdx = computed(() => (tab.value ? tab.value.chapterIndex + 1 : 0))
const lineCount = computed(() => {
  if (!tab.value || !data.value) return 0
  const ch = data.value.chapters[tab.value.chapterIndex]
  return ch ? ch.content.split('\n').length : 0
})
const lang = computed(() => {
  if (!tab.value) return 'Plain Text'
  const fakeName = Disguise.fakeChapterFilename(tab.value.chapterIndex, tab.value.bookId)
  const ext = fakeName.split('.').pop()
  const langMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript JSX',
    js: 'JavaScript',
    jsx: 'JavaScript JSX',
    vue: 'Vue',
    svelte: 'Svelte'
  }
  return langMap[ext || ''] || 'Plain Text'
})
const encoding = computed(() => book.value?.encoding || 'UTF-8')
</script>

<template>
  <div id="statusbar">
    <div class="sb-left">
      <span class="sb-item">
        <span v-html="ICONS.check"></span>
        <span>主分支 master</span>
      </span>
      <template v-if="tab">
        <span class="sb-item">
          <span v-html="ICONS.error"></span>
          <span>0</span>
        </span>
        <span class="sb-item">{{ currentIdx }}/{{ totalChapters }}</span>
      </template>
    </div>
    <div class="sb-right">
      <template v-if="tab">
        <span class="sb-item">{{ encoding }}</span>
        <span class="sb-item">Lines: {{ lineCount }}</span>
        <span class="sb-item">{{ lang }}</span>
      </template>
      <template v-else>
        <span class="sb-item">Ln 1, Col 1</span>
        <span class="sb-item">UTF-8</span>
      </template>
    </div>
  </div>
</template>
