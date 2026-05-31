'use client';

import { signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import type { Session } from 'next-auth';

export default function Header({ user }: { user: Session['user'] }): React.JSX.Element {
  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <button
          onClick={() => void signOut({ callbackUrl: '/auth/login' })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
