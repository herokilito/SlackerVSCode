<script setup lang="ts">
import { useUiStore } from '@renderer/stores/ui'
const ui = useUiStore()
</script>

<template>
  <div v-if="ui.toastVisible" class="toast">{{ ui.toastMsg }}</div>
</template>
