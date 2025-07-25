import { useState, useEffect } from 'react';
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobsWithDuration = data.map(job => ({
        ...job,
        duration: calculateDuration(job.started_at, job.completed_at),
        created_at: job.created_at || new Date().toISOString(),
      }));

      setJobs(jobsWithDuration);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Failed to load jobs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (fileId: string, jobName: string): Promise<boolean> => {
    try {
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

      toast({
        title: 'Job created successfully',
        description: `Processing ${data.urlCount} LinkedIn URLs`,
      });

      await fetchJobs();
      return true;
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast({
        title: 'Failed to create job',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const manageJob = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): Promise<boolean> => {
    try {
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

      toast({
        title: 'Job updated',
        description: data.message,
      });

      await fetchJobs();
      return true;
    } catch (error: any) {
      console.error('Error managing job:', error);
      toast({
        title: 'Failed to update job',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

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
    fetchJobs();

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
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    jobs,
    loading,
    createJob,
    manageJob,
    exportResults,
    refreshJobs: fetchJobs,
  };
};