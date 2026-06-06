'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
} from '@tanstack/react-table';

type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

type User = {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  balance: number;
  createdAt: string;
  _count: { bets: number; transfers: number };
};

const statusStyles: Record<UserStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300',
  ACTIVE: 'bg-green-900/40 text-green-300',
  INACTIVE: 'bg-zinc-600/40 text-zinc-300',
  SUSPENDED: 'bg-red-900/40 text-red-300',
};

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
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
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const pageSize = 20;



  const fetchUsers = useCallback(async (p: number, s: string, sort: SortingState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p.toString(), pageSize: pageSize.toString() });
      if (s) params.set('search', s);
      if (sort.length > 0) {
        params.set('sortBy', sort[0].id);
        params.set('sortOrder', sort[0].desc ? 'desc' : 'asc');
      }
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search, sorting);
  }, [page, search, sorting, fetchUsers]);

  function handleSearch() {
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / pageSize);

  const columns = useMemo(() => {
    const ch = createColumnHelper<User>();
    return [
      ch.accessor('username', {
        header: 'Username',
        cell: (info) => <span className="font-medium text-gray-800">{info.getValue()}</span>,
      }),
      ch.accessor('email', {
        header: 'Email',
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      ch.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      ch.accessor('balance', {
        header: 'Balance',
        cell: (info) => <span className="font-semibold text-gray-800">{formatAmount(info.getValue())}</span>,
      }),
      ch.accessor('createdAt', {
        header: 'Joined',
        cell: (info) => <span className="text-gray-500 text-xs">{formatDate(info.getValue())}</span>,
      }),
      ch.display({
        id: 'details',
        header: '',
        cell: ({ row }) => (
          <Link href={`/admin-dashboard/users/${row.original.id}`}>
            <Button variant="outline" size="xs">
              <Eye className="size-3" />
              Details
            </Button>
          </Link>
        ),
      }),
    ];
  }, []);

  const table = useReactTable({
    data: users,
    columns,
    pageCount: totalPages,
    state: { pagination: { pageIndex: page - 1, pageSize }, sorting },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }) : updater;
      setPage(next.pageIndex + 1);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      setPage(1);
    },
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage registered users</p>
      </div>

      {/* Search */}
      <div className="flex max-w-sm gap-2">
        <Input
          placeholder="Search by username or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-zinc-800' : ''}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
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
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zinc-400">No users found</td>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Page {page} of {totalPages} ({total} users)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

    </div>
  );
}
