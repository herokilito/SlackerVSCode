<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@renderer/stores/ui'
import ExplorerPanel from './panels/ExplorerPanel.vue'
import SearchPanel from './panels/SearchPanel.vue'

const ui = useUiStore()

const sidebarStyle = computed(() => ({
  width: ui.sidebarWidth + 'px',
  flex: '0 0 ' + ui.sidebarWidth + 'px',
  display: ui.sidebarVisible ? 'flex' : 'none'
}))
</script>

<template>
  <div id="sidebar" :style="sidebarStyle">
    <ExplorerPanel v-show="ui.sidebarPanel === 'explorer'" class="sb-panel" />
    <SearchPanel v-show="ui.sidebarPanel === 'search'" class="sb-panel" />
  </div>
</template>
