import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file from the current directory
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get API keys from .env or system environment variables
  const apiKey = env.API_KEY || process.env.API_KEY || "";
  const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  return {
    plugins: [react()],
    define: {
      // Inject variables into client-side bundle
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true
    }
  };
});