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
import { CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
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
        toast.error(d.error || 'Failed to approve');
        return;
      }
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === approveTarget.id ? { ...t, status: 'APPROVED' as TransferStatus } : t
        )
      );
      toast.success('Transaction approved');
      setApproveOpen(false);
      setApproveTarget(null);
    } catch {
      toast.error('Network error');
    } finally {
      setApproving(false);
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
            <Link href={`/admin-dashboard/transactions/${row.original.id}`}>
              <Button variant="outline" size="xs">
                <Eye className="size-3" />
                Details
              </Button>
            </Link>
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
    </div>
  );
}
