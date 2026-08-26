import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import FinanceClient from './FinanceClient';

export default async function FinancePage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get finance transactions
  const { data: transactions } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Sổ quỹ</h1>
      <FinanceClient 
        transactions={transactions || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
