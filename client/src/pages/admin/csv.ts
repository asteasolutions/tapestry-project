import { download } from 'tapestry-core-client/src/lib/file'

export type CsvValue = string | number | boolean | Date | null | undefined

function escape(value: CsvValue) {
  if (value === null || value === undefined) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: CsvValue[][]) {
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

export function downloadCsv(fileName: string, header: string[], rows: CsvValue[][]) {
  // The BOM makes spreadsheet applications detect UTF-8 correctly
  const blob = new Blob(['﻿', toCsv(header, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  download(url, fileName.endsWith('.csv') ? fileName : `${fileName}.csv`)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function csvDate(date: Date | null | undefined) {
  return date ? date.toISOString() : ''
}
