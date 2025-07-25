import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Job {
  id: string;
  name: string;
  description?: string | null;
  status: string; // Will be cast to correct type
  progress: number;
  total_urls: number;
  processed_urls: number;
  created_at: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration?: string;
  error_message?: string | null;
  user_id: string;
  input_file_id?: string | null;
  output_file_id?: string | null;
  retry_count?: number | null;
  updated_at?: string | null;
  max_retries?: number | null;
  settings?: any;
}

export const useJobs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: loading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(job => ({
        ...job,
        duration: calculateDuration(job.started_at, job.completed_at),
        created_at: job.created_at || new Date().toISOString(),
      }));
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const createJobMutation = useMutation({
    mutationFn: async ({ fileId, jobName }: { fileId: string; jobName: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('process-file', {
        body: { fileId, jobName },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Job creation failed');
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Job created successfully',
        description: `Processing ${data.urlCount} LinkedIn URLs`,
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create job',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createJob = useCallback(async (fileId: string, jobName: string): Promise<boolean> => {
    try {
      await createJobMutation.mutateAsync({ fileId, jobName });
      return true;
    } catch {
      return false;
    }
  }, [createJobMutation]);

  const manageJobMutation = useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: 'pause' | 'resume' | 'cancel' | 'retry' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-job', {
        body: { jobId, action },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Job management failed');
      
      return data;
    },
    onMutate: async ({ jobId, action }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData(['jobs']);
      
      queryClient.setQueryData(['jobs'], (old: Job[] | undefined) => {
        if (!old) return old;
        return old.map(job => 
          job.id === jobId 
            ? { ...job, status: action === 'pause' ? 'paused' : action === 'resume' ? 'running' : job.status }
            : job
        );
      });
      
      return { previousJobs };
    },
    onSuccess: (data) => {
      toast({
        title: 'Job updated',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: any, variables, context) => {
      queryClient.setQueryData(['jobs'], context?.previousJobs);
      toast({
        title: 'Failed to update job',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const manageJob = useCallback(async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): Promise<boolean> => {
    try {
      await manageJobMutation.mutateAsync({ jobId, action });
      return true;
    } catch {
      return false;
    }
  }, [manageJobMutation]);

  const exportResults = async (jobId: string): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('export-results', {
        body: { jobId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Export failed');

      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export completed',
        description: `Downloaded ${data.fileName}`,
      });
    } catch (error: any) {
      console.error('Error exporting results:', error);
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const calculateDuration = (startedAt?: string, completedAt?: string): string | undefined => {
    if (!startedAt || !completedAt) return undefined;

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diff = end.getTime() - start.getTime();

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    // Set up real-time subscription
    const subscription = supabase
      .channel('jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const refreshJobs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  }, [queryClient]);

  return {
    jobs,
    loading,
    createJob,
    manageJob,
    exportResults,
    refreshJobs,
  };
};