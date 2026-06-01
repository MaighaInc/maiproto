import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Approvals' };

interface ApprovalReceipt {
  id: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  metadata: { merchantName: string | null; total: number | null; currency: string | null } | null;
  vendor: { name: string } | null;
  uploadedBy: { firstName: string; lastName: string; email: string } | null;
}

export default async function ApprovalsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.accessToken;

  let items: ApprovalReceipt[] = [];
  let total = 0;

  try {
    const data = await apiFetch<{ data: ApprovalReceipt[]; total: number }>(
      '/receipts?status=PENDING_APPROVAL&limit=50',
      { accessToken: token },
    );
    items = data.data;
    total = data.total;
  } catch {
    // render empty state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">{total} receipt{total !== 1 ? 's' : ''} pending approval</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">No receipts pending approval.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Merchant</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted by</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {item.metadata?.merchantName ?? item.vendor?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.metadata?.total != null
                      ? formatCurrency(item.metadata.total, item.metadata.currency ?? 'USD')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.uploadedBy
                      ? `${item.uploadedBy.firstName} ${item.uploadedBy.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.submittedAt ? formatDate(item.submittedAt) : formatDate(item.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/receipts/${item.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Review
                    </a>
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
