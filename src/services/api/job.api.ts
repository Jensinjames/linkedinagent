import { supabase } from '@/integrations/supabase/client';
import { formatErrorMessage } from '@/lib/error-handling';

export interface Job {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  total_urls: number;
  processed_urls: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  input_file_id?: string;
  output_file_id?: string;
  settings?: Record<string, any>;
  processing_strategy?: Record<string, any>;
  ai_enhancement_enabled: boolean;
  proxy_usage_stats?: Record<string, any>;
  quality_metrics?: Record<string, any>;
  // Computed properties
  duration?: string;
}

export interface CreateJobRequest {
  name: string;
  description?: string;
  user_id: string;
  total_urls?: number;
  input_file_id?: string;
  settings?: Record<string, any>;
}

export interface UpdateJobRequest {
  status?: string;
  progress?: number;
  processed_urls?: number;
  error_message?: string;
  completed_at?: string;
  quality_metrics?: Record<string, any>;
}

export class JobApi {
  async getJobs(userId?: string): Promise<{ data?: Job[]; error?: string }> {
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return { data: data as Job[] };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getJobById(id: string): Promise<{ data?: Job; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Job not found' };
      }

      return { data: data as Job };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async createJob(jobData: CreateJobRequest): Promise<{ data?: Job; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data: data as Job };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async updateJob(id: string, updates: UpdateJobRequest): Promise<{ data?: Job; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data: data as Job };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async deleteJob(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getJobStats(): Promise<{ 
    data?: { 
      total: number; 
      running: number; 
      completed: number; 
      failed: number; 
    }; 
    error?: string; 
  }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('status');

      if (error) {
        return { error: error.message };
      }

      const stats = {
        total: data.length,
        running: data.filter(job => job.status === 'running').length,
        completed: data.filter(job => job.status === 'completed').length,
        failed: data.filter(job => job.status === 'failed').length,
      };

      return { data: stats };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }
}

export const jobApi = new JobApi();