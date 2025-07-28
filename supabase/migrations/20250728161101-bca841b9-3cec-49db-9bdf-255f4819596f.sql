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