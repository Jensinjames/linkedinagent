import { supabase } from '@/integrations/supabase/client';
import { formatErrorMessage } from '@/lib/error-handling';

export interface ScrapedProfile {
  id: string;
  job_id: string;
  linkedin_url: string;
  status: string;
  profile_data?: Record<string, any>;
  ai_enhanced_data?: Record<string, any>;
  quality_score?: number;
  error_message?: string;
  scraped_at?: string;
  created_at: string;
  processing_metadata?: Record<string, any>;
}

export class ScrapedProfileApi {
  async getProfilesByJobId(jobId: string): Promise<{ data?: ScrapedProfile[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('scraped_profiles')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data: data as ScrapedProfile[] };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getProfileById(id: string): Promise<{ data?: ScrapedProfile; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('scraped_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Profile not found' };
      }

      return { data: data as ScrapedProfile };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getProfileStats(jobId?: string): Promise<{ 
    data?: { 
      total: number; 
      completed: number; 
      pending: number; 
      failed: number; 
      avgQualityScore?: number; 
    }; 
    error?: string; 
  }> {
    try {
      let query = supabase.from('scraped_profiles').select('status, quality_score');

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      const qualityScores = data
        .filter(profile => profile.quality_score !== null)
        .map(profile => profile.quality_score);

      const stats = {
        total: data.length,
        completed: data.filter(profile => profile.status === 'completed').length,
        pending: data.filter(profile => profile.status === 'pending').length,
        failed: data.filter(profile => profile.status === 'failed').length,
        avgQualityScore: qualityScores.length > 0 
          ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
          : undefined
      };

      return { data: stats };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }
}

export const scrapedProfileApi = new ScrapedProfileApi();