<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Disguise } from '@renderer/lib/disguise'
import { ICONS } from '@renderer/lib/icons'
import { useBooksStore } from '@renderer/stores/books'
import { useTabsStore } from '@renderer/stores/tabs'
import { usePersistStore } from '@renderer/stores/persist'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()

const books = useBooksStore()
const tabs = useTabsStore()
const persist = usePersistStore()

const inputEl = ref<HTMLInputElement | null>(null)
const filter = ref('')
const selectedIndex = ref(0)

const activeBook = computed(() => {
  return books.findBook(tabs.activeBookId) || books.sortedBooks[0]
})

interface ChapterItem {
  i: number
  title: string
  fake: string
}

const filteredItems = computed<ChapterItem[]>(() => {
  if (!activeBook.value) return []
  const cache = books.getCache(activeBook.value.id)
  if (!cache) return []
  const f = filter.value.trim().toLowerCase()
  const all: ChapterItem[] = cache.chapters.map((c, i) => ({
    i,
    title: c.title,
    fake: Disguise.fakeChapterFilename(i, activeBook.value!.id)
  }))
  if (!f) return all
  return all.filter((it) => it.title.toLowerCase().includes(f) || it.fake.toLowerCase().includes(f))
})

watch(filteredItems, () => {
  selectedIndex.value = 0
})

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      filter.value = ''
      selectedIndex.value = 0
      // ensure book loaded
      if (activeBook.value && !books.getCache(activeBook.value.id)) {
        await books.ensureBookLoaded(activeBook.value)
      }
      await nextTick()
      inputEl.value?.focus()
    }
  }
)

function close(): void {
  emit('update:visible', false)
}

async function onConfirm(item: ChapterItem | undefined): Promise<void> {
  if (!item || !activeBook.value) return
  await tabs.openChapter(activeBook.value.id, item.i)
  persist.scheduleSave()
  close()
}

function onKeydown(e: KeyboardEvent): void {
  const arr = filteredItems.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(arr.length - 1, selectedIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(0, selectedIndex.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    onConfirm(arr[selectedIndex.value])
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}
</script>

<template>
  <div v-if="visible" class="quick-open">
    <input
      ref="inputEl"
      v-model="filter"
      class="qo-input"
      placeholder="按名称搜索章节…"
      autocomplete="off"
      @keydown="onKeydown"
    />
    <div class="qo-list">
      <div
        v-for="(it, k) in filteredItems.slice(0, 200)"
        :key="it.i"
        class="qo-item"
        :class="{ selected: k === selectedIndex }"
        @click="onConfirm(it)"
      >
        <span class="qi-num">{{ it.i + 1 }}</span>
        <span class="qi-icon" v-html="ICONS.file"></span>
        <span class="qi-fake">{{ it.fake }}</span>
        <span class="qi-real">{{ it.title }}</span>
      </div>
    </div>
  </div>
</template>
