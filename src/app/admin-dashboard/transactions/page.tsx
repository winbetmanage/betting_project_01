'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Eye } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';

const transferTypes = [
  { value: 'TELE_BIRR', label: 'Tele Birr' },
  { value: 'CBE', label: 'CBE' },
  { value: 'AWASH_BANK', label: 'Awash Bank' },
  { value: 'ABYSSINIA_BANK', label: 'Abyssinia Bank' },
  { value: 'DASHEN_BANK', label: 'Dashen Bank' },
  { value: 'M_PESA', label: 'M-Pesa' },
] as const;

type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type TransferType = (typeof transferTypes)[number]['value'];

type Transfer = {
  id: string;
  amount: number;
  type: TransferType;
  status: TransferStatus;
  transactionId: string;
  name: string | null;
  phone: string | null;
  reason: string | null;
  createdAt: string;
  user: { username: string; email: string };
};

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

const typeLabels: Record<TransferType, string> = {
  TELE_BIRR: 'Tele Birr',
  CBE: 'CBE',
  AWASH_BANK: 'Awash Bank',
  ABYSSINIA_BANK: 'Abyssinia Bank',
  DASHEN_BANK: 'Dashen Bank',
  M_PESA: 'M-Pesa',
};

export default function AdminTransactionsPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Transfer | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState<Transfer | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('TELE_BIRR');
  const [editTransactionId, setEditTransactionId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const fetchTransfers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions?page=${p}&pageSize=${pageSize}`);
      const data = await res.json();
      setTransfers(data.transfers ?? []);
      setTotal(data.total ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers(page);
  }, [page, fetchTransfers]);

  function openApprove(t: Transfer) {
    setApproveTarget(t);
    setApproveOpen(true);
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: approveTarget.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to approve');
        return;
      }
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === approveTarget.id ? { ...t, status: 'APPROVED' as TransferStatus } : t
        )
      );
      setApproveOpen(false);
      setApproveTarget(null);
    } catch {
      alert('Network error');
    } finally {
      setApproving(false);
    }
  }

  function openDetail(t: Transfer) {
    setDetailTransfer(t);
    setEditAmount(t.amount.toString());
    setEditType(t.type);
    setEditTransactionId(t.transactionId);
    setEditName(t.name ?? '');
    setEditPhone(t.phone ?? '');
    setEditReason(t.reason ?? '');
    setEditErrors({});
    setDetailOpen(true);
  }

  async function handleDetailApprove() {
    if (!detailTransfer) return;
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: detailTransfer.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to approve');
        return;
      }
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === detailTransfer.id ? { ...t, status: 'APPROVED' as TransferStatus } : t
        )
      );
      setDetailTransfer((prev) => prev ? { ...prev, status: 'APPROVED' as TransferStatus } : null);
    } catch {
      alert('Network error');
    }
  }

  async function handleEditSave() {
    if (!detailTransfer) return;
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
          id: detailTransfer.id,
          amount: parseFloat(editAmount),
          transactionId: editTransactionId.trim(),
          type: editType,
          name: editName.trim() || null,
          phone: editPhone.trim() || null,
          reason: editReason.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditErrors(d.errors ?? { form: 'Failed to update' });
        return;
      }
      const updated = await res.json();
      setTransfers((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setDetailTransfer((prev) => prev ? { ...prev, ...updated } : null);
    } catch {
      setEditErrors({ form: 'Network error' });
    } finally {
      setEditSaving(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  const columns = useMemo(() => {
    const ch = createColumnHelper<Transfer>();
    return [
      ch.accessor('user', {
        header: 'User',
        cell: (info) => (
          <div>
            <div className="font-medium text-gray-800">{info.getValue().username}</div>
            <div className="text-xs text-gray-500">{info.getValue().email}</div>
          </div>
        ),
      }),
      ch.accessor('amount', {
        header: 'Amount',
        cell: (info) => <span className="font-semibold text-gray-800">{formatAmount(info.getValue())}</span>,
      }),
      ch.accessor('type', {
        header: 'Type',
        cell: (info) => <span className="text-gray-800">{typeLabels[info.getValue()] || info.getValue()}</span>,
      }),
      ch.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      ch.accessor('transactionId', {
        header: 'Transaction ID',
        cell: (info) => (
          <span className="font-mono text-xs text-gray-800">{info.getValue()}</span>
        ),
      }),
      ch.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-1.5">
            {row.original.status === 'PENDING' && (
              <Button variant="outline" size="xs" onClick={() => openApprove(row.original)}>
                <CheckCircle className="size-3" />
                Approve
              </Button>
            )}
            <Button variant="outline" size="xs" onClick={() => openDetail(row.original)}>
              <Eye className="size-3" />
              Details
            </Button>
          </div>
        ),
      }),
    ];
  }, []);

  const table = useReactTable({
    data: transfers,
    columns,
    pageCount: totalPages,
    state: { pagination: { pageIndex: page - 1, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }) : updater;
      setPage(next.pageIndex + 1);
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Transactions</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage money transfer requests</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zinc-400">Loading...</td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zinc-400">No transactions</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <p className="text-sm text-zinc-600">
              Approve transfer of <strong>{formatAmount(approveTarget.amount)}</strong> from{' '}
              <strong>{approveTarget.user.username}</strong>? This will add the amount to their balance.
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button className="bg-gray-700 text-red-400 hover:bg-gray-600" />}>Cancel</DialogClose>
            <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleApprove} disabled={approving}>
              {approving ? 'Approving...' : 'Confirm Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details / Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
          </DialogHeader>

          {editErrors.form && (
            <div className="rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">{editErrors.form}</div>
          )}

          {detailTransfer && (
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                <span className="text-zinc-500">User</span>
                <span className="font-medium text-zinc-800">{detailTransfer.user.username} ({detailTransfer.user.email})</span>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                <span className="text-zinc-500">Status</span>
                <StatusBadge status={detailTransfer.status} />
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-700">{formatDate(detailTransfer.createdAt)}</span>
              </div>

              <div className="border-t border-zinc-200 pt-3">
                <label className="mb-1 block text-xs font-medium text-zinc-500">Amount <span className="text-red-400">*</span></label>
                <Input type="number" step="0.01" min="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                {editErrors.amount && <p className="mt-1 text-xs text-red-400">{editErrors.amount}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Transfer Method <span className="text-red-400">*</span></label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="h-8 w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-700 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  {transferTypes.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Transaction ID <span className="text-red-400">*</span></label>
                <Input value={editTransactionId} onChange={(e) => setEditTransactionId(e.target.value)} />
                {editErrors.transactionId && <p className="mt-1 text-xs text-red-400">{editErrors.transactionId}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Full Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Phone Number</label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Reason</label>
                <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button className="bg-gray-700 text-red-400 hover:bg-gray-600" />}>Close</DialogClose>
            {detailTransfer?.status === 'PENDING' && (
              <>
                <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleDetailApprove}>
                  <CheckCircle className="size-3" />
                  Approve
                </Button>
                <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleEditSave} disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
