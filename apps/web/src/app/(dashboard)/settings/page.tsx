import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Settings' };

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mfaEnabled: boolean;
  createdAt: string;
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  const token = session?.user?.['accessToken'] as string | undefined;

  let profile: UserProfile | null = null;

  try {
    profile = await apiFetch<UserProfile>('/users/me', { accessToken: token });
  } catch {
    // render with session fallback
  }

  const name = profile
    ? `${profile.firstName} ${profile.lastName}`
    : (session?.user?.name ?? '—');
  const email = profile?.email ?? session?.user?.email ?? '—';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm divide-y">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-base mb-4">Profile</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Full name</dt>
              <dd className="font-medium">{name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">MFA</dt>
              <dd className="font-medium">{profile?.mfaEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
        </div>

        <div className="px-6 py-4">
          <h2 className="font-semibold text-base mb-4">Navigation</h2>
          <div className="flex flex-col gap-2 text-sm">
            <a href="/settings/organization" className="text-primary hover:underline">
              Organization settings →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
