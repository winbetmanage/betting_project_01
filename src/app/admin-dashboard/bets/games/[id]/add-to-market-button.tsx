'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useMarketStore } from '@/stores/market-store';

export function AddToMarketButton({ matchId, marketKey }: { matchId: string; marketKey: string }) {
  const router = useRouter();
  const setAdded = useMarketStore((s) => s.setAdded);
  const setRemoved = useMarketStore((s) => s.setRemoved);
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    setAdded(marketKey);
    try {
      const res = await fetch('/api/admin/add-to-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, marketKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRemoved(marketKey);
        toast.error(data.error || 'Failed to add market');
        return;
      }
      toast.success(`"${marketKey}" added to markets`);
      router.refresh();
    } catch {
      setRemoved(marketKey);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="xs" variant="outline" onClick={handleAdd} disabled={loading}>
      <Plus className="size-3" />
      {loading ? 'Adding...' : 'Add to Markets'}
    </Button>
  );
}
