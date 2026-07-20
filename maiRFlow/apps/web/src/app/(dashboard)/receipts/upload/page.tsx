'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export default function UploadReceiptPage(): React.JSX.Element {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Get session token from the NextAuth session endpoint
      const sessionRes = await fetch('/api/auth/session');
      const session = (await sessionRes.json()) as { user?: { accessToken?: string } };
      const token = session.user?.accessToken;

      const formData = new FormData();
      formData.append('files', file);

      const res = await fetch(`${API_URL}/api/v1/receipts/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
      }

      const data = (await res.json()) as { data: { receiptIds: string[] } };
      const firstId = data.data.receiptIds[0];
      if (!firstId) throw new Error('No receipt ID returned');
      router.push(`/receipts/${firstId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Receipt</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a receipt image or PDF. We&apos;ll extract the details automatically.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-12 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <svg
            className="mb-3 h-10 w-10 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          {file ? (
            <p className="text-sm font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Click to choose a file</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, PDF up to 10 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <a
            href="/receipts"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
