<script setup lang="ts">
import { computed } from 'vue'
import { Disguise } from '@renderer/lib/disguise'
import { ICONS, fileTypeIcon } from '@renderer/lib/icons'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { usePersistStore } from '@renderer/stores/persist'

const books = useBooksStore()
const tabs = useTabsStore()
const persist = usePersistStore()

const tabsList = computed(() => tabs.tabs)
const activeIndex = computed(() => tabs.activeTabIndex)

function tabTitle(bookId: string, chapterIndex: number): string {
  const data = books.getCache(bookId)
  const realTitle = data && data.chapters[chapterIndex] ? data.chapters[chapterIndex].title : ''
  return realTitle || Disguise.fakeChapterFilename(chapterIndex, bookId)
}

function fakeName(bookId: string, chapterIndex: number): string {
  return Disguise.fakeChapterFilename(chapterIndex, bookId)
}

async function onTabClick(index: number): Promise<void> {
  tabs.selectTab(index)
  persist.scheduleSave()
}

async function onClose(index: number): Promise<void> {
  tabs.closeTab(index)
  persist.scheduleSave()
}
</script>

<template>
  <div class="tabs">
    <div
      v-for="(t, i) in tabsList"
      :key="i"
      class="tab"
      :class="{ active: i === activeIndex }"
      :title="tabTitle(t.bookId, t.chapterIndex)"
      @click="onTabClick(i)"
    >
      <span class="tab-icon" v-html="fileTypeIcon(fakeName(t.bookId, t.chapterIndex))"></span>
      <span class="tab-label">{{ fakeName(t.bookId, t.chapterIndex) }}</span>
      <span class="tab-close" @click.stop="onClose(i)" v-html="ICONS.close"></span>
    </div>
  </div>
</template>
