import iconv from 'iconv-lite'

export interface DecodeResult {
  text: string
  encoding: string
}

/** Strip UTF-8 BOM, try UTF-8 then fall back to GBK (common for CN novels). */
export function decodeBuffer(buffer: Buffer): DecodeResult {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.slice(3).toString('utf8'), encoding: 'UTF-8' }
  }
  const utf8 = buffer.toString('utf8')
  if (!/\uFFFD/.test(utf8)) return { text: utf8, encoding: 'UTF-8' }
  return { text: iconv.decode(buffer, 'gbk'), encoding: 'GBK' }
}
