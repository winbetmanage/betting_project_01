'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useMarketStore } from '@/stores/market-store';

export function RemoveFromMarketButton({ matchId, marketKey }: { matchId: string; marketKey: string }) {
  const router = useRouter();
  const addedMarkets = useMarketStore((s) => s.addedMarkets);
  const addedKeys = useMarketStore((s) => s.addedKeys);
  const removeMarketEntry = useMarketStore((s) => s.removeMarketEntry);
  const addMarketEntry = useMarketStore((s) => s.addMarketEntry);
  const setAdded = useMarketStore((s) => s.setAdded);
  const removedEntryRef = useRef<{ key: string; label: string; details: { label: string; value: string }[] } | null>(null);
  const removedKeyRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const entry = addedMarkets.find((m) => m.key === marketKey);
    if (entry) {
      removedEntryRef.current = { ...entry, details: [...entry.details] };
    }
    if (addedKeys[marketKey]) {
      removedKeyRef.current = marketKey;
    }
    removeMarketEntry(marketKey);
    try {
      const res = await fetch('/api/admin/remove-from-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, marketKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (removedEntryRef.current) addMarketEntry(removedEntryRef.current);
        else if (removedKeyRef.current) setAdded(removedKeyRef.current);
        toast.error(data.error || 'Failed to remove market');
        return;
      }
      toast.success(`"${marketKey}" removed from markets`);
      router.refresh();
    } catch {
      if (removedEntryRef.current) addMarketEntry(removedEntryRef.current);
      else if (removedKeyRef.current) setAdded(removedKeyRef.current);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="xs" variant="destructive" onClick={handleRemove} disabled={loading}>
      <X className="size-3" />
      {loading ? 'Removing...' : 'Remove'}
    </Button>
  );
}
