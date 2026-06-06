'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/common_components/Navbar';
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
import { Wallet, Plus, Eye } from 'lucide-react';
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
  transactionId: string | null;
  name: string | null;
  phone: string | null;
  reason: string | null;
  img: string | null;
  createdAt: string;
};

const statusStyles: Record<TransferStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300',
  APPROVED: 'bg-green-900/40 text-green-300',
  REJECTED: 'bg-red-900/40 text-red-300',
};

function StatusBadge({ status }: { status: TransferStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}
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

export default function BalancePage() {
  const router = useRouter();

  // balance
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // add transfer dialog
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addType, setAddType] = useState('TELE_BIRR');
  const [addTransactionId, setAddTransactionId] = useState('');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addReason, setAddReason] = useState('');
  const [addImg, setAddImg] = useState<File | null>(null);
  const [addImgPreview, setAddImgPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // transfers table
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);
  const pageSize = 15;

  // detail dialog
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

  useEffect(() => {
    fetch('/api/user/balance')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then((data) => setBalance(Number(data.balance)))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    setTableLoading(true);
    fetch(`/api/user/transfers?page=${page}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        setTransfers(data.transfers ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setTableLoading(false));
  }, [page]);

  function resetAddForm() {
    setAddAmount('');
    setAddType('TELE_BIRR');
    setAddTransactionId('');
    setAddName('');
    setAddPhone('');
    setAddReason('');
    setAddImg(null);
    setAddImgPreview(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadedUrl(null);
    setAddErrors({});
  }

  async function handleAddSubmit() {
    const fieldErrors: Record<string, string> = {};
    if (!addAmount || parseFloat(addAmount) <= 0) fieldErrors.amount = 'Amount must be positive';
    if (Object.keys(fieldErrors).length > 0) { setAddErrors(fieldErrors); return; }

    setSubmitting(true);

    try {
      const res = await fetch('/api/user/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(addAmount),
          transactionId: addTransactionId.trim() || undefined,
          type: addType,
          name: addName.trim() || undefined,
          phone: addPhone.trim() || undefined,
          reason: addReason.trim() || undefined,
          img: uploadedUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddErrors(data.errors ?? { form: 'Failed to submit' });
        return;
      }
      setAddOpen(false);
      resetAddForm();
      setPage(1);
      const r2 = await fetch(`/api/user/transfers?page=1&pageSize=${pageSize}`);
      const d2 = await r2.json();
      setTransfers(d2.transfers ?? []);
      setTotal(d2.total ?? 0);
    } catch {
      setAddErrors({ form: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  function openDetail(t: Transfer) {
    setDetailTransfer(t);
    setEditAmount(t.amount.toString());
    setEditType(t.type);
    setEditTransactionId(t.transactionId ?? '');
    setEditName(t.name ?? '');
    setEditPhone(t.phone ?? '');
    setEditReason(t.reason ?? '');
    setEditErrors({});
    setDetailOpen(true);
  }

  async function handleEditSave() {
    if (!detailTransfer) return;
    const fieldErrors: Record<string, string> = {};
    if (!editAmount || parseFloat(editAmount) <= 0) fieldErrors.amount = 'Amount must be positive';
    if (!editTransactionId.trim()) fieldErrors.transactionId = 'Transaction ID is required';
    if (Object.keys(fieldErrors).length > 0) { setEditErrors(fieldErrors); return; }

    setEditSaving(true);
    try {
      const res = await fetch('/api/user/transfers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: detailTransfer.id,
          amount: parseFloat(editAmount),
          transactionId: editTransactionId.trim(),
          type: editType,
          name: editName.trim() || undefined,
          phone: editPhone.trim() || undefined,
          reason: editReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditErrors(data.errors ?? { form: 'Failed to update' });
        return;
      }
      const updated = await res.json();
      setTransfers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setDetailOpen(false);
    } catch {
      setEditErrors({ form: 'Network error. Please try again.' });
    } finally {
      setEditSaving(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  const columns = useMemo(() => {
    const ch = createColumnHelper<Transfer>();
    return [
      ch.accessor('amount', {
        header: 'Amount',
        cell: (info) => (
          <span className="font-semibold text-zinc-200">
            {formatAmount(info.getValue())}
          </span>
        ),
      }),
      ch.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      ch.display({
        id: 'details',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="xs"
            onClick={() => openDetail(row.original)}
          >
            <Eye className="size-3" />
            Details
          </Button>
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
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      setPage(next.pageIndex + 1);
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        {/* Balance Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primarycolor">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Balance</h1>
              <p className="text-sm text-zinc-400">Your current wallet balance</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
            <p className="text-sm text-zinc-500">Available Balance</p>
            {loading ? (
              <p className="mt-2 text-3xl font-bold text-zinc-500">...</p>
            ) : (
              <p className="mt-2 text-4xl font-bold text-primarycolor">
                ETB {balance?.toFixed(2) ?? '0.00'}
              </p>
            )}
          </div>

          <div className="mt-6">
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                resetAddForm();
                setAddOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Balance
            </Button>
          </div>
        </div>

        {/* Transfers Table */}
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-white">Transfer History</h2>

          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr
                    key={hg.id}
                    className="border-b border-zinc-800 bg-zinc-950 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-sm text-zinc-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-sm text-zinc-500"
                    >
                      No transfers yet
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Transfer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Money Transfer</DialogTitle>
          </DialogHeader>

          {addErrors.form && (
            <div className="rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">
              {addErrors.form}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Amount <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.00"
              />
              {addErrors.amount && (
                <p className="mt-1 text-xs text-red-400">{addErrors.amount}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Transfer Method <span className="text-red-400">*</span>
              </label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-sm text-zinc-300 focus-visible:border-primarycolor focus-visible:ring-1 focus-visible:ring-primarycolor"
              >
                {transferTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Transaction ID
              </label>
              <Input
                value={addTransactionId}
                onChange={(e) => setAddTransactionId(e.target.value)}
                placeholder="e.g. TRX-123456 (optional)"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Screenshot (optional)</label>
              <input
                type="file"
                accept="image/*"
                disabled={uploadStatus === 'uploading'}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAddImg(file);
                  setAddImgPreview(file ? URL.createObjectURL(file) : null);
                  if (!file) { setUploadStatus('idle'); setUploadProgress(0); setUploadedUrl(null); return; }

                  setUploadStatus('uploading');
                  setUploadProgress(0);

                  const formData = new FormData();
                  formData.append('file', file);
                  const xhr = new XMLHttpRequest();
                  xhr.upload.addEventListener('progress', (evt) => {
                    if (evt.lengthComputable) {
                      setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
                    }
                  });
                  xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      const data = JSON.parse(xhr.responseText);
                      setUploadedUrl(data.url);
                      setUploadStatus('done');
                    } else {
                      try {
                        const err = JSON.parse(xhr.responseText);
                        setAddErrors({ form: err.detail ? `Upload failed: ${err.detail}` : 'Upload failed' });
                      } catch {
                        setAddErrors({ form: 'Upload failed' });
                      }
                      setUploadStatus('failed');
                    }
                  });
                  xhr.addEventListener('error', () => setUploadStatus('failed'));
                  xhr.open('POST', '/api/upload');
                  xhr.send(formData);
                }}
                className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-300 hover:file:bg-zinc-700 disabled:opacity-50"
              />
              {uploadStatus === 'uploading' && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-primarycolor transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Uploading... {uploadProgress}%</p>
                </div>
              )}
              {uploadStatus === 'failed' && (
                <p className="mt-1 text-xs text-red-400">Upload failed. Try selecting the file again.</p>
              )}
              {addImgPreview && uploadStatus !== 'uploading' && (
                <img src={addImgPreview} alt="Preview" className="mt-2 max-h-32 rounded-lg object-contain" />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Full Name</label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Phone Number</label>
              <Input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+251 9XX XXX XXX"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Reason (optional)</label>
              <Input
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="Deposit"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button className="bg-gray-700 text-red-400 hover:bg-gray-600" />}>Cancel</DialogClose>
            <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleAddSubmit} disabled={submitting || uploadStatus === 'uploading'}>
              {submitting ? 'Submitting...' : uploadStatus === 'uploading' ? 'Uploading image...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailTransfer
                ? `${typeLabels[detailTransfer.type as TransferType]} Transfer`
                : 'Transfer Details'}
            </DialogTitle>
          </DialogHeader>

          {editErrors.form && (
            <div className="rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">
              {editErrors.form}
            </div>
          )}

          {detailTransfer && (
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg bg-zinc-950 px-3 py-2 text-sm">
                <span className="text-zinc-500">Status</span>
                <StatusBadge status={detailTransfer.status} />
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-950 px-3 py-2 text-sm">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-300">{formatDate(detailTransfer.createdAt)}</span>
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Amount <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  disabled={detailTransfer.status !== 'PENDING'}
                />
                {editErrors.amount && (
                  <p className="mt-1 text-xs text-red-400">{editErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Transfer Method <span className="text-red-400">*</span>
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  disabled={detailTransfer.status !== 'PENDING'}
                  className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-sm text-zinc-300 focus-visible:border-primarycolor focus-visible:ring-1 focus-visible:ring-primarycolor disabled:opacity-50"
                >
                  {transferTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Transaction ID <span className="text-red-400">*</span>
                </label>
                <Input
                  value={editTransactionId}
                  onChange={(e) => setEditTransactionId(e.target.value)}
                  disabled={detailTransfer.status !== 'PENDING'}
                />
                {editErrors.transactionId && (
                  <p className="mt-1 text-xs text-red-400">{editErrors.transactionId}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Full Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={detailTransfer.status !== 'PENDING'}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Phone Number</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={detailTransfer.status !== 'PENDING'}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Reason</label>
                <Input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  disabled={detailTransfer.status !== 'PENDING'}
                />
              </div>

              {detailTransfer.img && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Screenshot</label>
                  <img
                    src={detailTransfer.img}
                    alt="Transfer screenshot"
                    className="max-h-48 w-full rounded-lg object-contain border border-zinc-700"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button className="bg-gray-700 text-red-400 hover:bg-gray-600" />}>Close</DialogClose>
            {detailTransfer?.status === 'PENDING' && (
              <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
