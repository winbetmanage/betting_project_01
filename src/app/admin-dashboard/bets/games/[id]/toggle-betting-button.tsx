'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ToggleBettingButton({ matchId, isInBetting }: { matchId: string; isInBetting: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/betting-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: [matchId], addToBetting: !isInBetting }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
        return;
      }
      toast.success(isInBetting ? 'Removed from betting' : 'Added to betting');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="xs" variant={isInBetting ? 'destructive' : 'default'} onClick={handleToggle} disabled={loading}>
      {loading ? 'Updating...' : isInBetting ? 'Remove from Bets' : 'Add to Bets'}
    </Button>
  );
}
