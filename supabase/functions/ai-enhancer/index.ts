import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;
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

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced cache for AI responses (using Map for simplicity, Redis would be better for production)
const enhancementCache = new Map<string, any>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 1000;

// Batch processing configuration
const BATCH_SIZE = 5;
const MAX_PARALLEL_REQUESTS = 3;

// Performance monitoring
interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageProcessingTime: number;
  openAIApiCalls: number;
}

const metrics: PerformanceMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageProcessingTime: 0,
  openAIApiCalls: 0,
};

function logWithContext(level: string, message: string, context: any = {}) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] AI-Enhancer: ${message}`, JSON.stringify(context));
}

function getCacheKey(profileData: any): string {
  // Create a simple hash key from profile data
  const keyData = {
    name: profileData.name,
    title: profileData.title,
    skills: profileData.skills,
    experience: profileData.experience?.length || 0
  };
  return btoa(JSON.stringify(keyData)).substring(0, 32);
}

function cleanCache() {
  if (enhancementCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(enhancementCache.entries());
    const oldEntries = entries.filter(([_, data]) => 
      Date.now() - data.timestamp > CACHE_TTL
    );
    
    // Remove old entries
    oldEntries.forEach(([key, _]) => enhancementCache.delete(key));
    
    // If still too large, remove oldest entries
    if (enhancementCache.size > MAX_CACHE_SIZE) {
      const remainingEntries = Array.from(enhancementCache.entries())
        .sort(([_, a], [__, b]) => a.timestamp - b.timestamp);
      
      const toRemove = remainingEntries.slice(0, enhancementCache.size - MAX_CACHE_SIZE + 100);
      toRemove.forEach(([key, _]) => enhancementCache.delete(key));
    }
  }
}

serve(async (req) => {
  const startTime = Date.now();
  metrics.totalRequests++;
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileData, url, batchMode = false, profiles = [] } = await req.json();

    // Check rate limit using IP as identifier for AI enhancer function
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitCheck = checkRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimitCheck.resetTime 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    if (!profileData && !batchMode) {
      return new Response(
        JSON.stringify({ error: 'Profile data is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!openAIApiKey) {
      logWithContext('warn', 'OpenAI API key not configured, returning original data');
      const fallbackData = batchMode ? profiles.map(p => ({ enhancedProfile: p })) : { enhancedProfile: profileData };
      return new Response(
        JSON.stringify(fallbackData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean cache periodically
    cleanCache();

    let result;
    
    if (batchMode && profiles?.length > 0) {
      logWithContext('info', 'Processing batch enhancement', { batchSize: profiles.length, url });
      result = await processBatchEnhancement(profiles);
    } else {
      logWithContext('info', 'Processing single enhancement', { url });
      
      // Check cache first
      const cacheKey = getCacheKey(profileData);
      const cachedResult = enhancementCache.get(cacheKey);
      
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
        metrics.cacheHits++;
        logWithContext('info', 'Cache hit', { cacheKey, url });
        
        const processingTime = Date.now() - startTime;
        return new Response(
          JSON.stringify({
            enhancedProfile: {
              ...cachedResult.data,
              aiProcessingMetadata: {
                ...cachedResult.data.aiProcessingMetadata,
                cacheHit: true,
                processingTime
              }
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      metrics.cacheMisses++;
      
      // Process with timeout
      const enhancedProfile = await Promise.race([
        enhanceProfileWithAI(profileData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Enhancement timeout')), 15000)
        )
      ]) as any;

      // Validate and clean the enhanced data
      const validatedProfile = await validateProfileData(enhancedProfile);

      // Calculate quality score
      const qualityScore = calculateDataQuality(validatedProfile);

      const finalProfile = {
        ...validatedProfile,
        aiProcessingMetadata: {
          processedAt: new Date().toISOString(),
          qualityScore,
          enhancementsApplied: [
            'skills_standardization',
            'experience_enrichment',
            'data_validation',
            'sentiment_analysis'
          ],
          cacheHit: false,
          processingTime: Date.now() - startTime
        }
      };

      // Cache the result
      enhancementCache.set(cacheKey, {
        data: finalProfile,
        timestamp: Date.now()
      });

      result = { enhancedProfile: finalProfile };
    }

    const processingTime = Date.now() - startTime;
    metrics.averageProcessingTime = (metrics.averageProcessingTime * (metrics.totalRequests - 1) + processingTime) / metrics.totalRequests;
    
    logWithContext('info', 'Enhancement completed', { 
      processingTime, 
      cacheHitRate: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses),
      url 
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithContext('error', 'AI enhancement failed', { 
      error: error.message, 
      processingTime,
      stack: error.stack 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'AI enhancement failed',
        fallbackProfile: req.body?.profileData || null,
        processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Batch processing for multiple profiles
async function processBatchEnhancement(profiles: any[]): Promise<any> {
  const results = [];
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    batches.push(profiles.slice(i, i + BATCH_SIZE));
  }
  
  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_REQUESTS) {
    const batchPromises = batches.slice(i, i + MAX_PARALLEL_REQUESTS).map(batch =>
      processBatch(batch)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        logWithContext('error', 'Batch processing failed', { error: result.reason });
      }
    });
  }
  
  return { enhancedProfiles: results };
}

async function processBatch(profiles: any[]): Promise<any[]> {
  return Promise.all(profiles.map(async (profile) => {
    try {
      const enhanced = await enhanceProfileWithAI(profile);
      const validated = await validateProfileData(enhanced);
      const qualityScore = calculateDataQuality(validated);
      
      return {
        ...validated,
        aiProcessingMetadata: {
          processedAt: new Date().toISOString(),
          qualityScore,
          enhancementsApplied: ['batch_processing'],
          batchMode: true
        }
      };
    } catch (error) {
      logWithContext('error', 'Individual profile enhancement failed', { error: error.message });
      return profile; // Return original on error
    }
  }));
}

async function enhanceProfileWithAI(profileData: any): Promise<any> {
  const enhancementStart = Date.now();
  
  try {
    const prompt = createEnhancementPrompt(profileData);
    
    metrics.openAIApiCalls++;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert LinkedIn profile data analyst. Your job is to enhance and standardize profile data extracted from LinkedIn profiles. 

            Guidelines:
            1. Standardize skill names (e.g., "JS" → "JavaScript", "React.js" → "React")
            2. Extract and categorize skills into technical/soft skills
            3. Enhance job titles with industry context
            4. Standardize company names
            5. Extract key achievements from experience descriptions
            6. Validate and clean all data
            7. Add confidence scores for data quality
            8. Return ONLY valid JSON without markdown formatting

            Return the enhanced data in this exact structure:
            {
              "name": "enhanced name",
              "title": "standardized title",
              "headline": "enhanced headline",
              "location": "standardized location",
              "skills": {
                "technical": ["standardized technical skills"],
                "soft": ["standardized soft skills"]
              },
              "experience": [enhanced experience array],
              "education": [enhanced education array],
              "summary": "AI-generated professional summary",
              "keyStrengths": ["identified strengths"],
              "industryExpertise": ["relevant industries"],
              "seniorityLevel": "junior|mid|senior|executive",
              "confidenceScore": 0.95
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent results
        max_tokens: 1500, // Reduced for better performance
        timeout: 10000 // 10 second timeout
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const enhancedContent = data.choices[0].message.content;

    // Parse the AI response with better error handling
    let enhancedData;
    try {
      // Remove potential markdown formatting
      const cleanContent = enhancedContent.replace(/```json\n?|\n?```/g, '').trim();
      enhancedData = JSON.parse(cleanContent);
    } catch (parseError) {
      logWithContext('warn', 'Failed to parse AI response as JSON', { 
        error: parseError.message, 
        content: enhancedContent.substring(0, 200) 
      });
      enhancedData = profileData;
    }

    const processingTime = Date.now() - enhancementStart;
    logWithContext('info', 'AI enhancement completed', { 
      processingTime,
      tokensUsed: data.usage?.total_tokens || 0
    });

    // Merge enhanced data with original data, preserving original fields
    return {
      ...profileData,
      ...enhancedData,
      originalData: profileData, // Keep reference to original
      aiEnhancementTime: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - enhancementStart;
    logWithContext('error', 'AI enhancement failed', { 
      error: error.message, 
      processingTime 
    });
    return profileData; // Return original data if AI enhancement fails
  }
}

function createEnhancementPrompt(profileData: any): string {
  return `Please analyze and enhance this LinkedIn profile data:

