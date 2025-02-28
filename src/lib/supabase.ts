import { createClient } from '@supabase/supabase-js';
import { debug, Category } from './debug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables for Supabase configuration');
}

debug.logInfo(Category.DATABASE, 'Initializing Supabase', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  },
  global: {
    headers: {
      'x-client-info': 'mortgage-rate-monitor'
    }
  }
});

// Initialize database connection monitoring
export async function initializeSupabase() {
  try {
    debug.logInfo(Category.DATABASE, 'Testing Supabase connection');
    
    // Test the connection by trying to fetch the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      debug.logError(Category.DATABASE, 'Session error during initialization', {}, sessionError);
      return false;
    }

    // Test database access
    const { error: dbError } = await supabase
      .from('rate_history')
      .select('count')
      .single();

    if (dbError) {
      debug.logError(Category.DATABASE, 'Database access error during initialization', {}, dbError);
      return false;
    }

    debug.logInfo(Category.DATABASE, 'Supabase initialization successful', {
      authenticated: !!session
    });

    return true;
  } catch (err) {
    debug.logError(Category.DATABASE, 'Supabase initialization error', {}, err);
    return false;
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  debug.logInfo(Category.DATABASE, 'Cleaning up Supabase connection');
});

// Monitor auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  debug.logInfo(Category.AUTH, 'Auth state change', {
    event,
    userId: session?.user?.id,
    timestamp: new Date().toISOString()
  });
});