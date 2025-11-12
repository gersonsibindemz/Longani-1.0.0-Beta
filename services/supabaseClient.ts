import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Use environment variables for Supabase credentials as per security best practices.
// These variables must be configured in your deployment environment (e.g., Vercel).
// IMPORTANT: The placeholders below are to prevent the app from crashing.
// Replace them with your actual Supabase URL and Anon Key for the app to function.
const supabaseUrl = process.env.SUPABASE_URL || 'https://eyjjqjhgbavhnvhvirzc.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ampxamhnYmF2aG52aHZpcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTU2NjcsImV4cCI6MjA3NzE3MTY2N30.dUrIChOtGbADDWQxCifOgHJ1dOkrPrp0V9amZL-JLb4';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
  const errorMessage = 'Supabase credentials are not configured. The app is using placeholder values. Please replace them in services/supabaseClient.ts for the app to function correctly.';
  console.error(errorMessage);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
