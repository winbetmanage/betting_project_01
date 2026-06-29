'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export function FetchOddsButton({ matchId, hasExistingFile }: { matchId: string; hasExistingFile: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fetch-game-odds-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch odds');
        return;
      }
      toast.success(`Odds saved to ${data.file}`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleFetch} disabled={loading}>
      <Download className="size-3.5" />
      {loading ? 'Fetching...' : hasExistingFile ? 'Refetch Market odds' : 'Fetch Market odds for this game'}
    </Button>
  );
}
