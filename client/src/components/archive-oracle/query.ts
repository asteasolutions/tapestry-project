import { uniq } from 'lodash-es'

const PARSER = new DOMParser()

export function htmlToPlainText(html: string) {
    const textContent = PARSER.parseFromString(html, 'text/html').body.textContent
    return textContent.replaceAll(/\s+/g, ' ').trim()
}

function isUsefulToken(t: string) {
  if (t.length < 4) return false
  if (/^\d+$/.test(t)) return false
  return true
}

export function buildArchiveOracleQueryFromHtml(html: string) {
  const text = htmlToPlainText(html)
  const tokens = uniq(
    text
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/g)
      .filter(Boolean)
      .filter(isUsefulToken),
  ).slice(0, 8)

  if (tokens.length < 3) {
    return { query: '', plainText: text }
  }

  const terms = tokens.map((t) => `"${t}"`).join(' AND ')
  const query = `(${terms}) AND (mediatype:(texts OR audio OR movies))`
  return { query, plainText: text }
}
