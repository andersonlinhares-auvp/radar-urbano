import { auth } from '@/auth';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}
