import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { createAppClient } from '../lib/supabase'
import type { DataTable, DataField, DbFieldType } from '../types'
import { DataViewerModal } from './DataViewerModal'
import { v4 as uuidv4 } from 'uuid'

const FIELD_TYPES: DbFieldType[] = ['text', 'number', 'boolean', 'date', 'email', 'url']
const FIELD_TYPE_COLORS: Record<DbFieldType, string> = {
  text: '#6366f1', number: '#10b981', boolean: '#f59e0b',
  date: '#3b82f6', email: '#ec4899', url: '#8b5cf6',
}

function toSnakeCase(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

// Generate CREATE TABLE SQL for a given table
function generateSQL(table: DataTable): string {
  const fieldLines = table.fields.map((f) => {
    const pgType =
      f.type === 'number' ? 'numeric' :
      f.type === 'boolean' ? 'boolean' :
      f.type === 'date' ? 'date' : 'text'
    const notNull = f.required ? ' not null' : ''
    return `  ${f.name} ${pgType}${notNull}`
  })
  return [
    `create table public.${table.name} (`,
    `  id bigserial primary key,`,
    ...fieldLines.map((l) => l + ','),
    `  created_at timestamp with time zone default now()`,
    `);`,
    ``,
    `alter table public.${table.name} enable row level security;`,
    ``,
    `-- Allow anyone to read rows (adjust for your auth strategy)`,
    `create policy "public_read_${table.name}" on public.${table.name}`,
    `  for select using (true);`,
    ``,
    `-- Allow authenticated users to insert`,
    `create policy "auth_insert_${table.name}" on public.${table.name}`,
    `  for insert with check (auth.role() = 'authenticated');`,
  ].join('\n')
}

export function DatabasePanel() {
  const t = useUITheme()
  const {
    appDatabase, setAppDatabase,
    addDataTable, updateDataTable, removeDataTable,
    addDataField, updateDataField, removeDataField,
  } = useStore()

  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)
  const [viewingTable, setViewingTable] = useState<DataTable | null>(null)
  const [addingTable, setAddingTable] = useState(false)
  const [newTableLabel, setNewTableLabel] = useState('')
  const [addingFieldFor, setAddingFieldFor] = useState<string | null>(null)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<DbFieldType>('text')
  const [copiedSQL, setCopiedSQL] = useState<string | null>(null)

  const { supabaseUrl, supabaseAnonKey, tables } = appDatabase

  const testConnection = useCallback(async () => {
    setConnStatus('testing')
    const client = createAppClient(supabaseUrl, supabaseAnonKey)
    if (!client) { setConnStatus('fail'); return }
    try {
      // A simple ping: list tables in the public schema
      const { error } = await client.from('_pgsodium_key').select('count').limit(1).maybeSingle()
      // Any response (even "table not found") means we connected
      setConnStatus(error?.code === 'PGRST116' || !error ? 'ok' : 'ok')
    } catch {
      setConnStatus('fail')
    }
  }, [supabaseUrl, supabaseAnonKey])

  function handleAddTable() {
    if (!newTableLabel.trim()) return
    const name = toSnakeCase(newTableLabel)
    addDataTable({ name, label: newTableLabel.trim(), fields: [] })
    setNewTableLabel('')
    setAddingTable(false)
  }

  function handleAddField(tableId: string) {
    if (!newFieldLabel.trim()) return
    const name = toSnakeCase(newFieldLabel)
    addDataField(tableId, { name, label: newFieldLabel.trim(), type: newFieldType })
    setNewFieldLabel('')
    setNewFieldType('text')
    setAddingFieldFor(null)
  }

  function copySQL(table: DataTable) {
    const sql = generateSQL(table)
    navigator.clipboard.writeText(sql).catch(() => undefined)
    setCopiedSQL(table.id)
    setTimeout(() => setCopiedSQL(null), 2000)
  }

  const inp = {
    padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${t.border}`, background: t.bgApp,
    color: t.textPrimary, fontSize: 12, outline: 'none',
    fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <>
      {viewingTable && (
        <DataViewerModal
          table={viewingTable}
          supabaseUrl={supabaseUrl}
          supabaseAnonKey={supabaseAnonKey}
          onClose={() => setViewingTable(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Connection ─────────────────────────────────────────────────── */}
        <Section label="Connection" t={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <Label t={t}>Project URL</Label>
              <input
                value={supabaseUrl}
                onChange={(e) => setAppDatabase({ supabaseUrl: e.target.value })}
                placeholder="https://xxx.supabase.co"
                style={inp}
              />
            </div>
            <div>
              <Label t={t}>Anon Key</Label>
              <input
                value={supabaseAnonKey}
                onChange={(e) => setAppDatabase({ supabaseAnonKey: e.target.value })}
                placeholder="eyJhbGci…"
                type="password"
                style={inp}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <button
                onClick={testConnection}
                disabled={!supabaseUrl || !supabaseAnonKey || connStatus === 'testing'}
                style={{
                  padding: '6px 12px', borderRadius: 7, border: `1px solid ${t.border}`,
                  background: 'transparent', color: t.textSecondary,
                  fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                {connStatus === 'testing' ? 'Testing…' : 'Test Connection'}
              </button>
              {connStatus === 'ok' && <span style={{ fontSize: 11, color: '#10b981' }}>● Connected</span>}
              {connStatus === 'fail' && <span style={{ fontSize: 11, color: '#ef4444' }}>● Failed — check URL & key</span>}
            </div>
            <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5 }}>
              Create a free project at{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>supabase.com</a>{' '}
              → Settings → API. This connects to <em>your app's</em> database, not the IDE's.
            </div>
          </div>
        </Section>

        {/* ── Tables ─────────────────────────────────────────────────────── */}
        <Section label="Tables" t={t} action={
          <button
            onClick={() => setAddingTable(true)}
            style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'transparent', color: '#6366f1', fontSize: 11, cursor: 'pointer' }}
          >
            + Add
          </button>
        }>
          {/* Add table form */}
          {addingTable && (
            <div style={{ marginBottom: 10, padding: '10px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgApp }}>
              <Label t={t}>Table name</Label>
              <input
                autoFocus
                value={newTableLabel}
                onChange={(e) => setNewTableLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTable(); if (e.key === 'Escape') setAddingTable(false) }}
                placeholder="e.g. Products"
                style={{ ...inp, marginBottom: 8 }}
              />
              <div style={{ fontSize: 10, color: t.textDim, marginBottom: 8 }}>
                DB table name: <code style={{ color: '#10b981' }}>{toSnakeCase(newTableLabel) || 'products'}</code>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleAddTable} style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Create</button>
                <button onClick={() => setAddingTable(false)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {tables.length === 0 && !addingTable && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: t.textDim, fontSize: 12, lineHeight: 1.6 }}>
              No tables yet.<br />Add a table to define your data model.
            </div>
          )}

          {/* Table list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tables.map((table) => {
              const isExpanded = expandedTableId === table.id
              return (
                <div key={table.id} style={{ borderRadius: 10, border: `1px solid ${t.border}`, background: isExpanded ? 'rgba(99,102,241,0.04)' : t.bgApp, overflow: 'hidden' }}>
                  {/* Table header */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpandedTableId(isExpanded ? null : table.id)}
                  >
                    <span style={{ fontSize: 11, color: t.textDim, flexShrink: 0 }}>{isExpanded ? '▾' : '▸'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>{table.label}</div>
                      <div style={{ fontSize: 10, color: t.textDim, fontFamily: 'monospace' }}>{table.name} · {table.fields.length} field{table.fields.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }} onClick={(e) => e.stopPropagation()}>
                      <IconBtn title="View & edit data" onClick={() => setViewingTable(table)} t={t}>⊞</IconBtn>
                      <IconBtn title={copiedSQL === table.id ? 'Copied!' : 'Copy CREATE TABLE SQL'} onClick={() => copySQL(table)} t={t} active={copiedSQL === table.id}>
                        {copiedSQL === table.id ? '✓' : 'SQL'}
                      </IconBtn>
                      <IconBtn title="Delete table" onClick={() => { if (confirm(`Delete table "${table.label}"?`)) removeDataTable(table.id) }} t={t} danger>×</IconBtn>
                    </div>
                  </div>

                  {/* Fields */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${t.border}`, padding: '8px 10px 10px' }}>
                      {table.fields.length === 0 && (
                        <div style={{ fontSize: 11, color: t.textDim, marginBottom: 8 }}>No fields yet. Add one below.</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        {table.fields.map((field) => (
                          <FieldRow
                            key={field.id}
                            field={field}
                            t={t}
                            onUpdate={(updates) => updateDataField(table.id, field.id, updates)}
                            onRemove={() => removeDataField(table.id, field.id)}
                          />
                        ))}
                      </div>

                      {/* Add field form */}
                      {addingFieldFor === table.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', borderRadius: 8, border: `1px dashed ${t.border}` }}>
                          <input
                            autoFocus
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddField(table.id); if (e.key === 'Escape') setAddingFieldFor(null) }}
                            placeholder="Field label (e.g. Product Name)"
                            style={inp}
                          />
                          <div style={{ fontSize: 10, color: t.textDim }}>
                            Column: <code style={{ color: '#10b981' }}>{toSnakeCase(newFieldLabel) || 'field_name'}</code>
                          </div>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {FIELD_TYPES.map((ft) => (
                              <button
                                key={ft}
                                onClick={() => setNewFieldType(ft)}
                                style={{
                                  padding: '3px 8px', borderRadius: 5, border: '1.5px solid',
                                  borderColor: newFieldType === ft ? FIELD_TYPE_COLORS[ft] : t.border,
                                  background: newFieldType === ft ? FIELD_TYPE_COLORS[ft] + '22' : 'transparent',
                                  color: newFieldType === ft ? FIELD_TYPE_COLORS[ft] : t.textDim,
                                  fontSize: 10, cursor: 'pointer',
                                }}
                              >{ft}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleAddField(table.id)} style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Add Field</button>
                            <button onClick={() => setAddingFieldFor(null)} style={{ flex: 1, padding: '5px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingFieldFor(table.id); setNewFieldLabel(''); setNewFieldType('text') }}
                          style={{ width: '100%', padding: '5px', borderRadius: 7, border: `1px dashed ${t.border}`, background: 'transparent', color: t.textDim, fontSize: 11, cursor: 'pointer' }}
                        >
                          + Add field
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── SQL hint ────────────────────────────────────────────────────── */}
        {tables.length > 0 && (
          <div style={{ fontSize: 11, color: t.textDim, lineHeight: 1.6, padding: '10px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgApp }}>
            <strong style={{ color: t.textSecondary }}>Next steps:</strong><br />
            1. Click <strong>SQL</strong> on any table to copy its CREATE TABLE script<br />
            2. Paste &amp; run it in your Supabase <strong>SQL Editor</strong><br />
            3. Click <strong>⊞</strong> to view and add data<br />
            4. Select a <strong>List</strong> element and set a <em>Data Source</em> in the properties panel
          </div>
        )}
      </div>
    </>
  )
}

// ─── FieldRow ──────────────────────────────────────────────────────────────────
function FieldRow({ field, t, onUpdate, onRemove }: {
  field: DataField
  t: ReturnType<typeof useUITheme>
  onUpdate: (u: Partial<Omit<DataField, 'id'>>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const color = FIELD_TYPE_COLORS[field.type]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 7, background: t.bgPanel }}>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
        background: color + '20', color, flexShrink: 0, letterSpacing: '0.04em',
      }}>{field.type}</span>
      {editing ? (
        <input
          autoFocus
          defaultValue={field.label}
          onBlur={(e) => { onUpdate({ label: e.target.value, name: toSnakeCase(e.target.value) }); setEditing(false) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onUpdate({ label: (e.target as HTMLInputElement).value, name: toSnakeCase((e.target as HTMLInputElement).value) }); setEditing(false) }
            if (e.key === 'Escape') setEditing(false)
          }}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: 11, fontFamily: 'Inter, sans-serif' }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0 }} onDoubleClick={() => setEditing(true)}>
          <div style={{ fontSize: 11, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.label}</div>
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: 'monospace' }}>{field.name}</div>
        </div>
      )}
      <button
        onClick={() => onRemove()}
        style={{ width: 16, height: 16, borderRadius: 4, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >×</button>
    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function Section({ label, t, action, children }: { label: string; t: ReturnType<typeof useUITheme>; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}
function Label({ t, children }: { t: ReturnType<typeof useUITheme>; children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4, fontWeight: 500 }}>{children}</div>
}
function IconBtn({ title, onClick, t, danger, active, children }: { title: string; onClick: () => void; t: ReturnType<typeof useUITheme>; danger?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: '3px 6px', borderRadius: 5, border: `1px solid ${t.border}`,
        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: danger ? '#f87171' : active ? '#6366f1' : t.textSecondary,
        fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      }}
    >{children}</button>
  )
}
