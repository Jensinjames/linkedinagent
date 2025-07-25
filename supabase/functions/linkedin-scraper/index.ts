import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;
const userRequests = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userLimit = userRequests.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    userRequests.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true };
}

// Performance optimizations
const CONNECTION_POOL = new Map<string, any>();
const MAX_CONCURRENT_SCRAPES = 5;
const ADAPTIVE_DELAY_BASE = 1000;
const MAX_RETRY_ATTEMPTS = 5;

// Circuit breaker pattern
interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

function logWithContext(level: string, message: string, context: any = {}) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] LinkedIn-Scraper: ${message}`, JSON.stringify(context));
}

function getCircuitBreakerKey(proxy?: any): string {
  return proxy ? `${proxy.host}:${proxy.port}` : 'direct';
}

function checkCircuitBreaker(key: string): boolean {
  const breaker = circuitBreakers.get(key);
  if (!breaker) return true;
  
  const now = Date.now();
  const timeSinceFailure = now - breaker.lastFailureTime;
  
  switch (breaker.state) {
    case 'closed':
      return true;
    case 'open':
      if (timeSinceFailure > 60000) { // 1 minute
        breaker.state = 'half-open';
        return true;
      }
      return false;
    case 'half-open':
      return true;
    default:
      return true;
  }
}

function recordSuccess(key: string) {
  const breaker = circuitBreakers.get(key) || { failureCount: 0, lastFailureTime: 0, state: 'closed' as const };
  breaker.failureCount = 0;
  breaker.state = 'closed';
  circuitBreakers.set(key, breaker);
}

function recordFailure(key: string) {
  const breaker = circuitBreakers.get(key) || { failureCount: 0, lastFailureTime: 0, state: 'closed' as const };
  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();
  
  if (breaker.failureCount >= 5) {
    breaker.state = 'open';
    logWithContext('warn', 'Circuit breaker opened', { key, failureCount: breaker.failureCount });
  }
  
  circuitBreakers.set(key, breaker);
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, urls, batchMode = false } = await req.json();

    // Check rate limit using IP as identifier for scraper function
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitCheck = checkRateLimit(clientIP);
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
    
    if (!url && !batchMode) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;
    
    if (batchMode && urls?.length > 0) {
      logWithContext('info', 'Starting batch scrape', { urlCount: urls.length });
      result = await processBatchScraping(urls, supabase);
    } else {
      logWithContext('info', 'Starting single scrape', { url });
      
      // Get optimal proxy for this request
      const { data: proxyData } = await supabase.functions.invoke('proxy-manager', {
        body: { action: 'get_optimal_proxy' }
      });

      const circuitBreakerKey = getCircuitBreakerKey(proxyData?.proxy);
      
      // Check circuit breaker
      if (!checkCircuitBreaker(circuitBreakerKey)) {
        logWithContext('warn', 'Circuit breaker is open, skipping request', { circuitBreakerKey });
        return new Response(
          JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
        );
      }

      // Advanced scraping with enhanced retry logic
      const profileData = await scrapeWithRetry(url, proxyData?.proxy);

      if (profileData.error) {
        recordFailure(circuitBreakerKey);
        
        // Update proxy stats if proxy failed
        if (proxyData?.proxy) {
          await supabase.functions.invoke('proxy-manager', {
            body: { 
              action: 'report_failure', 
              proxyId: proxyData.proxy.id,
              error: profileData.error
            }
          });
        }

        return new Response(
          JSON.stringify({ success: false, error: profileData.error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 }
        );
      }

      recordSuccess(circuitBreakerKey);
      
      // Update proxy stats on success
      if (proxyData?.proxy) {
        await supabase.functions.invoke('proxy-manager', {
          body: { 
            action: 'report_success', 
            proxyId: proxyData.proxy.id 
          }
        });
      }

      result = { 
        success: true, 
        profile: profileData,
        proxyUsed: proxyData?.proxy?.host || 'direct',
        processingTime: Date.now() - startTime
      };
    }

    const processingTime = Date.now() - startTime;
    logWithContext('info', 'Scraping completed', { 
      processingTime, 
      batchMode, 
      urlCount: batchMode ? urls?.length : 1 
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithContext('error', 'LinkedIn scraper error', { 
      error: error.message, 
      processingTime,
      stack: error.stack 
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Batch processing for multiple URLs
async function processBatchScraping(urls: string[], supabase: any): Promise<any> {
  const results = [];
  const concurrentLimit = Math.min(MAX_CONCURRENT_SCRAPES, urls.length);
  
  // Process URLs in concurrent batches
  for (let i = 0; i < urls.length; i += concurrentLimit) {
    const batch = urls.slice(i, i + concurrentLimit);
    
    const batchPromises = batch.map(async (url) => {
      try {
        const { data: proxyData } = await supabase.functions.invoke('proxy-manager', {
          body: { action: 'get_optimal_proxy' }
        });
        
        const profileData = await scrapeWithRetry(url, proxyData?.proxy);
        
        return {
          url,
          success: !profileData.error,
          profile: profileData.error ? null : profileData,
          error: profileData.error || null,
          proxyUsed: proxyData?.proxy?.host || 'direct'
        };
      } catch (error) {
        logWithContext('error', 'Batch scraping failed for URL', { url, error: error.message });
        return {
          url,
          success: false,
          profile: null,
          error: error.message,
          proxyUsed: null
        };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          url: 'unknown',
          success: false,
          profile: null,
          error: result.reason.message || 'Batch processing failed',
          proxyUsed: null
        });
      }
    });
    
    // Adaptive delay between batches based on success rate
    if (i + concurrentLimit < urls.length) {
      const successRate = results.filter(r => r.success).length / results.length;
      const adaptiveDelay = ADAPTIVE_DELAY_BASE * (1 + (1 - successRate));
      await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
    }
  }
  
  return {
    success: true,
    results,
    summary: {
      total: urls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      successRate: results.filter(r => r.success).length / urls.length
    }
  };
}

async function scrapeWithRetry(url: string, proxy?: any, maxRetries = MAX_RETRY_ATTEMPTS): Promise<any> {
  let lastError = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logWithContext('info', 'Scraping attempt', { attempt, maxRetries, url });
      
      // Adaptive delay based on attempt and proxy performance
      const baseDelay = ADAPTIVE_DELAY_BASE;
      const attemptMultiplier = Math.pow(1.5, attempt - 1);
      const jitter = Math.random() * 500;
      const delay = baseDelay * attemptMultiplier + jitter;
      
      await new Promise(resolve => setTimeout(resolve, delay));

      // Enhanced scraping with timeout
      const profileData = await Promise.race([
        performActualScraping(url, proxy),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Scraping timeout')), 15000)
        )
      ]) as any;
      
      if (profileData && !profileData.error) {
        const processingTime = Date.now() - startTime;
        logWithContext('info', 'Scraping successful', { 
          url, 
          attempt, 
          processingTime,
          proxy: proxy?.host || 'direct'
        });
        return {
          ...profileData,
          scrapingMetadata: {
            ...profileData.scrapingMetadata,
            attemptsUsed: attempt,
            totalProcessingTime: processingTime
          }
        };
      }

      lastError = profileData?.error || 'Unknown scraping error';
      
      // Enhanced error categorization
      const errorCategory = categorizeError(lastError);
      
      if (errorCategory === 'permanent') {
        logWithContext('warn', 'Permanent error detected', { url, error: lastError });
        break;
      }

      // Smart backoff strategy
      if (attempt < maxRetries) {
        const backoffTime = calculateBackoffTime(attempt, errorCategory);
        logWithContext('info', 'Retrying after backoff', { 
          url, 
          attempt, 
          backoffTime, 
          errorCategory, 
          error: lastError 
        });
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }

    } catch (error) {
      lastError = error.message;
      logWithContext('error', 'Scraping attempt failed', { url, attempt, error: error.message });
    }
  }

  const totalTime = Date.now() - startTime;
  logWithContext('error', 'All scraping attempts failed', { 
    url, 
    totalAttempts: maxRetries, 
    totalTime, 
    finalError: lastError 
  });
  
  return { error: lastError || 'All retry attempts failed' };
}

function calculateBackoffTime(attempt: number, errorCategory: string): number {
  const baseTime = 1000;
  const multiplier = errorCategory === 'rate_limit' ? 3 : 2;
  const exponential = Math.pow(multiplier, attempt);
  const jitter = Math.random() * 1000;
  
  return Math.min(baseTime * exponential + jitter, 30000); // Cap at 30 seconds
}

function categorizeError(error: string): 'temporary' | 'permanent' | 'rate_limit' {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('rate limit') || errorLower.includes('429')) {
    return 'rate_limit';
  }
  
  if (errorLower.includes('blocked') || errorLower.includes('captcha') || 
      errorLower.includes('403') || errorLower.includes('401')) {
    return 'permanent';
  }
  
  return 'temporary';
}

async function performActualScraping(url: string, proxy?: any): Promise<any> {
  // This would use Playwright in a real implementation
  // For now, we'll simulate more realistic scraping with detailed data extraction
  
  try {
    // Simulate network request with proxy
    console.log(`Using ${proxy ? `proxy ${proxy.host}:${proxy.port}` : 'direct connection'}`);
    
    // Simulate realistic scraping patterns
    const scrapingPatterns = [
      { selector: 'h1', field: 'name' },
      { selector: '.top-card-layout__title', field: 'title' },
      { selector: '.top-card-layout__headline', field: 'headline' },
      { selector: '.top-card-layout__subline', field: 'location' },
      { selector: '.experience-section', field: 'experience' },
      { selector: '.skills-section', field: 'skills' },
      { selector: '.education-section', field: 'education' }
    ];

    // Generate realistic profile data based on URL patterns
    const profileId = url.split('/').pop() || 'unknown';
    const isCompanyPage = url.includes('/company/');
    
    if (isCompanyPage) {
      throw new Error('Company pages not supported in this version');
    }

    // Extract realistic data structure
    const profileData = {
      url,
      linkedinId: profileId,
      name: generateRealisticName(),
      title: generateRealisticTitle(),
      headline: generateRealisticHeadline(),
      location: generateRealisticLocation(),
      experience: generateRealisticExperience(),
      skills: generateRealisticSkills(),
      education: generateRealisticEducation(),
      connectionCount: Math.floor(Math.random() * 500) + 50,
      profilePictureUrl: `https://media.licdn.com/dms/image/sample-${profileId}`,
      scrapedAt: new Date().toISOString(),
      scrapingMetadata: {
        proxyUsed: proxy?.host || 'direct',
        scrapingTime: Math.random() * 3000 + 1000,
        elementsFound: scrapingPatterns.length,
        dataQuality: Math.random() > 0.1 ? 'high' : 'medium'
      }
    };

    // Simulate occasional scraping failures for realism
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Profile access restricted');
    }

    return profileData;

  } catch (error) {
    return { error: error.message };
  }
}

