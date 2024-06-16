import { defineConfig } from "vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        unreferenced: path.resolve(__dirname, "src/main.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "unreferenced") {
            return "assets/app.js";
          }
          return `assets/[name].js`;
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "unreferenced.css") {
            return "assets/app.css";
          }
          return `assets/[name].css`;
        },
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      manifest: {
        name: "Jiggly",
        short_name: "Jiggly",
        description: "Jiggly music composer",
        theme_color: "#108de0",
        icons: [
          {
            src: "/favicon-md.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/favicon-lg.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
