import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, proxyId, error } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    switch (action) {
      case 'get_optimal_proxy':
        result = await getOptimalProxy(supabase);
        break;
      case 'report_success':
        result = await reportProxySuccess(supabase, proxyId);
        break;
      case 'report_failure':
        result = await reportProxyFailure(supabase, proxyId, error);
        break;
      case 'get_proxy_stats':
        result = await getProxyStats(supabase);
        break;
      case 'health_check':
        result = await performHealthCheck(supabase);
        break;
      default:
        throw new Error('Invalid action specified');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Proxy manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Proxy management failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function getOptimalProxy(supabase: any): Promise<any> {
  try {
    // Get all active proxies with their performance metrics
    const { data: proxies, error } = await supabase
      .from('proxy_configs')
      .select('*')
      .eq('is_active', true)
      .order('success_rate', { ascending: false })
      .order('last_used_at', { ascending: true });

    if (error) {
      console.error('Error fetching proxies:', error);
      return { proxy: null, reason: 'No proxies available' };
    }

    if (!proxies || proxies.length === 0) {
      return { proxy: null, reason: 'No active proxies configured' };
    }

    // Select proxy using weighted algorithm
    const optimalProxy = selectProxyWithWeighting(proxies);

    // Update last_used_at
    await supabase
      .from('proxy_configs')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', optimalProxy.id);

    return { 
      proxy: optimalProxy,
      reason: 'Selected based on success rate and rotation'
    };

  } catch (error) {
    console.error('Error getting optimal proxy:', error);
    return { proxy: null, reason: error.message };
  }
}

function selectProxyWithWeighting(proxies: any[]): any {
  // Weight proxies based on success rate, last used time, and randomization
  const now = new Date().getTime();
  
  const weightedProxies = proxies.map(proxy => {
    const successWeight = (proxy.success_rate || 0) / 100; // 0-1
    const lastUsed = proxy.last_used_at ? new Date(proxy.last_used_at).getTime() : 0;
    const timeSinceUsed = Math.min((now - lastUsed) / (1000 * 60 * 60), 24); // Hours, capped at 24
    const timeWeight = timeSinceUsed / 24; // 0-1, higher is better
    const randomWeight = Math.random() * 0.3; // Add some randomization

    const totalWeight = (successWeight * 0.5) + (timeWeight * 0.3) + randomWeight;

    return {
      ...proxy,
      weight: totalWeight
    };
  });

  // Sort by weight and return the best one
  weightedProxies.sort((a, b) => b.weight - a.weight);
  return weightedProxies[0];
}

async function reportProxySuccess(supabase: any, proxyId: string): Promise<any> {
  try {
    // Get current proxy stats
    const { data: proxy } = await supabase
      .from('proxy_configs')
      .select('success_rate')
      .eq('id', proxyId)
      .single();

    if (!proxy) {
      throw new Error('Proxy not found');
    }

    // Calculate new success rate (simple moving average approach)
    const currentRate = proxy.success_rate || 0;
    const newRate = Math.min(100, currentRate + (100 - currentRate) * 0.1);

    await supabase
      .from('proxy_configs')
      .update({ 
        success_rate: newRate,
        last_used_at: new Date().toISOString()
      })
      .eq('id', proxyId);

    return { success: true, newSuccessRate: newRate };

  } catch (error) {
    console.error('Error reporting proxy success:', error);
    return { success: false, error: error.message };
  }
}

async function reportProxyFailure(supabase: any, proxyId: string, errorMessage: string): Promise<any> {
  try {
    // Get current proxy stats
    const { data: proxy } = await supabase
      .from('proxy_configs')
      .select('success_rate')
      .eq('id', proxyId)
      .single();

    if (!proxy) {
      throw new Error('Proxy not found');
    }

    // Calculate new success rate (penalize failures)
    const currentRate = proxy.success_rate || 100;
    const penalty = categorizeErrorSeverity(errorMessage);
    const newRate = Math.max(0, currentRate - penalty);

    // Disable proxy if success rate drops too low
    const isActive = newRate > 20; // Disable if success rate below 20%

    await supabase
      .from('proxy_configs')
      .update({ 
        success_rate: newRate,
        is_active: isActive,
        last_used_at: new Date().toISOString()
      })
      .eq('id', proxyId);

    return { 
      success: true, 
      newSuccessRate: newRate,
      isActive,
      penalty 
    };

  } catch (error) {
    console.error('Error reporting proxy failure:', error);
    return { success: false, error: error.message };
  }
}

function categorizeErrorSeverity(errorMessage: string): number {
  const error = errorMessage.toLowerCase();
  
  // Severe errors (proxy might be blocked/dead)
  if (error.includes('connection refused') || 
      error.includes('timeout') || 
      error.includes('proxy authentication failed')) {
    return 15; // Heavy penalty
  }
  
  // Moderate errors (rate limiting, temporary blocks)
  if (error.includes('rate limit') || 
      error.includes('429') || 
      error.includes('captcha')) {
    return 8; // Medium penalty
  }
  
  // Light errors (parsing issues, content changes)
  if (error.includes('parsing') || 
      error.includes('element not found')) {
    return 3; // Light penalty
  }
  
  // Default penalty for unknown errors
  return 5;
}

async function getProxyStats(supabase: any): Promise<any> {
  try {
    const { data: proxies, error } = await supabase
      .from('proxy_configs')
      .select('*')
      .order('success_rate', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch proxy stats: ${error.message}`);
    }

    const totalProxies = proxies.length;
    const activeProxies = proxies.filter(p => p.is_active).length;
    const avgSuccessRate = proxies.reduce((sum, p) => sum + (p.success_rate || 0), 0) / totalProxies;

    return {
      totalProxies,
      activeProxies,
      inactiveProxies: totalProxies - activeProxies,
      averageSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      proxies: proxies.map(p => ({
        id: p.id,
        name: p.name,
        host: p.host,
        port: p.port,
        isActive: p.is_active,
        successRate: p.success_rate,
        lastUsed: p.last_used_at
      }))
    };

  } catch (error) {
    console.error('Error getting proxy stats:', error);
    return { error: error.message };
  }
}

async function performHealthCheck(supabase: any): Promise<any> {
  try {
    // This would test each proxy's connectivity in a real implementation
    // For now, we'll simulate health checks
    
    const { data: proxies } = await supabase
      .from('proxy_configs')
      .select('*')
      .eq('is_active', true);

    const healthResults = [];

    for (const proxy of proxies || []) {
      // Simulate health check
      const isHealthy = Math.random() > 0.1; // 90% healthy rate
      const responseTime = Math.random() * 2000 + 500; // 500-2500ms

      healthResults.push({
        proxyId: proxy.id,
        host: proxy.host,
        port: proxy.port,
        isHealthy,
        responseTime: Math.round(responseTime),
        checkedAt: new Date().toISOString()
      });

      // Update proxy status if unhealthy
      if (!isHealthy) {
        await supabase
          .from('proxy_configs')
          .update({ 
            is_active: false,
            success_rate: Math.max(0, (proxy.success_rate || 100) - 20)
          })
          .eq('id', proxy.id);
      }
    }

    return {
      totalChecked: healthResults.length,
      healthyCount: healthResults.filter(r => r.isHealthy).length,
      results: healthResults
    };

  } catch (error) {
    console.error('Error performing health check:', error);
    return { error: error.message };
  }
}