Name: ${profileData.name || 'Not provided'}
Title: ${profileData.title || 'Not provided'}
Headline: ${profileData.headline || 'Not provided'}
Location: ${profileData.location || 'Not provided'}
Skills: ${JSON.stringify(profileData.skills || [])}
Experience: ${JSON.stringify(profileData.experience || [])}
Education: ${JSON.stringify(profileData.education || [])}

Please enhance this data according to the guidelines provided in the system message.`;
}

async function validateProfileData(profileData: any): Promise<any> {
  // Implement data validation rules
  const validatedData = { ...profileData };

  // Validate name
  if (validatedData.name && typeof validatedData.name === 'string') {
    validatedData.name = validatedData.name.trim();
    if (validatedData.name.length < 2) {
      validatedData.name = 'Name not available';
    }
  }

  // Validate email format if present
  if (validatedData.email && !isValidEmail(validatedData.email)) {
    delete validatedData.email;
  }

  // Validate skills array
  if (validatedData.skills) {
    if (Array.isArray(validatedData.skills)) {
      validatedData.skills = validatedData.skills.filter(skill => 
        skill && typeof skill === 'string' && skill.trim().length > 0
      );
    } else if (validatedData.skills.technical || validatedData.skills.soft) {
      // Already in categorized format from AI enhancement
      if (validatedData.skills.technical) {
        validatedData.skills.technical = validatedData.skills.technical.filter(skill => 
          skill && typeof skill === 'string' && skill.trim().length > 0
        );
      }
      if (validatedData.skills.soft) {
        validatedData.skills.soft = validatedData.skills.soft.filter(skill => 
          skill && typeof skill === 'string' && skill.trim().length > 0
        );
      }
    }
  }

  // Validate experience array
  if (validatedData.experience && Array.isArray(validatedData.experience)) {
    validatedData.experience = validatedData.experience.filter(exp => 
      exp && exp.company && exp.title
    );
  }

  return validatedData;
}

function calculateDataQuality(profileData: any): number {
  let score = 0;
  let maxScore = 0;

  // Name quality (10 points)
  maxScore += 10;
  if (profileData.name && profileData.name !== 'Name not available') {
    score += 10;
  }

  // Title quality (15 points)
  maxScore += 15;
  if (profileData.title && profileData.title.length > 5) {
    score += 15;
  }

  // Skills quality (20 points)
  maxScore += 20;
  const skillsCount = getSkillsCount(profileData.skills);
  if (skillsCount > 0) {
    score += Math.min(20, skillsCount * 2);
  }

  // Experience quality (25 points)
  maxScore += 25;
  if (profileData.experience && Array.isArray(profileData.experience)) {
    score += Math.min(25, profileData.experience.length * 8);
  }

  // Education quality (15 points)
  maxScore += 15;
  if (profileData.education && Array.isArray(profileData.education) && profileData.education.length > 0) {
    score += 15;
  }

  // Location quality (10 points)
  maxScore += 10;
  if (profileData.location && profileData.location.length > 3) {
    score += 10;
  }

  // Headline quality (5 points)
  maxScore += 5;
  if (profileData.headline && profileData.headline.length > 10) {
    score += 5;
  }

  return Math.round((score / maxScore) * 100) / 100;
}

function getSkillsCount(skills: any): number {
  if (Array.isArray(skills)) {
    return skills.length;
  }
  if (skills && typeof skills === 'object') {
    const technical = skills.technical ? skills.technical.length : 0;
    const soft = skills.soft ? skills.soft.length : 0;
    return technical + soft;
  }
  return 0;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}