import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Eğer URL yoksa boş bir client oluşturma (çökmemesi için)
export const supabase = supabaseUrl 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null as any; 
