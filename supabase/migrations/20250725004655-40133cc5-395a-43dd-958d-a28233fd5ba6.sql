-- Fix the function search path mutable warning by setting search_path
ALTER FUNCTION public.calculate_job_quality_metrics(uuid) SET search_path TO 'public';