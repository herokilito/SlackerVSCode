import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { BookCacheEntry, BookRecord, AppStore } from '@renderer/types'
import { parseChapters } from '@renderer/lib/chapter'
import { useUiStore } from './ui'

const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const pathBasename = (p: string): string => p.split(/[\\/]/).pop()!

export const useBooksStore = defineStore('books', () => {
  const books = ref<BookRecord[]>([])
  // In-memory chapter cache (shallowRef to avoid deep reactivity on big arrays)
  const cache = shallowRef<Map<string, BookCacheEntry>>(new Map())
  // Book whose tree is currently expanded in the sidebar
  const expandedBookId = ref<string | null>(null)
  // Expanded subdirectory groups: Set of "bookId:groupIdx"
  const expandedDirs = ref<Set<string>>(new Set())

  const sortedBooks = computed(() =>
    [...books.value].sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))
  )

  function ensureProgress(book: BookRecord): void {
    if (!book.progress) {
      book.progress = { chapterIndex: 0, scrollByChapter: {} }
    }
    if (!book.progress.scrollByChapter) {
      book.progress.scrollByChapter = {}
    }
  }

  function getChapterScroll(book: BookRecord, chapterIndex: number): number {
    ensureProgress(book)
    return book.progress.scrollByChapter![String(chapterIndex)] || 0
  }

  function setChapterScroll(book: BookRecord, chapterIndex: number, pct: number): void {
    ensureProgress(book)
    book.progress.scrollByChapter![String(chapterIndex)] = pct
  }

  async function ensureBookLoaded(book: BookRecord): Promise<BookCacheEntry | null> {
    const map = cache.value
    if (map.has(book.id)) return map.get(book.id)!
    const res = await window.api.book.read(book.filePath)
    if (!res || !res.ok) {
      useUiStore().showToast('读取失败')
      return null
    }
    const chapters = parseChapters(res.text!)
    const entry: BookCacheEntry = {
      chapters,
      encoding: res.encoding!,
      mtime: res.mtime!,
      title: book.title
    }
    map.set(book.id, entry)
    cache.value = new Map(map)
    book.chapterCount = chapters.length
    book.encoding = res.encoding
    book.mtime = res.mtime
    return entry
  }

  async function pickAndAddBooks(): Promise<void> {
    const paths = await window.api.dialog.openBook()
    if (!paths || !paths.length) return
    let added = 0
    for (const p of paths) {
      if (books.value.some((b) => b.filePath === p)) {
        useUiStore().showToast('已在书架中: ' + pathBasename(p))
        continue
      }
      const res = await window.api.book.read(p)
      if (!res || !res.ok) {
        useUiStore().showToast('打开失败: ' + p)
        continue
      }
      const chapters = parseChapters(res.text!)
      const id = uid()
      const book: BookRecord = {
        id,
        title: pathBasename(p).replace(/\.txt$/i, ''),
        filePath: p,
        addedAt: Date.now(),
        lastReadAt: Date.now(),
        encoding: res.encoding,
        size: res.size,
        mtime: res.mtime,
        progress: { chapterIndex: 0, scrollByChapter: {} },
        chapterCount: chapters.length
      }
      books.value.push(book)
      const map = cache.value
      map.set(id, {
        chapters,
        encoding: res.encoding!,
        mtime: res.mtime!,
        title: book.title
      })
      cache.value = new Map(map)
      added++
    }
    if (added) {
      useUiStore().showToast('已添加 ' + added + ' 本小说')
    }
  }

  function removeBook(id: string): void {
    const idx = books.value.findIndex((b) => b.id === id)
    if (idx < 0) return
    books.value.splice(idx, 1)
    const map = cache.value
    map.delete(id)
    cache.value = new Map(map)
    if (expandedBookId.value === id) expandedBookId.value = null
  }

  function clearCache(): void {
    cache.value = new Map()
  }

  function toggleBookExpanded(id: string): void {
    if (expandedBookId.value === id) expandedBookId.value = null
    else expandedBookId.value = id
  }

  function toggleDirExpanded(key: string): void {
    const s = new Set(expandedDirs.value)
    if (s.has(key)) s.delete(key)
    else s.add(key)
    expandedDirs.value = s
  }

  function ensureDirExpanded(key: string): void {
    if (!expandedDirs.value.has(key)) {
      const s = new Set(expandedDirs.value)
      s.add(key)
      expandedDirs.value = s
    }
  }

  function findBook(id: string | null): BookRecord | undefined {
    if (!id) return undefined
    return books.value.find((b) => b.id === id)
  }

  function getCache(id: string): BookCacheEntry | undefined {
    return cache.value.get(id)
  }

  function loadFromStore(store: AppStore): void {
    books.value = store.books || []
  }

  function buildPersistableStore(): AppStore {
    return {
      books: books.value,
      settings: {
        // Settings come from the ui store; merged at the App level.
      }
    }
  }

  return {
    books,
    cache,
    expandedBookId,
    expandedDirs,
    sortedBooks,
    ensureProgress,
    getChapterScroll,
    setChapterScroll,
    ensureBookLoaded,
    pickAndAddBooks,
    removeBook,
    clearCache,
    toggleBookExpanded,
    toggleDirExpanded,
    ensureDirExpanded,
    findBook,
    getCache,
    loadFromStore,
    buildPersistableStore
  }
})
