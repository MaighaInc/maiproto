'use client';

import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SearchResult {
  id: string;
  status: string;
  createdAt: string;
  metadata: { merchantName: string | null; total: number | null; currency: string | null } | null;
  vendor: { name: string } | null;
}

export default function SearchPage(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/proxy/receipts?search=${encodeURIComponent(query)}&limit=50`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = (await res.json()) as { data: SearchResult[] };
        setResults(data.data ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">Search receipts by merchant, amount, or vendor.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search receipts…"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searched && (
        results.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center shadow-sm">
            <p className="text-muted-foreground">No receipts found for &quot;{query}&quot;.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Merchant</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {r.metadata?.merchantName ?? r.vendor?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.metadata?.total != null
                        ? formatCurrency(r.metadata.total, r.metadata.currency ?? 'USD')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <a href={`/receipts/${r.id}`} className="text-primary hover:underline font-medium">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
