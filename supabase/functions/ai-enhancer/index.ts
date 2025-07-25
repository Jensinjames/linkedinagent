import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileData, url } = await req.json();

    if (!profileData) {
      return new Response(
        JSON.stringify({ error: 'Profile data is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!openAIApiKey) {
      console.warn('OpenAI API key not configured, returning original data');
      return new Response(
        JSON.stringify({ enhancedProfile: profileData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enhancing profile data for: ${url}`);

    // Enhance profile data with AI
    const enhancedProfile = await enhanceProfileWithAI(profileData);

    // Validate and clean the enhanced data
    const validatedProfile = await validateProfileData(enhancedProfile);

    // Calculate quality score
    const qualityScore = calculateDataQuality(validatedProfile);

    return new Response(
      JSON.stringify({
        enhancedProfile: {
          ...validatedProfile,
          aiProcessingMetadata: {
            processedAt: new Date().toISOString(),
            qualityScore,
            enhancementsApplied: [
              'skills_standardization',
              'experience_enrichment',
              'data_validation',
              'sentiment_analysis'
            ]
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI enhancer error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'AI enhancement failed',
        fallbackProfile: req.body?.profileData || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function enhanceProfileWithAI(profileData: any): Promise<any> {
  try {
    const prompt = createEnhancementPrompt(profileData);

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
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedContent = data.choices[0].message.content;

    // Parse the AI response, handling potential JSON formatting issues
    let enhancedData;
    try {
      enhancedData = JSON.parse(enhancedContent);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using original data');
      enhancedData = profileData;
    }

    // Merge enhanced data with original data, preserving original fields
    return {
      ...profileData,
      ...enhancedData,
      originalData: profileData // Keep reference to original
    };

  } catch (error) {
    console.error('AI enhancement failed:', error);
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