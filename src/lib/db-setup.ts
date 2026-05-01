import { supabase } from './supabase';

export const checkDatabaseHealth = async () => {
  try {
    const { error } = await supabase
      .from('girilog_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Check if it's a "relation does not exist" error (Postgres code 42P01)
      if (error.code === '42P01') {
        return { ok: false, error: 'Tables are missing' };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Failed to connect to database' };
  }
};

export const initializeDatabase = async () => {
  try {
    // This will call the RPC function if it exists.
    // The user needs to create this RPC function in Supabase dashboard first.
    const { error } = await supabase.rpc('initialize_girilog_schema');
    
    if (error) {
      console.error('[DatabaseSetup] RPC Error:', error);
      return { ok: false, error: `${error.message} (${error.code})` };
    }
    
    return { ok: true };
  } catch (err: any) {
    console.error('[DatabaseSetup] Unexpected Error:', err);
    return { ok: false, error: err.message || 'An unexpected error occurred' };
  }
};
