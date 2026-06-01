import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

interface KPIData {
  totalSpend: number;
  receiptCount: number;
  pendingApprovals: number;
  unmatchedTransactions: number;
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.accessToken;

  let kpi: KPIData = { totalSpend: 0, receiptCount: 0, pendingApprovals: 0, unmatchedTransactions: 0 };

  try {
    const dateFrom = new Date();
    dateFrom.setDate(1);
    kpi = await apiFetch<KPIData>(
      `/reports/kpi?dateFrom=${dateFrom.toISOString()}`,
      { accessToken: token },
    );
  } catch {
    // Non-blocking: render with zeros if API call fails
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here&apos;s your month-to-date summary.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Total Spend (MTD)" value={formatCurrency(kpi.totalSpend)} />
        <KPICard label="Receipts Uploaded" value={String(kpi.receiptCount)} />
        <KPICard label="Pending Approvals" value={String(kpi.pendingApprovals)} highlight={kpi.pendingApprovals > 0} />
        <KPICard label="Unmatched Transactions" value={String(kpi.unmatchedTransactions)} highlight={kpi.unmatchedTransactions > 0} />
      </div>
    </div>
  );
}

function KPICard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }): React.JSX.Element {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${highlight ? 'border-orange-300 dark:border-orange-700' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${highlight ? 'text-orange-600 dark:text-orange-400' : ''}`}>{value}</p>
    </div>
  );
}
