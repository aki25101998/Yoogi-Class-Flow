import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useVenues(organizationId: string | undefined) {
  const supabase = createClient();

  const {
    data: venues = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    venues,
    isLoading,
    error,
  };
}
