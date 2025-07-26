import { jobApi, Job, CreateJobRequest, UpdateJobRequest } from '../api/job.api';
import { scrapedProfileApi } from '../api/scraped-profile.api';
import { supabase } from '@/integrations/supabase/client';
import { formatErrorMessage } from '@/lib/error-handling';

export type JobAction = 'pause' | 'resume' | 'cancel' | 'retry';

export interface JobDurationStats {
  averageDuration: number;
  totalJobs: number;
}

export interface JobWithProfiles extends Job {
  profiles?: any[];
}

export class JobService {
  async getJobs(): Promise<{ data?: Job[]; error?: string }> {
    const result = await jobApi.getJobs();
    if (result.error || !result.data) {
      return result;
    }

    // Add computed properties
    const jobsWithDuration = result.data.map(job => ({
      ...job,
      duration: this.calculateDuration(job.started_at, job.completed_at)
    }));

    return { data: jobsWithDuration };
  }

  async getJobById(id: string): Promise<{ data?: Job; error?: string }> {
    return jobApi.getJobById(id);
  }

  async getJobWithProfiles(id: string): Promise<{ data?: JobWithProfiles; error?: string }> {
    try {
      const jobResult = await jobApi.getJobById(id);
      if (jobResult.error || !jobResult.data) {
        return jobResult;
      }

      const profilesResult = await scrapedProfileApi.getProfilesByJobId(id);
      if (profilesResult.error) {
        return { error: profilesResult.error };
      }

      return {
        data: {
          ...jobResult.data,
          profiles: profilesResult.data || []
        }
      };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async createJob(fileId: string, jobName: string): Promise<{ data?: { jobId: string }; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-file', {
        body: { fileId, jobName }
      });

      if (error) {
        return { error: error.message };
      }

      return { data: { jobId: data.jobId } };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async manageJob(jobId: string, action: JobAction): Promise<{ data?: Job; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-job', {
        body: { jobId, action }
      });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async exportResults(jobId: string): Promise<{ error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('export-results', {
        body: { jobId }
      });

      if (error) {
        return { error: error.message };
      }

      // Trigger download
      if (data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || `job-${jobId}-results.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return {};
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getJobStats(): Promise<{ 
    data?: { 
      totalJobs: number; 
      successRate: number; 
      averageDuration: number; 
    }; 
    error?: string; 
  }> {
    try {
      const jobStatsResult = await jobApi.getJobStats();
      if (jobStatsResult.error) {
        return { error: jobStatsResult.error };
      }

      const profileStatsResult = await scrapedProfileApi.getProfileStats();
      if (profileStatsResult.error) {
        return { error: profileStatsResult.error };
      }

      const durationResult = await this.calculateAverageDuration();
      if (durationResult.error) {
        return { error: durationResult.error };
      }

      const jobStats = jobStatsResult.data!;
      const profileStats = profileStatsResult.data!;
      const duration = durationResult.data!;

      const successRate = profileStats.total > 0 
        ? (profileStats.completed / profileStats.total) * 100 
        : 0;

      return {
        data: {
          totalJobs: jobStats.total,
          successRate: Math.round(successRate * 100) / 100,
          averageDuration: duration.averageDuration
        }
      };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  private async calculateAverageDuration(): Promise<{ data?: JobDurationStats; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at, completed_at')
        .not('completed_at', 'is', null);

      if (error) {
        return { error: error.message };
      }

      if (data.length === 0) {
        return { data: { averageDuration: 0, totalJobs: 0 } };
      }

      const durations = data.map(job => {
        const start = new Date(job.created_at).getTime();
        const end = new Date(job.completed_at).getTime();
        return (end - start) / 1000; // Convert to seconds
      });

      const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

      return {
        data: {
          averageDuration: Math.round(averageDuration * 100) / 100,
          totalJobs: data.length
        }
      };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  calculateProgress(job: Job): number {
    if (job.total_urls === 0) return 0;
    return Math.round((job.processed_urls / job.total_urls) * 100);
  }

  getJobStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600';
      case 'running':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      case 'paused':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }

  getJobStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'running':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  calculateDuration(startedAt?: string, completedAt?: string): string | undefined {
    if (!startedAt || !completedAt) return undefined;

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diff = end.getTime() - start.getTime();

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  }
}

export const jobService = new JobService();