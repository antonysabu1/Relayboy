import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/login": { target: "http://localhost:3000", changeOrigin: true },
        "/register": { target: "http://localhost:3000", changeOrigin: true },
        "/verify-register-otp": { target: "http://localhost:3000", changeOrigin: true },
        "/logout": { target: "http://localhost:3000", changeOrigin: true },
        "/api": { target: "http://localhost:3000", changeOrigin: true },
        "/users": { target: "http://localhost:3000", changeOrigin: true },
        "/ws": { target: "ws://localhost:3000", ws: true },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
