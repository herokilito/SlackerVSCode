<script setup lang="ts">
import { computed } from 'vue'
import { Disguise } from '@renderer/lib/disguise'
import { ICONS, fileTypeIcon } from '@renderer/lib/icons'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'

const books = useBooksStore()
const tabs = useTabsStore()

const tab = computed(() => tabs.activeTab)
const book = computed(() => (tab.value ? books.findBook(tab.value.bookId) : undefined))
const data = computed(() => (tab.value ? books.getCache(tab.value.bookId) : undefined))
const realTitle = computed(() => {
  if (!tab.value || !data.value) return ''
  return data.value.chapters[tab.value.chapterIndex]?.title || ''
})
const fakeFilename = computed(() => {
  if (!tab.value) return ''
  return Disguise.fakeChapterFilename(tab.value.chapterIndex, tab.value.bookId)
})
const fakeProj = computed(() => (tab.value ? Disguise.fakeProjectName(tab.value.bookId) : ''))
const projTitle = computed(() => book.value?.title || '')
</script>

<template>
  <div class="breadcrumbs">
    <template v-if="tab">
      <span class="crumb" :title="projTitle">
        <span v-html="ICONS.folder"></span>
        <span>{{ fakeProj }}</span>
      </span>
      <span class="sep">›</span>
      <span class="crumb" :title="realTitle">
        <span v-html="fileTypeIcon(fakeFilename)"></span>
        <span>{{ fakeFilename }}</span>
      </span>
    </template>
  </div>
</template>
