import { onMounted, onUnmounted } from 'vue'

export type KeyHandler = (e: KeyboardEvent) => void

export interface KeyBinding {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  key: string // lowercase
  handler: KeyHandler
}

function matches(b: KeyBinding, e: KeyboardEvent): boolean {
  const ctrl = e.ctrlKey || e.metaKey
  if (!!b.ctrl !== ctrl) return false
  if (!!b.shift !== e.shiftKey) return false
  if (!!b.alt !== e.altKey) return false
  return e.key.toLowerCase() === b.key
}

/** Register global key bindings for the lifetime of the calling component. */
export function useGlobalKeys(bindings: KeyBinding[]): void {
  const onKey = (e: KeyboardEvent) => {
    for (const b of bindings) {
      if (matches(b, e)) {
        b.handler(e)
        return
      }
    }
  }
  onMounted(() => document.addEventListener('keydown', onKey))
  onUnmounted(() => document.removeEventListener('keydown', onKey))
}
