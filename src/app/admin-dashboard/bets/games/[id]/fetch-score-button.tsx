'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

type Props = {
  matchId: string;
  hasScore: boolean;
};

export function FetchScoreButton({ matchId, hasScore }: Props) {
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFetch() {
    setFetching(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/fetch-match-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed');
      } else if (data.completed) {
        setMessage(`Score fetched: ${data.homeScore} - ${data.awayScore}`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage(data.message || 'Not completed yet');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setFetching(false);
    }
  }

  if (hasScore) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="xs" onClick={handleFetch} disabled={fetching}>
        {fetching ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {fetching ? 'Fetching...' : 'Fetch Score'}
      </Button>
      {message && (
        <span className={`text-xs ${message.includes('Score fetched') ? 'text-green-600' : 'text-zinc-500'}`}>
          {message}
        </span>
      )}
    </div>
  );
}
