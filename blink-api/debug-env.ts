
import { supabase } from './src/lib/supabase';

console.log('--- ENV CHECK ---');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('PRIVY_ID:', process.env.NEXT_PUBLIC_PRIVY_APP_ID);
console.log('-----------------');
