import { createClient } from '@supabase/supabase-js';

// Reemplaza con tus datos reales de Supabase
const supabaseUrl = 'https://zktljinqtjlpdignuzxy.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_0chaVLnpOJQKR0V58GKwmg_JXsFElN8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);