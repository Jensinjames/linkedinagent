-- Fix function security by adding SECURITY DEFINER and search_path settings
-- Update functions that were missing proper security settings

DROP FUNCTION IF EXISTS public.get_jobs(text, integer, integer);
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

-- Fix other functions as well
DROP FUNCTION IF EXISTS public.get_job(text);
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