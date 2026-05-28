import { useState, useEffect, useCallback } from 'react'
import { createAppClient } from '../lib/supabase'
import { useUITheme } from '../hooks/useUITheme'
import type { DataTable, DbFieldType } from '../types'

type Row = Record<string, unknown>

interface Props {
  table: DataTable
  supabaseUrl: string
  supabaseAnonKey: string
  onClose: () => void
}

const FIELD_INPUT_TYPE: Record<DbFieldType, string> = {
  text: 'text', number: 'number', boolean: 'checkbox',
  date: 'date', email: 'email', url: 'url',
}

export function DataViewerModal({ table, supabaseUrl, supabaseAnonKey, onClose }: Props) {
  const t = useUITheme()
  const client = createAppClient(supabaseUrl, supabaseAnonKey)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRow, setNewRow] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    if (!client) { setError('No connection configured.'); setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await client.from(table.name).select('*').order('id', { ascending: false }).limit(200)
    if (err) setError(err.message)
    else setRows(data ?? [])
    setLoading(false)
  }, [client, table.name])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function addRow() {
    if (!client) return
    setSaving(true)
    const payload: Record<string, unknown> = {}
    table.fields.forEach((f) => {
      const v = newRow[f.name]
      if (v === undefined || v === '') return
      payload[f.name] = f.type === 'number' ? Number(v) : f.type === 'boolean' ? v === 'true' : v
    })
    const { error: err } = await client.from(table.name).insert(payload)
    if (err) { setSaveMsg('Error: ' + err.message) }
    else {
      setSaveMsg('Row added!')
      setNewRow({})
      setShowAddForm(false)
      await fetchRows()
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  async function deleteRow(id: unknown) {
    if (!client) return
    if (!confirm('Delete this row?')) return
    await client.from(table.name).delete().eq('id', id)
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const allCols = ['id', ...table.fields.map((f) => f.name), 'created_at']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: t.bgPanel, borderRadius: 16, width: '96vw', maxWidth: 860, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.textPrimary, fontFamily: 'Fraunces, Georgia, serif', flex: 1 }}>
            {table.label}
            <span style={{ fontSize: 11, color: t.textDim, fontFamily: 'monospace', marginLeft: 8, fontWeight: 400 }}>{table.name}</span>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
            + New Row
          </button>
          <button onClick={fetchRows} title="Refresh" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, cursor: 'pointer', fontSize: 14 }}>
            ↻
          </button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: t.textDim, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Add row form */}
        {showAddForm && (
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, background: 'rgba(99,102,241,0.04)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 10 }}>New Row</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {table.fields.map((f) => (
                <div key={f.id} style={{ minWidth: 130 }}>
                  <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4 }}>{f.label}</div>
                  <input
                    type={FIELD_INPUT_TYPE[f.type]}
                    value={newRow[f.name] ?? ''}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    placeholder={f.type}
                    style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${t.border}`, background: t.bgApp, color: t.textPrimary, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end', flexShrink: 0 }}>
                <button onClick={addRow} disabled={saving}
                  style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setShowAddForm(false)}
                  style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
            {saveMsg && <div style={{ marginTop: 8, fontSize: 12, color: saveMsg.startsWith('Error') ? '#ef4444' : '#10b981' }}>{saveMsg}</div>}
          </div>
        )}

        {/* Table body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!client && (
            <div style={{ padding: 32, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
              No Supabase connection configured. Add your URL and anon key in the Database tab.
            </div>
          )}
          {client && loading && (
            <div style={{ padding: 32, textAlign: 'center', color: t.textDim, fontSize: 13 }}>Loading rows…</div>
          )}
          {client && !loading && error && (
            <div style={{ padding: 32, textAlign: 'center', color: '#ef4444', fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>⚠ {error}</div>
              <div style={{ fontSize: 11, color: t.textDim }}>Make sure the table exists in your Supabase project. Use the SQL button in the Data panel to generate the CREATE TABLE script.</div>
            </div>
          )}
          {client && !loading && !error && (
            rows.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: t.textDim, fontSize: 13, lineHeight: 1.7 }}>
                No rows yet.<br />Click <strong>+ New Row</strong> to add the first one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                      {allCols.map((col) => (
                        <th key={col} style={{ padding: '8px 14px', textAlign: 'left', color: t.textSecondary, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', background: t.bgPanel }}>
                          {col}
                        </th>
                      ))}
                      <th style={{ padding: '8px 14px', background: t.bgPanel }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={String(row.id)} style={{ borderBottom: `1px solid ${t.border}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        {allCols.map((col) => {
                          const val = row[col]
                          const display =
                            val === null || val === undefined ? <span style={{ color: t.textDim, fontStyle: 'italic' }}>null</span> :
                            typeof val === 'boolean' ? <span style={{ color: val ? '#10b981' : '#ef4444' }}>{String(val)}</span> :
                            String(val).length > 60 ? String(val).slice(0, 57) + '…' : String(val)
                          return (
                            <td key={col} style={{ padding: '8px 14px', color: t.textPrimary, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              {display}
                            </td>
                          )
                        })}
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => deleteRow(row.id)}
                            title="Delete row"
                            style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#f87171', fontSize: 11, cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.textDim, flexShrink: 0 }}>
          {rows.length} row{rows.length !== 1 ? 's' : ''} · {table.fields.length} field{table.fields.length !== 1 ? 's' : ''}
          {rows.length === 200 && ' · showing latest 200'}
        </div>
      </div>
    </div>
  )
}
