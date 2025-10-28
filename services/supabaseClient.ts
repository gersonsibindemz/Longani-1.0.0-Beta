import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

const supabaseUrl = 'https://eyjjqjhgbavhnvhvirzc.supabase.co';
// Updated API Key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ampxamhnYmF2aG52aHZpcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTU2NjcsImV4cCI6MjA3NzE3MTY2N30.dUrIChOtGbADDWQxCifOgHJ1dOkrPrp0V9amZL-JLb4';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL and Anon Key must be provided.');
    throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);