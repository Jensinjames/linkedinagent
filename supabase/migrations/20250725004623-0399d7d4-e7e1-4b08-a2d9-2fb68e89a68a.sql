-- Add AI processing metadata to scraped_profiles table
ALTER TABLE public.scraped_profiles 
ADD COLUMN IF NOT EXISTS ai_enhanced_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for AI enhanced data queries
CREATE INDEX IF NOT EXISTS idx_scraped_profiles_quality_score 
ON public.scraped_profiles(quality_score);

-- Create index for AI processing metadata
CREATE INDEX IF NOT EXISTS idx_scraped_profiles_ai_metadata 
ON public.scraped_profiles USING GIN(ai_enhanced_data);

-- Add proxy performance tracking columns to proxy_configs
ALTER TABLE public.proxy_configs 
ADD COLUMN IF NOT EXISTS total_requests integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_requests integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_requests integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error_message text,
ADD COLUMN IF NOT EXISTS health_check_status text DEFAULT 'unknown';

-- Create index for proxy performance queries
CREATE INDEX IF NOT EXISTS idx_proxy_configs_performance 
ON public.proxy_configs(success_rate, is_active, last_used_at);

-- Add enhanced job tracking columns
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS processing_strategy jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_enhancement_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS proxy_usage_stats jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS quality_metrics jsonb DEFAULT '{}'::jsonb;

-- Create index for job processing strategies
CREATE INDEX IF NOT EXISTS idx_jobs_processing_strategy 
ON public.jobs USING GIN(processing_strategy);

-- Create job_processing_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS public.job_processing_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  linkedin_url text NOT NULL,
  processing_stage text NOT NULL, -- 'scraping', 'ai_enhancement', 'validation', 'completed', 'failed'
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  proxy_used text,
  processing_time_ms integer,
  data_quality_score numeric,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on job_processing_logs
ALTER TABLE public.job_processing_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for job_processing_logs
CREATE POLICY "Users can view own job processing logs" 
ON public.job_processing_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_processing_logs.job_id 
  AND jobs.user_id = auth.uid()
));

CREATE POLICY "System can insert job processing logs" 
ON public.job_processing_logs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_processing_logs.job_id 
  AND jobs.user_id = auth.uid()
));

-- Create indexes for job_processing_logs
CREATE INDEX IF NOT EXISTS idx_job_processing_logs_job_id 
ON public.job_processing_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_job_processing_logs_status 
ON public.job_processing_logs(status, processing_stage);

CREATE INDEX IF NOT EXISTS idx_job_processing_logs_created_at 
ON public.job_processing_logs(created_at);

-- Create trigger for updated_at on job_processing_logs
CREATE TRIGGER update_job_processing_logs_updated_at
BEFORE UPDATE ON public.job_processing_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate job statistics
CREATE OR REPLACE FUNCTION public.calculate_job_quality_metrics(job_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_profiles integer;
  successful_profiles integer;
  avg_quality_score numeric;
  avg_processing_time numeric;
  result jsonb;
BEGIN
  -- Get profile statistics for the job
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
    AVG(CASE WHEN status = 'completed' THEN quality_score END) as avg_quality,
    AVG(CASE WHEN status = 'completed' THEN processing_time_ms END) as avg_time
  INTO total_profiles, successful_profiles, avg_quality_score, avg_processing_time
  FROM public.job_processing_logs
  WHERE job_id = job_id_param;

  -- Build result JSON
  result := jsonb_build_object(
    'total_profiles', COALESCE(total_profiles, 0),
    'successful_profiles', COALESCE(successful_profiles, 0),
    'success_rate', CASE 
      WHEN total_profiles > 0 THEN ROUND((successful_profiles::numeric / total_profiles::numeric) * 100, 2)
      ELSE 0 
    END,
    'average_quality_score', COALESCE(ROUND(avg_quality_score, 2), 0),
    'average_processing_time_ms', COALESCE(ROUND(avg_processing_time, 0), 0),
    'calculated_at', NOW()
  );

  RETURN result;
END;
$$;