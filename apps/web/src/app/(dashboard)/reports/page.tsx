import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Reports' };

interface KPIData {
  totalSpend: number;
  receiptCount: number;
  pendingApprovals: number;
  unmatchedTransactions: number;
}

interface SpendByCategory {
  category: string;
  total: number;
  count: number;
}

export default async function ReportsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.['accessToken'] as string | undefined;

  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const dateTo = now.toISOString();

  let kpi: KPIData = { totalSpend: 0, receiptCount: 0, pendingApprovals: 0, unmatchedTransactions: 0 };
  let byCategory: SpendByCategory[] = [];

  try {
    [kpi, byCategory] = await Promise.all([
      apiFetch<KPIData>(`/reports/kpi?dateFrom=${dateFrom}&dateTo=${dateTo}`, { accessToken: token }),
      apiFetch<SpendByCategory[]>(`/reports/spend-by-category?dateFrom=${dateFrom}&dateTo=${dateTo}`, { accessToken: token }).catch(() => []),
    ]);
  } catch {
    // render with zeros
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Month-to-date summary</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Spend" value={formatCurrency(kpi.totalSpend)} />
        <StatCard label="Receipts" value={String(kpi.receiptCount)} />
        <StatCard label="Pending Approvals" value={String(kpi.pendingApprovals)} alert={kpi.pendingApprovals > 0} />
        <StatCard label="Unmatched Transactions" value={String(kpi.unmatchedTransactions)} alert={kpi.unmatchedTransactions > 0} />
      </div>

      {byCategory.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Spend by Category</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Receipts</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {byCategory.map((row) => (
                <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 font-medium">{row.category}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{row.count}</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }): React.JSX.Element {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${alert ? 'border-amber-300' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  );
}
