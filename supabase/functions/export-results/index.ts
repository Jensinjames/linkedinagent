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

    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    // Verify job ownership and completion
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'completed') {
      throw new Error('Job must be completed to export results');
    }

    // Get scraped profiles for this job
    const { data: profiles, error: profilesError } = await supabase
      .from('scraped_profiles')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      throw new Error('Failed to fetch profile data');
    }

    // Generate Excel file
    const excelBuffer = await generateExcelFile(profiles, job.name);
    
    // Upload to storage
    const fileName = `${job.name.replace(/[^a-zA-Z0-9]/g, '_')}_results_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = `exports/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filePath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    if (uploadError) {
      console.error('Export upload error:', uploadError);
      throw new Error('Failed to upload export file');
    }

    // Update job with output file info
    await supabase
      .from('jobs')
      .update({ output_file_id: filePath })
      .eq('id', jobId);

    // Generate signed URL for download
    const { data: signedUrl } = await supabase.storage
      .from('exports')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: signedUrl?.signedUrl,
        fileName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in export-results function:', error);
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

async function generateExcelFile(profiles: any[], jobName: string): Promise<Uint8Array> {
  try {
    // Import xlsx dynamically
    const XLSX = await import('https://esm.sh/xlsx@latest');
    
    // Prepare data for Excel
    const worksheetData = profiles.map(profile => ({
      'LinkedIn URL': profile.linkedin_url,
      'Status': profile.status,
      'Name': profile.profile_data?.name || '',
      'Title': profile.profile_data?.title || '',
      'Company': profile.profile_data?.company || '',
      'Location': profile.profile_data?.location || '',
      'Scraped At': profile.scraped_at ? new Date(profile.scraped_at).toLocaleString() : '',
      'Error Message': profile.error_message || ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Set column widths
    const columnWidths = [
      { wch: 50 }, // LinkedIn URL
      { wch: 12 }, // Status
      { wch: 25 }, // Name
      { wch: 30 }, // Title
      { wch: 25 }, // Company
      { wch: 20 }, // Location
      { wch: 20 }, // Scraped At
      { wch: 30 }, // Error Message
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx' 
    });
    
    return new Uint8Array(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error('Failed to generate Excel file');
  }
}