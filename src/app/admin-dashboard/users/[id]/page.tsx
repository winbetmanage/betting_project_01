'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';

type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type User = {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  balance: number;
  createdAt: string;
  _count: { bets: number; transfers: number };
};

type Transfer = {
  id: string;
  amount: number;
  type: string;
  status: TransferStatus;
  transactionId: string;
  name: string | null;
  phone: string | null;
  reason: string | null;
  createdAt: string;
};

const statusStyles: Record<UserStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300',
  ACTIVE: 'bg-green-900/40 text-green-300',
  INACTIVE: 'bg-zinc-600/40 text-zinc-300',
  SUSPENDED: 'bg-red-900/40 text-red-300',
};

const transferStatusStyles: Record<TransferStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300',
  APPROVED: 'bg-green-900/40 text-green-300',
  REJECTED: 'bg-red-900/40 text-red-300',
};

const typeLabels: Record<string, string> = {
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

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transfersTotal, setTransfersTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('PENDING');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}?page=${p}&pageSize=${pageSize}`);
      if (!res.ok) { router.push('/admin-dashboard/users'); return; }
      const data = await res.json();
      setUser(data.user);
      setTransfers(data.transfers ?? []);
      setTransfersTotal(data.transfersTotal ?? 0);
    } catch {
      router.push('/admin-dashboard/users');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  function openEditor() {
    if (!user) return;
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditBalance(user.balance.toString());
    setEditStatus(user.status);
    setEditError('');
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!user) return;
    if (!editUsername.trim() || !editEmail.trim() || !editBalance) {
      setEditError('All fields are required');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername.trim(),
          email: editEmail.trim(),
          balance: parseFloat(editBalance),
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditError(d.error || 'Failed to update');
        return;
      }
      const updated = await res.json();
      setUser(updated);
      setEditOpen(false);
    } catch {
      setEditError('Network error');
    } finally {
      setEditSaving(false);
    }
  }

  const totalPages = Math.ceil(transfersTotal / pageSize);

  const columns = useMemo(() => {
    const ch = createColumnHelper<Transfer>();
    return [
      ch.accessor('amount', {
        header: 'Amount',
        cell: (info) => <span className="font-semibold text-gray-800">{formatAmount(info.getValue())}</span>,
      }),
      ch.accessor('type', {
        header: 'Type',
        cell: (info) => <span className="text-gray-700">{typeLabels[info.getValue()] || info.getValue()}</span>,
      }),
      ch.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${transferStatusStyles[info.getValue()]}`}>
            {info.getValue()}
          </span>
        ),
      }),
      ch.accessor('transactionId', {
        header: 'Transaction ID',
        cell: (info) => <span className="font-mono text-xs text-gray-700">{info.getValue()}</span>,
      }),
      ch.accessor('createdAt', {
        header: 'Date',
        cell: (info) => <span className="text-xs text-gray-500">{formatDate(info.getValue())}</span>,
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

  if (loading && !user) {
    return <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin-dashboard/users" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="size-4" />
        Back to Users
      </Link>

      {/* User Info */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primarycolor text-lg font-bold text-white">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-zinc-900">{user.username}</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={openEditor}>
            <Pencil className="size-3.5" />
            Edit User
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Status</p>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${statusStyles[user.status]}`}>{user.status}</span>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Balance</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{formatAmount(user.balance)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Bets</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{user._count.bets}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">Transfers</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{user._count.transfers}</p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Transactions</h2>
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
                <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zinc-400">Loading...</td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zinc-400">No transactions</td></tr>
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
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
            <span>Page {page} of {totalPages} ({transfersTotal} total)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          {editError && (
            <div className="rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">{editError}</div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Username <span className="text-red-400">*</span></label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Email <span className="text-red-400">*</span></label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Balance <span className="text-red-400">*</span></label>
              <Input type="number" step="0.01" min="0" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Status <span className="text-red-400">*</span></label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                className="h-8 w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-700 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="PENDING">PENDING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button className="bg-gray-700 text-red-400 hover:bg-gray-600" />}>Cancel</DialogClose>
            <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