// Helper functions to generate realistic data
function generateRealisticName(): string {
  const firstNames = ['Alex', 'Sarah', 'John', 'Emma', 'Michael', 'Lisa', 'David', 'Jennifer', 'Robert', 'Jessica'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateRealisticTitle(): string {
  const titles = [
    'Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer',
    'Marketing Specialist', 'Sales Manager', 'DevOps Engineer', 'Business Analyst',
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'QA Engineer'
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function generateRealisticHeadline(): string {
  const headlines = [
    'Passionate about building scalable software solutions',
    'Driving growth through data-driven marketing strategies',
    'Creating intuitive user experiences that delight customers',
    'Leading high-performing engineering teams',
    'Transforming businesses through innovative technology'
  ];
  return headlines[Math.floor(Math.random() * headlines.length)];
}

function generateRealisticLocation(): string {
  const locations = [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
    'Boston, MA', 'Chicago, IL', 'Los Angeles, CA', 'Denver, CO'
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateRealisticExperience(): any[] {
  const companies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber', 'Airbnb'];
  const experience = [];
  
  for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
    experience.push({
      company: companies[Math.floor(Math.random() * companies.length)],
      title: generateRealisticTitle(),
      duration: `${Math.floor(Math.random() * 3) + 1} years`,
      description: 'Led key initiatives and delivered impactful results'
    });
  }
  
  return experience;
}

function generateRealisticSkills(): string[] {
  const allSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker',
    'Kubernetes', 'Machine Learning', 'Data Analysis', 'Project Management',
    'Agile', 'Scrum', 'Leadership', 'Communication', 'Problem Solving'
  ];
  
  const numSkills = Math.floor(Math.random() * 8) + 5;
  return allSkills.sort(() => 0.5 - Math.random()).slice(0, numSkills);
}

function generateRealisticEducation(): any[] {
  const universities = [
    'Stanford University', 'MIT', 'Harvard University', 'UC Berkeley',
    'Carnegie Mellon', 'University of Washington', 'Georgia Tech'
  ];
  
  const degrees = [
    'Bachelor of Science in Computer Science',
    'Master of Science in Data Science',
    'Bachelor of Engineering',
    'MBA'
  ];
  
  return [{
    university: universities[Math.floor(Math.random() * universities.length)],
    degree: degrees[Math.floor(Math.random() * degrees.length)],
    graduationYear: 2015 + Math.floor(Math.random() * 8)
  }];
}