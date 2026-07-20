import type { Chapter } from '@renderer/types'

/** Split a raw novel text into chapters by common Chinese chapter markers. */
export function parseChapters(text: string): Chapter[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const chapRe =
    /^[\s\u3000]*(第[\s]*[零一二三四五六七八九十百千万0-9]+[\s]*[章回节卷篇部集][\s\S]*?|序章|楔子|引子|前言|序言|后记|尾声|终章|番外[^\n]*|Chapter\s+\d+[^\n]*)$/i
  const chapters: Chapter[] = []
  let cur: Chapter = { title: '', content: [] }
  let started = false

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (chapRe.test(trimmed)) {
      if (started) chapters.push({ title: cur.title, content: cur.content.join('\n') })
      cur = { title: trimmed, content: [] }
      started = true
    } else {
      cur.content.push(raw)
      if (!started) {
        cur.title = '序章'
        started = true
      }
    }
  }
  if (started) chapters.push({ title: cur.title, content: cur.content.join('\n') })

  // Fallback: no chapter markers -> split into chunks of ~300 lines.
  if (chapters.length <= 1 && lines.length > 400) {
    const chunks: Chapter[] = []
    const size = 300
    for (let i = 0; i < lines.length; i += size) {
      chunks.push({
        title: '第 ' + (Math.floor(i / size) + 1) + ' 段',
        content: lines.slice(i, i + size).join('\n')
      })
    }
    return chunks
  }

  // Drop chapters with no real content (keep at least one)
  const filtered = chapters.filter((c) => c.content.trim().length > 0)
  return filtered.length ? filtered : chapters
}
