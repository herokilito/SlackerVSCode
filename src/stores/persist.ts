import { defineStore } from 'pinia'
import { useBooksStore } from './books'
import { useUiStore } from './ui'
import type { AppStore, AppSettings } from '@renderer/types'

export const usePersistStore = defineStore('persist', () => {
  let timer: ReturnType<typeof setTimeout> | null = null

  function buildStore(): AppStore {
    const books = useBooksStore()
    const ui = useUiStore()
    const settings: AppSettings = {
      fontSize: ui.fontSize,
      sidebarWidth: ui.sidebarWidth,
      sidebarVisible: ui.sidebarVisible,
      readingMode: ui.readingMode
    }
    return { books: books.books, settings }
  }

  async function save(): Promise<void> {
    const store = buildStore()
    await window.api.store.save(store)
  }

  /** Synchronous save — blocks the renderer until the file is written.
   *  Use in beforeunload so the window can't close before saving finishes. */
  function saveSync(): void {
    const store = buildStore()
    window.api.store.saveSync(store)
  }

  function scheduleSave(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(save, 400)
  }

  async function load(): Promise<AppStore> {
    return await window.api.store.load()
  }

  return { save, saveSync, scheduleSave, load }
})
