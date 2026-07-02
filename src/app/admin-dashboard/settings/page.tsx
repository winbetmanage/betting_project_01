'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Pencil } from 'lucide-react';
import { toast } from 'sonner';

type Setting = {
  id: string;
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'COLOR' | 'JSON';
  value: any;
  label: string | null;
  group: string | null;
  createdAt: string;
  updatedAt: string;
};

const typeColors: Record<string, string> = {
  STRING: 'text-blue-400 bg-blue-900/30',
  NUMBER: 'text-green-400 bg-green-900/30',
  BOOLEAN: 'text-yellow-400 bg-yellow-900/30',
  COLOR: 'text-purple-400 bg-purple-900/30',
  JSON: 'text-zinc-400 bg-zinc-800/50',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<'STRING' | 'NUMBER' | 'BOOLEAN'>('NUMBER');
  const [newLabel, setNewLabel] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [saving, setSaving] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) setSettings(await res.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function handleAdd() {
    if (!newKey.trim()) { toast.error('Key is required'); return; }
    if (!newValue.trim() && newType !== 'BOOLEAN') { toast.error('Value is required'); return; }

    setSaving(true);
    try {
      const val = newType === 'NUMBER' ? parseFloat(newValue) : newType === 'BOOLEAN' ? newValue === 'true' : newValue;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), value: val, type: newType, label: newLabel.trim() || undefined, group: newGroup.trim() || undefined }),
      });
      if (res.ok) {
        toast.success('Setting saved');
        setAddOpen(false);
        setNewKey(''); setNewValue(''); setNewType('NUMBER'); setNewLabel(''); setNewGroup('');
        fetchSettings();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  }

  async function handleEditSave(s: Setting) {
    const raw = editValue.trim();
    if (!raw) { toast.error('Value is required'); return; }

    setSaving(true);
    try {
      let val: any = raw;
      if (s.type === 'NUMBER') val = parseFloat(raw);
      else if (s.type === 'BOOLEAN') val = raw === 'true';

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: s.key, value: val, type: s.type, label: s.label || undefined, group: s.group || undefined }),
      });

      if (res.ok) {
        toast.success('Value updated');
        setEditingId(null);
        fetchSettings();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  }

  function displayValue(s: Setting): string {
    const raw = s.value?.value ?? s.value;
    if (s.type === 'BOOLEAN') return raw ? 'true' : 'false';
    return String(raw ?? '');
  }

  function startEdit(s: Setting) {
    setEditingId(s.id);
    setEditValue(String(s.value?.value ?? s.value ?? ''));
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-zinc-400">Manage application settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSettings}><RefreshCw className="size-4" /></Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add Setting</Button>
        </div>
      </div>

      {/* Add Setting Form */}
      {addOpen && (
        <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">New Setting</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Key *</label>
              <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. Referral_Payment" className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as any)} className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-300 outline-none focus:border-primarycolor">
                <option value="STRING">String</option>
                <option value="NUMBER">Number</option>
                <option value="BOOLEAN">Boolean</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Value *</label>
              {newType === 'BOOLEAN' ? (
                <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-300 outline-none focus:border-primarycolor">
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={newType === 'NUMBER' ? 'e.g. 50' : 'Value'} className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor" />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Label</label>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Display label" className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Group</label>
              <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="e.g. payment" className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Settings Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-400">Loading...</div>
        ) : settings.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-400">No settings yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-700">{s.key}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type={s.type === 'NUMBER' ? 'number' : 'text'}
                          step={s.type === 'NUMBER' ? 'any' : undefined}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-28 rounded border border-zinc-300 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-primarycolor"
                          autoFocus
                        />
                        <button onClick={() => handleEditSave(s)} disabled={saving} className="text-xs font-semibold text-green-600 hover:text-green-500 px-1">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-zinc-400 hover:text-zinc-600 px-1">Cancel</button>
                      </div>
                    ) : (
                      displayValue(s)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColors[s.type] || ''}`}>{s.type}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{s.label || '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">{s.group || '—'}</td>
                  <td className="px-4 py-3">
                    {editingId !== s.id && (
                      <button onClick={() => startEdit(s)} className="text-zinc-400 hover:text-blue-500 transition"><Pencil className="size-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
