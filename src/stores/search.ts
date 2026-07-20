import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SearchGroup } from '@renderer/types'
import { useBooksStore } from './books'
import { useTabsStore } from './tabs'

export interface SearchResultGroup extends SearchGroup {
  _counter?: number
}

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const groups = ref<SearchResultGroup[]>([])
  const totalMatches = ref(0)
  const detailText = ref('搜索当前打开的小说')
  const running = ref(false)

  // cancellation token for stale searches
  let token = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const countText = computed(() => (totalMatches.value > 0 ? String(totalMatches.value) : ''))

  function scheduleRun(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, 200)
  }

  async function run(): Promise<void> {
    const q = query.value.trim()
    if (!q) {
      groups.value = []
      totalMatches.value = 0
      detailText.value = '搜索当前打开的小说'
      return
    }
    const books = useBooksStore()
    const tabs = useTabsStore()
    const book =
      books.findBook(tabs.activeBookId) ||
      (tabs.activeTab && books.findBook(tabs.activeTab.bookId))
    if (!book) {
      groups.value = []
      totalMatches.value = 0
      detailText.value = '无打开的小说'
      return
    }
    const data = await books.ensureBookLoaded(book)
    if (!data) return
    const myToken = ++token
    const ql = q.toLowerCase()
    const out: SearchResultGroup[] = []
    let total = 0
    for (let i = 0; i < data.chapters.length; i++) {
      const ch = data.chapters[i]
      const paras = ch.content.split('\n').map((l) => l.trim()).filter(Boolean)
      const matches: { para: string; idx: number }[] = []
      for (const p of paras) {
        const lower = p.toLowerCase()
        let pos = lower.indexOf(ql)
        while (pos >= 0) {
          matches.push({ para: p, idx: pos })
          pos = lower.indexOf(ql, pos + ql.length)
        }
      }
      if (matches.length) {
        out.push({ chapterIndex: i, matches })
        total += matches.length
      }
      if (total > 2000) break
    }
    // bail if a newer search superseded us
    if (myToken !== token) return
    groups.value = out
    totalMatches.value = total
    detailText.value =
      total > 0 ? `${total} 个结果 · ${out.length} 章` : '无结果'
  }

  function reset(): void {
    query.value = ''
    groups.value = []
    totalMatches.value = 0
    detailText.value = '搜索当前打开的小说'
  }

  return {
    query,
    groups,
    totalMatches,
    detailText,
    running,
    countText,
    scheduleRun,
    run,
    reset
  }
})
