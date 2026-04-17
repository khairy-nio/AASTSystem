import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function BranchManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'BRANCH_MANAGER' && profile.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
