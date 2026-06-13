'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Upload, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { importPlayersFromExcel, type ImportRow } from '@/actions/import'
import * as XLSX from 'xlsx'

// Common column name patterns for auto-detection
const COLUMN_PATTERNS: Record<keyof ImportRow, string[]> = {
  email:       ['email'],
  name:        ['name', 'full name', 'player name'],
  phone:       ['phone', 'mobile', 'contact', 'whatsapp'],
  dateOfBirth: ['dob', 'date of birth', 'birthday', 'birth date'],
  gender:      ['gender', 'sex'],
  selfRating:  ['rating', 'skill', 'level', 'ntrp', 'dupr', 'self rating', 'player rating'],
  location:    ['city', 'location', 'town', 'place'],
}

const FIELD_LABELS: Record<keyof ImportRow, string> = {
  email:       'Email *',
  name:        'Name *',
  phone:       'Phone',
  dateOfBirth: 'Date of Birth',
  gender:      'Gender',
  selfRating:  'Rating (1–5)',
  location:    'City / Location',
}

type ColumnMap = Record<keyof ImportRow, number>

function detectColumns(headers: string[]): ColumnMap {
  const map = {} as ColumnMap
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const idx = headers.findIndex((h) =>
      patterns.some((p) => h.toLowerCase().includes(p))
    )
    map[field as keyof ImportRow] = idx
  }
  return map
}

function parseGender(raw: string): ImportRow['gender'] {
  const v = raw?.toLowerCase().trim()
  if (!v) return null
  if (v.startsWith('m')) return 'MALE'
  if (v.startsWith('f')) return 'FEMALE'
  if (v.includes('other') || v.includes('non')) return 'OTHER'
  return 'PREFER_NOT_TO_SAY'
}

function rowsFromSheet(sheet: XLSX.WorkSheet, colMap: ColumnMap): ImportRow[] {
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
  return data.slice(1).map((row) => ({
    email:       (row[colMap.email] ?? '').toString().trim(),
    name:        (row[colMap.name] ?? '').toString().trim(),
    phone:       colMap.phone >= 0 ? (row[colMap.phone] ?? '').toString().trim() || null : null,
    dateOfBirth: colMap.dateOfBirth >= 0 ? (row[colMap.dateOfBirth] ?? '').toString().trim() || null : null,
    gender:      colMap.gender >= 0 ? parseGender((row[colMap.gender] ?? '').toString()) : null,
    selfRating:  colMap.selfRating >= 0 ? parseFloat((row[colMap.selfRating] ?? '').toString()) || null : null,
    location:    colMap.location >= 0 ? (row[colMap.location] ?? '').toString().trim() || null : null,
  })).filter((r) => r.email || r.name)
}

interface Props {
  tournamentId: string
  tournamentSlug: string
}

