import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase según el ambiente
const SUPABASE_CONFIG = {
  production: {
    url: 'https://zktljinqtjlpdignuzxy.supabase.co',
    anonKey: 'sb_publishable_0chaVLnpOJQKR0V58GKwmg_JXsFElN8'
  },
  staging: {
    url: 'https://lepmnfgpbebbsztshqhw.supabase.co',
    anonKey: 'sb_publishable_3mBE3qspxlsZg3gJ89rPLQ_EbTHrTDd'
  }
};

// Detectar ambiente en tiempo de ejecución según el dominio
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname === 'portal.mdenglish.us' || 
   window.location.hostname === 'oficina-virtual-prod.web.app');

const environment = isProduction ? 'production' : 'staging';
const config = SUPABASE_CONFIG[environment];

// Debug log (puedes quitar esto después)
console.log('🔧 Supabase Config:', {
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
  environment,
  supabaseUrl: config.url
});

export const supabase = createClient(config.url, config.anonKey);

// Exportar información del ambiente para debugging
export const currentEnvironment = environment;
export const apiUrl = 'https://api.mdenglish.us';