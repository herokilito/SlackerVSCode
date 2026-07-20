<script setup lang="ts">
import { ICONS, type IconName } from '@renderer/lib/icons'
import { useUiStore } from '@renderer/stores/ui'

const ui = useUiStore()

interface AbItem {
  key: string
  icon: IconName
  tip: string
  enabled: boolean
}

const topItems: AbItem[] = [
  { key: 'explorer', icon: 'explorer', tip: '书架 Explorer', enabled: true },
  { key: 'search', icon: 'search', tip: '搜索 Search', enabled: true },
  { key: 'scm', icon: 'scm', tip: '源代码管理 Source Control', enabled: false },
  { key: 'run', icon: 'run', tip: '运行和调试 Run and Debug', enabled: false },
  { key: 'extensions', icon: 'extensions', tip: '扩展 Extensions', enabled: false }
]

function onItemClick(item: AbItem): void {
  if (!item.enabled) {
    ui.showToast('摸鱼模式下该面板已禁用 :)')
    return
  }
  if (item.key === 'explorer' || item.key === 'search') {
    ui.setSidebarPanel(item.key)
  }
}
</script>

<template>
  <div id="activitybar">
    <div class="ab-top">
      <div
        v-for="item in topItems"
        :key="item.key"
        class="ab-icon"
        :class="{ active: item.enabled && ui.sidebarPanel === item.key && ui.sidebarVisible }"
        :title="item.tip"
        @click="onItemClick(item)"
        v-html="ICONS[item.icon]"
      ></div>
    </div>
    <div class="ab-bottom">
      <div class="ab-icon" title="账户" @click="ui.showToast('摸鱼不需要登录 :)')" v-html="ICONS.account"></div>
      <div class="ab-icon" title="管理 设置" @click="ui.toggleReadingMode()" v-html="ICONS.settings"></div>
    </div>
  </div>
</template>
