<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Disguise } from '@renderer/lib/disguise'
import { ICONS, fileTypeIcon } from '@renderer/lib/icons'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { usePersistStore } from '@renderer/stores/persist'

const props = defineProps<{
  bookId: string
  chaptersPerDir: number
}>()

const books = useBooksStore()
const tabs = useTabsStore()
const persist = usePersistStore()

const loaded = ref(false)

const book = computed(() => books.findBook(props.bookId))
const cache = computed(() => books.getCache(props.bookId))
const chapters = computed(() => cache.value?.chapters || [])

async function ensureLoaded(): Promise<void> {
  if (!book.value) return
  if (!cache.value) {
    await books.ensureBookLoaded(book.value)
  }
  loaded.value = true
}

onMounted(ensureLoaded)
watch(() => props.bookId, ensureLoaded)

// Auto-expand the group containing the active chapter.
function ensureActiveGroupExpanded(): void {
  const at = tabs.activeTab
  if (!at || at.bookId !== props.bookId) return
  const groupIdx = Math.floor(at.chapterIndex / props.chaptersPerDir)
  books.ensureDirExpanded(props.bookId + ':' + groupIdx)
}

function isDirExpanded(groupIdx: number): boolean {
  const key = props.bookId + ':' + groupIdx
  return books.expandedDirs.has(key) || isDirContainingActive(groupIdx)
}

function isDirContainingActive(groupIdx: number): boolean {
  const at = tabs.activeTab
  if (!at || at.bookId !== props.bookId) return false
  const start = groupIdx * props.chaptersPerDir
  const end = start + props.chaptersPerDir
  return at.chapterIndex >= start && at.chapterIndex < end
}

function onDirClick(groupIdx: number): void {
  books.toggleDirExpanded(props.bookId + ':' + groupIdx)
}

function isChapterActive(chapterIndex: number): boolean {
  const at = tabs.activeTab
  return !!at && at.bookId === props.bookId && at.chapterIndex === chapterIndex
}

function isChapterRead(chapterIndex: number): boolean {
  if (!book.value?.progress) return false
  return chapterIndex < (book.value.progress.chapterIndex || 0)
}

async function onChapterClick(chapterIndex: number): Promise<void> {
  await tabs.openChapter(props.bookId, chapterIndex)
  persist.scheduleSave()
}

const groupCount = computed(() => Math.ceil(chapters.value.length / props.chaptersPerDir))
</script>

<template>
  <div class="tree-children">
    <template v-if="!loaded">
      <div class="empty-state" style="padding: 4px 20px;">加载中…</div>
    </template>
    <template v-else-if="groupCount <= 1">
      <div
        v-for="(ch, i) in chapters"
        :key="i"
        class="tree-item chapter-row"
        :class="{ active: isChapterActive(i) }"
        @click="onChapterClick(i)"
      >
        <span class="ti-spacer"></span>
        <span class="ti-icon" v-html="fileTypeIcon(Disguise.fakeChapterFilename(i, props.bookId))"></span>
        <span class="ti-label" :class="{ read: isChapterRead(i) }" :title="ch.title">{{ Disguise.fakeChapterFilename(i, props.bookId) }}</span>
      </div>
    </template>
    <template v-else>
      <template v-for="g in groupCount" :key="g">
        <div
          class="tree-item dir-row"
          @click="onDirClick(g - 1)"
        >
          <span class="chevron" v-html="isDirExpanded(g - 1) ? ICONS.chevronDown : ICONS.chevronRight"></span>
          <span class="ti-icon" v-html="isDirExpanded(g - 1) ? ICONS.folderOpen : ICONS.folder"></span>
          <span class="ti-label">{{ Disguise.fakeDirName(props.bookId, g - 1) }}</span>
        </div>
        <div v-if="isDirExpanded(g - 1)" class="tree-children">
          <div
            v-for="i in Math.min(props.chaptersPerDir, chapters.length - (g - 1) * props.chaptersPerDir)"
            :key="i"
            class="tree-item chapter-row"
            :class="{ active: isChapterActive((g - 1) * props.chaptersPerDir + i - 1) }"
            @click="onChapterClick((g - 1) * props.chaptersPerDir + i - 1)"
          >
            <span class="ti-spacer"></span>
            <span class="ti-icon" v-html="fileTypeIcon(Disguise.fakeChapterFilename((g - 1) * props.chaptersPerDir + i - 1, props.bookId))"></span>
            <span class="ti-label" :class="{ read: isChapterRead((g - 1) * props.chaptersPerDir + i - 1) }" :title="chapters[(g - 1) * props.chaptersPerDir + i - 1].title">{{ Disguise.fakeChapterFilename((g - 1) * props.chaptersPerDir + i - 1, props.bookId) }}</span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
