import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png", "repere-nutrition.png"],
      manifest: {
        name: "Nutrition Recettes",
        short_name: "Nutrition",
        description: "Gestion de recettes et suivi nutritionnel",
        theme_color: "#4f46e5",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-cache" },
          },
          {
            urlPattern: /^https:\/\/.*\.openfoodfacts\.org\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        recipeOptimizer: path.resolve(__dirname, "recipe-optimizer/index.html"),
      },
    },
  },
});
