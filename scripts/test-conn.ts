
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'PRESENT (starts with ' + supabaseKey.substring(0, 5) + '...)' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabase.from('core_merchants').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase Error:', error.message);
      process.exit(1);
    }
    console.log('Connection Successful!');
    console.log('Merchant count:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected Error:', err);
    process.exit(1);
  }
}

check();
