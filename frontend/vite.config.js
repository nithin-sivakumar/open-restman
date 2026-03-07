import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Open-RestMan",
        short_name: "RestMan",
        description: "Modern REST API & WebSocket Testing Client",
        theme_color: "#0f0f10",
        background_color: "#0f0f10",
        display: "standalone",
        orientation: "landscape",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/ws-proxy": { target: "ws://localhost:4000", ws: true },
    },
  },
});
