/** VS Code-style SVG icons (codicon-like, 16x16, currentColor fill). */

const I = (p: string): string =>
  `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${p}</svg>`

const icons = {
  // Activity bar
  explorer: I(
    `<path d="M14.5 2H7.7l-.36-.35L6.5 1h-5l-.5.5v11l.5.5H7v-1H2V6h4.5l.36-.35L7.5 5h4.4l.6 1V5h2v9h-3v1h3.5l.5-.5v-12L14.5 2zM6.5 5l-1 1H2V2h4l.5.5V5zM13 4h-1.4l-.6-1H7.5l-.5.5V4h6v9h-2V5.7L11.3 5H13v-1z"/>`
  ),
  search: I(
    `<path d="M15.25 14.4L11 10.15a5.5 5.5 0 1 0-.85.85l4.25 4.25.85-.85zM6.5 11A4.5 4.5 0 1 1 11 6.5 4.5 4.5 0 0 1 6.5 11z"/>`
  ),
  scm: I(
    `<path d="M13.5 2.5a2 2 0 0 0-2 2 2 2 0 0 0 1.5 1.93V9.5a1.5 1.5 0 0 1-3 0v-3a2.5 2.5 0 0 0-5 0v.07A2 2 0 0 0 4 11a2 2 0 0 0 2-2 2 2 0 0 0-1.5-1.93V6.5a1.5 1.5 0 0 1 3 0v3a2.5 2.5 0 0 0 5 0V6.43A2 2 0 0 0 13.5 2.5zM4 11a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm9.5-7a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>`
  ),
  run: I(`<path d="M5 3.5v9l7-4.5-7-4.5zm1 1.8L10.5 8 6 10.7V5.3z"/>`),
  extensions: I(
    `<path d="M9 1H7v2H5v2H3v2h2v6h2v2h2v-2h2v-6h2V5h-2V3H9V1zm0 2v2H7V3h2zm2 4v6H9v2H7v-2H5V7h6zM11 5H5V4h2V2h2v2h2v1z"/>`
  ),
  settings: I(
    `<path d="M9.1 4.3L8.6 2H7.4l-.5 2.3-.7.3-2-1.2-.9.8 1.2 2-.3.7L2 7.4v1.2l2.3.5.3.7-1.2 2 .8.8 2-1.2.7.3.5 2.3h1.2l.5-2.3.7-.3 2 1.2.8-.8-1.2-2 .3-.7 2.3-.5V7.4l-2.3-.5-.3-.7 1.2-2-.8-.8-2 1.2-.7-.3zM8 11a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0-1a2 2 0 1 0-2-2 2 2 0 0 0 2 2z"/>`
  ),
  account: I(
    `<path d="M8 1a3 3 0 0 0-3 3 3 3 0 0 0 .8 2A4 4 0 0 0 3 10v2l.5.5h9L13 12v-2a4 4 0 0 0-2.8-4A3 3 0 0 0 8 1zm0 1a2 2 0 1 1-2 2 2 2 0 0 1 2-2zm0 5a3 3 0 0 1 3 3v1.5H5V10a3 3 0 0 1 3-3z"/>`
  ),

  // Tree / explorer items
  chevronRight: I(`<path d="M6 3.5L10.5 8 6 12.5l.7.7L11.9 8 6.7 2.8 6 3.5z"/>`),
  chevronDown: I(`<path d="M3.5 6L8 10.5 12.5 6l-.7-.7L8 9.1 4.2 5.3 3.5 6z"/>`),
  folder: I(
    `<path d="M14 4.5H8.2l-1-1H2.5l-.5.5v8l.5.5H14l.5-.5V5l-.5-.5zM2.5 4.5h4.5l.5.5h6V6H3l-.5-.5V4.5zm11 7.5H3V7h10.5v5z"/>`
  ),
  folderOpen: I(
    `<path d="M14.5 5H8.7l-1-1H2.5L2 4.5v8l.5.5h10l.5-.4 2-6.6L14.5 5zM3 5h4.5l.5.5h6v.5H4.5L4 6.5 3 10V5zm9.7 7H3.2l1.5-5h9.5l-1.5 5z"/>`
  ),
  file: I(
    `<path d="M9.5 1H3.5l-.5.5v13l.5.5h9l.5-.5V5.5L9.5 1zM4 14V2h5v3.5l.5.5H13v8H4zm9-9h-3V2h.1L13 5z"/>`
  ),
  book: I(
    `<path d="M11 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm0 13H4V2h7v12zM6 4h3v1H6V4zm0 2h3v1H6V6zm0 2h3v1H6V8z"/>`
  ),
  close: I(
    `<path d="M8 7.3L4.7 4 4 4.7 7.3 8 4 11.3l.7.7L8 8.7 11.3 12l.7-.7L8.7 8 12 4.7l-.7-.7L8 7.3z"/>`
  ),
  add: I(`<path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>`),
  more: I(
    `<path d="M4 8a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm4 0a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm4 0a1 1 0 1 1-1-1 1 1 0 0 1 1 1z"/>`
  ),
  trash: I(
    `<path d="M11 3V2H5v1H2v1h1v9.5l.5.5h9l.5-.5V4h1V3h-3zm-5 0h4v1H6V3zm5 10H4V4h7v9zM6 5h1v6H6V5zm2 0h1v6H8V5z"/>`
  ),
  refresh: I(
    `<path d="M13.5 3.5l-.4 2A5 5 0 1 0 13 11.5l-.7-.7A4 4 0 1 1 12.5 5l-1.5 1-.3-3 2.8.5z"/>`
  ),
  error: I(
    `<path d="M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6 6 0 0 1-6 6zm-.5-3h1v1h-1v-1zm0-7h1v6h-1V4z"/>`
  ),
  split: I(
    `<path d="M14 2H2l-.5.5v11l.5.5h12l.5-.5v-11L14 2zM7.5 13h-5V3h5v10zm6 0h-5V3h5v10z"/>`
  ),
  check: I(`<path d="M6.5 11.5L3 8l.7-.7 2.8 2.8 5.8-5.8.7.7-6.5 6.5z"/>`),
  listTree: I(
    `<path d="M2 3h2v2H2V3zm3 1h9v1H5V4zM2 7h2v2H2V7zm3 1h9v1H5V8zm-3 4h2v2H2v-2zm3 1h9v1H5v-1z"/>`
  ),
  history: I(
    `<path d="M8 2a6 6 0 0 0-6 6H.5L2.5 10l2-2H3a5 5 0 1 1 1.5 3.6l-.7.7A6 6 0 1 0 8 2zm-.5 3v3.7l3 1.8.5-.8L8 8.3V5H7.5z"/>`
  ),

  // File-type icons (Seti-style: file body + colored language badge)
  // ts / tsx — TypeScript blue
  fileTs: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="#519aba" d="M9.5 1H3.5l-.5.5v13l.5.5h9l.5-.5V5.5L9.5 1zM4 14V2h5v3.5l.5.5H13v8H4z"/><rect x="8.5" y="9.5" width="6.5" height="5" rx="0.8" fill="#3178c6"/><text x="11.75" y="13.4" font-size="3.6" fill="#fff" text-anchor="middle" font-family="Consolas,monospace" font-weight="bold">TS</text></svg>`,
  // js / jsx — JavaScript yellow
  fileJs: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="#519aba" d="M9.5 1H3.5l-.5.5v13l.5.5h9l.5-.5V5.5L9.5 1zM4 14V2h5v3.5l.5.5H13v8H4z"/><rect x="8.5" y="9.5" width="6.5" height="5" rx="0.8" fill="#dcb000"/><text x="11.75" y="13.4" font-size="3.6" fill="#1e1e1e" text-anchor="middle" font-family="Consolas,monospace" font-weight="bold">JS</text></svg>`,
  // vue — Vue green
  fileVue: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="#519aba" d="M9.5 1H3.5l-.5.5v13l.5.5h9l.5-.5V5.5L9.5 1zM4 14V2h5v3.5l.5.5H13v8H4z"/><rect x="8.5" y="9.5" width="6.5" height="5" rx="0.8" fill="#41b883"/><text x="11.75" y="13.4" font-size="4.2" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold">V</text></svg>`,
  // svelte — Svelte orange
  fileSvelte: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="#519aba" d="M9.5 1H3.5l-.5.5v13l.5.5h9l.5-.5V5.5L9.5 1zM4 14V2h5v3.5l.5.5H13v8H4z"/><rect x="8.5" y="9.5" width="6.5" height="5" rx="0.8" fill="#ff3e00"/><text x="11.75" y="13.4" font-size="4.2" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold">S</text></svg>`
}

const FILE_EXT_ICONS: Record<string, keyof typeof icons> = {
  ts: 'fileTs',
  tsx: 'fileTs',
  js: 'fileJs',
  jsx: 'fileJs',
  vue: 'fileVue',
  svelte: 'fileSvelte'
}

export function fileTypeIcon(filename: string): string {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  return icons[FILE_EXT_ICONS[ext] || 'file']
}

export type IconName = keyof typeof icons

export const ICONS = icons
