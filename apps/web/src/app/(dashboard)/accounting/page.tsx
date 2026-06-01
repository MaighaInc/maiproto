import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Accounting' };

interface JournalEntry {
  id: string;
  status: string;
  postedAt: string | null;
  createdAt: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  receipt: { id: string; metadata: { merchantName: string | null } | null } | null;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.accessToken;
  const { page = '1', status } = await searchParams;

  let entries: JournalEntry[] = [];
  let total = 0;

  try {
    const params = new URLSearchParams({ page, limit: '20', ...(status ? { status } : {}) });
    const data = await apiFetch<{ data: JournalEntry[]; total: number }>(
      `/accounting/journal-entries?${params}`,
      { accessToken: token },
    );
    entries = data.data;
    total = data.total;
  } catch {
    // render empty state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">{total} journal entr{total !== 1 ? 'ies' : 'y'}</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">No journal entries found.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {entry.description ?? entry.receipt?.metadata?.merchantName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(entry.totalAmount, entry.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(entry.postedAt ?? entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const map: Record<string, string> = {
    POSTED: 'bg-green-100 text-green-800',
    DRAFT: 'bg-yellow-100 text-yellow-800',
    VOID: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}
