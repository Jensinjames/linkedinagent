import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced logging utility
function logWithContext(level: string, message: string, context: any = {}) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${message}`, JSON.stringify(context));
}

// Input validation schema
function validateJobManagementRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body) {
    errors.push('Request body is required');
    return { isValid: false, errors };
  }
  
  if (!body.action || typeof body.action !== 'string') {
    errors.push('Action is required and must be a string');
  }
  
  if (!body.jobId || typeof body.jobId !== 'string') {
    errors.push('Job ID is required and must be a string');
  }
  
  const validActions = ['pause', 'resume', 'cancel', 'retry'];
  if (body.action && !validActions.includes(body.action)) {
    errors.push(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }
  
  return { isValid: errors.length === 0, errors };
}

serve(async (req) => {
  const startTime = Date.now();
  
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
      logWithContext('error', 'Missing authorization header', { userAgent: req.headers.get('User-Agent') });
      throw new Error('No authorization header');
    }

    // Enhanced auth validation with better error handling
    let user;
    try {
      const token = authHeader.replace('Bearer ', '');
      if (!token || token.length < 10) {
        throw new Error('Invalid token format');
      }
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError) {
        logWithContext('error', 'Auth error', { error: authError.message, token: token.substring(0, 10) + '...' });
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      if (!authUser) {
        throw new Error('User not found');
      }
      
      user = authUser;
      logWithContext('info', 'User authenticated', { userId: user.id });
    } catch (error) {
      logWithContext('error', 'Authentication failed', { error: error.message });
      throw new Error(`Unauthorized: ${error.message}`);
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      logWithContext('error', 'Invalid JSON in request body', { error: error.message });
      throw new Error('Invalid JSON in request body');
    }
    
    // Validate input
    const validation = validateJobManagementRequest(requestBody);
    if (!validation.isValid) {
      logWithContext('error', 'Request validation failed', { errors: validation.errors, body: requestBody });
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const { action, jobId } = requestBody;

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

    const processingTime = Date.now() - startTime;
    logWithContext('info', 'Job management completed', { 
      action, 
      jobId, 
      processingTime,
      userId: user.id 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Job ${action} completed successfully`,
        jobId,
        processingTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithContext('error', 'Job management failed', { 
      error: error.message, 
      processingTime,
      stack: error.stack 
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('Validation failed') || 
        error.message.includes('Action and job ID are required') ||
        error.message.includes('Invalid action')) {
      statusCode = 400;
    } else if (error.message.includes('Unauthorized') || 
               error.message.includes('Authentication failed')) {
      statusCode = 401;
    } else if (error.message.includes('Job not found')) {
      statusCode = 404;
    } else if (error.message.includes('Can only')) {
      statusCode = 409; // Conflict
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
        processingTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});