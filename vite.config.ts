import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
      "^/(socket|ws)$": { target: "ws://localhost:3000", ws: true },
      "/": {
        target: "ws://localhost:3000",
        ws: true,
        bypass: (req) => (req.headers.upgrade === "websocket" ? undefined : req.url),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
