import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, jobId } = await req.json();
    
    if (!action || !jobId) {
      throw new Error('Action and job ID are required');
    }

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    let updateData: any = {};
    let message = '';

    switch (action) {
      case 'pause':
        // Can only pause running jobs
        if (job.status !== 'running') {
          throw new Error('Can only pause running jobs');
        }
        
        updateData.status = 'paused';
        break;
        
      case 'resume':
        // Can only resume paused jobs
        if (job.status !== 'paused') {
          throw new Error('Can only resume paused jobs');
        }
        
        updateData.status = 'running';
        updateData.started_at = new Date().toISOString();
        
        // Resume processing by calling process-file function
        try {
          const { error: processError } = await supabase.functions.invoke('process-file', {
            body: { 
              fileId: job.input_file_id,
              jobName: job.name,
              resumeJobId: job.id
            }
          });
          
          if (processError) {
            console.warn('Failed to resume job processing:', processError);
          }
        } catch (resumeError) {
          console.warn('Failed to trigger job resume:', resumeError);
        }
        break;
        
      case 'cancel':
        // Cannot cancel completed or failed jobs
        if (job.status === 'completed' || job.status === 'failed') {
          throw new Error('Cannot cancel completed or failed jobs');
        }
        
        updateData.status = 'cancelled';
        updateData.completed_at = new Date().toISOString();
        break;
        
      case 'retry':
        // Can only retry failed or cancelled jobs
        if (job.status !== 'failed' && job.status !== 'cancelled') {
          throw new Error('Can only retry failed or cancelled jobs');
        }
        
        updateData.status = 'queued';
        updateData.retry_count = (job.retry_count || 0) + 1;
        updateData.error_message = null;
        updateData.progress = 0;
        updateData.processed_urls = 0;
        
        // Restart processing
        try {
          const { error: processError } = await supabase.functions.invoke('process-file', {
            body: { 
              fileId: job.input_file_id,
              jobName: job.name,
              retryJobId: job.id
            }
          });
          
          if (processError) {
            console.warn('Failed to retry job processing:', processError);
          }
        } catch (retryError) {
          console.warn('Failed to trigger job retry:', retryError);
        }
        break;
        
      default:
        throw new Error('Invalid action. Supported actions: pause, resume, cancel, retry');
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      console.error('Job update error:', updateError);
      throw new Error('Failed to update job');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        jobId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in manage-job function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});