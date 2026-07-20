import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage(): Promise<never> {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/auth/login');
  }
}
