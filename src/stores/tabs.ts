import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Tab } from '@renderer/types'
import { useBooksStore } from './books'

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeTabIndex = ref(-1)

  const activeTab = computed<Tab | null>(() => {
    if (activeTabIndex.value < 0 || activeTabIndex.value >= tabs.value.length) return null
    return tabs.value[activeTabIndex.value]
  })

  const activeBookId = computed<string | null>(() => activeTab.value?.bookId ?? null)
  const activeChapterIndex = computed<number>(() => activeTab.value?.chapterIndex ?? -1)

  async function openChapter(bookId: string, chapterIndex: number): Promise<void> {
    const existing = tabs.value.findIndex(
      (t) => t.bookId === bookId && t.chapterIndex === chapterIndex
    )
    if (existing >= 0) {
      selectTab(existing)
      return
    }
    // Replace the current tab if it belongs to the same book (navigate in place, like VS Code preview)
    const sameBookIdx = tabs.value.findIndex(
      (t, i) => i === activeTabIndex.value && t.bookId === bookId
    )
    if (sameBookIdx >= 0) {
      tabs.value[sameBookIdx] = { bookId, chapterIndex }
      activeTabIndex.value = sameBookIdx
    } else {
      tabs.value.push({ bookId, chapterIndex })
      activeTabIndex.value = tabs.value.length - 1
    }
    const books = useBooksStore()
    const book = books.findBook(bookId)
    if (book) {
      book.lastReadAt = Date.now()
      books.ensureProgress(book)
      book.progress.chapterIndex = chapterIndex
    }
  }

  function selectTab(index: number): void {
    if (index < 0 || index >= tabs.value.length) return
    activeTabIndex.value = index
  }

  function closeTab(index: number): void {
    tabs.value.splice(index, 1)
    if (activeTabIndex.value >= tabs.value.length) {
      activeTabIndex.value = tabs.value.length - 1
    }
  }

  function closeTabsForBook(bookId: string): void {
    tabs.value = tabs.value.filter((t) => t.bookId !== bookId)
    if (activeTabIndex.value >= tabs.value.length) {
      activeTabIndex.value = tabs.value.length - 1
    }
  }

  return {
    tabs,
    activeTabIndex,
    activeTab,
    activeBookId,
    activeChapterIndex,
    openChapter,
    selectTab,
    closeTab,
    closeTabsForBook
  }
})
