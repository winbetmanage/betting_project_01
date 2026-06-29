'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const transferTypes = [
  { value: 'TELE_BIRR', label: 'Tele Birr' },
  { value: 'CBE', label: 'CBE' },
  { value: 'AWASH_BANK', label: 'Awash Bank' },
  { value: 'ABYSSINIA_BANK', label: 'Abyssinia Bank' },
  { value: 'DASHEN_BANK', label: 'Dashen Bank' },
  { value: 'M_PESA', label: 'M-Pesa' },
] as const;

type TransferType = (typeof transferTypes)[number]['value'];
type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Transfer = {
  id: string;
  amount: number;
  type: TransferType;
  status: TransferStatus;
  transactionId: string;
  name: string | null;
  phone: string | null;
  reason: string | null;
  img: string | null;
  createdAt: string;
  user: { username: string; email: string };
};

const typeLabels: Record<TransferType, string> = {
  TELE_BIRR: 'Tele Birr',
  CBE: 'CBE',
  AWASH_BANK: 'Awash Bank',
  ABYSSINIA_BANK: 'Abyssinia Bank',
  DASHEN_BANK: 'Dashen Bank',
  M_PESA: 'M-Pesa',
};

function formatAmount(n: number | string) {
  return `ETB ${Number(n).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: TransferStatus }) {
  const bg = status === 'APPROVED' ? '#16a34a' : '#451b4a';
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {status}
    </span>
  );
}

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransferType>('TELE_BIRR');
  const [editTransactionId, setEditTransactionId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editImg, setEditImg] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/transactions/${id}`);
        if (!res.ok) { router.push('/admin-dashboard/transactions'); return; }
        const data = await res.json();
        setTransfer(data);
        setEditAmount(data.amount.toString());
        setEditType(data.type);
        setEditTransactionId(data.transactionId ?? '');
        setEditName(data.name ?? '');
        setEditPhone(data.phone ?? '');
        setEditReason(data.reason ?? '');
        setEditImg(data.img ?? '');
      } catch {
        router.push('/admin-dashboard/transactions');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function handleApprove() {
    if (!transfer) return;
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: transfer.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || 'Failed to approve');
        return;
      }
      toast.success('Transaction approved');
      setTransfer((prev) => prev ? { ...prev, status: 'APPROVED' } : null);
    } catch {
      toast.error('Network error');
    }
  }

  async function handleEditSave() {
    if (!transfer) return;
    const fieldErrors: Record<string, string> = {};
    if (!editAmount || parseFloat(editAmount) <= 0) fieldErrors.amount = 'Amount must be positive';
    if (!editTransactionId.trim()) fieldErrors.transactionId = 'Transaction ID is required';
    if (Object.keys(fieldErrors).length > 0) { setEditErrors(fieldErrors); return; }

    setEditSaving(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          id: transfer.id,
          amount: parseFloat(editAmount),
          transactionId: editTransactionId.trim(),
          type: editType,
          name: editName.trim() || null,
          phone: editPhone.trim() || null,
          reason: editReason.trim() || null,
          img: editImg.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditErrors(d.errors ?? { form: 'Failed to update' });
        return;
      }
      const updated = await res.json();
      setTransfer((prev) => prev ? { ...prev, ...updated, amount: Number(updated.amount) } : null);
      setEditing(false);
    } catch {
      setEditErrors({ form: 'Network error' });
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>;
  }

  if (!transfer) return null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin-dashboard/transactions" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="size-4" />
        Back to Transactions
      </Link>

      {/* Transfer Info Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900">Transfer Details</h1>
          {transfer.status === 'PENDING' && (
            <div className="flex gap-2">
              <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleApprove}>
                <CheckCircle className="size-3.5" />
                Approve
              </Button>
              {!editing && (
                <Button variant="outline" onClick={() => { setEditing(true); setEditErrors({}); }}>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">User</p>
            <p className="mt-1 font-medium text-zinc-900">{transfer.user.username}</p>
            <p className="text-xs text-zinc-500">{transfer.user.email}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Status</p>
            <div className="mt-1"><StatusBadge status={transfer.status} /></div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Amount</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{formatAmount(transfer.amount)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Transfer Method</p>
            <p className="mt-1 font-medium text-zinc-900">{typeLabels[transfer.type] || transfer.type}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Transaction ID</p>
            <p className="mt-1 font-mono text-sm text-zinc-900">{transfer.transactionId ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Date</p>
            <p className="mt-1 font-medium text-zinc-900">{formatDate(transfer.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Full Name</p>
            <p className="mt-1 text-zinc-900">{transfer.name ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Phone Number</p>
            <p className="mt-1 text-zinc-900">{transfer.phone ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 sm:col-span-2">
            <p className="text-xs text-zinc-500">Reason</p>
            <p className="mt-1 text-zinc-900">{transfer.reason ?? '—'}</p>
          </div>
        </div>

        {/* Image */}
        {transfer.img && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-zinc-500">Screenshot</p>
            <a
              href={transfer.img}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-block overflow-hidden rounded-lg border border-zinc-200"
            >
              <img
                src={transfer.img}
                alt="Transfer screenshot"
                className="max-h-80 w-auto object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <ExternalLink className="size-6 text-white" />
              </div>
            </a>
          </div>
        )}
      </div>

      {/* Edit Section */}
      {editing && transfer.status === 'PENDING' && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Edit Transfer</h2>

          {editErrors.form && (
            <div className="mb-4 rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">{editErrors.form}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Amount <span className="text-red-400">*</span></label>
              <Input type="number" step="0.01" min="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              {editErrors.amount && <p className="mt-1 text-xs text-red-400">{editErrors.amount}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Transfer Method <span className="text-red-400">*</span></label>
              <select value={editType} onChange={(e) => setEditType(e.target.value as TransferType)} className="h-8 w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-700 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                {transferTypes.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Transaction ID <span className="text-red-400">*</span></label>
              <Input value={editTransactionId} onChange={(e) => setEditTransactionId(e.target.value)} />
              {editErrors.transactionId && <p className="mt-1 text-xs text-red-400">{editErrors.transactionId}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Image URL</label>
              <Input value={editImg} onChange={(e) => setEditImg(e.target.value)} placeholder="https://..." />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Full Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Phone Number</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Reason</label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button className="bg-gray-700 text-red-400 hover:bg-gray-600" onClick={() => { setEditing(false); setEditErrors({}); }}>
              Cancel
            </Button>
            <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
