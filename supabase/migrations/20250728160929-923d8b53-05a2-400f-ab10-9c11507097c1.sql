-- Enable RLS on function_logs table
ALTER TABLE public.function_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for function_logs - only admins can view
CREATE POLICY "Admins can view function logs" 
ON public.function_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Create RLS policy for function_logs - only service role can insert
CREATE POLICY "Service role can insert function logs" 
ON public.function_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on job_logs table
ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for job_logs - users can view logs for their own jobs
CREATE POLICY "Users can view their job logs" 
ON public.job_logs 
FOR SELECT 
USING (
  job_id IN (
    SELECT id FROM public.jobs 
    WHERE user_id = auth.uid()
  )
);

-- Create RLS policy for job_logs - service role can insert
CREATE POLICY "Service role can insert job logs" 
ON public.job_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');