import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Organization Settings' };

interface Organization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  fiscalYearStart: number | null;
  createdAt: string;
}

export default async function OrganizationSettingsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.accessToken;

  let org: Organization | null = null;

  try {
    org = await apiFetch<Organization>('/organizations/current', { accessToken: token });
  } catch {
    // render empty state
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/settings" className="hover:text-foreground transition-colors">Settings</a>
        <span>/</span>
        <span>Organization</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground">View and manage your organization details.</p>
      </div>

      {org === null ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">Organization details unavailable.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="px-6 py-4">
            <h2 className="font-semibold text-base mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{org.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono text-xs bg-muted rounded px-2 py-0.5">{org.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-medium">{org.currency}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Timezone</dt>
                <dd className="font-medium">{org.timezone}</dd>
              </div>
              {org.fiscalYearStart != null && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Fiscal year start (month)</dt>
                  <dd className="font-medium">{org.fiscalYearStart}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
