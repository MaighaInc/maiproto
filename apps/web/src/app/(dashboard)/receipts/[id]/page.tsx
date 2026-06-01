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
  // Fields populated by OCR worker
  merchantName: string | null;
  merchantAddress: string | null;
  transactionDate: string | null;
  subtotal: string | null;
  tax: string | null;
  tip: string | null;
  total: string | null;
  currency: string | null;
  paymentMethod: string | null;
  last4Digits: string | null;
  lineItems: Array<{ id: string; description: string; quantity: number | null; unitPrice: string | null; amount: string | null }>;
  files: Array<{ id: string; storageKey: string; mimeType: string; originalName: string }>;
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.accessToken;
  const { id } = await params;

  let receipt: ReceiptDetail;
  try {
    const data = await apiFetch<{ data: ReceiptDetail }>(`/receipts/${id}`, { accessToken: token });
    receipt = data.data;
  } catch {
    notFound();
  }

  const isProcessing = receipt.status === 'DRAFT' || receipt.status === 'PROCESSING';
  const hasData = receipt.merchantName ?? receipt.total ?? receipt.transactionDate;
  const currency = receipt.currency ?? 'USD';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {receipt.merchantName ?? 'Receipt'}
          </h1>
          <p className="text-muted-foreground text-sm">{id}</p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-muted">
          {receipt.status}
        </span>
      </div>

      {isProcessing && !hasData && (
        <div className="rounded-xl border bg-amber-50 border-amber-200 p-6 text-center space-y-2">
          <p className="font-medium text-amber-800">Extracting receipt data…</p>
          <p className="text-sm text-amber-700">The OCR worker is processing your file. Refresh in a moment.</p>
          <a
            href={`/receipts/${id}`}
            className="inline-block mt-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Refresh
          </a>
        </div>
      )}

      {hasData && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Receipt Details</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {receipt.transactionDate && (
              <>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDate(receipt.transactionDate)}</dd>
              </>
            )}
            {receipt.merchantAddress && (
              <>
                <dt className="text-muted-foreground">Address</dt>
                <dd>{receipt.merchantAddress}</dd>
              </>
            )}
            {receipt.paymentMethod && (
              <>
                <dt className="text-muted-foreground">Payment</dt>
                <dd>{receipt.paymentMethod}{receipt.last4Digits ? ` •••• ${receipt.last4Digits}` : ''}</dd>
              </>
            )}
            {receipt.subtotal != null && (
              <>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatCurrency(Number(receipt.subtotal), currency)}</dd>
              </>
            )}
            {receipt.tax != null && (
              <>
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatCurrency(Number(receipt.tax), currency)}</dd>
              </>
            )}
            {receipt.tip != null && (
              <>
                <dt className="text-muted-foreground">Tip</dt>
                <dd>{formatCurrency(Number(receipt.tip), currency)}</dd>
              </>
            )}
            {receipt.total != null && (
              <>
                <dt className="font-medium">Total</dt>
                <dd className="font-bold text-lg">{formatCurrency(Number(receipt.total), currency)}</dd>
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
                  <td className="px-4 py-2 text-right tabular-nums">{item.quantity ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {item.unitPrice != null ? formatCurrency(Number(item.unitPrice), currency) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {item.amount != null ? formatCurrency(Number(item.amount), currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt.files.length > 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-2">
          <h2 className="font-semibold mb-3">Files</h2>
          {receipt.files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{f.mimeType}</span>
              <span>{f.originalName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
