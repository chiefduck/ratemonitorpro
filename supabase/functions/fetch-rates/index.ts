import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

interface MortgageRate {
  date: string;
  type: string;
  value: number;
  termYears: number;
}

async function fetch30YearMortgageRate(apiKey: string): Promise<MortgageRate | null> {
  try {
    const baseUrl = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
      series_id: 'MORTGAGE30US',
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'desc',
      limit: '1',
      observation_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      observation_end: new Date().toISOString().split('T')[0]
    });

    console.log('Fetching 30-year rate from FRED...');
    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.observations || data.observations.length === 0) {
      throw new Error('No rate data found');
    }

    const observation = data.observations[0];
    const value = parseFloat(observation.value);

    if (isNaN(value) || value <= 0 || value > 15) {
      throw new Error(`Invalid rate value: ${value}`);
    }

    return {
      date: observation.date,
      type: 'Fixed',
      value: value,
      termYears: 30
    };
  } catch (error) {
    console.error('Error fetching 30-year rate:', error);
    return null;
  }
}

async function store30YearMortgageRate(supabase: any, rate: MortgageRate): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from('rate_history')
      .upsert({
        rate_date: rate.date,
        rate_type: rate.type,
        rate_value: rate.value,
        term_years: rate.termYears,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'rate_date,term_years'
      });

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error('Error storing rate:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const FRED_API_KEY = Deno.env.get('FRED_API_KEY');
    if (!FRED_API_KEY) {
      throw new Error('FRED API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch and store 30-year rate
    const rate30Year = await fetch30YearMortgageRate(FRED_API_KEY);
    if (!rate30Year) {
      throw new Error('Failed to fetch 30-year rate');
    }

    await store30YearMortgageRate(supabase, rate30Year);

    // Also fetch 15-year and 20-year rates
    const rates = [
      rate30Year,
      // Derive 15-year rate (typically 0.5-0.75 lower)
      {
        ...rate30Year,
        value: Math.max(0, rate30Year.value - 0.625),
        termYears: 15
      },
      // Derive 20-year rate (typically between 15 and 30)
      {
        ...rate30Year,
        value: Math.max(0, rate30Year.value - 0.3125),
        termYears: 20
      }
    ];

    // Store all rates
    for (const rate of rates) {
      await store30YearMortgageRate(supabase, rate);
    }

    return new Response(
      JSON.stringify(rates),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch rates', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});