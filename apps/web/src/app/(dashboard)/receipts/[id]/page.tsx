import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Receipt Detail' };

interface ReceiptDetail {
  id: string;
  status: string;
  createdAt: string;
  vendor: { name: string } | null;
  metadata: {
    merchantName: string | null;
    merchantAddress: string | null;
    transactionDate: string | null;
    subtotal: number | null;
    tax: number | null;
    tip: number | null;
    total: number | null;
    currency: string;
    paymentMethod: string | null;
    last4Digits: string | null;
  } | null;
  lineItems: Array<{ id: string; description: string; quantity: number; unitPrice: number | null; totalPrice: number | null }>;
  files: Array<{ id: string; storageKey: string; mimeType: string }>;
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.['accessToken'] as string | undefined;
  const { id } = await params;

  let receipt: ReceiptDetail;
  try {
    const data = await apiFetch<{ data: ReceiptDetail }>(`/receipts/${id}`, { accessToken: token });
    receipt = data.data;
  } catch {
    notFound();
  }

  const meta = receipt.metadata;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {receipt.vendor?.name ?? meta?.merchantName ?? 'Receipt'}
          </h1>
          <p className="text-muted-foreground text-sm">{id}</p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-muted">
          {receipt.status}
        </span>
      </div>

      {meta && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Receipt Details</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {meta.transactionDate && (
              <>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDate(meta.transactionDate)}</dd>
              </>
            )}
            {meta.merchantAddress && (
              <>
                <dt className="text-muted-foreground">Address</dt>
                <dd>{meta.merchantAddress}</dd>
              </>
            )}
            {meta.paymentMethod && (
              <>
                <dt className="text-muted-foreground">Payment</dt>
                <dd>{meta.paymentMethod}{meta.last4Digits ? ` •••• ${meta.last4Digits}` : ''}</dd>
              </>
            )}
            {meta.subtotal != null && (
              <>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatCurrency(meta.subtotal, meta.currency)}</dd>
              </>
            )}
            {meta.tax != null && (
              <>
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatCurrency(meta.tax, meta.currency)}</dd>
              </>
            )}
            {meta.tip != null && (
              <>
                <dt className="text-muted-foreground">Tip</dt>
                <dd>{formatCurrency(meta.tip, meta.currency)}</dd>
              </>
            )}
            {meta.total != null && (
              <>
                <dt className="font-medium">Total</dt>
                <dd className="font-bold text-lg">{formatCurrency(meta.total, meta.currency)}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {receipt.lineItems.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <h2 className="font-semibold px-6 py-4 border-b">Line Items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Unit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lineItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{item.description}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {item.totalPrice != null ? formatCurrency(item.totalPrice) : '—'}
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
