/** Shared types for the renderer layer. */

export interface Chapter {
  title: string
  content: string
}

export interface BookCacheEntry {
  chapters: Chapter[]
  encoding: string
  mtime: number
  title: string
}

export interface BookRecord {
  id: string
  title: string
  filePath: string
  addedAt: number
  lastReadAt: number
  encoding?: string
  size?: number
  mtime?: number
  chapterCount?: number
  progress: {
    chapterIndex: number
    scrollByChapter?: Record<string, number>
  }
}

export interface AppSettings {
  fontSize?: number
  sidebarWidth?: number
  sidebarVisible?: boolean
  readingMode?: boolean
}

export interface AppStore {
  books: BookRecord[]
  settings: AppSettings
}

export interface Tab {
  bookId: string
  chapterIndex: number
}

export interface BookReadResult {
  ok: boolean
  text?: string
  encoding?: string
  size?: number
  mtime?: number
  error?: string
}

export type SidebarPanel = 'explorer' | 'search'

export interface SearchMatch {
  para: string
  idx: number
}

export interface SearchGroup {
  chapterIndex: number
  matches: SearchMatch[]
}

export interface DisguiseLine {
  kind: 'header' | 'code' | 'comment'
  text: string
}

export interface ElectronAPI {
  store: {
    load: () => Promise<AppStore>
    save: (data: AppStore) => Promise<boolean>
    saveSync: (data: AppStore) => boolean
  }
  dialog: {
    openBook: () => Promise<string[] | null>
  }
  book: {
    read: (filePath: string) => Promise<BookReadResult>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<boolean>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  shell: {
    openExternal: (url: string) => Promise<boolean>
  }
}