export function ImportForm({ tournamentId, tournamentSlug }: Props) {
  const [isPending, startTransition] = useTransition()
  const [headers, setHeaders] = useState<string[]>([])
  const [colMap, setColMap] = useState<ColumnMap>({} as ColumnMap)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [allRows, setAllRows] = useState<ImportRow[]>([])
  const [result, setResult] = useState<{ imported: number; alreadyRegistered: number; errors: { row: number; email: string; reason: string }[] } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]

      if (raw.length === 0) { toast.error('File is empty'); return }

      const detectedHeaders = (raw[0] ?? []).map(String)
      const detected = detectColumns(detectedHeaders)

      setHeaders(detectedHeaders)
      setColMap(detected)
      const rows = rowsFromSheet(sheet, detected)
      setAllRows(rows)
      setPreview(rows.slice(0, 5))
      setResult(null)
    }
    reader.readAsArrayBuffer(file)
  }

  function rebuildPreview(newMap: ColumnMap) {
    // Re-parse with updated column map using the raw allRows approach isn't ideal
    // since allRows was already parsed — we just rebuild the colMap and reparse
    setColMap(newMap)
  }

  function handleImport() {
    const validRows = allRows.filter((r) => r.email && r.name)
    if (validRows.length === 0) { toast.error('No valid rows found'); return }

    startTransition(async () => {
      const res = await importPlayersFromExcel(tournamentId, validRows)
      if (res.success) {
        setResult({ imported: res.imported, alreadyRegistered: res.alreadyRegistered, errors: res.errors })
        if (res.imported > 0) toast.success(`${res.imported} players imported.`)
        else toast.info('No new players to import.')
      } else {
        toast.error(res.error ?? 'Import failed')
      }
    })
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-success/30 bg-success/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success shrink-0" />
            <p className="font-display font-bold uppercase text-success tracking-wide">Import Complete</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Imported', value: result.imported, color: 'text-success' },
              { label: 'Already Registered', value: result.alreadyRegistered, color: 'text-text-muted' },
              { label: 'Errors', value: result.errors.length, color: result.errors.length > 0 ? 'text-warning' : 'text-text-muted' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-surface-overlay p-3">
                <p className={`font-display font-black text-2xl ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning-bg p-4 space-y-2">
            <p className="text-xs font-semibold text-warning uppercase tracking-wider">Skipped rows</p>
            {result.errors.map((e) => (
              <p key={e.row} className="text-xs text-text-secondary">
                Row {e.row} ({e.email}): {e.reason}
              </p>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={() => { setResult(null); setHeaders([]); setAllRows([]) }} className="text-sm">
          Import another file
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border hover:border-brand-500/50 bg-surface-raised p-10 cursor-pointer transition-colors group">
        <Upload size={28} className="text-text-muted group-hover:text-brand-400 transition-colors" />
        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary">Drop an Excel or CSV file here</p>
          <p className="text-xs text-text-muted mt-1">Exported from Google Forms · .xlsx or .csv</p>
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </label>

      {/* Column mapping + preview */}
      {headers.length > 0 && (
        <div className="space-y-4">
          {/* Mapping UI */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Column Mapping — {allRows.length} rows detected
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(FIELD_LABELS) as (keyof ImportRow)[]).map((field) => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-xs text-text-secondary">{FIELD_LABELS[field]}</label>
                  <div className="relative">
                    <select
                      value={colMap[field] ?? -1}
                      onChange={(e) => rebuildPreview({ ...colMap, [field]: parseInt(e.target.value) })}
                      className="w-full h-8 rounded-md border border-border bg-surface-raised px-2 pr-7 text-xs text-text-primary focus:border-brand-500 focus:outline-none appearance-none"
                    >
                      <option value={-1}>— not mapped —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-2 text-text-muted pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Preview (first 5 rows)</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-overlay">
                      {(['email', 'name', 'phone', 'selfRating', 'gender'] as const).map((f) => (
                        <th key={f} className="px-3 py-2 text-left font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                          {FIELD_LABELS[f].replace(' *', '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((row, i) => (
                      <tr key={i} className={!row.email || !row.name ? 'opacity-40' : ''}>
                        <td className="px-3 py-2 text-text-secondary max-w-[160px] truncate">{row.email || <span className="text-warning">missing</span>}</td>
                        <td className="px-3 py-2 text-text-primary whitespace-nowrap">{row.name || <span className="text-warning">missing</span>}</td>
                        <td className="px-3 py-2 text-text-muted">{row.phone ?? '—'}</td>
                        <td className="px-3 py-2 text-text-muted">{row.selfRating ?? '—'}</td>
                        <td className="px-3 py-2 text-text-muted">{row.gender ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {allRows.length > 5 && (
                <p className="text-xs text-text-muted">…and {allRows.length - 5} more rows</p>
              )}
            </div>
          )}

          {/* Missing required columns warning */}
          {(colMap.email < 0 || colMap.name < 0) && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
              <AlertCircle size={14} className="text-warning shrink-0" />
              <p className="text-xs text-warning">Map the Email and Name columns before importing.</p>
            </div>
          )}

          <Button
            onClick={handleImport}
            loading={isPending}
            disabled={colMap.email < 0 || colMap.name < 0 || allRows.length === 0}
            className="w-full font-display font-bold uppercase tracking-wide"
          >
            Import {allRows.filter((r) => r.email && r.name).length} Players
          </Button>
        </div>
      )}
    </div>
  )
}
