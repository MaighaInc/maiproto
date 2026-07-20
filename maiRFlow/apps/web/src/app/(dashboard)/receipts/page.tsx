import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Receipts' };

interface Receipt {
  id: string;
  status: string;
  createdAt: string;
  metadata: { merchantName: string | null; total: number | null; transactionDate: string | null } | null;
  vendor: { name: string } | null;
}

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.accessToken;
  const { page = '1', status } = await searchParams;

  let receipts: Receipt[] = [];
  let total = 0;

  try {
    const params = new URLSearchParams({ page, limit: '20', ...(status ? { status } : {}) });
    const data = await apiFetch<{ data: Receipt[]; total: number }>(
      `/receipts?${params}`,
      { accessToken: token },
    );
    receipts = data.data;
    total = data.total;
  } catch {
    // render empty state
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground">{total} receipts total</p>
        </div>
        <a
          href="/receipts/upload"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upload receipt
        </a>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Merchant</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No receipts found.
                </td>
              </tr>
            )}
            {receipts.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <a href={`/receipts/${r.id}`} className="font-medium hover:underline">
                    {r.vendor?.name ?? r.metadata?.merchantName ?? '—'}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.metadata?.transactionDate ? formatDate(r.metadata.transactionDate) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.metadata?.total != null ? formatCurrency(r.metadata.total) : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    EXTRACTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    CATEGORIZED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    REVIEW_REQUIRED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
