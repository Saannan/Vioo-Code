import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseConfig } from './config.js';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);