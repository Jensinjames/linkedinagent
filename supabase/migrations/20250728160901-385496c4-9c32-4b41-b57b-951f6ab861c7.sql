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

-- Update database functions to be more secure
CREATE OR REPLACE FUNCTION public.authenticate_user(email text, password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_record record;
    result json;
BEGIN
    -- Find user by email
    SELECT * INTO user_record 
    FROM public."User" 
    WHERE "User".email = authenticate_user.email;
    
    IF user_record IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Invalid credentials');
    END IF;
    
    -- For demo purposes, accept any password
    -- In production, you would verify the hashed password here
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'createdAt', user_record."createdAt"
        )
    );
END;
$function$

-- Update get_jobs function to be more secure
CREATE OR REPLACE FUNCTION public.get_jobs(status text DEFAULT NULL::text, page integer DEFAULT 1, page_size integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result json;
    total_count integer;
    offset_val integer;
BEGIN
    offset_val := (page - 1) * page_size;
    
    -- Mock data for demo - in production this would query actual job tables
    SELECT json_build_object(
        'data', json_build_array(
            json_build_object(
                'id', gen_random_uuid(),
                'tenantId', gen_random_uuid(),
                'status', COALESCE(status, 'running'),
                'totalUrls', 1000,
                'processed', 750,
                'retryCount', 2,
                'createdAt', now() - interval '2 hours',
                'updatedAt', now() - interval '30 minutes'
            ),
            json_build_object(
                'id', gen_random_uuid(),
                'tenantId', gen_random_uuid(),
                'status', 'success',
                'totalUrls', 500,
                'processed', 500,
                'retryCount', 0,
                'createdAt', now() - interval '1 day',
                'updatedAt', now() - interval '1 day',
                'outputFileId', gen_random_uuid()
            )
        ),
        'page', page,
        'pageSize', page_size,
        'total', 25
    ) INTO result;
    
    RETURN result;
END;
$function$

-- Update get_job function to be more secure
CREATE OR REPLACE FUNCTION public.get_job(job_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result json;
BEGIN
    -- Mock data for demo - in production this would query actual job table
    SELECT json_build_object(
        'id', job_id,
        'tenantId', gen_random_uuid(),
        'status', 'running',
        'totalUrls', 1000,
        'processed', 750,
        'retryCount', 2,
        'createdAt', now() - interval '2 hours',
        'updatedAt', now() - interval '30 minutes'
    ) INTO result;
    
    RETURN result;
END;
$function$

-- Update create_job function to be more secure
CREATE OR REPLACE FUNCTION public.create_job(title text, description text, tenant_id text, file_ids text[] DEFAULT NULL::text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    new_job_id uuid;
    result json;
BEGIN
    new_job_id := gen_random_uuid();
    
    -- Mock job creation - in production this would insert into actual job table
    SELECT json_build_object(
        'id', new_job_id,
        'tenantId', tenant_id,
        'status', 'queued',
        'totalUrls', 0,
        'processed', 0,
        'retryCount', 0,
        'createdAt', now(),
        'updatedAt', now()
    ) INTO result;
    
    RETURN result;
END;
$function$

-- Update cancel_job function to be more secure
CREATE OR REPLACE FUNCTION public.cancel_job(job_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result json;
BEGIN
    -- Mock job cancellation - in production this would update actual job table
    SELECT json_build_object(
        'success', true,
        'message', 'Job cancelled successfully',
        'jobId', job_id
    ) INTO result;
    
    RETURN result;
END;
$function$

-- Update get_stats function to be more secure
CREATE OR REPLACE FUNCTION public.get_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result json;
BEGIN
    -- Mock statistics - in production this would aggregate from actual tables
    SELECT json_build_object(
        'jobsLast30Days', 156,
        'successRate', 0.94,
        'avgDuration', 1847.5
    ) INTO result;
    
    RETURN result;
END;
$function$

-- Update get_file_download_url function to be more secure
CREATE OR REPLACE FUNCTION public.get_file_download_url(file_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result json;
BEGIN
    -- Mock file download URL - in production this would generate signed URL
    SELECT json_build_object(
        'downloadUrl', 'https://example.com/files/' || file_id || '/download',
        'expiresAt', now() + interval '1 hour'
    ) INTO result;
    
    RETURN result;
END;
$function$