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

    const { fileId, jobName } = await req.json();
    
    if (!fileId || !jobName) {
      throw new Error('File ID and job name are required');
    }

    // Get file from database
    const { data: fileData, error: fileError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found');
    }

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(fileData.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error('Failed to download file');
    }

    // Parse Excel file to extract LinkedIn URLs
    const arrayBuffer = await fileBlob.arrayBuffer();
    const urls = await parseExcelFile(arrayBuffer);
    
    if (urls.length === 0) {
      throw new Error('No LinkedIn URLs found in the file');
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        name: jobName,
        description: `Processing ${fileData.filename}`,
        user_id: user.id,
        input_file_id: fileId,
        total_urls: urls.length,
        processed_urls: 0,
        progress: 0,
        status: 'queued',
        settings: { urls }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      throw new Error('Failed to create job');
    }

    // Start processing job asynchronously
    EdgeRuntime.waitUntil(processJobUrls(job.id, urls, supabase));

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: job.id,
        urlCount: urls.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in process-file function:', error);
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

async function parseExcelFile(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    // Import xlsx dynamically
    const XLSX = await import('https://esm.sh/xlsx@latest');
    
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const urls: string[] = [];
    const linkedinRegex = /linkedin\.com\/in\/[^\s,\)]+/gi;
    
    for (const row of data as any[][]) {
      for (const cell of row) {
        if (typeof cell === 'string') {
          const matches = cell.match(linkedinRegex);
          if (matches) {
            matches.forEach(match => {
              const cleanUrl = match.replace(/[,\)]+$/, '');
              if (!urls.includes(cleanUrl)) {
                urls.push(cleanUrl);
              }
            });
          }
        }
      }
    }
    
    return urls;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file');
  }
}

async function processJobUrls(jobId: string, urls: string[], supabase: any) {
  try {
    console.log(`Starting to process job ${jobId} with ${urls.length} URLs`);
    
    // Update job status to running
    await supabase
      .from('jobs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    // Process URLs in batches
    const batchSize = 10;
    let processed = 0;
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      // Process each URL in the batch
      const profiles = await Promise.allSettled(
        batch.map(url => scrapeLinkedInProfile(url))
      );
      
      // Save results
      const profileData = profiles.map((result, index) => ({
        job_id: jobId,
        linkedin_url: batch[index],
        status: result.status === 'fulfilled' ? 'completed' : 'failed',
        profile_data: result.status === 'fulfilled' ? result.value : {},
        error_message: result.status === 'rejected' ? result.reason?.message : null,
        scraped_at: new Date().toISOString()
      }));
      
      await supabase
        .from('scraped_profiles')
        .insert(profileData);
      
      processed += batch.length;
      const progress = Math.round((processed / urls.length) * 100);
      
      // Update job progress
      await supabase
        .from('jobs')
        .update({ 
          processed_urls: processed,
          progress: progress
        })
        .eq('id', jobId);
      
      // Add delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Mark job as completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100
      })
      .eq('id', jobId);
      
    console.log(`Completed processing job ${jobId}`);
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    
    // Mark job as failed
    await supabase
      .from('jobs')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', jobId);
  }
}

// Advanced LinkedIn profile scraping with Playwright and AI enhancement
async function scrapeLinkedInProfile(url: string): Promise<any> {
  console.log(`Scraping profile: ${url}`);
  
  try {
    // Call the linkedin-scraper function for actual scraping
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: scrapedData, error } = await supabase.functions.invoke('linkedin-scraper', {
      body: { url }
    });

    if (error) {
      console.error(`Scraping error for ${url}:`, error);
      throw new Error(`Scraping failed: ${error.message}`);
    }

    // Enhance data with AI if scraping was successful
    if (scrapedData && scrapedData.success) {
      const { data: enhancedData, error: aiError } = await supabase.functions.invoke('ai-enhancer', {
        body: { profileData: scrapedData.profile, url }
      });

      if (aiError) {
        console.warn(`AI enhancement failed for ${url}:`, aiError);
        return scrapedData.profile; // Return raw data if AI enhancement fails
      }

      return enhancedData.enhancedProfile || scrapedData.profile;
    }

    throw new Error('Scraping failed: No data returned');
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    
    // Return error data for tracking
    return {
      url,
      error: error.message || 'Unknown scraping error',
      status: 'failed',
      scrapedAt: new Date().toISOString()
    };
  }
}