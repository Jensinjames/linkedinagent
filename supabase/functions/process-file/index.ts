import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

// Memory and file size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const MEMORY_CHECK_INTERVAL = 100; // Check memory every 100 rows

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const userRequests = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userLimit = userRequests.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    userRequests.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      (typeof Deno !== "undefined" && Deno.env.get('SUPABASE_URL')) || '',
      (typeof Deno !== "undefined" && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) || ''
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

    // Check rate limit
    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimitCheck.resetTime 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
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

    // Check file size before processing
    if (fileBlob.size > MAX_FILE_SIZE) {
      throw new Error(`File size (${Math.round(fileBlob.size / 1024 / 1024)}MB) exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    console.log(`Processing file: ${fileData.filename} (${Math.round(fileBlob.size / 1024)}KB)`);

    // Parse Excel file to extract LinkedIn URLs with memory optimization
    const arrayBuffer = await fileBlob.arrayBuffer();
    const urls = await parseExcelFileOptimized(arrayBuffer, jobName, supabase, user.id);
    
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

    // Start processing job asynchronously using background tasks
    const processingPromise = processJobUrls(job.id, urls, supabase);
    
    // Use EdgeRuntime.waitUntil to ensure background task completes
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processingPromise);
    } else {
      // Fallback for environments without EdgeRuntime
      processingPromise.catch(error => {
        console.error('Background processing error:', error);
      });
    }

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

// Memory-optimized Excel parsing with streaming and progress tracking
async function parseExcelFileOptimized(
  arrayBuffer: ArrayBuffer, 
  jobName: string, 
  supabase: any, 
  userId: string
): Promise<string[]> {
  try {
    console.log('Starting memory-optimized Excel parsing...');
    const startTime = Date.now();
    
    // Read workbook with minimal options for memory efficiency
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: false,
      cellNF: false,
      cellStyles: false
    });
    
    if (!workbook.SheetNames.length) {
      throw new Error('No sheets found in Excel file');
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    console.log(`Processing sheet with ${range.e.r + 1} rows and ${range.e.c + 1} columns`);
    
    const urls = new Set<string>(); // Use Set for deduplication
    const linkedinRegex = /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/gi;
    let processedRows = 0;
    
    // Process rows in chunks to avoid memory issues
    for (let row = range.s.r; row <= range.e.r; row++) {
      // Memory check every MEMORY_CHECK_INTERVAL rows
      if (processedRows % MEMORY_CHECK_INTERVAL === 0 && processedRows > 0) {
        console.log(`Processed ${processedRows} rows, found ${urls.size} unique LinkedIn URLs`);
        
        // Force garbage collection hint (if available)
        if (typeof globalThis.gc === 'function') {
          globalThis.gc();
        }
        
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Process each cell in the row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v && typeof cell.v === 'string') {
          const cellValue = cell.v.toString();
          const matches = cellValue.match(linkedinRegex);
          
          if (matches) {
            matches.forEach(match => {
              // Clean up URL
              let cleanUrl = match.replace(/[,\)\s]+$/, '');
              
              // Ensure URL starts with https://
              if (!cleanUrl.startsWith('https://')) {
                cleanUrl = cleanUrl.replace(/^https?:\/\//, 'https://');
              }
              
              // Ensure it's a valid LinkedIn profile URL
              if (cleanUrl.includes('/in/') && cleanUrl.length > 30) {
                urls.add(cleanUrl);
              }
            });
          }
        }
      }
      
      processedRows++;
    }
    
    const urlArray = Array.from(urls);
    const processingTime = Date.now() - startTime;
    
    console.log(`Excel parsing completed in ${processingTime}ms`);
    console.log(`Found ${urlArray.length} unique LinkedIn URLs from ${processedRows} rows`);
    
    // Log memory usage if available
    if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
      const memUsage = Deno.memoryUsage();
      console.log(`Memory usage: ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap`);
    }
    
    return urlArray;
  } catch (error) {
    console.error('Error in optimized Excel parsing:', error);
    
    // Provide specific error messages for common issues
    if (error.message?.includes('Cannot read property')) {
      throw new Error('Invalid Excel file format or corrupted file');
    } else if (error.message?.includes('out of memory')) {
      throw new Error('File too large to process. Please use a smaller file (max 10MB)');
    } else {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }
}

// Legacy function kept for compatibility (not used)
async function parseExcelFile(arrayBuffer: ArrayBuffer): Promise<string[]> {
  console.warn('Using legacy parseExcelFile - consider using parseExcelFileOptimized');
  return parseExcelFileOptimized(arrayBuffer, 'legacy', null, 'system');
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

// Advanced LinkedIn profile scraping with AI enhancement
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