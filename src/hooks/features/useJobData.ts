import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobService } from '@/services/business/job.service';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useJobData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch jobs data
  const {
    data: jobs = [],
    isLoading: loading,
    error,
    refetch: refreshJobs
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const result = await jobService.getJobs();
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time updates
  });

  // Set up real-time subscription for jobs
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Jobs table change:', payload);
          // Invalidate and refetch jobs data
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, queryClient]);

  return {
    jobs,
    loading,
    error: error?.message,
    refreshJobs
  };
};